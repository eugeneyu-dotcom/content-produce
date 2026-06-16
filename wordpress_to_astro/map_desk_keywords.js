const fs = require('fs');
const path = require('path');

const csv = fs.readFileSync('SOP2-1_Dimension.csv', 'utf8');
const lines = csv.split('\n');

const deskData = [];
for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('ミニマリスト・デスクセットアップ')) {
        // Simple CSV parsing handling quotes
        const cols = [];
        let inQuote = false;
        let col = '';
        for (let j = 0; j < line.length; j++) {
            if (line[j] === '"') {
                inQuote = !inQuote;
            } else if (line[j] === ',' && !inQuote) {
                cols.push(col);
                col = '';
            } else {
                col += line[j];
            }
        }
        cols.push(col);
        
        if (cols.length >= 6) {
            deskData.push({
                site: cols[0],
                title: cols[1],
                dimension: cols[2],
                article: cols[3],
                keywordSlug: cols[4].replace(/"/g, '').trim(),
                faq: cols[5].replace(/"/g, '').trim()
            });
        }
    }
}
console.log("Desk Data:", JSON.stringify(deskData, null, 2));

const blogDir = path.join(__dirname, 'Desk', 'src', 'content', 'blog');
const blogFiles = fs.readdirSync(blogDir).filter(f => f.endsWith('.md'));
console.log(`Found ${blogFiles.length} blog files.`);
// Let's print out the titles/slugs of all blog files to see how we can map keywords to them
const postMap = [];
for (const f of blogFiles) {
    const content = fs.readFileSync(path.join(blogDir, f), 'utf8');
    const slugMatch = content.match(/slug:\s*['"]?([^'"\n]+)['"]?/);
    const titleMatch = content.match(/title:\s*['"]?([^'"\n]+)['"]?/);
    if (slugMatch && titleMatch) {
        postMap.push({ file: f, slug: slugMatch[1], title: titleMatch[1] });
    }
}
console.log("Posts:");
console.log(postMap.map(p => `${p.slug} | ${p.title}`).join('\n'));
