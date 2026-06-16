const fs = require('fs');
const path = require('path');

const sites = ['Dream', 'joaillerie', 'Desk', 'Legend'];
const missingFiles = {};

sites.forEach(site => {
    missingFiles[site] = new Set();
    const publicDir = path.join(__dirname, site, 'public', 'media-images');
    
    // Check index.astro
    const indexAst = path.join(__dirname, site, 'src', 'pages', 'index.astro');
    if (fs.existsSync(indexAst)) {
        const content = fs.readFileSync(indexAst, 'utf8');
        const matches = [...content.matchAll(/(?:\/media-images\/)([^"'\s\)]+\.(webp|png|jpg|jpeg))/gi)];
        matches.forEach(m => {
            const file = m[1];
            if (!fs.existsSync(path.join(publicDir, file))) {
                missingFiles[site].add(file);
            }
        });
    }

    // Check Header.astro
    const headerAst = path.join(__dirname, site, 'src', 'components', 'Header.astro');
    if (fs.existsSync(headerAst)) {
        const content = fs.readFileSync(headerAst, 'utf8');
        const matches = [...content.matchAll(/(?:\/media-images\/)([^"'\s\)]+\.(webp|png|jpg|jpeg))/gi)];
        matches.forEach(m => {
            const file = m[1];
            if (!fs.existsSync(path.join(publicDir, file))) {
                missingFiles[site].add(file);
            }
        });
    }
    
    // Check BaseHead.astro
    const baseHeadAst = path.join(__dirname, site, 'src', 'components', 'BaseHead.astro');
    if (fs.existsSync(baseHeadAst)) {
        const content = fs.readFileSync(baseHeadAst, 'utf8');
        const matches = [...content.matchAll(/(?:\/media-images\/)([^"'\s\)]+\.(webp|png|jpg|jpeg))/gi)];
        matches.forEach(m => {
            const file = m[1];
            if (!fs.existsSync(path.join(publicDir, file))) {
                missingFiles[site].add(file);
            }
        });
    }
});

Object.keys(missingFiles).forEach(site => {
    if (missingFiles[site].size > 0) {
        console.log(`\n[${site}] Missing Manual Images:`);
        missingFiles[site].forEach(file => console.log(` - /media-images/${file}`));
    } else {
        console.log(`\n[${site}] All manual images are present!`);
    }
});
