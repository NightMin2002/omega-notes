use tauri::{
    menu::{MenuBuilder, MenuItemBuilder},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager, WindowEvent, WebviewUrl, WebviewWindowBuilder,
};
#[cfg(windows)]
use windows_sys::Win32::UI::WindowsAndMessaging::{
    SetWindowPos, SWP_ASYNCWINDOWPOS, SWP_NOACTIVATE, SWP_NOZORDER,
};

/* ─── 悬挂窗口 ─── */

#[tauri::command]
async fn open_popout(app: tauri::AppHandle, kind: String, note_id: Option<String>) -> Result<(), String> {
    let (label, route, w, h, decorations, resizable) = match kind.as_str() {
        "progress" => ("popout-progress", "/popout/progress".to_string(), 420.0, 48.0, false, false),
        "note"  => {
            let id = note_id.unwrap_or_default();
            ("popout-note", format!("/popout/note/{}", id), 520.0, 700.0, false, true)
        }
        _ => return Err("Unknown popout kind".into()),
    };

    // 如果窗口已存在 → 聚焦
    if let Some(win) = app.get_webview_window(label) {
        let _ = win.show();
        let _ = win.unminimize();
        if kind.as_str() != "progress" {
            let _ = win.set_focus();
        }
        return Ok(());
    }

    // 用查询参数传递目标路由，前端 main.ts 读取后跳转
    let url = WebviewUrl::App(format!("index.html?popout_route={}", route).into());
    let mut builder = WebviewWindowBuilder::new(&app, label, url)
        .title("Ω Notes")
        .inner_size(w, h)
        .focused(kind.as_str() != "progress")
        .always_on_top(true)
        .resizable(resizable)
        .maximizable(resizable)
        .decorations(decorations)
        .transparent(true);
        
    if !decorations {
        builder = builder.shadow(false).skip_taskbar(true);
    }

    if kind.as_str() == "progress" {
        if let Ok(Some(monitor)) = app.primary_monitor() {
            let scale_factor = monitor.scale_factor() as f64;
            let work_area = monitor.work_area();
            let target_x =
                (work_area.position.x as f64 / scale_factor) + (work_area.size.width as f64 / scale_factor) - w - 24.0;
            // 使用 work area，避免被 Windows 任务栏或多屏偏移坐标干扰
            let target_y =
                (work_area.position.y as f64 / scale_factor) + (work_area.size.height as f64 / scale_factor) - h - 12.0;
            builder = builder.position(target_x, target_y);
        }
    }

    builder.build().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn resize_popout(app: tauri::AppHandle, label: String, w: f64, h: f64) -> Result<(), String> {
    if let Some(win) = app.get_webview_window(&label) {
        let size = tauri::LogicalSize::new(w, h);
        win.set_size(size).map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// 原子化窗口几何操作：
/// - Windows: 通过单次 SetWindowPos 同时完成移动 + 缩放，并显式禁止激活窗口
/// - 其他平台: 退回原有的顺序型 size/position 更新
#[tauri::command]
async fn update_popout_geometry(
    app: tauri::AppHandle,
    label: String,
    x: f64,
    y: f64,
    w: f64,
    h: f64,
    _order: Option<String>,
) -> Result<(), String> {
    if let Some(win) = app.get_webview_window(&label) {
        #[cfg(windows)]
        {
            let hwnd = win.hwnd().map_err(|e| e.to_string())?;
            let scale_factor = win.scale_factor().map_err(|e| e.to_string())?;
            let width = ((w * scale_factor).round() as i32).max(1);
            let height = ((h * scale_factor).round() as i32).max(1);
            let x = x.round() as i32;
            let y = y.round() as i32;
            let result = unsafe {
                SetWindowPos(
                    hwnd.0 as _,
                    std::ptr::null_mut(),
                    x,
                    y,
                    width,
                    height,
                    SWP_ASYNCWINDOWPOS | SWP_NOACTIVATE | SWP_NOZORDER,
                )
            };
            if result == 0 {
                return Err(std::io::Error::last_os_error().to_string());
            }
            return Ok(());
        }

        #[cfg(not(windows))]
        {
        let position = tauri::PhysicalPosition::new(x.round() as i32, y.round() as i32);
        let size = tauri::LogicalSize::new(w, h);

        match _order.as_deref() {
            Some("size-first") => {
                win.set_size(size).map_err(|e| e.to_string())?;
                win.set_position(position).map_err(|e| e.to_string())?;
            }
            _ => {
                win.set_position(position).map_err(|e| e.to_string())?;
                win.set_size(size).map_err(|e| e.to_string())?;
            }
        }
        }
    }
    Ok(())
}

#[tauri::command]
async fn close_popout(app: tauri::AppHandle, label: String) -> Result<(), String> {
    if let Some(win) = app.get_webview_window(&label) {
        win.destroy().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_notification::init())
        // ─── 单实例：第二个进程启动时聚焦已有窗口 ───
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.unminimize();
                let _ = window.set_focus();
            }
        }))
        .invoke_handler(tauri::generate_handler![open_popout, resize_popout, close_popout, update_popout_geometry])
        .setup(|app| {
            // 开发模式日志
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            // 全局快捷键 + 自启（仅桌面端）
            #[cfg(desktop)]
            {
                app.handle().plugin(
                    tauri_plugin_global_shortcut::Builder::new().build(),
                )?;
                app.handle().plugin(
                    tauri_plugin_autostart::init(
                        tauri_plugin_autostart::MacosLauncher::LaunchAgent,
                        None,
                    ),
                )?;
            }

            // ─── 系统托盘 ───
            #[cfg(desktop)]
            {
                let show = MenuItemBuilder::with_id("show", "显示 Ω Notes").build(app)?;
                let float_progress = MenuItemBuilder::with_id("float-progress", "🚀 时间枢纽").build(app)?;
                let quit = MenuItemBuilder::with_id("quit", "退出").build(app)?;
                let menu = MenuBuilder::new(app)
                    .items(&[&show, &float_progress, &quit])
                    .build()?;

                TrayIconBuilder::new()
                    .icon(app.default_window_icon().unwrap().clone())
                    .tooltip("Ω Notes")
                    .menu(&menu)
                    .on_menu_event(|app, event| match event.id().as_ref() {
                        "show" => {
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.show();
                                let _ = window.unminimize();
                                let _ = window.set_focus();
                            }
                        }
                        "float-progress" => {
                            let handle = app.clone();
                            tauri::async_runtime::spawn(async move {
                                let _ = open_popout(handle, "progress".into(), None).await;
                            });
                        }
                        "quit" => {
                            app.exit(0);
                        }
                        _ => {}
                    })
                    // 双击托盘图标 → 恢复窗口
                    .on_tray_icon_event(|tray, event| {
                        if let TrayIconEvent::Click {
                            button: MouseButton::Left,
                            button_state: MouseButtonState::Up,
                            ..
                        } = event
                        {
                            let app = tray.app_handle();
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.show();
                                let _ = window.unminimize();
                                let _ = window.set_focus();
                            }
                        }
                    })
                    .build(app)?;
            }

            Ok(())
        })
        // ─── 关闭按钮 → 最小化到托盘（而非退出）───
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                // 只有主窗口最小化到托盘，子窗口直接关闭
                if window.label() == "main" {
                    api.prevent_close();
                    let _ = window.hide();
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

