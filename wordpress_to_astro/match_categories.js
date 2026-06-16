const fs = require('fs');
const path = require('path');

const csvPath = path.join(__dirname, 'SOP2-1_Dimension.csv');
const csvContent = fs.readFileSync(csvPath, 'utf8');

const parseCSV = (content) => {
    const lines = content.split('\n').filter(line => line.trim() !== '');
    const headers = lines[0].split(',').map(h => h.trim());
    
    // Simple CSV parser for quoted fields
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

// Site mapping
const siteMap = {
    'Dream Interpretation': 'Dream',
    'Joaillerie et Symbolique': 'joaillerie',
    'ミニマリスト・デスクセットアップ': 'Desk',
    'Global Urban Legends Analysis': 'Legend'
};

const siteDirs = {
    'Dream': path.join(__dirname, 'Dream', 'src', 'content', 'blog'),
    'joaillerie': path.join(__dirname, 'joaillerie', 'src', 'content', 'blog'),
    'Desk': path.join(__dirname, 'Desk', 'src', 'content', 'blog'),
    'Legend': path.join(__dirname, 'Legend', 'src', 'content', 'blog')
};

// We need a helper to normalize strings for matching
const normalize = (str) => {
    if (!str) return '';
    return str.toLowerCase().replace(/[^a-z0-9]/g, '');
};

rows.forEach(row => {
    const siteName = siteMap[row['Site']];
    if (!siteName) return;
    
    const blogDir = siteDirs[siteName];
    if (!fs.existsSync(blogDir)) return;
    
    const files = fs.readdirSync(blogDir).filter(f => f.endsWith('.md'));
    
    const dim = row['Pillar Post Dimension'];
    const keywordSlug = row['Keyword slug'];
    
    // Let's try to find the matching file.
    let bestMatch = null;
    let maxScore = -1;
    
    files.forEach(file => {
        const content = fs.readFileSync(path.join(blogDir, file), 'utf8');
        
        // Simple score: how many words from dim/keywordSlug appear in the file content or title
        let score = 0;
        
        // check frontmatter title
        const titleMatch = content.match(/^title:\s*"?([^"]+)"?/m);
        const title = titleMatch ? titleMatch[1] : '';
        
        // We can just check if file name or title contains key words
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
    
    console.log(`Site: ${siteName} | Dim: ${dim} | Best File Match: ${bestMatch} (Score: ${maxScore})`);
});
