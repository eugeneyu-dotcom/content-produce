const fs = require('fs');
const path = require('path');

const siteConfigs = {
    'Dream': {
        title: 'The Master Encyclopedia of Dreams',
        description: 'Decode the Language of the Subconscious: Journey through the neurobiology, psychology, and spiritual evolution of your nightly visions.',
        url: 'https://www.encyclopedia-of-dreams.com',
        lang: 'en'
    },
    'Legend': {
        title: 'The Global Encyclopedia of Urban Legends',
        description: 'Unveiling the Psychology and History behind Global Urban Legends, Creepypastas, and Cryptids.',
        url: 'https://www.global-urban-legends.com',
        lang: 'en'
    },
    'joaillerie': {
        title: 'Joaillerie et Symbolique',
        description: "L'Encyclopédie des Symboles de Bijouterie : Le Langage Silencieux des Ornements. Découvrez la signification cachée des pierres et des métaux.",
        url: 'https://www.joaillerie-et-symbolique.com',
        lang: 'fr'
    },
    'Desk': {
        title: 'Minimal Desk Studio',
        description: 'ミニマリスト・デスクセットアップの究極ガイド。機能と美が融合した理想のワークスペース構築法。',
        url: 'https://www.minimal-desk-studio.com',
        lang: 'ja'
    }
};

const findFiles = (dir, ext) => {
    let results = [];
    if (!fs.existsSync(dir)) return results;
    const list = fs.readdirSync(dir);
    for (const file of list) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            results = results.concat(findFiles(fullPath, ext));
        } else if (fullPath.endsWith(ext)) {
            results.push(fullPath);
        }
    }
    return results;
};

Object.keys(siteConfigs).forEach(site => {
    const config = siteConfigs[site];

    // 1. Update consts.ts
    const constsPath = path.join(__dirname, site, 'src', 'consts.ts');
    if (fs.existsSync(constsPath)) {
        let content = fs.readFileSync(constsPath, 'utf8');
        content = content.replace(/export const SITE_TITLE = '.*?';/, `export const SITE_TITLE = '${config.title}';`);
        content = content.replace(/export const SITE_DESCRIPTION = '.*?';/, `export const SITE_DESCRIPTION = '${config.description}';`);
        fs.writeFileSync(constsPath, content);
        console.log(`[${site}] Updated consts.ts`);
    }

    // 2. Update astro.config.mjs
    const astroConfigPath = path.join(__dirname, site, 'astro.config.mjs');
    if (fs.existsSync(astroConfigPath)) {
        let content = fs.readFileSync(astroConfigPath, 'utf8');
        content = content.replace(/site:\s*'https?:\/\/example\.com'/, `site: '${config.url}'`);
        fs.writeFileSync(astroConfigPath, content);
        console.log(`[${site}] Updated astro.config.mjs`);
    }

    // 3. Update HTML lang attributes
    const astroFiles = findFiles(path.join(__dirname, site, 'src'), '.astro');
    let changedLangCount = 0;
    astroFiles.forEach(file => {
        let content = fs.readFileSync(file, 'utf8');
        const langRegex = /<html lang="[a-zA-Z\-]+">/g;
        if (content.match(langRegex)) {
            const newContent = content.replace(langRegex, `<html lang="${config.lang}">`);
            if (newContent !== content) {
                fs.writeFileSync(file, newContent);
                changedLangCount++;
            }
        }
    });
    console.log(`[${site}] Updated lang="${config.lang}" in ${changedLangCount} files.`);
});

console.log("SEO updates complete!");
