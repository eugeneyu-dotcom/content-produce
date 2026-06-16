const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

// Parse CSV helper
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

const sites = ['Dream', 'joaillerie', 'Desk', 'Legend'];
const siteMap = {
    'Dream Interpretation': 'Dream',
    'Joaillerie et Symbolique': 'joaillerie',
    'Joaillerie': 'joaillerie',
    'ミニマリスト・デスクセットアップ': 'Desk',
    'Global Urban Legends Analysis': 'Legend'
};

const siteUrls = {
    'Dream': 'https://www.encyclopedia-of-dreams.com',
    'joaillerie': 'https://www.joaillerie-et-symbolique.com',
    'Desk': 'https://www.minimal-desk-studio.com',
    'Legend': 'https://www.global-urban-legends.com'
};

// 1. Build Category map from generated Astro files
// categoryMap[site][dim] = categorySlug
// oldPillarSlugs[site][oldSlug] = categorySlug
const categoryMap = {}; 
const oldPillarSlugs = {}; 

sites.forEach(site => {
    categoryMap[site] = {};
    oldPillarSlugs[site] = {};
    
    const categoryDir = path.join(__dirname, site, 'src', 'pages', 'category');
    if (fs.existsSync(categoryDir)) {
        const files = fs.readdirSync(categoryDir).filter(f => f.endsWith('.astro'));
        files.forEach(f => {
            const content = fs.readFileSync(path.join(categoryDir, f), 'utf8');
            const match = content.match(/<h1>(.*?)<\/h1>/);
            if (match) {
                const dim = match[1];
                const slug = f.replace('.astro', '');
                categoryMap[site][dim] = slug;
            }
        });
    }
    
    // Also read backup_categories to map old slug -> new category slug
    const backupDir = path.join(__dirname, site, 'backup_categories');
    if (fs.existsSync(backupDir)) {
        const files = fs.readdirSync(backupDir).filter(f => f.endsWith('.md'));
        files.forEach(f => {
            const oldSlug = f.replace('.md', '');
            const content = fs.readFileSync(path.join(backupDir, f), 'utf8');
            const match = content.match(/^title:\s*"?([^"]+)"?/m);
            // We can match by finding which category has similar words
            let bestMatch = null;
            let maxScore = -1;
            Object.keys(categoryMap[site]).forEach(dim => {
                let score = 0;
                const title = match ? match[1] : '';
                const dimWords = dim.split(/[\s,()]+/).filter(w => w.length > 3).map(w => w.toLowerCase());
                dimWords.forEach(w => {
                    if (oldSlug.toLowerCase().includes(w)) score += 2;
                    if (title.toLowerCase().includes(w)) score += 2;
                });
                if (score > maxScore) {
                    maxScore = score;
                    bestMatch = dim;
                }
            });
            if (bestMatch && maxScore > 0) {
                oldPillarSlugs[site][oldSlug] = categoryMap[site][bestMatch];
            }
        });
    }
});

// 2. Parse SOP2-2_Keyword to get Keyword -> Pillar Dimension
const sop22Path = path.join(__dirname, 'SOP2-2_Keyword.csv');
const sop22Rows = parseCSV(fs.readFileSync(sop22Path, 'utf8'));
const keywordToDim = {}; // keyword -> dim
const dimToKeywords = {}; // site -> dim -> [keywords]
sop22Rows.forEach(row => {
    const site = siteMap[row['Site'] ? row['Site'].trim() : ''];
    if (!site) return;
    const kw = row['Keyword'] ? row['Keyword'].trim() : '';
    const dim = row['Pillar Post Dimension'] ? row['Pillar Post Dimension'].trim() : '';
    if (kw && dim) {
        keywordToDim[kw] = dim;
        if (!dimToKeywords[site]) dimToKeywords[site] = {};
        if (!dimToKeywords[site][dim]) dimToKeywords[site][dim] = [];
        dimToKeywords[site][dim].push(kw);
    }
});

// 3. Parse N8N_work
const n8nPath = path.join(__dirname, 'N8N_work - Workflow_Config .csv');
const n8nRows = parseCSV(fs.readFileSync(n8nPath, 'utf8'));
const keywordToWpSlug = {}; 
const wpSlugToKeyword = {};
n8nRows.forEach(row => {
    const kw = row['Keyword'] ? row['Keyword'].trim() : '';
    const postUrl = row['Post_Url'] ? row['Post_Url'].trim() : '';
    if (kw && postUrl) {
        const match = postUrl.match(/https?:\/\/[^\/]+\/(.+?)[\/]?$/);
        if (match) {
            keywordToWpSlug[kw] = match[1];
            wpSlugToKeyword[match[1]] = kw;
        }
    }
});

