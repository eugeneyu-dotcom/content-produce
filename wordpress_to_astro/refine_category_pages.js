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

// 1. Load SOP2-1_Dimension to get FAQ text
const sop21Path = path.join(__dirname, 'SOP2-1_Dimension.csv');
const sop21Content = fs.readFileSync(sop21Path, 'utf8');
const sop21Rows = parseCSV(sop21Content);

const siteMap = {
    'Dream Interpretation': 'Dream',
    'Joaillerie et Symbolique': 'joaillerie',
    'Joaillerie': 'joaillerie',
    'ミニマリスト・デスクセットアップ': 'Desk',
    'Global Urban Legends Analysis': 'Legend'
};

const dimFaqMap = {}; // site -> dim -> faq
sop21Rows.forEach(row => {
    const rawSite = row['Site'] ? row['Site'].trim() : '';
    const site = siteMap[rawSite];
    if (!site) return;
    
    const dim = row['Pillar Post Dimension'] ? row['Pillar Post Dimension'].trim() : '';
    const faq = row['FAQ'] ? row['FAQ'].trim() : '';
    
    if (!dim || !faq) return;
    
    if (!dimFaqMap[site]) dimFaqMap[site] = {};
    dimFaqMap[site][dim] = faq;
});

// Function to parse FAQ text into an array of {q, a} objects
const parseFaqText = (text) => {
    const items = [];
    
    // Format 1: Q1: ... ? A: ... Q2: ...
    if (text.includes('Q1:') || text.includes('Q1 :') || text.includes('Q 1:')) {
        const regex = /Q\d*\s*[:.]?\s*(.*?)(?=\s*A\s*[:.])A\s*[:.]\s*(.*?)(?=\s*Q\d*\s*[:.]|$)/g;
        let match;
        while ((match = regex.exec(text)) !== null) {
            items.push({ q: match[1].trim(), a: match[2].trim() });
        }
    } 
    // Format 2: 1. Question? (Answer). 2. Question? (Answer).
    else if (text.match(/\d+\.\s/)) {
        // split by digit dot
        const parts = text.split(/(?:\s|^)\d+\.\s/).filter(p => p.trim());
        parts.forEach(part => {
            const parenMatch = part.match(/^(.*?)\s*\((.*?)\)\.?$/);
            if (parenMatch) {
                items.push({ q: parenMatch[1].trim(), a: parenMatch[2].trim() });
            } else {
                // If it doesn't match parens, maybe it's just a string, fallback
                const qMark = part.indexOf('?');
                if (qMark !== -1) {
                    items.push({ q: part.substring(0, qMark + 1).trim(), a: part.substring(qMark + 1).trim() });
                } else {
                    items.push({ q: part, a: '' });
                }
            }
        });
    } else {
        // Fallback if formatting is weird
        items.push({ q: 'Question', a: text });
    }
    
    return items;
};

// Generate Beautiful FAQ HTML
const generateStyledFaqHtml = (faqText) => {
    if (!faqText) return '';
    const items = parseFaqText(faqText);
    
    let html = `
<div class="category-faq-section" style="margin-top: 50px; padding: 30px; background: rgba(0,0,0,0.2); border-radius: 12px; border: 1px solid rgba(255,255,255,0.05);">
    <h2 style="text-align: center; margin-bottom: 30px; color: #fbcfe8; font-size: 2rem;">Frequently Asked Questions</h2>
    <div class="faq-content" style="display: flex; flex-direction: column; gap: 20px;">
`;

    items.forEach((item, index) => {
        html += `
        <div class="faq-item" style="background: rgba(255,255,255,0.03); border-radius: 8px; padding: 20px; border-left: 4px solid var(--accent, #ec4899); box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <h4 style="color: var(--accent, #ec4899); margin-top: 0; margin-bottom: 12px; font-size: 1.15rem; font-weight: 600;">Q: ${item.q.replace(/</g, '<').replace(/>/g, '>')}</h4>
            <p style="color: #e2e8f0; margin: 0; line-height: 1.6; font-size: 1.05rem;"><strong>A:</strong> ${item.a.replace(/</g, '<').replace(/>/g, '>')}</p>
        </div>
`;
    });

    html += `    </div>\n</div>\n`;
    return html;
};


// 3. Process each Category page
const sites = ['Dream', 'joaillerie', 'Desk', 'Legend'];

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
        
        // 1. Width adjustment (75%)
        content = content.replace(/<main class="category-page" style="max-width: 800px; margin: 0 auto; padding: 20px;">/g, 
                                  '<main class="category-page" style="width: 75%; max-width: none; margin: 0 auto; padding: 20px;">');
                                  
        // 2. Video removal
        const wpContentRegex = /<section class="category-wp-content">([\s\S]*?)<\/section>/;
        const match = content.match(wpContentRegex);
        if (match) {
            let wpContent = match[1];
            const $ = cheerio.load(wpContent, null, false);
            
            // Remove video embeds
            $('.wp-block-embed.is-type-video').remove();
            $('iframe[src*="youtube.com"]').parent().remove();
            $('iframe[src*="youtube.com"]').remove();
            
            wpContent = $.html();
            content = content.replace(wpContentRegex, `<section class="category-wp-content">\n${wpContent}\n</section>`);
        }
        
        // 3. Replace old FAQ block with new beautifully styled FAQ block
        const faqText = dimFaqMap[site]?.[dimTitle];
        if (faqText) {
            const newFaqHtml = generateStyledFaqHtml(faqText);
            
            // Find the old FAQ section and replace it
            const oldFaqRegex = /<div class="category-faq-section"[\s\S]*?<\/div>\s*<\/div>\n?/g;
            if (content.match(oldFaqRegex)) {
                content = content.replace(oldFaqRegex, newFaqHtml);
            } else {
                // If it wasn't matched, just append it before </main>
                content = content.replace(/<\/main>/, `\n${newFaqHtml}\n    </main>`);
            }
        }
        
        fs.writeFileSync(filePath, content);
        console.log(`[${site}] Refined category page: ${file}`);
    });
});
