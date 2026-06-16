const fs = require('fs');
const path = require('path');

const sites = ['Dream', 'joaillerie', 'Desk', 'Legend'];

// HTML entity decoder
const decodeHtml = (text) => {
    return text
        .replace(/&#8217;/g, "'")
        .replace(/&#8216;/g, "'")
        .replace(/&#8220;/g, '"')
        .replace(/&#8221;/g, '"')
        .replace(/&#8211;/g, '-')
        .replace(/&#8212;/g, '--')
        .replace(/&/g, '&')
        .replace(/"/g, '"')
        .replace(/&#038;/g, '&')
        .replace(/</g, '<')
        .replace(/>/g, '>');
};

sites.forEach(site => {
    const blogDir = path.join(__dirname, site, 'src', 'content', 'blog');
    if (!fs.existsSync(blogDir)) return;

    const files = fs.readdirSync(blogDir).filter(f => f.endsWith('.md'));

    files.forEach(file => {
        let filePath = path.join(blogDir, file);
        let content = fs.readFileSync(filePath, 'utf8');

        // Decode entities in frontmatter
        const fmMatch = content.match(/^---\n([\s\S]*?)\n---\n/);
        if (fmMatch) {
            let frontmatter = fmMatch[1];
            let changed = false;

            const titleMatch = frontmatter.match(/^title:\s*"?([^"\n]+)"?/m);
            if (titleMatch) {
                const decodedTitle = decodeHtml(titleMatch[1]);
                if (decodedTitle !== titleMatch[1]) {
                    frontmatter = frontmatter.replace(titleMatch[1], decodedTitle);
                    changed = true;
                }
            }
            
            // Fix post-105.md in Dream
            if (file === 'post-105.md' && site === 'Dream') {
                // Rename file
                const newPath = path.join(blogDir, 'how-to-wake-up-from-a-lucid-dream-fast.md');
                fs.renameSync(filePath, newPath);
                filePath = newPath;
                console.log("Renamed post-105.md to how-to-wake-up-from-a-lucid-dream-fast.md");
                
                // Update slug in frontmatter
                frontmatter = frontmatter.replace(/slug:\s*".*?"/, 'slug: "how-to-wake-up-from-a-lucid-dream-fast"');
                
                // Fix heroImage for this file
                if (!frontmatter.includes('heroImage:')) {
                    frontmatter += `\nheroImage: "/media-images/hero-bg.webp"`;
                } else if (frontmatter.includes('heroImage: ""') || frontmatter.includes('heroImage: null')) {
                    frontmatter = frontmatter.replace(/heroImage:.*/, 'heroImage: "/media-images/hero-bg.webp"');
                }
                changed = true;
            }

            if (changed) {
                content = content.replace(fmMatch[1], frontmatter);
                fs.writeFileSync(filePath, content);
                console.log(`[${site}] Fixed frontmatter in ${filePath.split('/').pop()}`);
            }
        }
    });
});
