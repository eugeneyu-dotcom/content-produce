const fs = require('fs');
const path = require('path');
const https = require('https');

const sites = ['Dream', 'joaillerie', 'Desk', 'Legend'];
const siteUrls = {
    'Dream': 'https://www.encyclopedia-of-dreams.com',
    'joaillerie': 'https://www.joaillerie-et-symbolique.com',
    'Desk': 'https://www.minimal-desk-studio.com',
    'Legend': 'https://www.global-urban-legends.com'
};

const fetchPostFromWP = (siteUrl, slug) => {
    return new Promise((resolve, reject) => {
        const url = `${siteUrl}/wp-json/wp/v2/posts?slug=${slug}`;
        https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    if (parsed && parsed.length > 0) {
                        resolve(parsed[0]);
                    } else {
                        resolve(null);
                    }
                } catch (e) {
                    reject(e);
                }
            });
        }).on('error', e => reject(e));
    });
};

const run = async () => {
    for (const site of sites) {
        const blogDir = path.join(__dirname, site, 'src', 'content', 'blog');
        if (!fs.existsSync(blogDir)) continue;
        
        const files = fs.readdirSync(blogDir).filter(f => f.endsWith('.md'));
        for (const file of files) {
            const filePath = path.join(blogDir, file);
            let content = fs.readFileSync(filePath, 'utf8');
            
            if (content.includes('This is migrated content for the keyword')) {
                console.log(`[${site}] Found placeholder in ${file}. Fetching real content...`);
                
                const fmMatch = content.match(/^---\n([\s\S]*?)\n---\n/);
                if (!fmMatch) continue;
                let frontmatter = fmMatch[1];
                
                const slugMatch = frontmatter.match(/^slug:\s*"?([^"\n]+)"?/m);
                const slug = slugMatch ? slugMatch[1] : file.replace('.md', '');
                
                try {
                    const wpPost = await fetchPostFromWP(siteUrls[site], slug);
                    if (wpPost && wpPost.content && wpPost.content.rendered) {
                        let newBody = wpPost.content.rendered;
                        
                        // Check if we need to extract a hero image
                        if (!frontmatter.includes('heroImage:')) {
                            const imgMatch = newBody.match(/<img[^>]+src="([^"]+)"/i);
                            if (imgMatch) {
                                frontmatter += `\nheroImage: "${imgMatch[1]}"`;
                            }
                        }
                        
                        content = `---\n${frontmatter}\n---\n\n${newBody}`;
                        fs.writeFileSync(filePath, content);
                        console.log(`[${site}] Successfully restored real content for ${file}`);
                    } else {
                        console.log(`[${site}] Warning: Could not find WP post for slug ${slug}`);
                    }
                } catch (err) {
                    console.error(`[${site}] Error fetching slug ${slug}:`, err);
                }
            }
        }
    }
};

run();
