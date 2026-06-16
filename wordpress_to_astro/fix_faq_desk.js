const fs = require('fs');
const path = require('path');

const dirPath = path.join(__dirname, 'Desk/src/content/blog');
const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.md') || f.endsWith('.mdx'));

for (const file of files) {
  const filePath = path.join(dirPath, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  const faqRegex = /<h4[^>]*>\s*FAQ\s*<\/h4>\s*<div[^>]*faq-inner-container[^>]*>[\s\S]*?<\/div>\s*<\/div>/i;
  
  // Actually wait, looking at the previous grep:
  // <h4 ...>FAQ</h4>
  // <div class="faq-inner-container"...>...</div>
  // The first regex ends at the first </div>, but maybe I should just match until the end of the <dl> or similar.
  // Better yet, use a custom script with cheerio or just precise regex.
  
  let match = content.match(/<h4[^>]*>\s*FAQ\s*<\/h4>\s*<div[^>]*faq-inner-container[^>]*>[\s\S]*?<\/div>/i);
  if (match) {
    const faqHtml = match[0];
    
    const qRegex = /<dt[^>]*>([\s\S]*?)<\/dt>/gi;
    const aRegex = /<dd[^>]*>([\s\S]*?)<\/dd>/gi;
    
    let qs = [];
    let qMatch;
    while ((qMatch = qRegex.exec(faqHtml)) !== null) {
      qs.push(qMatch[1].trim());
    }
    
    let as = [];
    let aMatch;
    while ((aMatch = aRegex.exec(faqHtml)) !== null) {
      as.push(aMatch[1].trim());
    }
    
    if (qs.length > 0 && qs.length === as.length) {
      let markdownFaq = `#### FAQ\n\n`;
      
      for (let i = 0; i < qs.length; i++) {
        // Strip existing Q1: A1: tags if any
        let qText = qs[i].replace(/^(Q\d+:)\s*/i, '');
        let aText = as[i].replace(/^(A\d+:)\s*/i, '');
        
        markdownFaq += `**<span style="color: #E67E22;">Q: ${qText}</span>**\n\n`;
        markdownFaq += `<span style="color: #34495E;">A: ${aText}</span>\n\n`;
      }
      
      content = content.replace(faqHtml, markdownFaq.trim());
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Updated FAQ in ${file}`);
    } else {
      console.log(`Mismatch or no Q/A found in ${file}`);
    }
  }
}
