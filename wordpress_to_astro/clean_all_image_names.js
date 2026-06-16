const fs = require('fs');
const path = require('path');

const sites = ['Dream', 'joaillerie', 'Desk', 'Legend'];

const excludeFiles = [
    'hero-bg.webp', 'hero-bg.jpg', 'hero-bg.png', 
    'Logo.webp', 'Logo.png', 'Logo.jpg', 
    'favicon.ico', 'favicon.svg'
];

// Helper to check if file should be excluded
const shouldExclude = (filename) => {
    if (excludeFiles.includes(filename)) return true;
    if (filename.startsWith('pillar-')) return true; // pillar images are shared on homepage
    // if filename already perfectly matches the semantic format [slug]-illustration-[index], we could skip, but renaming it again is fine if it just overrides it
    return false;
};

// Helper to find file recursively in a directory
const findFileRecursively = (dir, filename) => {
    if (!fs.existsSync(dir)) return null;
    try {
        const decodedFilename = decodeURIComponent(filename);
        const files = fs.readdirSync(dir);
        for (const file of files) {
            const fullPath = path.join(dir, file);
            const stat = fs.statSync(fullPath);
            if (stat.isDirectory()) {
                const found = findFileRecursively(fullPath, filename);
                if (found) return found;
            } else if (file === filename || file === decodedFilename) {
                return fullPath;
            }
        }
    } catch(e) {}
    return null;
};

// Map of old physical path -> new physical path to track renames across a single run
const renamedMap = {};

