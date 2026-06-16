const fs = require('fs');
const path = require('path');

const siteName = 'joaillerie';
const outDir = path.join(__dirname, siteName, 'src/content/blog');
const mediaDir = path.join(__dirname, siteName, 'public/media-images');

function renameImagesAndMap() {
    const files = fs.readdirSync(outDir).filter(f => f.endsWith('.md') || f.endsWith('.mdx'));
    
    for (const file of files) {
        const filePath = path.join(outDir, file);
        let content = fs.readFileSync(filePath, 'utf-8');
        
        // Match heroImage path
        const heroMatch = content.match(/heroImage:\s*"(.*?)"/);
        const slugMatch = content.match(/slug:\s*"(.*?)"/);
        
        if (heroMatch && heroMatch[1] && slugMatch && slugMatch[1]) {
            let oldPath = heroMatch[1];
            const slug = slugMatch[1];
            
            // if it's already using the exact slug, skip
            if (oldPath.includes(slug)) continue;

            const publicOldPath = path.join(__dirname, siteName, 'public', oldPath);
            
            // Find the actual file considering extensions
            let exts = ['.webp', '.jpg', '.png', '.jpeg'];
            let actualPath = null;
            let extToUse = null;

            let basePath = publicOldPath;
            if (publicOldPath.match(/\.(jpg|jpeg|png|webp)$/i)) {
                basePath = publicOldPath.replace(/\.(jpg|jpeg|png|webp)$/i, '');
            }

            for (const ext of exts) {
                if (fs.existsSync(basePath + ext)) {
                    actualPath = basePath + ext;
                    extToUse = ext;
                    break;
                }
            }

            if (actualPath) {
                // Rename file
                const newRelativeDir = `/media-images/posts`;
                const newPublicDir = path.join(__dirname, siteName, 'public', newRelativeDir);
                
                if (!fs.existsSync(newPublicDir)) {
                    fs.mkdirSync(newPublicDir, { recursive: true });
                }

                const newFileName = `${slug}${extToUse}`;
                const newPublicPath = path.join(newPublicDir, newFileName);
                
                fs.copyFileSync(actualPath, newPublicPath);
                
                // Update markdown
                const newHeroImage = `${newRelativeDir}/${slug}${extToUse}`;
                content = content.replace(heroMatch[0], `heroImage: "${newHeroImage}"`);
                fs.writeFileSync(filePath, content, 'utf-8');
                console.log(`Updated ${slug}: copied ${path.basename(actualPath)} -> ${newFileName}`);
            }
        }
    }
}

renameImagesAndMap();
