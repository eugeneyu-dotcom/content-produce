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
        
        // Extract title from Layout tag
        const titleMatch = content.match(/<Layout title="([^"]+)">/);
        const title = titleMatch ? titleMatch[1] : 'Category';
        
        // Extract main content
        const mainMatch = content.match(/<main class="category-page"[\s\S]*?<\/main>/);
        const mainContent = mainMatch ? mainMatch[0] : '';
        
        const newContent = `---
import BaseHead from '../../components/BaseHead.astro';
import Header from '../../components/Header.astro';
import Footer from '../../components/Footer.astro';
import { SITE_TITLE } from '../../consts';
---

<!doctype html>
<html lang="en">
    <head>
        <BaseHead title={"${title} | " + SITE_TITLE} description="${title} category page" />
    </head>
    <body>
        <Header />
        ${mainContent}
        <Footer />
    </body>
</html>
`;
        fs.writeFileSync(filePath, newContent);
        console.log(`[${site}] Fixed layout for ${file}`);
    });
});
