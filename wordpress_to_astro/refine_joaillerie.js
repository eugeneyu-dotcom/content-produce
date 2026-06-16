const fs = require('fs');
const path = require('path');

const joaillerieDir = path.join(__dirname, 'joaillerie', 'src', 'content', 'blog');
const mdFiles = fs.readdirSync(joaillerieDir).filter(f => f.endsWith('.md') || f.endsWith('.mdx'));

for (const file of mdFiles) {
    const filePath = path.join(joaillerieDir, file);
    let content = fs.readFileSync(filePath, 'utf-8');
    
    // Remove the old WordPress FAQ block entirely
    // The block usually starts with <div class="wp-block-uagb-faq... and ends with a matching </div> sequence
    // A robust way since we don't have a DOM parser is to remove everything from `<div class="wp-block-uagb-faq` up to the injected FAQ or end of file
    // Actually, it might be easier to use a regex to match the outer div
    
    let startIndex = content.indexOf('<div class="wp-block-uagb-faq');
    if (startIndex !== -1) {
        let endIndex = content.indexOf('<div class="faq-section"', startIndex);
        if (endIndex === -1) {
            // If our injected FAQ isn't there, maybe it ends at the end of the file
            endIndex = content.length;
        }
        
        // Remove the block
        content = content.slice(0, startIndex) + content.slice(endIndex);
    }

    // Now refine the styling of our injected FAQ to match Joaillerie elegance
    content = content.replace(/background-color: var\(--gray-light\)/g, 'background-color: #fdfaf6; border: 1px solid #eaddd3');
    content = content.replace(/color: var\(--accent-dark\)/g, 'color: #3b2c35; font-family: \'Playfair Display\', serif; font-size: 2.2em; font-weight: normal;');
    content = content.replace(/border-left: 4px solid var\(--accent\)/g, 'border-left: 4px solid #cda291');
    content = content.replace(/color: var\(--gray-dark\)/g, 'color: #4a3b42; font-family: \'Playfair Display\', serif; font-size: 1.3em;');
    content = content.replace(/color: #555;/g, 'color: #665b60; line-height: 1.6; background-color: #f8f1eb; padding: 1em; border-radius: 4px; margin-top: 0.5em; border: 1px solid #f0e6dd;');

    fs.writeFileSync(filePath, content, 'utf-8');
}

console.log('Cleaned up WP FAQ blocks and refined injected FAQ styles.');

// Also update global.css to be extremely Joaillerie-like
const cssPath = path.join(__dirname, 'joaillerie', 'src', 'styles', 'global.css');
if (fs.existsSync(cssPath)) {
    let css = fs.readFileSync(cssPath, 'utf-8');
    
    css = css.replace(/--accent: #b39ddb;/g, '--accent: #cda291;'); // elegant rose/gold
    css = css.replace(/--accent-dark: #7e57c2;/g, '--accent-dark: #8c7369;');
    css = css.replace(/--gray-light: 243, 238, 250;/g, '--gray-light: 253, 250, 246;'); // soft cream
    css = css.replace(/--gray-dark: 60, 45, 75;/g, '--gray-dark: 59, 44, 53;'); // deep warm grey/brown
    css = css.replace(/--bg-color: #faf9f6;/g, '--bg-color: #ffffff;'); // crisp white background
    
    // update a tags
    if (!css.includes('a {\n\tcolor: var(--accent-dark);')) {
        css = css.replace(/a \{\s*\}/, 'a {\n\tcolor: var(--accent-dark);\n\ttext-decoration: none;\n\tborder-bottom: 1px solid transparent;\n\ttransition: border-color 0.2s ease;\n}');
        css = css.replace(/a:hover \{\s*\}/, 'a:hover {\n\tborder-bottom: 1px solid var(--accent-dark);\n}');
    }

    fs.writeFileSync(cssPath, css, 'utf-8');
    console.log('Refined global.css colors');
}

// Update Header to match new elegance
const headerPath = path.join(__dirname, 'joaillerie', 'src', 'components', 'Header.astro');
if (fs.existsSync(headerPath)) {
    let header = fs.readFileSync(headerPath, 'utf-8');
    header = header.replace(/background-color: var\(--accent-dark, #7e57c2\);/, 'background-color: #3b2c35;'); // very dark top bar
    fs.writeFileSync(headerPath, header, 'utf-8');
    console.log('Refined Header.astro');
}
