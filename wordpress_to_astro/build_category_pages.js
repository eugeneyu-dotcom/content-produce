const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const csvPath = path.join(__dirname, 'SOP2-1_Dimension.csv');
const csvContent = fs.readFileSync(csvPath, 'utf8');

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

const rows = parseCSV(csvContent);

const siteMap = {
    'Dream Interpretation': 'Dream',
    'Joaillerie et Symbolique': 'joaillerie',
    'ミニマリスト・デスクセットアップ': 'Desk',
    'Global Urban Legends Analysis': 'Legend'
};

const siteDirs = {
    'Dream': path.join(__dirname, 'Dream'),
    'joaillerie': path.join(__dirname, 'joaillerie'),
    'Desk': path.join(__dirname, 'Desk'),
    'Legend': path.join(__dirname, 'Legend')
};

// Function to generate FAQ HTML
const generateFaqHtml = (faqText) => {
    if (!faqText) return '';
    
    // faqs are like "1. Q1? (A1). 2. Q2? (A2)."
    // We can just output them as simple list or details/summary for simplicity
    const faqs = faqText.match(/\d+\.\s*(.*?)\s*\((.*?)\)\.?/g);
    
    // For joaillerie it is "Q1: Pourquoi... ? A: Car..."
    // We can just output the raw text in a nice format if it doesn't match standard
    
    return `
<div class="category-faq-section" style="margin-top: 40px; padding: 20px; background: rgba(0,0,0,0.05); border-radius: 8px;">
    <h2>Frequently Asked Questions</h2>
    <div class="faq-content">
        <p style="white-space: pre-wrap;">${faqText.replace(/</g, '<').replace(/>/g, '>')}</p>
    </div>
</div>
`;
};

rows.forEach(row => {
    const siteName = siteMap[row['Site']];
    if (!siteName) return;
    
    const siteDir = siteDirs[siteName];
    const blogDir = path.join(siteDir, 'src', 'content', 'blog');
    const categoryDir = path.join(siteDir, 'src', 'pages', 'category');
    const backupDir = path.join(siteDir, 'backup_categories');
    
    if (!fs.existsSync(blogDir)) return;
    if (!fs.existsSync(categoryDir)) fs.mkdirSync(categoryDir, { recursive: true });
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
    
    const files = fs.readdirSync(blogDir).filter(f => f.endsWith('.md'));
    const dim = row['Pillar Post Dimension'];
    const article = row['Pillar Post Dimension article'];
    const keywordSlug = row['Keyword slug'];
    const faq = row['FAQ'];
    
    let bestMatch = null;
    let maxScore = -1;
    
    files.forEach(file => {
        const content = fs.readFileSync(path.join(blogDir, file), 'utf8');
        let score = 0;
        const titleMatch = content.match(/^title:\s*"?([^"]+)"?/m);
        const title = titleMatch ? titleMatch[1] : '';
        
        const dimWords = dim.split(/[\s,()]+/).filter(w => w.length > 3).map(w => w.toLowerCase());
        dimWords.forEach(w => {
            if (file.toLowerCase().includes(w)) score += 2;
            if (title.toLowerCase().includes(w)) score += 2;
        });
        
        if (score > maxScore) {
            maxScore = score;
            bestMatch = file;
        }
    });
    
    if (bestMatch && maxScore > 0) {
        const sourcePath = path.join(blogDir, bestMatch);
        let rawContent = fs.readFileSync(sourcePath, 'utf8');
        
        // Remove frontmatter
        const fmMatch = rawContent.match(/^---\n[\s\S]*?\n---\n/);
        let htmlContent = rawContent;
        let title = dim;
        
        if (fmMatch) {
            htmlContent = rawContent.slice(fmMatch[0].length);
        }
        
        // Clean up old WP garbled code using cheerio
        const $ = cheerio.load(htmlContent, null, false);
        
        // Remove old buttons
        $('.wp-block-uagb-buttons').remove();
        
        // Remove old FAQs
        $('.wp-block-uagb-faq').remove();
        
        // Remove FAQ headers
        $('h2:contains("Frequently Asked Questions")').remove();
        $('h2:contains("FAQ")').remove();
        
        const cleanedHtml = $.html();
        
        // Determine slug
        let slug = keywordSlug.split(',')[0].trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        if (!slug) slug = bestMatch.replace('.md', '');
        
        // Generate Astro Page
        const astroContent = `---
import Layout from '../../layouts/Layout.astro';
// You might need to adjust the Layout import path based on the project structure
---

<Layout title="${title}">
    <main class="category-page" style="max-width: 800px; margin: 0 auto; padding: 20px;">
        <header style="margin-bottom: 40px;">
            <h1>${title}</h1>
        </header>

        <section class="category-article" style="margin-bottom: 40px; font-size: 1.1rem; line-height: 1.8;">
            ${article ? `<p>${article}</p>` : ''}
        </section>

        <section class="category-wp-content">
            ${cleanedHtml}
        </section>

        ${faq ? generateFaqHtml(faq) : ''}
    </main>
</Layout>
`;

        const targetPath = path.join(categoryDir, `${slug}.astro`);
        fs.writeFileSync(targetPath, astroContent);
        
        // Move original md to backup
        const backupPath = path.join(backupDir, bestMatch);
        fs.renameSync(sourcePath, backupPath);
        
        console.log(`[${siteName}] Created category page: ${slug}.astro (Moved ${bestMatch} to backup)`);
    }
});
