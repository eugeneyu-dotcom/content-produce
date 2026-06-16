const fs = require('fs');
const path = require('path');

const sites = ['Desk', 'Dream', 'Legend'];

async function run() {
    for (const site of sites) {
        console.log(`\n=== Patching index.astro for ${site} ===`);
        
        const indexPath = path.join(__dirname, site, 'src/pages/index.astro');
        if (fs.existsSync(indexPath)) {
            let index = fs.readFileSync(indexPath, 'utf-8');
            
            // Inject findImage helper
            if (!index.includes('findImage(')) {
                index = index.replace(/import { SITE_TITLE, SITE_DESCRIPTION } from '\.\.\/consts';/, `import { SITE_TITLE, SITE_DESCRIPTION } from '../consts';\nimport fs from 'node:fs';\nimport path from 'node:path';\n\nfunction findImage(basePath) {\n\tconst exts = ['.webp', '.jpg', '.png', '.jpeg'];\n\tconst publicDir = path.join(process.cwd(), 'public');\n\tlet base = basePath;\n\tif (basePath.match(/\\.(jpg|jpeg|png|webp)$/i)) {\n\t\tbase = basePath.replace(/\\.(jpg|jpeg|png|webp)$/i, '');\n\t}\n\tfor (const ext of exts) {\n\t\tif (fs.existsSync(path.join(publicDir, base + ext))) {\n\t\t\treturn base + ext;\n\t\t}\n\t}\n\treturn '';\n}`);
                
                // Update article map
                index = index.replace(
                    /const bgImage = post\.data\.heroImage \? post\.data\.heroImage : `\/media-images\/post-\$\{post\.slug\}\.jpg`;/,
                    `const basePath = post.data.heroImage ? post.data.heroImage : \`/media-images/post-\${post.slug}\`;\n\t\t\t\t\t\tconst bgImage = findImage(basePath);`
                );

                // Update article card style
                index = index.replace(
                    /<li class="article-card" style={`background-image: url\('\$\{bgImage\}'\);`}>/g,
                    `<li class="article-card" style={bgImage ? \`background-image: url('\${bgImage}');\` : ''}>`
                );

                fs.writeFileSync(indexPath, index, 'utf-8');
                console.log('Updated index.astro');
            }
        }
    }
}

run().catch(console.error);
