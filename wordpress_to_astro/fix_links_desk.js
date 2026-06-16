const fs = require('fs');
const path = require('path');

const deskDir = path.join(__dirname, 'Desk', 'src', 'content', 'blog');
const mdFiles = fs.readdirSync(deskDir).filter(f => f.endsWith('.md') || f.endsWith('.mdx'));

// Create a Set of existing slugs
const existingSlugs = new Set();
for (const file of mdFiles) {
    const filePath = path.join(deskDir, file);
    let content = fs.readFileSync(filePath, 'utf-8');
    const slugMatch = content.match(/slug:\s*"(.*?)"/);
    if (slugMatch && slugMatch[1]) {
        existingSlugs.add(slugMatch[1]);
    }
}

// Replace links
let replaceCount = 0;
for (const file of mdFiles) {
    const filePath = path.join(deskDir, file);
    let content = fs.readFileSync(filePath, 'utf-8');
    
    // Replace old absolute URLs with local /blog/slug/ URLs
    content = content.replace(/href="https:\/\/www\.minimal-desk-studio\.com\/([^/"]+)\/?"/g, (match, slug) => {
        // If the slug exists locally, change to local path
        if (existingSlugs.has(slug)) {
            replaceCount++;
            return `href="/blog/${slug}/"`;
        }
        // If it doesn't exist, leave it as is
        return match;
    });

    fs.writeFileSync(filePath, content, 'utf-8');
}
console.log(`Replaced ${replaceCount} links in Desk markdown files.`);
