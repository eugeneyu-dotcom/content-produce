const fs = require('fs');
const content = fs.readFileSync('SOP2-1_Dimension.csv', 'utf8');
const lines = content.split('\n').filter(line => line.includes('Desk'));
lines.forEach(line => console.log(line));
