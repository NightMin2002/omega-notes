const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const releaseNotesPath = path.join(__dirname, '../RELEASE_NOTES.md');

try {
  // 1. 获取上一个 Tag（例如 v2.3.0）
  let lastTag = '';
  try {
    lastTag = execSync('git describe --tags --abbrev=0', { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
  } catch (e) {
    console.log('未找到历史 Tag，将提取所有 Commit...');
  }

  const gitRange = lastTag ? `${lastTag}..HEAD` : 'HEAD';
  console.log(`正在提取范围: [ ${lastTag || 'Start'} -> 最新 ]\n`);
  
  // 2. 批量提取该区间的全部 Commit（剔除 Merge，强制要求输出 UTF-8）
  // 采用安全的界定符：||_COMMIT_||
  const output = execSync(`git -c i18n.logOutputEncoding=utf-8 log ${gitRange} --no-merges --pretty=format:"||_COMMIT_||%n%s%n||_BODY_||%n%b"`, { encoding: 'utf-8' }).trim();
  
  if (!output) {
    console.log(`⚠️ 在 ${lastTag || '现在'} 之后没有任何新的 Commit。无需更新。`);
    process.exit(0);
  }

  // 3. 解析与格式化
  const commitBlocks = output.split('||_COMMIT_||').filter(Boolean);
  
  const today = new Date().toISOString().split('T')[0];
  let changelogContent = `## 更新日志 - ${today}\n\n`;

  commitBlocks.forEach(block => {
    const parts = block.split('||_BODY_||');
    const title = parts[0] ? parts[0].trim() : '';
    const body = parts[1] ? parts[1].trim() : '';
    
    if (!title) return;
    
    changelogContent += `### ${title}\n`;
    if (body) {
      changelogContent += `${body}\n\n`;
    } else {
      changelogContent += '\n';
    }
  });

  // 4. 直接清空并覆写 RELEASE_NOTES.md
  fs.writeFileSync(releaseNotesPath, changelogContent.trim() + '\n', 'utf-8');
  
  console.log('✅ 发版日志已提取并覆盖写入 RELEASE_NOTES.md！');
  console.log('👀 请在 VS Code 中打开文件进行审查，无误后统一 Commit。');

} catch (error) {
  console.error('❌ 提取失败:', error.message);
  process.exit(1);
}
