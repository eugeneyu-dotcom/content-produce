const fs = require('fs');
const path = require('path');

const replaceInFile = (filePath, search, replace) => {
    if (!fs.existsSync(filePath)) return;
    let content = fs.readFileSync(filePath, 'utf8');
    if (content.match(search)) {
        content = content.replace(search, replace);
        fs.writeFileSync(filePath, content);
        console.log(`Updated ${filePath}`);
    }
};

// Dream updates
replaceInFile(path.join(__dirname, 'Dream/src/pages/index.astro'), /\/media-images\/Logo\.webp/g, '/media-images/Logo.png');
replaceInFile(path.join(__dirname, 'Dream/src/components/Header.astro'), /\/media-images\/Logo\.webp/g, '/media-images/Logo.png');
replaceInFile(path.join(__dirname, 'Dream/src/components/BaseHead.astro'), /\/media-images\/Logo\.webp/g, '/media-images/Logo.png');
replaceInFile(path.join(__dirname, 'Dream/src/components/BaseHead.astro'), /type="image\/webp"\s+href="\/media-images\/Logo\.png"/g, 'type="image/png" href="/media-images/Logo.png"');

// Legend updates
replaceInFile(path.join(__dirname, 'Legend/src/pages/index.astro'), /\/media-images\/Logo\.webp/g, '/media-images/Logo.png');
replaceInFile(path.join(__dirname, 'Legend/src/components/Header.astro'), /\/media-images\/Logo\.webp/g, '/media-images/Logo.png');
replaceInFile(path.join(__dirname, 'Legend/src/components/BaseHead.astro'), /\/media-images\/Logo\.webp/g, '/media-images/Logo.png');
replaceInFile(path.join(__dirname, 'Legend/src/components/BaseHead.astro'), /type="image\/webp"\s+href="\/media-images\/Logo\.png"/g, 'type="image/png" href="/media-images/Logo.png"');

// Desk updates
replaceInFile(path.join(__dirname, 'Desk/src/pages/index.astro'), /\/media-images\/pillar-biophilic\.webp/g, '/media-images/pillar-biophilic.jpeg');