const processFilesInDir = (site, dirPath) => {
    if (!fs.existsSync(dirPath)) return;
    
    const files = fs.readdirSync(dirPath);
    for (const file of files) {
        const fullPath = path.join(dirPath, file);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
            processFilesInDir(site, fullPath);
        } else if (fullPath.endsWith('.md') || fullPath.endsWith('.astro')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let changed = false;
            
            // Extract slug and title
            const slugMatch = content.match(/^slug:\s*"?([^"\n]+)"?/m);
            let slug = slugMatch ? slugMatch[1] : path.basename(file, path.extname(file));
            if (slug === 'index') slug = path.basename(path.dirname(fullPath)); // if index.astro, use folder name
            if (slug === 'home') slug = 'home';
            if (slug === 'home-2') slug = 'home';
            
            const titleMatch = content.match(/^title:\s*"?([^"\n]+)"?/m) || content.match(/<h1>(.*?)<\/h1>/);
            const title = titleMatch ? titleMatch[1].replace(/"/g, '') : slug.replace(/-/g, ' ');

            let imageIndex = 1;

            // 1. Process Frontmatter heroImage
            const heroMatch = content.match(/heroImage:\s*"([^"]+)"/);
            if (heroMatch) {
                let heroUrl = heroMatch[1];
                let filename = heroUrl.split('/').pop().split('?')[0];
                
                if (!shouldExclude(filename)) {
                    let ext = filename.split('.').pop();
                    if (!['png', 'jpg', 'jpeg', 'webp', 'svg', 'gif'].includes(ext.toLowerCase())) ext = 'webp';
                    
                    const newFilename = `${slug}-cover.${ext}`;
                    const publicDir = path.join(__dirname, site, 'public', 'media-images');
                    const oldFilePath = findFileRecursively(publicDir, filename);
                    
                    if (oldFilePath) {
                        const postsDir = path.join(publicDir, 'posts');
                        if (!fs.existsSync(postsDir)) fs.mkdirSync(postsDir, { recursive: true });
                        const newFilePath = path.join(postsDir, newFilename);
                        
                        if (!renamedMap[oldFilePath]) {
                            if (!fs.existsSync(newFilePath) || oldFilePath === newFilePath) {
                                if (oldFilePath !== newFilePath) fs.renameSync(oldFilePath, newFilePath);
                            }
                            renamedMap[oldFilePath] = newFilePath;
                        }
                        
                        const newUrl = `/media-images/posts/${newFilename}`;
                        content = content.replace(heroMatch[0], `heroImage: "${newUrl}"`);
                        changed = true;
                    } else if (heroUrl.includes('wp-content')) {
                        // If it's a WP url but not found locally, just update the string anyway to clean it
                        const newUrl = `/media-images/posts/${newFilename}`;
                        content = content.replace(heroMatch[0], `heroImage: "${newUrl}"`);
                        changed = true;
                    }
                }
            }

            // 2. Process all <img> tags in the body
            const imgTagRegex = /<img([^>]+)>/gi;
            content = content.replace(imgTagRegex, (fullTag, attributes) => {
                let newTag = fullTag;
                let srcFilename = '';
                
                // Extract src
                const srcMatch = attributes.match(/src=["']([^"']+)["']/i);
                if (srcMatch) {
                    const srcUrl = srcMatch[1];
                    srcFilename = srcUrl.split('/').pop().split('?')[0];
                    
                    if (!shouldExclude(srcFilename)) {
                        let ext = srcFilename.split('.').pop();
                        if (!['png', 'jpg', 'jpeg', 'webp', 'svg', 'gif'].includes(ext.toLowerCase())) ext = 'webp';
                        
                        const newFilename = `${slug}-illustration-${imageIndex++}.${ext}`;
                        const publicDir = path.join(__dirname, site, 'public', 'media-images');
                        const oldFilePath = findFileRecursively(publicDir, srcFilename);
                        
                        const newUrl = `/media-images/posts/${newFilename}`;
                        
                        if (oldFilePath) {
                            const postsDir = path.join(publicDir, 'posts');
                            if (!fs.existsSync(postsDir)) fs.mkdirSync(postsDir, { recursive: true });
                            const newFilePath = path.join(postsDir, newFilename);
                            
                            if (!renamedMap[oldFilePath]) {
                                if (!fs.existsSync(newFilePath) || oldFilePath === newFilePath) {
                                    if (oldFilePath !== newFilePath) fs.renameSync(oldFilePath, newFilePath);
                                }
                                renamedMap[oldFilePath] = newFilePath;
                            }
                            
                            newTag = newTag.replace(srcUrl, newUrl);
                        } else if (srcUrl.includes('wp-content')) {
                            newTag = newTag.replace(srcUrl, newUrl);
                        }
                    }
                }

                // Process srcset
                const srcsetMatch = attributes.match(/srcset=["']([^"']+)["']/i);
                if (srcsetMatch && srcFilename && !shouldExclude(srcFilename)) {
                    // Just remove srcset entirely to simplify and force it to use the new local src
                    // Because srcset has a lot of resized weird filenames that we don't want to track down
                    newTag = newTag.replace(/\s*srcset=["'][^"']+["']/i, '');
                    newTag = newTag.replace(/\s*sizes=["'][^"']+["']/i, '');
                }

                // Update alt and title
                if (srcFilename && !shouldExclude(srcFilename)) {
                    const altRegex = /alt=["']([^"']*)["']/i;
                    if (newTag.match(altRegex)) {
                        newTag = newTag.replace(altRegex, `alt="Illustration for ${title}"`);
                    } else {
                        newTag = newTag.replace('<img', `<img alt="Illustration for ${title}"`);
                    }

                    const titleRegex = /title=["']([^"']*)["']/i;
                    if (newTag.match(titleRegex)) {
                        newTag = newTag.replace(titleRegex, `title="${title}"`);
                    }
                }

                if (newTag !== fullTag) changed = true;
                return newTag;
            });
            
            // 3. Process Markdown images ![alt](url)
            const mdImgRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
            content = content.replace(mdImgRegex, (match, alt, url) => {
                let filename = url.split('/').pop().split('?')[0];
                if (!shouldExclude(filename)) {
                    let ext = filename.split('.').pop();
                    if (!['png', 'jpg', 'jpeg', 'webp', 'svg', 'gif'].includes(ext.toLowerCase())) ext = 'webp';
                    
                    const newFilename = `${slug}-illustration-${imageIndex++}.${ext}`;
                    const publicDir = path.join(__dirname, site, 'public', 'media-images');
                    const oldFilePath = findFileRecursively(publicDir, filename);
                    
                    const newUrl = `/media-images/posts/${newFilename}`;
                    
                    if (oldFilePath) {
                        const postsDir = path.join(publicDir, 'posts');
                        if (!fs.existsSync(postsDir)) fs.mkdirSync(postsDir, { recursive: true });
                        const newFilePath = path.join(postsDir, newFilename);
                        
                        if (!renamedMap[oldFilePath]) {
                            if (!fs.existsSync(newFilePath) || oldFilePath === newFilePath) {
                                if (oldFilePath !== newFilePath) fs.renameSync(oldFilePath, newFilePath);
                            }
                            renamedMap[oldFilePath] = newFilePath;
                        }
                        return `![Illustration for ${title}](${newUrl} "${title}")`;
                    } else if (url.includes('wp-content')) {
                        return `![Illustration for ${title}](${newUrl} "${title}")`;
                    }
                }
                return match;
            });

            if (changed) {
                fs.writeFileSync(fullPath, content);
                console.log(`[${site}] Semantically renamed images in ${file}`);
            }
        }
    }
};

sites.forEach(site => {
    console.log(`\nScanning ${site} for image semantics...`);
    processFilesInDir(site, path.join(__dirname, site, 'src', 'content', 'blog'));
    processFilesInDir(site, path.join(__dirname, site, 'src', 'pages'));
    processFilesInDir(site, path.join(__dirname, site, 'src', 'pages', 'category'));
});

console.log("\nDone cleaning all image names!");
