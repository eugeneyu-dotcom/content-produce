const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'joaillerie', 'src', 'content', 'blog', 'a-propos.md');
let content = fs.readFileSync(filePath, 'utf-8');

const parts = content.split('---');
const frontmatter = '---' + parts[1] + '---';
let body = parts.slice(2).join('---');

// Clean up HTML tags into Markdown
body = body.replace(/<h1[^>]*>\s*(.*?)\s*<\/h1>/g, '# $1\n\n');
body = body.replace(/<h2[^>]*>\s*(.*?)\s*<\/h2>/g, '## $1\n\n');
body = body.replace(/<h3[^>]*>\s*(.*?)\s*<\/h3>/g, '### $1\n\n');
body = body.replace(/<h4[^>]*>\s*(.*?)\s*<\/h4>/g, '#### $1\n\n');
body = body.replace(/<p[^>]*>\s*(.*?)\s*<\/p>/g, '$1\n\n');
body = body.replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/g, '[$2]($1)');
body = body.replace(/<strong[^>]*>\s*(.*?)\s*<\/strong>/g, '**$1**');
body = body.replace(/<em[^>]*>\s*(.*?)\s*<\/em>/g, '*$1*');
body = body.replace(/<br\s*\/?>/g, '\n');
body = body.replace(/<div[^>]*>/g, '');
body = body.replace(/<\/div>/g, '');
body = body.replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*>/g, '![$2]($1)\n\n');
// Also catch without alt
body = body.replace(/<img[^>]*src="([^"]*)"[^>]*>/g, '![]($1)\n\n');

body = body.replace(/\n\s*\n/g, '\n\n');

const cleanContent = frontmatter + '\n\n' + body.trim() + '\n';

fs.writeFileSync(filePath, cleanContent, 'utf-8');
console.log('Cleaned up a-propos.md into Markdown.');

// Now we update Header.astro to point to /blog/a-propos/ instead of /about
const headerPath = path.join(__dirname, 'joaillerie', 'src', 'components', 'Header.astro');
let headerContent = fs.readFileSync(headerPath, 'utf-8');
headerContent = headerContent.replace(/<HeaderLink href="\/about">À Propos<\/HeaderLink>/g, '<HeaderLink href="/blog/a-propos/">À Propos</HeaderLink>');
fs.writeFileSync(headerPath, headerContent, 'utf-8');
console.log('Updated Header.astro to point to /blog/a-propos/');

// Remove the old about.astro to prevent confusion
const aboutPath = path.join(__dirname, 'joaillerie', 'src', 'pages', 'about.astro');
if (fs.existsSync(aboutPath)) {
    fs.unlinkSync(aboutPath);
    console.log('Removed old about.astro');
}
