const fs = require('fs');
const path = require('path');

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

rows.forEach(row => {
    const siteName = siteMap[row['Site']];
    if (!siteName) return;
    
    const siteDir = siteDirs[siteName];
    const backupDir = path.join(siteDir, 'backup_categories');
    const headerPath = path.join(siteDir, 'src', 'components', 'Header.astro');
    
    if (!fs.existsSync(backupDir) || !fs.existsSync(headerPath)) return;
    
    const files = fs.readdirSync(backupDir).filter(f => f.endsWith('.md'));
    const dim = row['Pillar Post Dimension'];
    const keywordSlug = row['Keyword slug'];
    
    let bestMatch = null;
    let maxScore = -1;
    
    files.forEach(file => {
        const content = fs.readFileSync(path.join(backupDir, file), 'utf8');
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
        let slug = keywordSlug.split(',')[0].trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        if (!slug) slug = bestMatch.replace('.md', '');
        
        const oldSlug = bestMatch.replace('.md', '');
        
        // Update header file
        let headerContent = fs.readFileSync(headerPath, 'utf8');
        // We replace both /blog/old-slug and /old-slug with /category/slug to be safe, but typically it's /blog/old-slug or /old-slug
        // First try replacing /blog/old-slug
        headerContent = headerContent.replace(new RegExp(`href="/blog/${oldSlug}"`, 'g'), `href="/category/${slug}"`);
        // Then try /old-slug
        headerContent = headerContent.replace(new RegExp(`href="/${oldSlug}"`, 'g'), `href="/category/${slug}"`);
        
        fs.writeFileSync(headerPath, headerContent);
        console.log(`[${siteName}] Updated Header.astro: replaced link to ${oldSlug} with /category/${slug}`);
    }
});
