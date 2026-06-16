const fs = require('fs');
const content = fs.readFileSync('SOP2-1_Dimension.csv', 'utf8');
const lines = content.split('\n');
const sites = new Set();
for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',');
    if (cols[0]) sites.add(cols[0].trim());
}
console.log(Array.from(sites));
