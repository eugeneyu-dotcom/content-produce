const fs = require('fs');
const path = require('path');

const blogDir = path.join(__dirname, 'Desk', 'src', 'content', 'blog');
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
    let content = fs.readFileSync(path.join(blogDir, file), 'utf8');
    
    // Add missing closing tags if needed
    const searchString = '</h5></div>\n\n<style></style><style></style>';
    if (content.includes(searchString)) {
        console.log(`Fixing ${file}`);
        content = content.replace(searchString, '</h5></div>\n</div></div>\n\n<style></style><style></style>');
        fs.writeFileSync(path.join(blogDir, file), content, 'utf8');
    }
}
