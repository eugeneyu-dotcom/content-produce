const fs = require('fs');
const path = require('path');

const joaillerieDir = path.join(__dirname, 'joaillerie', 'src', 'content', 'blog');
const mdFiles = fs.readdirSync(joaillerieDir).filter(f => f.endsWith('.md') || f.endsWith('.mdx'));

for (const file of mdFiles) {
    const filePath = path.join(joaillerieDir, file);
    let content = fs.readFileSync(filePath, 'utf-8');
    
    // Fix WordPress scaled/dimension suffixes in local URLs
    // e.g. /media-images/2026/01/image-1024x536.webp -> /media-images/2026/01/image.webp
    content = content.replace(/-\d+x\d+\.(webp|jpg|png|jpeg)/g, '.$1');
    content = content.replace(/-scaled\.(webp|jpg|png|jpeg)/g, '.$1');
    
    // Also fix the hero-bg.jpg issue mentioned by user:
    // In index.astro, hero-bg.jpg is missing or not resolving correctly.
    
    fs.writeFileSync(filePath, content, 'utf-8');
}
console.log('Stripped WP dimension suffixes from image URLs in markdown.');