// 4. Gather local MD files and map slugs
const localFiles = {}; // site -> localSlug -> filename
const slugToLocal = {}; // site -> wpSlug -> localSlug
const keywordToLocalSlug = {}; // keyword -> localSlug
sites.forEach(site => {
    localFiles[site] = {};
    slugToLocal[site] = {};
    const blogDir = path.join(__dirname, site, 'src', 'content', 'blog');
    if (!fs.existsSync(blogDir)) return;
    
    fs.readdirSync(blogDir).filter(f => f.endsWith('.md')).forEach(f => {
        const localSlug = f.replace('.md', '');
        localFiles[site][localSlug] = f;
        
        // Let's check frontmatter slug
        const content = fs.readFileSync(path.join(blogDir, f), 'utf8');
        const fmMatch = content.match(/^slug:\s*"?([^"\n]+)"?/m);
        const frontmatterSlug = fmMatch ? fmMatch[1] : localSlug;
        
        // Map wpSlug to localSlug
        slugToLocal[site][frontmatterSlug] = localSlug;
        slugToLocal[site][localSlug] = localSlug;
        
        // If we can identify keyword
        const kw = wpSlugToKeyword[frontmatterSlug] || wpSlugToKeyword[localSlug];
        if (kw) {
            keywordToLocalSlug[kw] = localSlug;
        }
    });
});

// Helper to extract slug from URL
const extractSlug = (urlStr, site) => {
    const siteUrl = siteUrls[site];
    let slug = '';
    if (urlStr.startsWith(siteUrl)) {
        slug = urlStr.replace(siteUrl, '').split('?')[0].replace(/^\/+|\/+$/g, '');
    } else if (urlStr.startsWith('/')) {
        slug = urlStr.split('?')[0].replace(/^\/+|\/+$/g, '');
    }
    // Remove "blog/" prefix if present
    if (slug.startsWith('blog/')) slug = slug.replace('blog/', '');
    return slug;
};

// 5. Process MD files: inject heroImage, category, fix links
sites.forEach(site => {
    const blogDir = path.join(__dirname, site, 'src', 'content', 'blog');
    if (!fs.existsSync(blogDir)) return;
    
    fs.readdirSync(blogDir).filter(f => f.endsWith('.md')).forEach(f => {
        const filePath = path.join(blogDir, f);
        let content = fs.readFileSync(filePath, 'utf8');
        const localSlug = f.replace('.md', '');
        
        // Determine Keyword and Category
        const kw = wpSlugToKeyword[localSlug] || Object.keys(keywordToLocalSlug).find(k => keywordToLocalSlug[k] === localSlug);
        let category = '';
        if (kw && keywordToDim[kw]) {
            category = keywordToDim[kw];
        }
        
        // Separate frontmatter
        const fmMatch = content.match(/^---\n([\s\S]*?)\n---\n/);
        if (!fmMatch) return;
        
        let frontmatter = fmMatch[1];
        let body = content.slice(fmMatch[0].length);
        
        // Extract heroImage if not present in frontmatter
        let heroImage = '';
        if (!frontmatter.includes('heroImage:')) {
            const imgMatch = body.match(/<img[^>]+src="([^"]+)"/i);
            if (imgMatch) {
                heroImage = imgMatch[1];
            }
        }
        
        // Update frontmatter
        let newFm = frontmatter;
        if (heroImage && !newFm.includes('heroImage:')) {
            newFm += `\nheroImage: "${heroImage}"`;
        }
        if (category && !newFm.includes('category:')) {
            newFm += `\ncategory: "${category}"`;
        }
        
        // Fix internal links in body
        // Match <a href="...">
        const linkRegex = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>/gi;
        body = body.replace(linkRegex, (match, url) => {
            const slug = extractSlug(url, site);
            if (slug) {
                // Check if it's an old pillar post
                if (oldPillarSlugs[site][slug]) {
                    const newUrl = `/category/${oldPillarSlugs[site][slug]}/`;
                    return match.replace(url, newUrl);
                }
                // Check if it's a known blog post
                if (slugToLocal[site][slug]) {
                    const newUrl = `/blog/${slugToLocal[site][slug]}/`;
                    return match.replace(url, newUrl);
                }
            }
            return match; // keep original if no match
        });
        
        // Write back
        content = `---\n${newFm}\n---\n${body}`;
        fs.writeFileSync(filePath, content);
    });
    console.log(`[${site}] Fixed blog posts (thumbnails, categories, internal links)`);
});

