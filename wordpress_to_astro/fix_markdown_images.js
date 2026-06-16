const fs = require('fs');
const path = require('path');

const joaillerieDir = path.join(__dirname, 'joaillerie', 'src', 'content', 'blog');
const mdFiles = fs.readdirSync(joaillerieDir).filter(f => f.endsWith('.md') || f.endsWith('.mdx'));

for (const file of mdFiles) {
    const filePath = path.join(joaillerieDir, file);
    let content = fs.readFileSync(filePath, 'utf-8');
    
    // Replace absolute WP URLs with local /media-images/
    content = content.replace(/https:\/\/www\.joaillerie-et-symbolique\.com\/wp-content\/uploads/g, '/media-images');
    
    // Remove width and height attributes from img tags to prevent compression/distortion
    content = content.replace(/<img([^>]*)width="[^"]*"([^>]*)height="[^"]*"([^>]*)>/g, '<img$1$2$3 style="width: 100%; height: auto; object-fit: cover; border-radius: 8px; margin: 2em 0;">');
    content = content.replace(/<img([^>]*)height="[^"]*"([^>]*)width="[^"]*"([^>]*)>/g, '<img$1$2$3 style="width: 100%; height: auto; object-fit: cover; border-radius: 8px; margin: 2em 0;">');
    
    // Just in case width/height were single:
    content = content.replace(/<img([^>]*)width="[^"]*"([^>]*)>/g, '<img$1$2>');
    content = content.replace(/<img([^>]*)height="[^"]*"([^>]*)>/g, '<img$1$2>');
    
    // Make sure all images have object-fit: cover if they don't have style
    content = content.replace(/<img([^>]*)>/g, (match, p1) => {
        if (!p1.includes('style=')) {
            return `<img${p1} style="width: 100%; height: auto; object-fit: cover; border-radius: 8px; margin: 2em 0;">`;
        }
        return match;
    });

    // Strip srcset and sizes as they might point to missing thumbnails, let browser just load the main src
    content = content.replace(/srcset="[^"]*"/g, '');
    content = content.replace(/sizes="[^"]*"/g, '');

    fs.writeFileSync(filePath, content, 'utf-8');
}
console.log('Fixed markdown image compression and URLs.');
