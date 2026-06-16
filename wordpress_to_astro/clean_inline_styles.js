const fs = require('fs');
const path = require('path');

const sites = ['Dream', 'joaillerie', 'Desk', 'Legend'];

const processContent = (content) => {
    // Separate the body from our custom injected blocks at the end
    let body = content;
    let tail = '';
    
    const kwIndex = content.indexOf('<section class="category-keywords"');
    const faqIndex = content.indexOf('<div class="category-faq-section"');
    
    let splitIndex = -1;
    if (kwIndex !== -1 && faqIndex !== -1) {
        splitIndex = Math.min(kwIndex, faqIndex);
    } else if (kwIndex !== -1) {
        splitIndex = kwIndex;
    } else if (faqIndex !== -1) {
        splitIndex = faqIndex;
    }
    
    if (splitIndex !== -1) {
        body = content.substring(0, splitIndex);
        tail = content.substring(splitIndex);
    }
    
    // Clean inline styles from p, li, span, div, h2, h3, h4, h5, h6 in the body
    // Exclude h1 because h1 is used in hero blocks with white text on dark background
    const tagRegex = /<(p|li|span|div|h[2-6])\s+([^>]*)style=["']([^"']*)["']([^>]*)>/gi;
    
    body = body.replace(tagRegex, (match, tag, before, style, after) => {
        // If it's a wp-block-group alignfull (Hero block), do not strip its color to preserve the background contrast
        if (before.includes('wp-block-group alignfull') || after.includes('wp-block-group alignfull')) {
            return match;
        }
        
        let newStyle = style
            .replace(/color:\s*#[a-fA-F0-9]{3,6};?\s*/gi, '')
            .replace(/color:\s*rgb\([^)]+\);?\s*/gi, '')
            .replace(/font-size:\s*[^;]+;?\s*/gi, '')
            .replace(/line-height:\s*[^;]+;?\s*/gi, '')
            .replace(/font-family:\s*[^;]+;?\s*/gi, '')
            .trim();
            
        if (newStyle.length === 0) {
            let cleanedTag = `<${tag} ${before}${after}>`.replace(/\s+>/g, '>');
            // if before and after are empty, it becomes e.g. <p > -> <p>
            return cleanedTag;
        } else {
            return `<${tag} ${before}style="${newStyle}"${after}>`;
        }
    });
    
    return body + tail;
};

sites.forEach(site => {
    const blogDir = path.join(__dirname, site, 'src', 'content', 'blog');
    if (!fs.existsSync(blogDir)) return;

    const files = fs.readdirSync(blogDir).filter(f => f.endsWith('.md'));

    files.forEach(file => {
        let filePath = path.join(blogDir, file);
        let content = fs.readFileSync(filePath, 'utf8');
        
        const newContent = processContent(content);
        
        if (newContent !== content) {
            fs.writeFileSync(filePath, newContent);
            console.log(`[${site}] Cleaned inline styles in ${file}`);
        }
    });
});

console.log("Cleanup of inline styles complete!");
