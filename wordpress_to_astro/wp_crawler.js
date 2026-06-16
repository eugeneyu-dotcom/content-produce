const fs = require('fs');
const path = require('path');

const sites = [
  { name: 'Desk', url: 'https://www.minimal-desk-studio.com' },
  { name: 'Dream', url: 'https://www.encyclopedia-of-dreams.com' },
  { name: 'joaillerie', url: 'https://www.joaillerie-et-symbolique.com' },
  { name: 'Legend', url: 'https://www.global-urban-legends.com' }
];

async function fetchFromWP(siteUrl, type) {
  let allData = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    try {
      console.log(`Fetching ${type} from ${siteUrl} (Page ${page})...`);
      const res = await fetch(`${siteUrl}/wp-json/wp/v2/${type}?per_page=100&page=${page}`);
      
      if (!res.ok) {
        console.error(`Error fetching ${type} from ${siteUrl}: ${res.statusText}`);
        break;
      }

      if (page === 1) {
        const totalPagesHeader = res.headers.get('x-wp-totalpages');
        if (totalPagesHeader) {
          totalPages = parseInt(totalPagesHeader, 10);
        }
      }

      const data = await res.json();
      allData = allData.concat(data);
      page++;
    } catch (err) {
      console.error(`Failed to fetch ${type} from ${siteUrl}`, err);
      break;
    }
  }
  return allData;
}

function sanitizeTitle(title) {
  return title.replace(/"/g, '\\"');
}

async function run() {
  for (const site of sites) {
    console.log(`\n=== Processing Site: ${site.name} ===`);
    
    const outDir = path.join(__dirname, site.name, 'src/content/blog');
    fs.mkdirSync(outDir, { recursive: true });

    // Fetch Posts
    const posts = await fetchFromWP(site.url, 'posts');
    for (const post of posts) {
      const slug = post.slug;
      const title = post.title && post.title.rendered ? post.title.rendered : slug;
      const content = post.content && post.content.rendered ? post.content.rendered : '';
      const date = post.date || new Date().toISOString();

      const mdContent = `---
title: "${sanitizeTitle(title)}"
slug: "${slug}"
date: "${date}"
type: "post"
---

${content}
`;
      fs.writeFileSync(path.join(outDir, `${slug}.md`), mdContent, 'utf-8');
    }
    console.log(`Saved ${posts.length} posts for ${site.name}`);

    // Fetch Pages
    const pages = await fetchFromWP(site.url, 'pages');
    for (const pageObj of pages) {
      const slug = pageObj.slug;
      const title = pageObj.title && pageObj.title.rendered ? pageObj.title.rendered : slug;
      const content = pageObj.content && pageObj.content.rendered ? pageObj.content.rendered : '';
      const date = pageObj.date || new Date().toISOString();

      const mdContent = `---
title: "${sanitizeTitle(title)}"
slug: "${slug}"
date: "${date}"
type: "page"
---

${content}
`;
      // Pages can also be saved in the blog folder or a pages folder.
      // Saving in the same place for simplicity.
      fs.writeFileSync(path.join(outDir, `${slug}.md`), mdContent, 'utf-8');
    }
    console.log(`Saved ${pages.length} pages for ${site.name}`);
  }
  
  console.log('\nAll done! Content successfully migrated via WordPress REST API.');
}

run().catch(console.error);
