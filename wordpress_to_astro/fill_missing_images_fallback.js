const fs = require('fs');
const path = require('path');

const sites = ['Dream', 'joaillerie', 'Desk', 'Legend'];

sites.forEach(site => {
    const blogDir = path.join(__dirname, site, 'src', 'content', 'blog');
    if (!fs.existsSync(blogDir)) return;

    const files = fs.readdirSync(blogDir).filter(f => f.endsWith('.md'));
    
    files.forEach(file => {
        const mdPath = path.join(blogDir, file);
        const content = fs.readFileSync(mdPath, 'utf8');
        const slug = file.replace('.md', '');
        
        let changed = false;
        let newContent = content;

        // Check heroImage
        const heroMatch = newContent.match(/heroImage:\s*"([^"]+)"/);
        if (heroMatch) {
            let heroUrl = heroMatch[1];
            if (heroUrl.startsWith('/media-images/')) {
                const localPath = path.join(__dirname, site, 'public', heroUrl);
                if (!fs.existsSync(localPath)) {
                    // Provide fallback
                    const placeholder = path.join(__dirname, site, 'public', 'media-images', 'hero-bg.webp');
                    if (fs.existsSync(placeholder)) {
                        fs.mkdirSync(path.dirname(localPath), { recursive: true });
                        fs.copyFileSync(placeholder, localPath);
                        console.log(`[${site}] Copied fallback for ${localPath.split('/').pop()}`);
                    }
                }
            }
        }

        // Check body images
        const imgRegex = /<img[^>]+src=["']([^"']+)["']/gi;
        let match;
        let bodyImageCount = 0;
        while ((match = imgRegex.exec(content)) !== null) {
            bodyImageCount++;
            let src = match[1];
            if (src.startsWith('/media-images/')) {
                const localPath = path.join(__dirname, site, 'public', src);
                if (!fs.existsSync(localPath)) {
                    const placeholder = path.join(__dirname, site, 'public', 'media-images', 'hero-bg.webp');
                    if (fs.existsSync(placeholder)) {
                        fs.mkdirSync(path.dirname(localPath), { recursive: true });
                        fs.copyFileSync(placeholder, localPath);
                        console.log(`[${site}] Copied fallback for ${localPath.split('/').pop()}`);
                    }
                }
            }
        }
        
        const mdImgRegex = /!\[[^\]]*\]\(([^)]+)\)/g;
        while ((match = mdImgRegex.exec(content)) !== null) {
            bodyImageCount++;
            let src = match[1].split(' ')[0];
            if (src.startsWith('/media-images/')) {
                const localPath = path.join(__dirname, site, 'public', src);
                if (!fs.existsSync(localPath)) {
                    const placeholder = path.join(__dirname, site, 'public', 'media-images', 'hero-bg.webp');
                    if (fs.existsSync(placeholder)) {
                        fs.mkdirSync(path.dirname(localPath), { recursive: true });
                        fs.copyFileSync(placeholder, localPath);
                        console.log(`[${site}] Copied fallback for ${localPath.split('/').pop()}`);
                    }
                }
            }
        }
    });
});
