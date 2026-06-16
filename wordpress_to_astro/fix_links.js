const fs = require('fs');
const path = require('path');

const joaillerieDir = path.join(__dirname, 'joaillerie', 'src', 'content', 'blog');
const mdFiles = fs.readdirSync(joaillerieDir).filter(f => f.endsWith('.md') || f.endsWith('.mdx'));

// Create a Set of existing slugs
const existingSlugs = new Set();
for (const file of mdFiles) {
    const filePath = path.join(joaillerieDir, file);
    let content = fs.readFileSync(filePath, 'utf-8');
    const slugMatch = content.match(/slug:\s*"(.*?)"/);
    if (slugMatch && slugMatch[1]) {
        existingSlugs.add(slugMatch[1]);
    }
}

// Replace links
let replaceCount = 0;
for (const file of mdFiles) {
    const filePath = path.join(joaillerieDir, file);
    let content = fs.readFileSync(filePath, 'utf-8');
    
    // Replace old absolute URLs with local /blog/slug/ URLs
    content = content.replace(/href="https:\/\/www\.joaillerie-et-symbolique\.com\/([^/"]+)\/?"/g, (match, slug) => {
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
console.log(`Replaced ${replaceCount} links in markdown files.`);
