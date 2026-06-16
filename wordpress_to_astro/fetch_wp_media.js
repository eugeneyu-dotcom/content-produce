const fs = require('fs');
const path = require('path');

const site = { name: 'joaillerie', url: 'https://www.joaillerie-et-symbolique.com' };

async function fetchFromWP(siteUrl, type) {
  let allData = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    try {
      console.log(`Fetching ${type} from ${siteUrl} (Page ${page})...`);
      const res = await fetch(`${siteUrl}/wp-json/wp/v2/${type}?_embed=1&per_page=100&page=${page}`);
      
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

async function run() {
  console.log(`\n=== Fetching Media for: ${site.name} ===`);
  const posts = await fetchFromWP(site.url, 'posts');
  fs.writeFileSync('joaillerie_posts.json', JSON.stringify(posts, null, 2), 'utf-8');
  console.log('Saved joaillerie_posts.json');

  const outDir = path.join(__dirname, site.name, 'src/content/blog');

  for (const post of posts) {
    const slug = post.slug;
    let heroImage = '';

    if (post._embedded && post._embedded['wp:featuredmedia'] && post._embedded['wp:featuredmedia'][0]) {
      const media = post._embedded['wp:featuredmedia'][0];
      if (media.source_url) {
        // e.g. https://www.joaillerie-et-symbolique.com/wp-content/uploads/2026/01/image.webp
        const urlObj = new URL(media.source_url);
        const urlPath = urlObj.pathname; // /wp-content/uploads/2026/01/image.webp
        const localPath = urlPath.replace('/wp-content/uploads', '/media-images');
        heroImage = localPath;
      }
    }

    if (heroImage) {
      const mdPath = path.join(outDir, `${slug}.md`);
      if (fs.existsSync(mdPath)) {
        let mdContent = fs.readFileSync(mdPath, 'utf-8');
        if (!mdContent.includes('heroImage:')) {
          mdContent = mdContent.replace('---', `---\nheroImage: "${heroImage}"`);
          fs.writeFileSync(mdPath, mdContent, 'utf-8');
          console.log(`Updated ${slug}.md with heroImage: ${heroImage}`);
        } else {
            mdContent = mdContent.replace(/heroImage:.*(\r?\n)/, `heroImage: "${heroImage}"$1`);
            fs.writeFileSync(mdPath, mdContent, 'utf-8');
            console.log(`Updated ${slug}.md with heroImage: ${heroImage} (replaced)`);
        }
      }
    }
  }
}

run().catch(console.error);
