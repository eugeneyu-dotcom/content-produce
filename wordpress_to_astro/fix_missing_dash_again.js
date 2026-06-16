const fs = require('fs');
const path = require('path');

const sites = ['Dream', 'joaillerie', 'Desk', 'Legend'];

sites.forEach(site => {
    const blogDir = path.join(__dirname, site, 'src', 'content', 'blog');
    if (!fs.existsSync(blogDir)) return;

    const files = fs.readdirSync(blogDir).filter(f => f.endsWith('.md'));

    files.forEach(file => {
        let filePath = path.join(blogDir, file);
        let content = fs.readFileSync(filePath, 'utf8');
        let changed = false;

        // Fix broken frontmatter starting with --
        if (content.startsWith('--\n')) {
            content = content.replace(/^--\n/, '---\n');
            changed = true;
        } else if (content.startsWith('--\r\n')) {
            content = content.replace(/^--\r\n/, '---\n');
            changed = true;
        }

        // Fix missing fallback image copy
        if (file === 'evolutionary-purpose-scary-stories-after-republic.md') {
            const postsDir = path.join(__dirname, 'Legend', 'public', 'media-images', 'posts');
            if (!fs.existsSync(postsDir)) fs.mkdirSync(postsDir, { recursive: true });
            
            // Try to copy from different fallback sources
            let exts = ['webp', 'jpg', 'png', 'jpeg'];
            let placeholderSource = null;
            for (let ext of exts) {
                let testPath = path.join(__dirname, site, 'public', 'media-images', `hero-bg.${ext}`);
                if (fs.existsSync(testPath)) {
                    placeholderSource = testPath;
                    break;
                }
            }
            
            if (placeholderSource) {
                fs.copyFileSync(placeholderSource, path.join(postsDir, 'evolutionary-purpose-scary-stories-after-republic.png'));
                fs.copyFileSync(placeholderSource, path.join(postsDir, 'evolutionary-purpose-scary-stories-after-republic-footer.png'));
                console.log(`Copied placeholder images for Legend.`);
            } else {
                console.log(`Failed to find any hero-bg in Legend!`);
            }
        }
        
        if (file === 'how-to-wake-up-from-a-lucid-dream-fast.md') {
            const postsDir = path.join(__dirname, 'Dream', 'public', 'media-images', 'posts');
            if (!fs.existsSync(postsDir)) fs.mkdirSync(postsDir, { recursive: true });
            
            let placeholderSource = path.join(__dirname, 'Dream', 'public', 'media-images', `hero-bg.webp`);
            
            if (fs.existsSync(placeholderSource)) {
                fs.copyFileSync(placeholderSource, path.join(postsDir, 'how-to-wake-up-from-a-lucid-dream-fast.png'));
                console.log(`Copied placeholder image for how-to-wake-up-from-a-lucid-dream-fast.png`);
            }
            
            // Update heroImage frontmatter just in case it points to post-105
            content = content.replace(/heroImage:\s*".*?"/, 'heroImage: "/media-images/posts/how-to-wake-up-from-a-lucid-dream-fast.png"');
            changed = true;
        }

        if (changed) {
            fs.writeFileSync(filePath, content);
            console.log(`[${site}] Fixed dashes/images in ${file}`);
        }
    });
});
