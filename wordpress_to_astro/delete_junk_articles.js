const fs = require('fs');
const path = require('path');

const sites = ['Dream', 'joaillerie', 'Desk', 'Legend', 'bustling-bar', 'cyan-chaos', 'irregular-inclination'];
// Including the other folders just to keep the workspace clean, although they are mostly test sites.

const junkFiles = [
    'first-post.md',
    'second-post.md',
    'third-post.md',
    'markdown-style-guide.md',
    'using-mdx.mdx',
    'home.md',
    'home-2.md',
    'blog.md',
    'blog-2.md',
    'about-us.md',
    'a-propos.md',
    'privacy-policy.md',
    'politique-de-confidentialite.md',
    'contact-us.md',
    'disclaimer.md'
];

sites.forEach(site => {
    const blogDir = path.join(__dirname, site, 'src', 'content', 'blog');
    if (!fs.existsSync(blogDir)) return;

    const files = fs.readdirSync(blogDir);
    let deletedCount = 0;

    files.forEach(file => {
        if (junkFiles.includes(file)) {
            const filePath = path.join(blogDir, file);
            fs.unlinkSync(filePath);
            console.log(`[${site}] Deleted ${file}`);
            deletedCount++;
        }
    });

    if (deletedCount > 0) {
        console.log(`[${site}] Total deleted: ${deletedCount} junk files.`);
    }
});

console.log("Cleanup complete!");
