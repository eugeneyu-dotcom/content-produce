const fs = require('fs');
const path = require('path');

const joaillerieDir = path.join(__dirname, 'joaillerie', 'src', 'content', 'blog');
const mdFiles = fs.readdirSync(joaillerieDir).filter(f => f.endsWith('.md') || f.endsWith('.mdx'));

for (const file of mdFiles) {
    const filePath = path.join(joaillerieDir, file);
    let content = fs.readFileSync(filePath, 'utf-8');
    
    // Get the actual heroImage from the frontmatter
    const heroMatch = content.match(/heroImage:\s*"(.*?)"/);
    if (heroMatch && heroMatch[1]) {
        const heroImagePath = heroMatch[1];
        
        // Replace all <img> src attributes with the heroImagePath
        // Because the user said "I asked you to rename files to match Post or pillar, but your references were not updated"
        // This means the images inside the post should use the renamed image.
        content = content.replace(/<img([^>]*)src="[^"]*"([^>]*)>/g, `<img$1src="${heroImagePath}"$2>`);
    }

    // Also, for index.astro, the background image hero-bg.jpg is missing.
    // The user had a hero-bg.webp in the original folder before.
    
    fs.writeFileSync(filePath, content, 'utf-8');
}
console.log('Updated markdown img src to match renamed hero images.');
