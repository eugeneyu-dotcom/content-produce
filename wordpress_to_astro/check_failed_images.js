const fs = require('fs');
const path = require('path');

const sites = ['Dream', 'joaillerie', 'Desk', 'Legend'];

// Helper to recursively find files
const findFiles = (dir, fileList = []) => {
    if (!fs.existsSync(dir)) return fileList;
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            findFiles(fullPath, fileList);
        } else if (fullPath.endsWith('.md') || fullPath.endsWith('.astro')) {
            fileList.push(fullPath);
        }
    }
    return fileList;
};

const run = () => {
    console.log("=== Scanning for Placeholder (Failed) Images ===");
    
    let failedCount = 0;

    for (const site of sites) {
        const searchDirs = [
            path.join(__dirname, site, 'src', 'content', 'blog'),
            path.join(__dirname, site, 'src', 'pages')
        ];
        
        const filesToScan = [];
        searchDirs.forEach(dir => findFiles(dir, filesToScan));

        const siteMissing = new Set();

        for (const filePath of filesToScan) {
            const content = fs.readFileSync(filePath, 'utf8');
            let title = path.basename(filePath).replace(/\.(md|astro)$/, '').replace(/-/g, ' ');
            
            const titleMatch = content.match(/^title:\s*"?([^"\n]+)"?/m) || content.match(/<h1>(.*?)<\/h1>/);
            if (titleMatch) title = titleMatch[1];
            
            const localImgRegex = /(?:src=["']|heroImage:\s*"|!\s*\[.*?\]\()(\/media-images\/[^"' )]+)/gi;
            
            let match;
            while ((match = localImgRegex.exec(content)) !== null) {
                let imgPath = match[1];
                let physicalPath = path.join(__dirname, site, 'public', imgPath);
                
                // Exclude valid uses of hero-bg.webp
                if (imgPath.includes('hero-bg')) continue;
                
                if (fs.existsSync(physicalPath)) {
                    // Check if it's the generic placeholder (size 84786)
                    const stat = fs.statSync(physicalPath);
                    if (stat.size === 84786) {
                        siteMissing.add(`${title} (${imgPath})`);
                    }
                } else {
                    siteMissing.add(`${title} (${imgPath}) [File not found]`);
                }
            }
        }

        if (siteMissing.size > 0) {
            console.log(`\n[${site}] 發現 ${siteMissing.size} 張未能成功生成的圖片：`);
            siteMissing.forEach(item => {
                console.log(`  - ${item}`);
                failedCount++;
            });
        }
    }

    if (failedCount === 0) {
        console.log("\n太棒了！所有圖片都已經成功生成，沒有任何遺漏或使用備用圖片的地方！");
    } else {
        console.log(`\n總共有 ${failedCount} 個地方仍然使用了備用圖片或檔案遺失。`);
    }
};

run();
