# Ω Notes V2 — 开发环境配置指南

> 面向开发者和 AI 助手：此文档记录了项目构建所需的全部环境依赖。

## 前置依赖

| 依赖 | 版本要求 | 用途 | 安装方式 |
|---|---|---|---|
| Node.js | ^20.19 或 ≥22.12 | 前端运行时 | `winget install OpenJS.NodeJS.LTS` |
| Rust | ≥1.80 | Tauri 后端编译 | `winget install Rustlang.Rustup` |
| VS Build Tools | 2022 (17.x) | MSVC 链接器（Rust 编译必需） | `winget install Microsoft.VisualStudio.2022.BuildTools --source winget --override "--wait --passive --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"` |

### 为什么需要 VS Build Tools？

Rust 在 Windows 上使用 MSVC 工具链编译，需要 `link.exe`（链接器）和 Windows SDK headers。它们只能通过 VS Build Tools 获取。

**注意**：
- 这 **不是** Visual Studio IDE（几十 GB 的大软件），只是编译工具（约 3-5 GB）
- 装好后不需要打开它，不需要在里面写代码
- 它是一个后台工具，Rust 编译器会自动找到它

### 验证安装

```powershell
# 验证 Node.js
node --version     # 应输出 v20.x 或 v22+

# 验证 Rust
rustc --version    # 应输出 rustc 1.x.x
cargo --version    # 应输出 cargo 1.x.x

# 验证 MSVC（需在 VS 开发者命令提示符中）
cl                 # 应显示 Microsoft C/C++ 编译器版本
```

## 项目结构（Tauri 相关）

```
omega-v2/
├── src/                    # 前端代码（Vue 3）
├── src-tauri/              # Tauri 后端代码
│   ├── Cargo.toml          # Rust 依赖配置
│   ├── tauri.conf.json     # Tauri 应用配置
│   ├── src/
│   │   ├── main.rs         # 桌面应用入口
│   │   └── lib.rs          # Rust 库入口
│   ├── capabilities/       # 权限配置
│   └── icons/              # 应用图标
├── vite.config.ts          # Vite 配置（端口 8080）
└── package.json            # 包含 tauri 脚本
```

## 日常开发命令

| 命令 | 用途 | 说明 |
|---|---|---|
| `npm run dev` | 仅前端开发 | 在浏览器中打开 `http://localhost:8080` |
| `npm run tauri:dev` | 桌面应用开发模式 | 自动启动 Vite + 编译 Rust + 弹出桌面窗口 |
| `npm run tauri:build` | 构建生产包 | 输出 .exe / .msi 安装包 |

### 首次编译说明

`npm run tauri:dev` 首次运行时会：
1. 下载 ~400 个 Rust crate 依赖
2. 编译所有依赖（耗时 2-5 分钟）
3. 之后增量编译很快（几秒）

如果编译缓存被清理（如 `cargo clean`），需要重新完整编译。

## Tauri 配置要点

配置文件：`src-tauri/tauri.conf.json`

| 配置项 | 当前值 | 说明 |
|---|---|---|
| `productName` | `Omega Notes` | 应用名称 |
| `identifier` | `com.nightmin.omega-notes` | 应用唯一标识 |
| `devUrl` | `http://localhost:8080` | 开发时前端地址 |
| `frontendDist` | `../dist` | 构建时前端产物路径 |
| 窗口大小 | 1200×800 | 默认窗口尺寸 |
| 最小窗口 | 800×600 | 不能再小了 |

### Vite 配置适配

```typescript
// vite.config.ts 中为 Tauri 做的配置
clearScreen: false,        // 避免清屏导致 Tauri 误判进程退出
server: {
  host: '0.0.0.0',        // 绑定所有接口（避免 IPv6 权限问题）
  port: 8080,             // 固定端口（5173 在此系统被 Hyper-V 保留）
  strictPort: true,       // 端口被占用时直接报错
}
```

## 数据持久化现状

| 存储方式 | 状态 | 风险 |
|---|---|---|
| localStorage（WebView2） | **当前使用** | 清理 WebView 缓存或重装应用会丢失数据 |
| 本地 .md 文件 | 规划中 | 数据完全由用户控制，不会丢失 |

当前数据存储位置（Windows）：
```
%LOCALAPPDATA%\com.nightmin.omega-notes\
```

## Tauri vs Electron 对比

| 维度 | Electron | Tauri |
|---|---|---|
| 后端语言 | Node.js (JS) | Rust |
| 浏览器引擎 | 自带 Chromium (~150MB) | 系统 WebView2 (~0MB) |
| 打包体积 | 100-200MB | **3-8MB** |
| 内存占用 | 200-500MB | **30-80MB** |
| 编译依赖 | 无额外依赖 | Rust + MSVC |
| 文件系统访问 | Node.js fs 模块 | Tauri fs 插件 |
| 安全模型 | 较弱（全 Node 访问） | 强（权限能力系统） |

## 故障排查

### 1. `EACCES: permission denied ::1:5173`
Vite 无法绑定 IPv6 localhost。解决：使用 `host: '0.0.0.0'` 绑定。

### 2. `error: linker 'link.exe' not found`
MSVC 链接器未安装。解决：安装 VS Build Tools + VCTools 工作负载。

### 3. `beforeDevCommand terminated with a non-zero status code`
Vite dev server 启动失败。检查端口是否被占用，或 `strictPort` 配置。

### 4. 首次 `tauri dev` 非常慢
正常，首次需要编译 400+ 个 Rust crate。之后增量编译只需几秒。

---

> **维护提醒**：更新 Rust 版本时运行 `rustup update`，更新 Tauri CLI 时运行 `npm update @tauri-apps/cli`。
