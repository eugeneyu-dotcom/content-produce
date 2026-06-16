const fs = require('fs');
const path = require('path');

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

const n8nPath = path.join(__dirname, 'N8N_work - Workflow_Config .csv');
const n8nContent = fs.readFileSync(n8nPath, 'utf8');
const n8nRows = parseCSV(n8nContent);

const activeRow = n8nRows.find(row => row['Status'] === 'Active');
if (activeRow) {
    console.log("Found Active Row:");
    console.log(activeRow);
} else {
    console.log("No Active row found.");
}
