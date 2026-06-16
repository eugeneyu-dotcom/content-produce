const fs = require('fs');
const path = require('path');

const sites = ['Dream', 'joaillerie', 'Desk', 'Legend'];

// HTML entity decoder
const decodeHtml = (text) => {
    return text
        .replace(/&#8217;/g, "'")
        .replace(/&#8216;/g, "'")
        .replace(/&#8220;/g, '"')
        .replace(/&#8221;/g, '"')
        .replace(/&#8211;/g, '-')
        .replace(/&#8212;/g, '--')
        .replace(/&/g, '&')
        .replace(/"/g, '"')
        .replace(/&#038;/g, '&')
        .replace(/</g, '<')
        .replace(/>/g, '>');
};

sites.forEach(site => {
    const blogDir = path.join(__dirname, site, 'src', 'content', 'blog');
    if (!fs.existsSync(blogDir)) return;

    const files = fs.readdirSync(blogDir).filter(f => f.endsWith('.md'));

    files.forEach(file => {
        let filePath = path.join(blogDir, file);
        let content = fs.readFileSync(filePath, 'utf8');
        let changed = false;

        // 1. Fix broken frontmatter starting with -- instead of ---
        if (content.startsWith('--\n')) {
            content = content.replace(/^--\n/, '---\n');
            changed = true;
        }

        // 2. Decode entities ANYWHERE in frontmatter
        const fmMatch = content.match(/^---\n([\s\S]*?)\n---\n/);
        if (fmMatch) {
            let frontmatter = fmMatch[1];
            const decodedFm = decodeHtml(frontmatter);
            
            if (decodedFm !== frontmatter) {
                content = content.replace(fmMatch[1], decodedFm);
                changed = true;
            }
        }
        
        // Check body just in case the title appears decoded but some other meta field had it
        // Actually, sometimes the title in the HTML body inside <h1 class="wp-block-heading"> is NOT decoded!
        // We can just decode all instances of &#8217; in the whole file to be safe.
        const decodedContent = decodeHtml(content);
        if (decodedContent !== content) {
            content = decodedContent;
            changed = true;
        }

        if (changed) {
            fs.writeFileSync(filePath, content);
            console.log(`[${site}] Fixed frontmatter/entities in ${file}`);
        }
    });

    // 3. Fix main and .prose width in BlogPost.astro
    const layoutPath = path.join(__dirname, site, 'src', 'layouts', 'BlogPost.astro');
    if (fs.existsSync(layoutPath)) {
        let layoutContent = fs.readFileSync(layoutPath, 'utf8');
        let layoutChanged = false;
        
        // Update <main> styling
        if (layoutContent.includes('width: calc(100% - 2em);')) {
            layoutContent = layoutContent.replace(/main\s*\{\s*width: calc\(100% - 2em\);\s*max-width: 100%;\s*margin: 0;\s*\}/, 
                `main {\n\t\t\t\twidth: 75%;\n\t\t\t\tmax-width: none;\n\t\t\t\tmargin: 0 auto;\n\t\t\t}`);
            layoutChanged = true;
        }
        
        // Update .prose styling
        if (layoutContent.includes('width: 720px;')) {
            layoutContent = layoutContent.replace(/width: 720px;/, 'width: 100%;');
            layoutChanged = true;
        }
        if (layoutContent.includes('width: 75vw;')) {
            layoutContent = layoutContent.replace(/width: 75vw;/, 'width: 100%;');
            layoutChanged = true;
        }
        if (layoutContent.includes('max-width: calc(100% - 2em);')) {
            layoutContent = layoutContent.replace(/max-width: calc\(100% - 2em\);/, 'max-width: none;');
            layoutChanged = true;
        }
        
        // Fix global styles for tables
        if (layoutContent.includes('.prose table {')) {
            layoutContent = layoutContent.replace(/\.prose table {/g, ':global(.prose table) {');
            layoutContent = layoutContent.replace(/\.prose th,/g, ':global(.prose th),');
            layoutContent = layoutContent.replace(/\.prose td {/g, ':global(.prose td) {');
            layoutContent = layoutContent.replace(/\.prose th {/g, ':global(.prose th) {');
            layoutContent = layoutContent.replace(/\.prose tr:nth-child\(even\)/g, ':global(.prose tr:nth-child(even))');
            layoutChanged = true;
        }

        if (layoutChanged) {
            fs.writeFileSync(layoutPath, layoutContent);
            console.log(`[${site}] Updated BlogPost.astro width and global table styles.`);
        }
    }
});
