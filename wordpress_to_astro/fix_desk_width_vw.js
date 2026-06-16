const fs = require('fs');
const path = require('path');

const dirPath = path.join(__dirname, 'Desk/src/content/blog');
const files = [
  'biophilic-design.md',
  'cable-management.md',
  'color-theory-and-materiality.md',
  'digital-minimalism.md',
  'functional-ergonomics.md',
  'lighting-design.md',
  'psychology-of-flow.md'
];

for (const file of files) {
  const filePath = path.join(dirPath, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Replace `width: 75%;` with `width: 75vw;`
  content = content.replace(/style="width:\s*75%;\s*margin:\s*0 auto;\s*"/g, 'style="width: 75vw; margin: 0 auto;"');

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Updated width to 75vw in ${file}`);
}
