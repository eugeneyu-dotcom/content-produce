const fs = require('fs');
const path = require('path');

const blogDir = path.join(__dirname, 'Desk', 'src', 'content', 'blog');
const files = fs.readdirSync(blogDir).filter(f => f.endsWith('.md'));

let found = 0;
for (const file of files) {
    const content = fs.readFileSync(path.join(blogDir, file), 'utf8');
    if (content.includes('category: カテゴリー') || content.includes('category: "カテゴリー"')) {
        console.log('Found category: カテゴリー in', file);
        found++;
        if (found === 1) {
            console.log('--- CONTENT PREVIEW ---');
            console.log(content.substring(0, 500));
            console.log('--- END PREVIEW ---');
        }
    }
}
if (found === 0) {
    console.log('No files with category: カテゴリー found in Desk/src/content/blog/');
    // let's check what categories exist
    const categories = new Set();
    for (const file of files) {
        const content = fs.readFileSync(path.join(blogDir, file), 'utf8');
        const match = content.match(/category:\s*(.*)/);
        if (match) {
            categories.add(match[1].trim());
        }
    }
    console.log('Categories found:', Array.from(categories));
}