// 6. Update src/content.config.ts
sites.forEach(site => {
    const configPath = path.join(__dirname, site, 'src', 'content.config.ts');
    if (fs.existsSync(configPath)) {
        let content = fs.readFileSync(configPath, 'utf8');
        if (!content.includes('category: z.string().optional()')) {
            content = content.replace(/heroImage: z\.string\(\)\.optional\(\),/, "heroImage: z.string().optional(),\n\t\t\tcategory: z.string().optional(),");
            fs.writeFileSync(configPath, content);
            console.log(`[${site}] Updated content.config.ts with category field`);
        }
    }
});

// 7. Update Category pages Keyword Links
sites.forEach(site => {
    const categoryDir = path.join(__dirname, site, 'src', 'pages', 'category');
    if (!fs.existsSync(categoryDir)) return;
    
    fs.readdirSync(categoryDir).filter(f => f.endsWith('.astro')).forEach(f => {
        const filePath = path.join(categoryDir, f);
        let content = fs.readFileSync(filePath, 'utf8');
        
        // Extract dim title
        const titleMatch = content.match(/<h1>(.*?)<\/h1>/);
        if (!titleMatch) return;
        const dimTitle = titleMatch[1];
        
        const keywords = dimToKeywords[site]?.[dimTitle] || [];
        if (keywords.length > 0) {
            let keywordsHtml = `
<section class="category-keywords" style="margin: 40px 0; padding: 20px; border-top: 1px solid rgba(255,255,255,0.1);">
    <h3 style="margin-bottom: 20px; font-size: 1.3rem;">Related Keywords</h3>
    <div style="display: flex; flex-wrap: wrap; gap: 10px;">
`;
            keywords.forEach(kw => {
                const localSlug = keywordToLocalSlug[kw];
                // Check if file actually exists
                const fileExists = localSlug && localFiles[site][localSlug];
                
                if (fileExists) {
                    keywordsHtml += `        <a href="/blog/${localSlug}/" class="keyword-btn active" style="padding: 8px 16px; background-color: var(--accent, #ec4899); color: #fff; text-decoration: none; border-radius: 4px; font-size: 0.95rem; transition: opacity 0.2s;">#${kw}</a>\n`;
                } else {
                    keywordsHtml += `        <span class="keyword-btn pending" style="padding: 8px 16px; background-color: #4a4a4a; color: #a0a0a0; border-radius: 4px; font-size: 0.95rem; cursor: not-allowed;">#${kw}</span>\n`;
                }
            });
            keywordsHtml += `    </div>\n</section>`;
            
            // Replace in category file
            const kwRegex = /<section class="category-keywords"[\s\S]*?<\/section>/;
            if (content.match(kwRegex)) {
                content = content.replace(kwRegex, keywordsHtml);
                fs.writeFileSync(filePath, content);
            }
        }
    });
    console.log(`[${site}] Updated category pages keyword links`);
});

// 8. Update Home pages (index.astro) Pillar Links
sites.forEach(site => {
    const indexPath = path.join(__dirname, site, 'src', 'pages', 'index.astro');
    if (!fs.existsSync(indexPath)) return;
    
    let content = fs.readFileSync(indexPath, 'utf8');
    let changed = false;
    
    // Find all pillar links /blog/old-slug and replace with /category/new-slug
    Object.keys(oldPillarSlugs[site]).forEach(oldSlug => {
        const newSlug = oldPillarSlugs[site][oldSlug];
        const linkPattern1 = new RegExp(`href="/blog/${oldSlug}"`, 'g');
        const linkPattern2 = new RegExp(`link:\\s*["']/blog/${oldSlug}["']`, 'g');
        
        if (content.match(linkPattern1)) {
            content = content.replace(linkPattern1, `href="/category/${newSlug}"`);
            changed = true;
        }
        if (content.match(linkPattern2)) {
            content = content.replace(linkPattern2, `link: "/category/${newSlug}"`);
            changed = true;
        }
    });
    
    if (changed) {
        fs.writeFileSync(indexPath, content);
        console.log(`[${site}] Updated Home page Pillar Links`);
    }
});
