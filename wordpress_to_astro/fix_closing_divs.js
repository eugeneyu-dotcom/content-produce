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
        
        // Restore missing closing divs for FAQ
        // The generateThemedFaqHtml returned html ending with </div>\n</div>\n
        // if content ends with </p>\n        </main>, it means we lost 3 divs (faq-item, faq-content, category-faq-section)
        if (content.match(/<\/p>\n\s*<\/main>/)) {
            content = content.replace(/<\/p>\n\s*<\/main>/, '</p>\n        </div>\n    </div>\n</div>\n    </main>');
        }
        
        fs.writeFileSync(filePath, content);
    });
});
