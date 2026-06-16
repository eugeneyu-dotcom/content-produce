const fs = require('fs');
const path = require('path');

const sites = ['Dream', 'joaillerie', 'Desk', 'Legend'];

// Helper to find file recursively in a directory
const findFileRecursively = (dir, filename) => {
    if (!fs.existsSync(dir)) return null;
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            const found = findFileRecursively(fullPath, filename);
            if (found) return found;
        } else if (file === filename) {
            return fullPath;
        }
    }
    return null;
};

// Helper to process files in a directory
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
            
            const titleMatch = content.match(/^title:\s*"?([^"\n]+)"?/m) || content.match(/<h1>(.*?)<\/h1>/);
            const title = titleMatch ? titleMatch[1] : slug.replace(/-/g, ' ');

            // 1. Rename files and update paths
            const geminiImgRegex = /Gemini_Generated_Image_[a-zA-Z0-9\-]+\.(png|jpg|jpeg|webp)/gi;
            let imgMatches = content.match(geminiImgRegex);
            
            if (imgMatches) {
                // remove duplicates
                imgMatches = [...new Set(imgMatches)];
                
                imgMatches.forEach((oldFilename, index) => {
                    const ext = oldFilename.split('.').pop();
                    const newFilename = `${slug}-illustration-${index + 1}.${ext}`;
                    
                    // Search for the old file in the public directory
                    const publicDir = path.join(__dirname, site, 'public', 'media-images');
                    const oldFilePath = findFileRecursively(publicDir, oldFilename);
                    
                    if (oldFilePath) {
                        // Move to posts directory for cleanliness
                        const postsDir = path.join(publicDir, 'posts');
                        if (!fs.existsSync(postsDir)) fs.mkdirSync(postsDir, { recursive: true });
                        
                        const newFilePath = path.join(postsDir, newFilename);
                        
                        // Only rename if it doesn't already exist to prevent overwriting
                        if (!fs.existsSync(newFilePath)) {
                            fs.renameSync(oldFilePath, newFilePath);
                            console.log(`[${site}] Renamed ${oldFilename} -> ${newFilename}`);
                        }
                        
                        // Replace the entire URL if it's an absolute WP URL, otherwise just the filename
                        // Often it looks like: src="https://www.old-site.com/wp-content/uploads/2026/01/Gemini_...webp"
                        // Or srcset="..."
                        const wpUrlRegex = new RegExp(`https?:\/\/[^\s"'<>]+\/${oldFilename}`, 'gi');
                        if (content.match(wpUrlRegex)) {
                            content = content.replace(wpUrlRegex, `/media-images/posts/${newFilename}`);
                            changed = true;
                        }
                        
                        // Replace remaining standalone filenames
                        if (content.includes(oldFilename)) {
                            content = content.replace(new RegExp(oldFilename, 'g'), newFilename);
                            changed = true;
                        }
                    } else {
                        // If file isn't found locally, just replace the filename in text so the AI trace is removed anyway
                        const newUrl = `/media-images/posts/${newFilename}`;
                        const wpUrlRegex = new RegExp(`https?:\/\/[^\s"'<>]+\/${oldFilename}`, 'gi');
                        if (content.match(wpUrlRegex)) {
                            content = content.replace(wpUrlRegex, newUrl);
                            changed = true;
                        } else if (content.includes(oldFilename)) {
                            content = content.replace(new RegExp(oldFilename, 'g'), newFilename);
                            changed = true;
                        }
                    }
                });
            }

            // 2. Clean alt and title tags
            const altRegex = /alt="gemini generated image[^"]*"/gi;
            if (content.match(altRegex)) {
                content = content.replace(altRegex, `alt="Illustration for ${title}"`);
                changed = true;
            }

            const titleAttrRegex = /title="gemini generated image[^"]*"/gi;
            if (content.match(titleAttrRegex)) {
                content = content.replace(titleAttrRegex, `title="${title}"`);
                changed = true;
            }

            if (changed) {
                fs.writeFileSync(fullPath, content);
                console.log(`[${site}] Cleaned AI traces in ${file}`);
            }
        }
    }
};

sites.forEach(site => {
    console.log(`\nScanning ${site}...`);
    processFilesInDir(site, path.join(__dirname, site, 'src', 'content', 'blog'));
    processFilesInDir(site, path.join(__dirname, site, 'src', 'pages'));
    processFilesInDir(site, path.join(__dirname, site, 'src', 'pages', 'category'));
    processFilesInDir(site, path.join(__dirname, site, 'src', 'layouts'));
    processFilesInDir(site, path.join(__dirname, site, 'src', 'components'));
});

console.log("\nDone cleaning AI traces!");
