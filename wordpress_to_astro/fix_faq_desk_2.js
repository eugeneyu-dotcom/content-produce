const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const dirPath = path.join(__dirname, 'Desk/src/content/blog');
const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.md') || f.endsWith('.mdx'));

for (const file of files) {
  const filePath = path.join(dirPath, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  if (!content.includes('FAQ')) continue;
  
  // A regex to match the FAQ h4 and its following div
  const faqBlockRegex = /<h4[^>]*>\s*FAQ\s*<\/h4>\s*<div[^>]*>([\s\S]*?)<\/div>(?=\s*(?:<div id="n8n-video-block"|<figure|<\/div>|\n|$))/i;
  let match = content.match(faqBlockRegex);
  
  if (match) {
    const faqHtml = match[0];
    const $ = cheerio.load(faqHtml, { decodeEntities: false });
    
    let qaPairs = [];
    
    if ($('dl').length > 0) {
      const dts = $('dt').toArray();
      const dds = $('dd').toArray();
      
      for (let i = 0; i < dts.length; i++) {
        qaPairs.push({
          q: $(dts[i]).text().trim(),
          a: $(dds[i]).text().trim()
        });
      }
    } else {
      // Find Q and A in h3/p or similar
      const allText = $('div').text() || $.text();
      // Or just look for tags containing Q1: and A1:
      const qElements = $('h3, p, div, span').filter(function() {
        return $(this).text().trim().match(/^Q\d+:/i);
      }).toArray();
      
      const aElements = $('h3, p, div, span, ul').filter(function() {
        const text = $(this).text().trim();
        // The answer could be a p tag starting with A1: or a group of tags. 
        // Actually, let's just parse the HTML.
        return text.match(/^A\d+:/i) || text.includes('A1:');
      }).toArray();
      
      // A more robust way for the non-dl ones: just extract raw text and split by Q1:, A1:, Q2:, A2:...
      const textNodes = $.root().text();
      let regexQA = /(Q\d+:.*?)(?=A\d+:)(A\d+:.*?)(?=Q\d+:|$)/gis;
      let qaMatch;
      while ((qaMatch = regexQA.exec(textNodes)) !== null) {
        qaPairs.push({
          q: qaMatch[1].trim().replace(/\s+/g, ' '),
          a: qaMatch[2].trim().replace(/\s+/g, ' ')
        });
      }
      
      if (qaPairs.length === 0) {
          // If the regex above failed because the A1: text has linebreaks and the $ won't match correctly, let's try a different approach.
          let qMatches = [];
          let aMatches = [];
          let fullText = textNodes;
          
          let qRegex = /(Q\d+:\s*.*?)(?=A\d+:)/gs;
          let aRegex = /(A\d+:\s*.*?)(?=Q\d+:|$)/gs;
          
          let qm, am;
          while ((qm = qRegex.exec(fullText)) !== null) qMatches.push(qm[1].trim());
          while ((am = aRegex.exec(fullText)) !== null) aMatches.push(am[1].trim());
          
          if (qMatches.length === aMatches.length && qMatches.length > 0) {
            for (let i=0; i<qMatches.length; i++) {
               qaPairs.push({q: qMatches[i], a: aMatches[i]});
            }
          }
      }
    }
    
    if (qaPairs.length > 0) {
      let markdownFaq = `#### FAQ\n\n`;
      
      for (const pair of qaPairs) {
        let qText = pair.q.replace(/^(Q\d+:)\s*/i, '');
        let aText = pair.a.replace(/^(A\d+:)\s*/i, '');
        
        markdownFaq += `**<span style="color: #E67E22;">Q: ${qText}</span>**\n\n`;
        markdownFaq += `<span style="color: #34495E;">A: ${aText}</span>\n\n`;
      }
      
      content = content.replace(faqHtml, markdownFaq.trim());
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Updated FAQ in ${file} with ${qaPairs.length} pairs.`);
    } else {
      console.log(`Mismatch or no Q/A found in ${file}`);
    }
  }
}
