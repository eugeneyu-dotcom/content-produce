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

// 1. Get Keywords
const sop22Path = path.join(__dirname, 'SOP2-2_Keyword.csv');
const sop22Rows = parseCSV(fs.readFileSync(sop22Path, 'utf8'));

const dimToKeywords = {}; // dim -> [keywords] for Joaillerie
sop22Rows.forEach(row => {
    const site = row['Site'] ? row['Site'].trim() : '';
    if (site !== 'Joaillerie' && site !== 'Joaillerie et Symbolique') return;
    
    const kw = row['Keyword'] ? row['Keyword'].trim() : '';
    const dim = row['Pillar Post Dimension'] ? row['Pillar Post Dimension'].trim() : '';
    if (kw && dim) {
        if (!dimToKeywords[dim]) dimToKeywords[dim] = [];
        dimToKeywords[dim].push(kw);
    }
});

// 2. Get local files & slugs
const siteDir = path.join(__dirname, 'joaillerie');
const blogDir = path.join(siteDir, 'src', 'content', 'blog');
const localFiles = {}; 
const slugToLocal = {}; 
fs.readdirSync(blogDir).filter(f => f.endsWith('.md')).forEach(f => {
    const localSlug = f.replace('.md', '');
    localFiles[localSlug] = f;
    const content = fs.readFileSync(path.join(blogDir, f), 'utf8');
    const fmMatch = content.match(/^slug:\s*"?([^"\n]+)"?/m);
    const frontmatterSlug = fmMatch ? fmMatch[1] : localSlug;
    slugToLocal[frontmatterSlug] = localSlug;
    slugToLocal[localSlug] = localSlug;
});

// 3. Map N8N
const n8nPath = path.join(__dirname, 'N8N_work - Workflow_Config .csv');
const n8nRows = parseCSV(fs.readFileSync(n8nPath, 'utf8'));
const keywordToWpSlug = {}; 
n8nRows.forEach(row => {
    const kw = row['Keyword'] ? row['Keyword'].trim() : '';
    const postUrl = row['Post_Url'] ? row['Post_Url'].trim() : '';
    if (kw && postUrl) {
        const match = postUrl.match(/https?:\/\/[^\/]+\/(.+?)[\/]?$/);
        if (match) {
            keywordToWpSlug[kw] = match[1];
        }
    }
});

// 4. Update joaillerie category pages
const categoryDir = path.join(siteDir, 'src', 'pages', 'category');
fs.readdirSync(categoryDir).filter(f => f.endsWith('.astro')).forEach(f => {
    const filePath = path.join(categoryDir, f);
    let content = fs.readFileSync(filePath, 'utf8');
    
    const titleMatch = content.match(/<h1>(.*?)<\/h1>/);
    if (!titleMatch) return;
    const dimTitle = titleMatch[1]; // e.g. "Le Langage des Doigts et l'Autorité"
    
    // Fuzzy matching to find the right dim from SOP2-2
    let bestDim = null;
    let maxScore = -1;
    const dimWords = dimTitle.toLowerCase().split(/[\s,()']+/).filter(w => w.length > 2);
    
    Object.keys(dimToKeywords).forEach(dim => {
        let score = 0;
        const testWords = dim.toLowerCase().split(/[\s,()']+/).filter(w => w.length > 2);
        dimWords.forEach(w => {
            if (testWords.includes(w)) score++;
        });
        if (score > maxScore) {
            maxScore = score;
            bestDim = dim;
        }
    });
    
    if (bestDim && maxScore > 0) {
        const keywords = dimToKeywords[bestDim];
        if (keywords.length > 0) {
            let keywordsHtml = `
<section class="category-keywords" style="margin: 40px 0; padding: 20px; border-top: 1px solid rgba(0,0,0,0.1);">
    <h3 style="margin-bottom: 20px; font-size: 1.3rem;">Related Keywords</h3>
    <div style="display: flex; flex-wrap: wrap; gap: 10px;">
`;
            keywords.forEach(kw => {
                const wpSlug = keywordToWpSlug[kw];
                const localSlug = slugToLocal[wpSlug] || slugToLocal[kw.toLowerCase().replace(/[^a-z0-9]+/g, '-')];
                const fileExists = localSlug && localFiles[localSlug];
                
                if (fileExists) {
                    keywordsHtml += `        <a href="/blog/${localSlug}/" class="keyword-btn active" style="padding: 8px 16px; background-color: var(--accent, #9335B6); color: #fff; text-decoration: none; border-radius: 4px; font-size: 0.95rem; transition: opacity 0.2s;">#${kw}</a>\n`;
                } else {
                    keywordsHtml += `        <span class="keyword-btn pending" style="padding: 8px 16px; background-color: #f0f0f0; color: #888; border-radius: 4px; font-size: 0.95rem; cursor: not-allowed;">#${kw}</span>\n`;
                }
            });
            keywordsHtml += `    </div>\n</section>`;
            
            // Remove old keyword section if any
            content = content.replace(/<section class="category-keywords"[\s\S]*?<\/section>\n?/g, '');
            
            // Insert before category-faq-section
            content = content.replace(/<div class="category-faq-section"/, `${keywordsHtml}\n\n<div class="category-faq-section"`);
            
            fs.writeFileSync(filePath, content);
            console.log(`Updated keywords for ${f} (Matched: ${bestDim})`);
        }
    }
});
