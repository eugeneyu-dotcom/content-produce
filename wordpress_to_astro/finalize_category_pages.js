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

// Load SOP2-1_Dimension to get FAQ text
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
    if (text.includes('Q1:') || text.includes('Q1 :') || text.includes('Q 1:')) {
        const regex = /Q\d*\s*[:.]?\s*(.*?)(?=\s*A\s*[:.])A\s*[:.]\s*(.*?)(?=\s*Q\d*\s*[:.]|$)/g;
        let match;
        while ((match = regex.exec(text)) !== null) {
            items.push({ q: match[1].trim(), a: match[2].trim() });
        }
    } else if (text.match(/\d+\.\s/)) {
        const parts = text.split(/(?:\s|^)\d+\.\s/).filter(p => p.trim());
        parts.forEach(part => {
            const parenMatch = part.match(/^(.*?)\s*\((.*?)\)\.?$/);
            if (parenMatch) {
                items.push({ q: parenMatch[1].trim(), a: parenMatch[2].trim() });
            } else {
                const qMark = part.indexOf('?');
                if (qMark !== -1) {
                    items.push({ q: part.substring(0, qMark + 1).trim(), a: part.substring(qMark + 1).trim() });
                } else {
                    items.push({ q: part, a: '' });
                }
            }
        });
    } else {
        items.push({ q: 'Question', a: text });
    }
    return items;
};

// Theme configurations for FAQ
const themes = {
    'Dream': {
        bg: 'rgba(0,0,0,0.3)',
        itemBg: 'rgba(255,255,255,0.03)',
        border: 'rgba(236,72,153,0.1)',
        accent: '#ec4899', 
        textQ: '#ec4899',
        textA: '#e2e8f0',
        title: '#fbcfe8',
        boxShadow: '0 4px 15px rgba(0,0,0,0.3)'
    },
    'joaillerie': {
        bg: '#ffffff',
        itemBg: '#fcfcfc',
        border: '#eaeaea',
        accent: '#9335B6', 
        textQ: '#9335B6',
        textA: '#444444',
        title: '#222222',
        boxShadow: '0 4px 10px rgba(0,0,0,0.05)'
    },
    'Desk': {
        bg: '#f8f9fa',
        itemBg: '#ffffff',
        border: '#eeeeee',
        accent: '#333333',
        textQ: '#111111',
        textA: '#555555',
        title: '#111111',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
    },
    'Legend': {
        bg: 'rgba(10,10,10,0.8)',
        itemBg: '#1a1a1a',
        border: 'rgba(255,0,0,0.15)',
        accent: '#d32f2f', 
        textQ: '#ff4d4d',
        textA: '#cccccc',
        title: '#f5f5f5',
        boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
    }
};

const generateThemedFaqHtml = (faqText, theme) => {
    if (!faqText) return '';
    const items = parseFaqText(faqText);
    
    let html = `
<div class="category-faq-section" style="margin-top: 60px; padding: 40px 30px; background: ${theme.bg}; border-radius: 12px; border: 1px solid ${theme.border};">
    <h2 style="text-align: center; margin-bottom: 40px; color: ${theme.title}; font-size: 2rem; font-family: 'Playfair Display', serif;">Frequently Asked Questions</h2>
    <div class="faq-content" style="display: flex; flex-direction: column; gap: 24px;">
`;

    items.forEach((item, index) => {
        html += `
        <div class="faq-item" style="background: ${theme.itemBg}; border-radius: 8px; padding: 24px; border-left: 4px solid ${theme.accent}; box-shadow: ${theme.boxShadow}; transition: transform 0.2s ease;">
            <h4 style="color: ${theme.textQ}; margin-top: 0; margin-bottom: 12px; font-size: 1.2rem; font-weight: 600;">Q: ${item.q.replace(/</g, '<').replace(/>/g, '>')}</h4>
            <p style="color: ${theme.textA}; margin: 0; line-height: 1.7; font-size: 1.05rem;"><strong>A:</strong> ${item.a.replace(/</g, '<').replace(/>/g, '>')}</p>
        </div>
`;
    });

    html += `    </div>\n</div>\n`;
    return html;
};

// Process each Category page
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
        
        // Replace FAQ
        const faqText = dimFaqMap[site]?.[dimTitle];
        if (faqText) {
            const newFaqHtml = generateThemedFaqHtml(faqText, themes[site]);
            const oldFaqRegex = /<div class="category-faq-section"[\s\S]*?<\/div>\s*<\/div>\n?/g;
            if (content.match(oldFaqRegex)) {
                content = content.replace(oldFaqRegex, newFaqHtml);
            } else {
                content = content.replace(/<\/main>/, `\n${newFaqHtml}\n    </main>`);
            }
        }
        
        // Clean wp-content block (Keep ONLY up to 2 images)
        const wpContentRegex = /<section class="category-wp-content">([\s\S]*?)<\/section>/;
        const match = content.match(wpContentRegex);
        if (match) {
            const oldWpContent = match[1];
            const $ = cheerio.load(oldWpContent, null, false);
            
            const images = [];
            $('img').each((i, el) => {
                if (images.length < 2) {
                    const src = $(el).attr('src');
                    if (src && !src.includes('M-final') && !src.includes('maxora')) {
                        const parentFigure = $(el).closest('figure');
                        if (parentFigure.length) {
                            // Clear any text or figcaption inside the figure just to be safe
                            parentFigure.find('figcaption').remove();
                            // Keep classes and structure of the figure
                            images.push($.html(parentFigure));
                        } else {
                            // Wrap standalone image in a clean figure
                            images.push(`<figure style="margin: 20px 0; text-align: center;">${$.html(el)}</figure>`);
                        }
                    }
                }
            });
            
            // Replace the entire old content with ONLY the extracted images
            let newWpContent = images.join('\n');
            content = content.replace(wpContentRegex, `<section class="category-wp-content">\n${newWpContent}\n</section>`);
        }
        
        fs.writeFileSync(filePath, content);
        console.log(`[${site}] Finalized category page: ${file}`);
    });
});
