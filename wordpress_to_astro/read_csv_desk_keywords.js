const fs = require('fs');
const content = fs.readFileSync('SOP2-1_Dimension.csv', 'utf8');
const lines = content.split('\n');
const deskKeywords = [];
for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',');
    if (cols[0] === 'ミニマリスト・デスクセットアップ') {
        const slug = cols[4];
        if (slug) deskKeywords.push(slug.trim());
    }
}
console.log(deskKeywords);
