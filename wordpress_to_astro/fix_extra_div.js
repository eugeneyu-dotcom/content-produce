const fs = require('fs');
const path = require('path');

const sites = ['Dream', 'joaillerie', 'Desk', 'Legend'];

sites.forEach(site => {
    const categoryDir = path.join(__dirname, site, 'src', 'pages', 'category');
    if (!fs.existsSync(categoryDir)) return;
    
    const files = fs.readdirSync(categoryDir).filter(f => f.endsWith('.astro'));
    
    files.forEach(file => {
        const filePath = path.join(categoryDir, file);
        let content = fs.readFileSync(filePath, 'utf8');
        
        // Fix extra div
        content = content.replace(/<\/div>\n\s*<\/main>/, '</main>');
        // Also remove if there are multiple extra divs
        while (content.match(/<\/div>\n\s*<\/main>/)) {
            content = content.replace(/<\/div>\n\s*<\/main>/, '</main>');
        }
        
        fs.writeFileSync(filePath, content);
    });
});
