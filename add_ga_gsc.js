const fs = require('fs');
const path = require('path');

const sites = ['Dream', 'joaillerie', 'Desk', 'Legend'];

const gaGscSnippet = `
<!-- Google Search Console Verification -->
<meta name="google-site-verification" content="YOUR_GSC_VERIFICATION_CODE_HERE" />

<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());

  gtag('config', 'G-XXXXXXXXXX');
</script>
`;

sites.forEach(site => {
    const baseHeadPath = path.join(__dirname, site, 'src', 'components', 'BaseHead.astro');
    if (!fs.existsSync(baseHeadPath)) return;

    let content = fs.readFileSync(baseHeadPath, 'utf8');

    // Only inject if not already injected
    if (!content.includes('YOUR_GSC_VERIFICATION_CODE_HERE')) {
        // Inject after <meta name="generator" ... /> or <!-- Global Metadata -->
        const generatorMatch = content.match(/<meta name="generator" content=\{Astro.generator\} \/>\n/);
        
        if (generatorMatch) {
            content = content.replace(
                generatorMatch[0],
                `${generatorMatch[0]}\n${gaGscSnippet}\n`
            );
            fs.writeFileSync(baseHeadPath, content);
            console.log(`[${site}] Injected GA4 and GSC placeholders into BaseHead.astro`);
        } else {
            // fallback inject after title
            const titleMatch = content.match(/<title>\{title\}<\/title>\n/);
            if (titleMatch) {
                content = content.replace(
                    titleMatch[0],
                    `${titleMatch[0]}\n${gaGscSnippet}\n`
                );
                fs.writeFileSync(baseHeadPath, content);
                console.log(`[${site}] Injected GA4 and GSC placeholders into BaseHead.astro`);
            }
        }
    }
});
