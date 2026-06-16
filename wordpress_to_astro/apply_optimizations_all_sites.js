const fs = require('fs');
const path = require('path');

const sites = [
    { name: 'Desk', url: 'https://www.minimal-desk-studio.com' },
    { name: 'Dream', url: 'https://www.encyclopedia-of-dreams.com' },
    { name: 'Legend', url: 'https://www.global-urban-legends.com' }
];

async function fetchFromWP(siteUrl, type) {
    let allData = [];
    let page = 1;
    let totalPages = 1;
    while (page <= totalPages) {
        try {
            const res = await fetch(`${siteUrl}/wp-json/wp/v2/${type}?_embed=1&per_page=100&page=${page}`);
            if (!res.ok) break;
            if (page === 1) {
                const totalPagesHeader = res.headers.get('x-wp-totalpages');
                if (totalPagesHeader) totalPages = parseInt(totalPagesHeader, 10);
            }
            const data = await res.json();
            allData = allData.concat(data);
            page++;
        } catch (err) {
            break;
        }
    }
    return allData;
}

async function run() {
    for (const site of sites) {
        console.log(`\n=== Processing ${site.name} ===`);
        
        // 1. Move media-images
        const oldMediaDir = path.join(__dirname, site.name, 'media-images');
        const newMediaDir = path.join(__dirname, site.name, 'public/media-images');
        if (fs.existsSync(oldMediaDir)) {
            if (!fs.existsSync(newMediaDir)) fs.mkdirSync(newMediaDir, { recursive: true });
            const files = fs.readdirSync(oldMediaDir);
            for (const file of files) fs.renameSync(path.join(oldMediaDir, file), path.join(newMediaDir, file));
            fs.rmdirSync(oldMediaDir);
        }

        // 2. Fetch WP media and update markdown heroImage
        const posts = await fetchFromWP(site.url, 'posts');
        const outDir = path.join(__dirname, site.name, 'src/content/blog');
        for (const post of posts) {
            const slug = post.slug;
            let heroImage = '';
            if (post._embedded && post._embedded['wp:featuredmedia'] && post._embedded['wp:featuredmedia'][0]) {
                const media = post._embedded['wp:featuredmedia'][0];
                if (media.source_url) {
                    const urlObj = new URL(media.source_url);
                    heroImage = urlObj.pathname.replace('/wp-content/uploads', '/media-images');
                }
            }
            if (heroImage && fs.existsSync(path.join(outDir, `${slug}.md`))) {
                let mdContent = fs.readFileSync(path.join(outDir, `${slug}.md`), 'utf-8');
                if (!mdContent.includes('heroImage:')) {
                    mdContent = mdContent.replace('---', `---\nheroImage: "${heroImage}"`);
                } else {
                    mdContent = mdContent.replace(/heroImage:.*(\r?\n)/, `heroImage: "${heroImage}"$1`);
                }
                fs.writeFileSync(path.join(outDir, `${slug}.md`), mdContent, 'utf-8');
            }
        }

        // 3. Rename images
        const files = fs.readdirSync(outDir).filter(f => f.endsWith('.md') || f.endsWith('.mdx'));
        for (const file of files) {
            const filePath = path.join(outDir, file);
            let content = fs.readFileSync(filePath, 'utf-8');
            const heroMatch = content.match(/heroImage:\s*"(.*?)"/);
            const slugMatch = content.match(/slug:\s*"(.*?)"/);
            
            if (heroMatch && heroMatch[1] && slugMatch && slugMatch[1]) {
                let oldPath = heroMatch[1];
                const slug = slugMatch[1];
                if (oldPath.includes(slug)) continue;

                const publicOldPath = path.join(__dirname, site.name, 'public', oldPath);
                let actualPath = null;
                let extToUse = null;
                let basePath = publicOldPath;
                if (publicOldPath.match(/\.(jpg|jpeg|png|webp)$/i)) basePath = publicOldPath.replace(/\.(jpg|jpeg|png|webp)$/i, '');

                for (const ext of ['.webp', '.jpg', '.png', '.jpeg']) {
                    if (fs.existsSync(basePath + ext)) {
                        actualPath = basePath + ext;
                        extToUse = ext;
                        break;
                    }
                }

                if (actualPath) {
                    const newRelativeDir = `/media-images/posts`;
                    const newPublicDir = path.join(__dirname, site.name, 'public', newRelativeDir);
                    if (!fs.existsSync(newPublicDir)) fs.mkdirSync(newPublicDir, { recursive: true });
                    const newFileName = `${slug}${extToUse}`;
                    fs.copyFileSync(actualPath, path.join(newPublicDir, newFileName));
                    content = content.replace(heroMatch[0], `heroImage: "${newRelativeDir}/${slug}${extToUse}"`);
                    fs.writeFileSync(filePath, content, 'utf-8');
                }
            }
        }

        // 4. BaseHead.astro
        const baseHeadPath = path.join(__dirname, site.name, 'src/components/BaseHead.astro');
        if (fs.existsSync(baseHeadPath)) {
            let baseHead = fs.readFileSync(baseHeadPath, 'utf-8');
            baseHead = baseHead.replace(/<link rel="icon" type="image\/svg\+xml" href="\/favicon.svg" \/>/g, '<link rel="icon" type="image/webp" href="/media-images/Logo.webp" />');
            fs.writeFileSync(baseHeadPath, baseHead, 'utf-8');
        }

        // 5. Header.astro
        const headerPath = path.join(__dirname, site.name, 'src/components/Header.astro');
        if (fs.existsSync(headerPath)) {
            let header = fs.readFileSync(headerPath, 'utf-8');
            if (!header.includes('/media-images/Logo.webp')) {
                // simple replacement based on default astro header
                header = header.replace(/<a href="\/".*?>\s*<h2(.*?)>(.*?)<\/h2>\s*<\/a>/s, `<a href="/" class="logo-link">\n\t\t\t\t<img src="/media-images/Logo.webp" alt="$2 Logo" class="site-logo" />\n\t\t\t\t<h2$1>$2</h2>\n\t\t\t</a>`);
                if (!header.includes('.logo-link')) {
                    header = header.replace(/<style>/, `<style>\n\t.logo-link {\n\t\tdisplay: flex;\n\t\talign-items: center;\n\t\ttext-decoration: none;\n\t\tgap: 1em;\n\t}\n\t.site-logo {\n\t\theight: 60px;\n\t\twidth: auto;\n\t\tborder-radius: 50%;\n\t\tobject-fit: cover;\n\t}\n`);
                }
                fs.writeFileSync(headerPath, header, 'utf-8');
            }
        }

        // 6. content.config.ts
        const configPath = path.join(__dirname, site.name, 'src/content.config.ts');
        if (fs.existsSync(configPath)) {
            let config = fs.readFileSync(configPath, 'utf-8');
            config = config.replace(/heroImage:\s*z\.optional\(image\(\)\),/g, 'heroImage: z.string().optional(),');
            config = config.replace(/schema:\s*\(\{\s*image\s*\}\)\s*=>/g, 'schema: () =>');
            fs.writeFileSync(configPath, config, 'utf-8');
        }

        // 7. BlogPost.astro
        const blogPostPath = path.join(__dirname, site.name, 'src/layouts/BlogPost.astro');
        if (fs.existsSync(blogPostPath)) {
            let blogPost = fs.readFileSync(blogPostPath, 'utf-8');
            
            // Inject findImage helper
            if (!blogPost.includes('findImage')) {
                blogPost = blogPost.replace(/const { title, description, pubDate, updatedDate, heroImage } = Astro.props;/g, `const { title, description, pubDate, updatedDate, heroImage } = Astro.props;\nimport fs from 'node:fs';\nimport path from 'node:path';\nfunction findImage(basePath: string) {\n\tif (!basePath) return '';\n\tconst exts = ['.webp', '.jpg', '.png', '.jpeg'];\n\tconst publicDir = path.join(process.cwd(), 'public');\n\tlet base = basePath;\n\tif (basePath.match(/\\.(jpg|jpeg|png|webp)$/i)) {\n\t\tbase = basePath.replace(/\\.(jpg|jpeg|png|webp)$/i, '');\n\t}\n\tfor (const ext of exts) {\n\t\tif (fs.existsSync(path.join(publicDir, base + ext))) {\n\t\t\treturn base + ext;\n\t\t}\n\t}\n\treturn '';\n}\nconst resolvedHeroImage = findImage(heroImage || '');`);
                
                // Replace Image component with standard img
                blogPost = blogPost.replace(/{heroImage && <Image.*?>}/, `{resolvedHeroImage && <img width="1020" height="510" src={resolvedHeroImage} alt={title || "Hero Image"} onerror="this.style.display='none'" />}`);
                fs.writeFileSync(blogPostPath, blogPost, 'utf-8');
            }
        }

        console.log(`Optimizations applied for ${site.name}`);
    }
}

run().catch(console.error);
