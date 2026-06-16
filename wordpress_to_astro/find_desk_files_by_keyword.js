const fs = require('fs');
const path = require('path');

const blogDir = path.join(__dirname, 'Desk', 'src', 'content', 'blog');
const files = fs.readdirSync(blogDir).filter(f => f.endsWith('.md'));

const keywords = [
  'デスク 人間工学',
  'ミニマリスト デスク 色',
  'デスク 配線 隠す',
  'モニターライト メリット',
  'デスクトップ 整理術',
  'デスク 觀葉植物',
  '集中力 デスク 整理'
];

for (const file of files) {
    const content = fs.readFileSync(path.join(blogDir, file), 'utf8');
    for (const keyword of keywords) {
        if (content.includes(keyword)) {
            console.log(`File: ${file} contains keyword: ${keyword}`);
        }
    }
}
