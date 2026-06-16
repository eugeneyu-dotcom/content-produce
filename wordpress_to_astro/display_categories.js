const fs = require('fs');
const path = require('path');

const sites = ['Dream', 'joaillerie', 'Desk', 'Legend'];

sites.forEach(site => {
    // Update BlogPost.astro
    const layoutPath = path.join(__dirname, site, 'src', 'layouts', 'BlogPost.astro');
    if (fs.existsSync(layoutPath)) {
        let content = fs.readFileSync(layoutPath, 'utf8');
        
        // Ensure category is extracted from props
        if (!content.includes('const { title, description, pubDate, updatedDate, heroImage, category } = Astro.props;')) {
            content = content.replace(
                /const { title, description, pubDate, updatedDate, heroImage } = Astro.props;/g, 
                'const { title, description, pubDate, updatedDate, heroImage, category } = Astro.props;'
            );
        }
        
        // Add category tag to the UI, right above the title
        if (!content.includes('<div class="article-category"')) {
            content = content.replace(
                /<div class="title">/,
                `{category && (\n\t\t\t\t\t\t<div class="article-category" style="text-align: center; margin-bottom: 0.5em;">\n\t\t\t\t\t\t\t<span style="background: var(--accent, #ec4899); color: #fff; padding: 4px 12px; border-radius: 20px; font-size: 0.85em; text-transform: uppercase; letter-spacing: 1px;">{category}</span>\n\t\t\t\t\t\t</div>\n\t\t\t\t\t)}\n\t\t\t\t\t<div class="title">`
            );
            fs.writeFileSync(layoutPath, content);
            console.log(`[${site}] Added category to BlogPost.astro`);
        }
    }
    
    // Update blog/index.astro
    const blogIndexPath = path.join(__dirname, site, 'src', 'pages', 'blog', 'index.astro');
    if (fs.existsSync(blogIndexPath)) {
        let content = fs.readFileSync(blogIndexPath, 'utf8');
        
        // Add category tag to the UI, inside the link, above the title
        if (!content.includes('<div class="post-category"')) {
            content = content.replace(
                /<h4 class="title"/g,
                `{post.data.category && (\n\t\t\t\t\t\t\t\t\t\t<div class="post-category" style="margin-bottom: 0.5em; font-size: 0.75em; text-transform: uppercase; letter-spacing: 1px; color: var(--accent, #ec4899); font-weight: bold;">{post.data.category}</div>\n\t\t\t\t\t\t\t\t\t)}\n\t\t\t\t\t\t\t\t\t<h4 class="title"`
            );
            fs.writeFileSync(blogIndexPath, content);
            console.log(`[${site}] Added category to blog/index.astro`);
        }
    }
});
