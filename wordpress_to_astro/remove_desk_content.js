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
    
    // Find the end of the keyword slug heading
    const h5Match = content.match(/<div class="wp-block-uagb-advanced-heading[^>]*><h5[^>]*>.*?<\/h5><\/div>/s);
    if (!h5Match) {
        console.log(`Could not find h5 for keyword slug in ${file}`);
        continue;
    }
    
    const startIdx = h5Match.index + h5Match[0].length;
    
    // Find the footer start
    const footerMatch = content.indexOf('<style></style><style></style>');
    if (footerMatch === -1) {
        console.log(`Could not find footer in ${file}`);
        continue;
    }
    
    if (startIdx < footerMatch) {
        console.log(`Deleting ${footerMatch - startIdx} characters from ${file}`);
        const newContent = content.substring(0, startIdx) + '\n\n' + content.substring(footerMatch);
        fs.writeFileSync(path.join(blogDir, file), newContent, 'utf8');
    } else {
        console.log(`Skipping ${file}, footer is before keyword slug?`);
    }
}
