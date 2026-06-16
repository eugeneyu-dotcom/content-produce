const fs = require('fs');

const deskData = JSON.parse(fs.readFileSync('output_map.txt', 'utf8').split('Found')[0].replace('Desk Data: ', ''));

const sop2 = fs.readFileSync('SOP2-2_Keyword.csv', 'utf8').split('\n');
const keywordToPost = {}; // Maps keyword to slug

// We need to map the keywords from SOP2-2 to actual post slugs.
// How do we find the slug?
// Maybe the keyword is in the frontmatter `slug` or `title` or we can just search the blog files?
