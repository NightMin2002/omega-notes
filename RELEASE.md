# Ω Notes — 发布流程手册

> **目标读者**：本项目的开发者（你自己）
>
> 每次准备发布新版本时，打开本文件照做即可。

---

## 一、开发完成后的检查清单

在你打 tag 之前，先过一遍这个清单：

### 代码质量

- [ ] 所有新功能已在 `npm run dev` 下手动测试通过
- [ ] 桌面端 `npx tauri dev` 运行无报错
- [ ] 控制台无红色错误（`console.error`）
- [ ] 浏览器端降级可用（`npm run dev` 直接打开 localhost）

### 文件与配置

- [ ] `.gitignore` 包含 `.tauri-keys.txt`（私钥绝不能提交）
- [ ] `src-tauri/tauri.conf.json` 中 `pubkey` 不是占位符
- [ ] GitHub Secrets 中 `TAURI_SIGNING_PRIVATE_KEY` 和 `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` 已配置

### 提交规范

- [ ] 所有 commit 消息使用简体中文 + Conventional Commits（`feat:` / `fix:` / `refactor:` / `chore:` 等）
- [ ] commit 标题 ≤ 50 字

---

## 二、发布步骤（每次照做）

### Step 1 — 确定新版本号

版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)：

| 变更类型 | 版本变化 | 示例 |
|---|---|---|
| Bug 修复、文案调整 | `patch` +1 | 2.0.1 → 2.0.2 |
| 新增功能 | `minor` +1 | 2.0.2 → 2.1.0 |
| 不兼容的架构重构 | `major` +1 | 2.1.0 → 3.0.0 |

### Step 2 — 同步版本号

```bash
node scripts/bump-version.js <版本号>
```

这会自动同步 `package.json`、`tauri.conf.json`、`Cargo.toml` 三处版本号。

### Step 3 — 编写更新内容（可选但推荐）

有两种方式控制 Release 页面的「更新内容」展示：

**方式 A：手写（推荐有重大更新时用）**

在项目根目录创建 `RELEASE_NOTES.md`，写你想展示给用户的内容：

```markdown
### 新增
- 集成自动更新系统，应用内可一键升级
- 设置页新增「应用更新」区域，实时检查新版本

### 修复
- 修复某某功能的某某问题

### 优化
- 侧边栏设置图标新增红点更新提示
```

> CI 会**优先**读取此文件内容作为发布说明。发布后可以删除此文件。

**方式 B：自动生成（常规小更新时用）**

不创建 `RELEASE_NOTES.md`，CI 会自动提取上个 tag 到当前 tag 之间的所有 commit 消息作为发布说明。

所以你平时的 commit 消息要写清楚，这样自动生成的内容才有可读性。

### Step 4 — 提交并推送

```bash
git add -A
git commit -m "chore: 发布 v<版本号>"
git tag v<版本号>
git push origin main --tags
```

### Step 5 — 等待 & 验证

1. 打开 [GitHub Actions](https://github.com/NightMin2002/omega-notes/actions) 页面
2. 找到刚触发的 `Release` 工作流，等待全部绿勾（约 8-10 分钟）
3. 打开 [Releases](https://github.com/NightMin2002/omega-notes/releases) 确认：
   - [ ] Release 标题为 `Ω Notes v<版本号>`
   - [ ] 附件包含 `.exe` 安装包和 `latest.json`
   - [ ] 「更新内容」区域有你写的/自动生成的发布说明
   - [ ] `.sig` 签名文件存在

### Step 6 — 清理（如果用了手写方式）

```bash
# 如果创建了 RELEASE_NOTES.md，发布后删除它
rm RELEASE_NOTES.md
git add -A
git commit -m "chore: 清理发布说明"
git push origin main
```

---

## 三、关于 CHANGELOG.md

`CHANGELOG.md` 是**开发者档案**，不是发布说明。

- **它的作用**：记录项目从 v1 到现在的全部技术变更历史，方便你日后回顾
- **是否必须更新**：不强制。你想写就写，不写也不影响发布流程
- **和发布什么关系**：没有直接关系。用户看到的更新内容来自 `RELEASE_NOTES.md` 或自动 commit 提取

如果你希望维护它，建议在重大版本时补一条记录就行。

---

## 四、用户侧更新体验

发布成功后，已安装旧版本的用户会经历：

1. **应用启动 5 秒后** 自动检查更新（静默，不弹窗）
2. **每 4 小时** 定时复查一次
3. 发现新版本 → **侧边栏设置图标亮红点**（呼吸脉冲动画）
4. 用户点进设置 → **「应用更新」区域** 显示新版本号 + 更新内容
5. 点击 **「下载并安装」** → 进度条 → 自动重启完成更新
6. 也可以点 **「忽略本版」** → 红点消失，下个版本再提醒

### 镜像加速

更新检查会同时请求两个端点（取先返回的）：
- GitHub 原始：`github.com/NightMin2002/omega-notes/releases/...`
- 国内镜像：`ghfast.top/...`

---

## 五、故障排除

| 问题 | 解法 |
|---|---|
| Actions 没有触发 | 确认 tag 格式为 `v` 开头（如 `v2.1.0`），且 Actions 已启用 |
| 构建失败 | 查看 Actions 日志，通常是 Rust 编译错误或 npm 依赖问题 |
| Release 更新内容为空 | 检查 commit 消息是否为空，或创建 `RELEASE_NOTES.md` |
| 用户检测不到更新 | 确认 `latest.json` 存在于 Release 附件中 |
| 签名验证失败 | 确认 `tauri.conf.json` 中的 `pubkey` 和 GitHub Secret 中的私钥是同一对 |
| 国内下载慢 | `ghfast.top` 镜像已配置，应自动切换 |
