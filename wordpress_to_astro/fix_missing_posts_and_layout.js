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

const searchPostFromWP = (siteUrl, query) => {
    return new Promise((resolve, reject) => {
        const url = `${siteUrl}/wp-json/wp/v2/posts?search=${encodeURIComponent(query)}`;
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
    // 1. Fetch missing content by title/keyword
    for (const site of sites) {
        const blogDir = path.join(__dirname, site, 'src', 'content', 'blog');
        if (!fs.existsSync(blogDir)) continue;
        
        const files = fs.readdirSync(blogDir).filter(f => f.endsWith('.md'));
        for (const file of files) {
            const filePath = path.join(blogDir, file);
            let content = fs.readFileSync(filePath, 'utf8');
            
            if (content.includes('This is migrated content for the keyword')) {
                const fmMatch = content.match(/^---\n([\s\S]*?)\n---\n/);
                if (!fmMatch) continue;
                let frontmatter = fmMatch[1];
                
                // Get title or slug to search
                const titleMatch = frontmatter.match(/^title:\s*"?([^"\n]+)"?/m);
                const title = titleMatch ? titleMatch[1] : '';
                
                const kwMatch = content.match(/This is migrated content for the keyword \*\*(.*?)\*\*/);
                const keyword = kwMatch ? kwMatch[1] : title;
                
                const searchQuery = keyword || title;
                if (!searchQuery) continue;
                
                console.log(`[${site}] Found placeholder in ${file}. Searching WP for '${searchQuery}'...`);
                
                try {
                    const wpPost = await searchPostFromWP(siteUrls[site], searchQuery);
                    if (wpPost && wpPost.content && wpPost.content.rendered) {
                        let newBody = wpPost.content.rendered;
                        
                        // Extract hero image
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
                        console.log(`[${site}] Warning: Could not find WP post for '${searchQuery}'`);
                    }
                } catch (err) {
                    console.error(`[${site}] Error searching for '${searchQuery}':`, err);
                }
            }
        }
    }
    
    // 2. Update BlogPost.astro layout (Width 75vw & Table Styles)
    for (const site of sites) {
        const layoutPath = path.join(__dirname, site, 'src', 'layouts', 'BlogPost.astro');
        if (!fs.existsSync(layoutPath)) continue;
        
        let content = fs.readFileSync(layoutPath, 'utf8');
        
        // Update width
        content = content.replace(/width:\s*720px;/g, 'width: 75vw;');
        
        // Add table styles if not present
        if (!content.includes('.prose table {')) {
            const tableStyles = `
			.prose table {
				width: 100%;
				border-collapse: collapse;
				margin: 2em 0;
				font-size: 0.95em;
			}
			.prose th, .prose td {
				border: 1px solid rgba(128, 128, 128, 0.2);
				padding: 12px 16px;
				text-align: left;
			}
			.prose th {
				background-color: var(--accent, #ec4899);
				color: #fff;
				font-weight: bold;
			}
			.prose tr:nth-child(even) {
				background-color: rgba(128, 128, 128, 0.05);
			}
`;
            // Insert table styles right after .prose block
            content = content.replace(/(\.prose\s*\{[\s\S]*?\})/, `$1${tableStyles}`);
            fs.writeFileSync(layoutPath, content);
            console.log(`[${site}] Updated BlogPost.astro with 75vw width and Table styles.`);
        }
    }
    console.log("Done!");
};

run();
