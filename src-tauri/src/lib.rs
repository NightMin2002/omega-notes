use tauri::{
    menu::{MenuBuilder, MenuItemBuilder},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager, WindowEvent, WebviewUrl, WebviewWindowBuilder,
};

/* ─── 悬挂窗口 ─── */

#[tauri::command]
async fn open_popout(app: tauri::AppHandle, kind: String, note_id: Option<String>) -> Result<(), String> {
    let (label, route, w, h, decorations, resizable) = match kind.as_str() {
        "tasks" => ("popout-tasks", "/popout/tasks".to_string(), 340.0, 520.0, true, true),
        "timer" => ("popout-timer", "/popout/timer".to_string(), 240.0, 280.0, true, false),
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
        let _ = win.set_focus();
        return Ok(());
    }

    // 用查询参数传递目标路由，前端 main.ts 读取后跳转
    let url = WebviewUrl::App(format!("index.html?popout_route={}", route).into());
    let mut builder = WebviewWindowBuilder::new(&app, label, url)
        .title("Ω Notes")
        .inner_size(w, h)
        .always_on_top(true)
        .resizable(resizable)
        .maximizable(resizable)
        .decorations(decorations)
        .transparent(true);
        
    if !decorations {
        builder = builder.shadow(false);
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
        .invoke_handler(tauri::generate_handler![open_popout, resize_popout, close_popout])
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
                let float_tasks = MenuItemBuilder::with_id("float-tasks", "📋 悬挂任务").build(app)?;
                let float_timer = MenuItemBuilder::with_id("float-timer", "⏱ 悬挂计时").build(app)?;
                let float_progress = MenuItemBuilder::with_id("float-progress", "🕒 悬挂时间").build(app)?;
                let quit = MenuItemBuilder::with_id("quit", "退出").build(app)?;
                let menu = MenuBuilder::new(app)
                    .items(&[&show, &float_tasks, &float_timer, &float_progress, &quit])
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
                        "float-tasks" => {
                            let handle = app.clone();
                            tauri::async_runtime::spawn(async move {
                                let _ = open_popout(handle, "tasks".into(), None).await;
                            });
                        }
                        "float-timer" => {
                            let handle = app.clone();
                            tauri::async_runtime::spawn(async move {
                                let _ = open_popout(handle, "timer".into(), None).await;
                            });
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

