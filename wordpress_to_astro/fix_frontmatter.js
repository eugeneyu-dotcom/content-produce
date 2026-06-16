const fs = require('fs');
const path = require('path');

const sites = ['Desk', 'Dream', 'joaillerie', 'Legend'];

sites.forEach(site => {
  const dir = path.join(__dirname, site, 'src/content/blog');
  if (fs.existsSync(dir)) {
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.md'));
    files.forEach(file => {
      const filePath = path.join(dir, file);
      let content = fs.readFileSync(filePath, 'utf8');
      
      // Fix pubDate and add description if not exists
      // The current frontmatter has: date: "..."
      // Change to pubDate: new Date("...") and add description
      
      content = content.replace(/date:\s*"(.*?)"/, 'pubDate: new Date("$1")\ndescription: "Migrated post from WordPress."');
      
      fs.writeFileSync(filePath, content);
    });
  }
});
console.log('Fixed frontmatter schemas for Astro');
