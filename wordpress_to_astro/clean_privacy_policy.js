const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'joaillerie', 'src', 'content', 'blog', 'politique-de-confidentialite.md');
let content = fs.readFileSync(filePath, 'utf-8');

// The file has a frontmatter block followed by raw HTML.
// Let's split it into frontmatter and body.
const parts = content.split('---');
const frontmatter = '---' + parts[1] + '---';
let body = parts.slice(2).join('---');

// We want to extract the meaningful text from the Spectra blocks.
// Looking at the HTML, the meaningful parts are inside:
// <h2 ...> Politique de Confidentialité </h2>
// <p ...> Chez Joaillerie... </p>
// <h4 ...> 01 </h4>
// <h4 ...> Qui sommes-nous ? </h4>
// <p ...> L'adresse... </p>

// Let's replace the h2
body = body.replace(/<h2[^>]*>\s*(.*?)\s*<\/h2>/g, '## $1\n\n');

// For the h4 blocks, we have two types: numbering (01, 02) and titles. We can just convert all h4 to markdown headings.
// But numbering might look weird. Let's just convert h4 to ###
body = body.replace(/<h4[^>]*>\s*(.*?)\s*<\/h4>/g, '### $1\n\n');

// Convert p tags to plain text
body = body.replace(/<p[^>]*>\s*(.*?)\s*<\/p>/g, '$1\n\n');

// Convert links inside paragraphs
body = body.replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/g, '[$2]($1)');

// Convert br tags to newlines
body = body.replace(/<br\s*\/?>/g, '\n');

// Remove all div tags and their attributes (opening and closing)
body = body.replace(/<div[^>]*>/g, '');
body = body.replace(/<\/div>/g, '');

// Clean up remaining image and figure tags (if the user wants clean markdown, maybe keep the image but just as markdown)
// We see <figure ...><img ... src="/media-images/2026/03/M-final-2.png" alt="" ...></figure>
body = body.replace(/<figure[^>]*>\s*<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*>\s*<\/figure>/g, '![$2]($1)\n\n');
// Also catch any standalone img
body = body.replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*>/g, '![$2]($1)\n\n');

// Clean up multiple blank lines
body = body.replace(/\n\s*\n/g, '\n\n');

const cleanContent = frontmatter + '\n\n' + body.trim() + '\n';

fs.writeFileSync(filePath, cleanContent, 'utf-8');
console.log('Cleaned up politique-de-confidentialite.md into Markdown.');
