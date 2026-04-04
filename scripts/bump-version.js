#!/usr/bin/env node
/**
 * Ω Notes — 版本号同步脚本
 *
 * 用法: node scripts/bump-version.js <version>
 * 示例: node scripts/bump-version.js 2.9.0
 *
 * 同步更新以下三处版本号:
 *   - package.json          → "version"
 *   - src-tauri/tauri.conf.json → "version"
 *   - src-tauri/Cargo.toml     → [package] version
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execSync } from 'node:child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

const newVersion = process.argv[2]
if (!newVersion) {
  console.error('用法: node scripts/bump-version.js <version>')
  console.error('示例: node scripts/bump-version.js 2.9.0')
  process.exit(1)
}

// 校验版本号格式
if (!/^\d+\.\d+\.\d+/.test(newVersion)) {
  console.error(`无效的版本号: "${newVersion}" — 需要 semver 格式 (如 2.9.0)`)
  process.exit(1)
}

// 1. package.json
const pkgPath = resolve(root, 'package.json')
const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))
const oldVersion = pkg.version
pkg.version = newVersion
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf-8')
console.log(`  package.json            ${oldVersion} → ${newVersion}`)

// 2. tauri.conf.json
const tauriPath = resolve(root, 'src-tauri/tauri.conf.json')
const tauri = JSON.parse(readFileSync(tauriPath, 'utf-8'))
tauri.version = newVersion
writeFileSync(tauriPath, JSON.stringify(tauri, null, 2) + '\n', 'utf-8')
console.log(`  tauri.conf.json         ${oldVersion} → ${newVersion}`)

// 3. Cargo.toml (正则替换 [package] 下的 version)
const cargoPath = resolve(root, 'src-tauri/Cargo.toml')
let cargoContent = readFileSync(cargoPath, 'utf-8')
cargoContent = cargoContent.replace(
  /^(version\s*=\s*")[^"]*(")/m,
  `$1${newVersion}$2`
)
writeFileSync(cargoPath, cargoContent, 'utf-8')
console.log(`  Cargo.toml              ${oldVersion} → ${newVersion}`)

// 4. 更新 Cargo.lock
// 替换 Cargo.toml 的版本后，调用 cargo update 仅更新本项目在 lockfile 中的版本
try {
  execSync('cargo update -p omega-notes', { 
    cwd: resolve(root, 'src-tauri'),
    stdio: 'ignore' // 忽略输出，只在出错时抛出异常
  })
  console.log(`  Cargo.lock              已同步更新为 ${newVersion}`)
} catch (err) {
  console.error('更新 Cargo.lock 失败，请之后手动运行 cargo check 或 cargo build:', err.message)
}

console.log(`\n版本号已同步为 ${newVersion}`)
console.log('下一步:')
console.log(`  git add -A && git commit -m "chore: 发布 v${newVersion}"`)
console.log(`  git tag v${newVersion}`)
console.log(`  git push origin main --tags`)
