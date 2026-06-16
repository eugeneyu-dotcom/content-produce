const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'Dream/src/content/blog/how-to-wake-up-from-a-lucid-dream-fast.md');

if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Fix the broken dashed line
    if (content.startsWith('--\n') || content.startsWith('--\r\n')) {
        content = content.replace(/^--\r?\n/, '---\n');
    }
    
    // Fix the heroImage
    content = content.replace(/heroImage: "\/media-images\/posts\/post-105\.png"/, 'heroImage: "/media-images/hero-bg.webp"');
    
    fs.writeFileSync(filePath, content);
    console.log("Fixed how-to-wake-up-from-a-lucid-dream-fast.md");
}
