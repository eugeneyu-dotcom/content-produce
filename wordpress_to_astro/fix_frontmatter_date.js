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
      
      // Fix pubDate: Remove the "new Date()" wrapper
      content = content.replace(/pubDate:\s*new Date\("(.*?)"\)/g, 'pubDate: $1');
      
      fs.writeFileSync(filePath, content);
    });
  }
});
console.log('Fixed YAML date parsing in frontmatter');
