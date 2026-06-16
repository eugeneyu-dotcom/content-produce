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

  // The hero block is the first uagb-is-root-container.
  // The lower container is the second uagb-is-root-container.
  // We can find the second instance of `<div class="wp-block-uagb-container...uagb-is-root-container">`
  // and modify it.

  let count = 0;
  content = content.replace(/<div class="wp-block-uagb-container[^>]*uagb-is-root-container[^>]*>/g, (match) => {
    count++;
    if (count === 2) {
      // This is the lower container
      // Remove alignfull and add style="width: 75%; margin: 0 auto;"
      let newMatch = match.replace('alignfull', '');
      if (!newMatch.includes('style=')) {
          newMatch = newMatch.replace('>', ' style="width: 75%; margin: 0 auto;">');
      } else {
          newMatch = newMatch.replace('style="', 'style="width: 75%; margin: 0 auto; ');
      }
      return newMatch;
    }
    return match;
  });

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Updated width for lower container in ${file}`);
}
