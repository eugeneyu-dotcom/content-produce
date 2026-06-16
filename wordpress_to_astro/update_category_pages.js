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

// Site Mapping
const siteMap = {
    'Dream Interpretation': 'Dream',
    'Joaillerie et Symbolique': 'joaillerie',
    'Joaillerie': 'joaillerie',
    'ミニマリスト・デスクセットアップ': 'Desk',
    'Global Urban Legends Analysis': 'Legend'
};

// 1. Load N8N Workflow Config
const n8nPath = path.join(__dirname, 'N8N_work - Workflow_Config .csv');
const n8nContent = fs.readFileSync(n8nPath, 'utf8');
const n8nRows = parseCSV(n8nContent);

const keywordData = {}; // keyword -> { status, urlSlug }
n8nRows.forEach(row => {
    const kw = row['Keyword'] ? row['Keyword'].trim() : '';
    if (!kw) return;
    
    const status = row['Status'] ? row['Status'].trim() : '';
    const postUrl = row['Post_Url'] ? row['Post_Url'].trim() : '';
    
    let urlSlug = '';
    if (postUrl) {
        // extract slug from url
        const match = postUrl.match(/https?:\/\/[^\/]+\/(.+?)[\/]?$/);
        if (match) {
            urlSlug = match[1];
        }
    }
    
    keywordData[kw] = { status, urlSlug };
});

// 2. Load SOP2-2_Keyword
const sop22Path = path.join(__dirname, 'SOP2-2_Keyword.csv');
const sop22Content = fs.readFileSync(sop22Path, 'utf8');
const sop22Rows = parseCSV(sop22Content);

const dimKeywords = {}; // site -> dim -> [keywords]
sop22Rows.forEach(row => {
    const rawSite = row['Site'] ? row['Site'].trim() : '';
    const site = siteMap[rawSite];
    if (!site) return;
    
    const dim = row['Pillar Post Dimension'] ? row['Pillar Post Dimension'].trim() : '';
    const kw = row['Keyword'] ? row['Keyword'].trim() : '';
    
    if (!dim || !kw) return;
    
    if (!dimKeywords[site]) dimKeywords[site] = {};
    if (!dimKeywords[site][dim]) dimKeywords[site][dim] = [];
    dimKeywords[site][dim].push(kw);
});

// 3. Process each Category page
const sites = ['Dream', 'joaillerie', 'Desk', 'Legend'];

// Helper to extract the URL from the string since string manipulation could fail.
sites.forEach(site => {
    const categoryDir = path.join(__dirname, site, 'src', 'pages', 'category');
    if (!fs.existsSync(categoryDir)) return;
    
    const files = fs.readdirSync(categoryDir).filter(f => f.endsWith('.astro'));
    
    files.forEach(file => {
        const filePath = path.join(categoryDir, file);
        let content = fs.readFileSync(filePath, 'utf8');
        
        // Extract dim title
        const titleMatch = content.match(/<h1>(.*?)<\/h1>/);
        if (!titleMatch) return;
        const dimTitle = titleMatch[1];
        
        // Extract section category-wp-content
        const wpContentRegex = /<section class="category-wp-content">([\s\S]*?)<\/section>/;
        const match = content.match(wpContentRegex);
        if (!match) return;
        
        let wpContent = match[1];
        
        // Clean wpContent using cheerio
        const $ = cheerio.load(wpContent, null, false);
        
        // Remove old faq / buttons
        $('.wp-block-spectra-accordion').remove();
        $('.wp-block-spectra-buttons').remove();
        $('.wp-block-uagb-buttons').remove();
        $('.wp-block-uagb-faq').remove();
        
        // Remove text nodes containing 'Find answers to commonly asked questions'
        $('*').each((i, el) => {
            if ($(el).text().includes('Find answers to commonly asked questions')) {
                // remove the nearest spectra container
                const container = $(el).closest('.wp-block-spectra-container');
                if (container.length) container.remove();
                else $(el).parent().remove();
            }
        });
        
        // Remove Maxora / M-final-2 images
        $('img[src*="M-final"], img[src*="maxora"], img[alt*="m final"], img[alt*="M final"]').each((i, el) => {
            const figure = $(el).closest('figure');
            if (figure.length) {
                figure.remove();
            } else {
                $(el).remove();
            }
        });
        
        // Sometimes the figure may be wrapped in a container, let's remove empty containers if they are uagb
        // Just leaving them is fine if they are empty
        
        wpContent = $.html();
        
        // Generate Keywords HTML
        let keywordsHtml = '';
        const keywords = (dimKeywords[site] && dimKeywords[site][dimTitle]) ? dimKeywords[site][dimTitle] : [];
        
        if (keywords.length > 0) {
            keywordsHtml = `
<section class="category-keywords" style="margin: 40px 0; padding: 20px; border-top: 1px solid rgba(255,255,255,0.1);">
    <h3 style="margin-bottom: 20px; font-size: 1.3rem;">Related Keywords</h3>
    <div style="display: flex; flex-wrap: wrap; gap: 10px;">
`;
            keywords.forEach(kw => {
                const data = keywordData[kw] || { status: 'None', urlSlug: '' };
                if (data.status === 'USED' && data.urlSlug) {
                    keywordsHtml += `        <a href="/blog/${data.urlSlug}/" class="keyword-btn active" style="padding: 8px 16px; background-color: var(--accent, #ec4899); color: #fff; text-decoration: none; border-radius: 4px; font-size: 0.95rem; transition: opacity 0.2s;">#${kw}</a>\n`;
                } else {
                    keywordsHtml += `        <span class="keyword-btn pending" style="padding: 8px 16px; background-color: #4a4a4a; color: #a0a0a0; border-radius: 4px; font-size: 0.95rem; cursor: not-allowed;">#${kw}</span>\n`;
                }
            });
            keywordsHtml += `    </div>\n</section>\n`;
        }
        
        // Replace old wp-content
        content = content.replace(wpContentRegex, `<section class="category-wp-content">\n${wpContent}\n</section>\n${keywordsHtml}`);
        
        // Wait, what if the script is run multiple times? keywordsHtml would be added multiple times.
        // We can just remove old category-keywords if it exists
        content = content.replace(/<section class="category-keywords"[\s\S]*?<\/section>\n?/, '');
        // Replace again properly
        content = content.replace(wpContentRegex, `<section class="category-wp-content">\n${wpContent}\n</section>\n${keywordsHtml}`);
        
        fs.writeFileSync(filePath, content);
        console.log(`[${site}] Updated category page: ${file}`);
    });
});
