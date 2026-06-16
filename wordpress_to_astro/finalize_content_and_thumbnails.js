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

const parseCSV = (content) => {
    const lines = content.split('\n').filter(line => line.trim() !== '');
    const headers = lines[0].split(',').map(h => h.trim());
    
    const result = [];
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        let current = '';
        let inQuotes = false;
        const row = [];
        
        for (let j = 0; j < line.length; j++) {
            const char = line[j];
            if (char === '"' && line[j+1] === '"') {
                current += '"';
                j++;
            } else if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                row.push(current);
                current = '';
            } else {
                current += char;
            }
        }
        row.push(current);
        
        if (row.length === headers.length) {
            const obj = {};
            headers.forEach((h, idx) => obj[h] = row[idx]);
            result.push(obj);
        }
    }
    return result;
};

// 1. Build Mappings from N8N
const n8nPath = path.join(__dirname, 'N8N_work - Workflow_Config .csv');
const n8nContent = fs.readFileSync(n8nPath, 'utf8');
const n8nRows = parseCSV(n8nContent);

const apiKeyToSlug = {};
const keywordToSlug = {};

n8nRows.forEach(row => {
    const apiKey = row['API Key'] ? row['API Key'].trim() : '';
    const kw = row['Keyword'] ? row['Keyword'].trim() : '';
    const postUrl = row['Post_Url'] ? row['Post_Url'].trim() : '';
    
    if (postUrl) {
        const match = postUrl.match(/https?:\/\/[^\/]+\/(.+?)[\/]?$/);
        if (match) {
            const realSlug = match[1];
            if (apiKey) apiKeyToSlug[apiKey] = realSlug;
            if (kw) keywordToSlug[kw] = realSlug;
        }
    }
});

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
            let currentSlug = file.replace('.md', '');
            let filePath = path.join(blogDir, file);
            let content = fs.readFileSync(filePath, 'utf8');
            
            // Extract frontmatter
            const fmMatch = content.match(/^---\n([\s\S]*?)\n---\n/);
            if (!fmMatch) continue;
            let frontmatter = fmMatch[1];
            
            // Attempt to find real slug
            let realSlug = currentSlug;
            if (apiKeyToSlug[currentSlug]) {
                realSlug = apiKeyToSlug[currentSlug];
            } else if (keywordToSlug[currentSlug]) {
                realSlug = keywordToSlug[currentSlug];
            }
            
            let isRenamed = false;
            // 2. Rename file if needed
            if (realSlug !== currentSlug) {
                const newFilePath = path.join(blogDir, `${realSlug}.md`);
                // Move file
                fs.renameSync(filePath, newFilePath);
                filePath = newFilePath;
                currentSlug = realSlug;
                isRenamed = true;
                console.log(`[${site}] Renamed ${file} to ${realSlug}.md`);
            }
            
            // 3. Restore content if it has placeholder
            let body = content.slice(fmMatch[0].length);
            if (body.includes('This is migrated content for the keyword') || isRenamed) {
                // If it was renamed, it might be a placeholder or it might just need real content fetch
                if (body.includes('This is migrated content for the keyword')) {
                    console.log(`[${site}] Fetching real content for ${realSlug}...`);
                    try {
                        const wpPost = await fetchPostFromWP(siteUrls[site], realSlug);
                        if (wpPost && wpPost.content && wpPost.content.rendered) {
                            body = wpPost.content.rendered;
                            console.log(`[${site}] Successfully restored real content for ${realSlug}`);
                        } else {
                            console.log(`[${site}] Warning: Could not find WP post for slug ${realSlug}`);
                        }
                    } catch (err) {
                        console.error(`[${site}] Error fetching slug ${realSlug}:`, err);
                    }
                }
            }
            
            // 4. Update heroImage and slug in frontmatter
            // We force heroImage to point to the local media-images file!
            const localImageSrc = `/media-images/posts/${realSlug}.png`;
            
            // Replace heroImage if exists, else add it
            if (frontmatter.includes('heroImage:')) {
                frontmatter = frontmatter.replace(/heroImage:\s*".*?"/g, `heroImage: "${localImageSrc}"`);
            } else {
                frontmatter += `\nheroImage: "${localImageSrc}"`;
            }
            
            // Replace slug
            if (frontmatter.includes('slug:')) {
                frontmatter = frontmatter.replace(/slug:\s*".*?"/g, `slug: "${realSlug}"`);
            } else {
                frontmatter += `\nslug: "${realSlug}"`;
            }
            
            // Save file
            content = `---\n${frontmatter}\n---\n${body}`;
            fs.writeFileSync(filePath, content);
        }
        
        // 5. Update keyword links in Category pages to point to realSlug
        const categoryDir = path.join(__dirname, site, 'src', 'pages', 'category');
        if (fs.existsSync(categoryDir)) {
            const catFiles = fs.readdirSync(categoryDir).filter(f => f.endsWith('.astro'));
            catFiles.forEach(f => {
                const catPath = path.join(categoryDir, f);
                let catContent = fs.readFileSync(catPath, 'utf8');
                let changed = false;
                
                // Replace old N8N API Key slugs with real slugs in links
                Object.keys(apiKeyToSlug).forEach(apiKey => {
                    const rSlug = apiKeyToSlug[apiKey];
                    const linkPattern = new RegExp(`href="/blog/${apiKey}/"`, 'g');
                    if (catContent.match(linkPattern)) {
                        catContent = catContent.replace(linkPattern, `href="/blog/${rSlug}/"`);
                        changed = true;
                    }
                });
                
                if (changed) {
                    fs.writeFileSync(catPath, catContent);
                    console.log(`[${site}] Updated keyword links in category ${f}`);
                }
            });
        }
    }
    console.log("Done finalizing content and thumbnails!");
};

run();
