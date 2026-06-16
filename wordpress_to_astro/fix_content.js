const fs = require('fs');
const path = require('path');

// Basic HTML entity decoder
function decodeHTMLEntities(text) {
    return text
        .replace(/&rsquo;/g, "'")
        .replace(/&#8217;/g, "'")
        .replace(/&#8211;/g, "-")
        .replace(/&#8212;/g, "—")
        .replace(/&/g, "&")
        .replace(/"/g, '"');
}

// 1. Read CSV and parse FAQs
const csvPath = path.join(__dirname, 'SOP2-1產出（子頁標題）.csv');
const csvContent = fs.readFileSync(csvPath, 'utf-8');
const rows = csvContent.split('\n');

const faqMap = {}; // slug -> html snippet

// Find Joaillerie rows and map them
for (const row of rows) {
    if (row.includes('Joaillerie et Symbolique')) {
        const columns = row.split('","'); // It's quoted CSV, but let's do a simple split or regex
        // Since CSV parsing can be tricky with commas inside quotes, let's use a simple regex for the columns we need.
        // Actually, looking at the CSV provided:
        // Joaillerie et Symbolique,L'Encyclopédie des Symboles de Bijouterie : Le Langage Silencieux des Ornements,Le Langage des Doigts et l'Autorité,"...",戒指位置與權力象徵...,Symbolisme des bagues par doigt,資訊型 + 引導型,"Q1: Pourquoi l'index est-il lié au pouvoir ? A: Car il est régi par Jupiter, roi des dieux. Q2: ...",...
        
        // Let's use a proper approach or just search by post title slug
        let titleCol = '';
        let faqCol = '';
        const matchTitle = row.match(/Joaillerie et Symbolique,[^,]+,([^,]+),"/);
        if (matchTitle && matchTitle[1]) {
            titleCol = matchTitle[1];
        }

        // Q1: ... A: ... Q2: ... A: ... Q3: ... A: ... Q4: ... A: ... Q5: ... A: ...
        const matchFaq = row.match(/(Q1:.*?(?:A:.*?)(?=,Q1:|"$))/);
        if (matchFaq && matchFaq[1]) {
            faqCol = matchFaq[1];
        }

        // Alternative: we can just manually map since there are only 6 pillars.
    }
}

// Since CSV parsing is messy in JS without a library, and we only have 6 pillars for Joaillerie, let's hardcode the mapping based on the read_file output:
const manualFaqMap = {
    'le-langage-des-doigts-et-lautorite': `Q1: Pourquoi l'index est-il lié au pouvoir ? A: Car il est régi par Jupiter, roi des dieux. Q2: Main gauche ou droite ? A: Gauche pour l'intuition, droite pour l'action. Q3: Signification bague pouce ? A: Volonté et indépendance. Q4: Bague petit doigt ? A: Intelligence et éloquence. Q5: Bague médius ? A: Équilibre et responsabilité.`,
    'lenergie-des-pierres-et-la-guerison': `Q1: Comment purifier les pierres ? A: Par l'eau ou la lune pour préserver l'énergie. Q2: L'émeraude et le cœur ? A: Elle harmonise les émotions et apporte la paix. Q3: Saphir et sagesse ? A: Il clarifie l'esprit et la concentration. Q4: Améthyste et sommeil ? A: Elle apaise l'esprit et évite les cauchemars. Q5: Porter plusieurs pierres ? A: Oui, si leurs énergies sont compatibles.`,
    'totems-sacres-et-protection-antique': `Q1: Signification de l'Œil Bleu ? A: Protection contre la jalousie d'autrui. Q2: Main de Fatma origine ? A: Symbole de protection universel (Hamsa). Q3: Scarabée sacré égyptien ? A: Symbole de renaissance et de cycle éternel. Q4: Arbre de vie ? A: Connexion entre ciel, terre et racines. Q5: Bijou cassé ? A: Signifie qu'il a absorbé un mal à votre place.`,
    'alchimie-des-metaux-et-eternite': `Q1: Pourquoi l'or est-il sacré ? A: Pour son éclat solaire et son incorruptibilité. Q2: Argent et intuition ? A: Il favorise l'écoute de soi et des rêves. Q3: Or rose signification ? A: Romance et tendresse moderne. Q4: Le platine en bijouterie ? A: Force pure et rareté ultime. Q5: Métal et allergies ? A: L'or pur et le platine sont les plus sûrs.`,
    'rites-de-passage-et-memoire': `Q1: Origine de la bague de fiançailles ? A: Un symbole d'engagement éternel (diamant). Q2: Qu'est-ce qu'un bijou de deuil ? A: Un objet porté pour honorer un défunt (ex: jais). Q3: Bijoux de baptême ? A: Marque le début d'un chemin spirituel. Q4: Transmettre un bijou ? A: Passage de l'histoire familiale entre générations. Q5: Bague d'amitié ? A: Engagement non romantique mais loyal.`,
    'esthetique-de-lidentite-et-sous-cultures': `Q1: Pourquoi le Choker est-il iconique ? A: Il oscille entre servitude et haute mode. Q2: Bijoux gothiques symbolisme ? A: Beauté dans l'obscurité et memento mori. Q3: Minimalisme en joaillerie ? A: Focus sur l'essence et la pureté. Q4: Bijoux Punk et rébellion ? A: Détournement d'objets usuels (épingles). Q5: Signification du piercing ? A: Marqueur culturel ou rite moderne.`,
    'faune-flore-et-secrets-de-la-nature': `Q1: Pourquoi le serpent en bijoux ? A: Symbole d'amour éternel et de sagesse. Q2: Papillon et transformation ? A: Représente l'âme et le renouveau personnel. Q3: L'abeille de Napoléon ? A: Symbole d'immortalité et d'ordre. Q4: Fleur de lys signification ? A: Royauté et pureté (France). Q5: La plume en joaillerie ? A: Légèreté, liberté et voyage spirituel.`
};

function buildFAQHTML(faqString) {
    if (!faqString) return '';
    // Format Q1: ... A: ... into HTML
    const pairs = faqString.match(/Q\d+:.*?A:.*?(?=Q\d+:|$)/g);
    if (!pairs) return '';
    
    let html = `<div class="faq-section" style="margin-top: 3em; padding: 2em; background-color: var(--gray-light); border-radius: 12px;">\n<h2 style="text-align: center; margin-bottom: 1.5em; color: var(--accent-dark);">Questions Fréquentes (FAQ)</h2>\n<div class="faq-list" style="display: flex; flex-direction: column; gap: 1.5em;">\n`;
    
    for (const pair of pairs) {
        const qMatch = pair.match(/(Q\d+:.*?)\s+A:/);
        const aMatch = pair.match(/A:\s*(.*)/);
        if (qMatch && aMatch) {
            html += `  <div class="faq-item" style="background: white; padding: 1.5em; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); border-left: 4px solid var(--accent);">\n`;
            html += `    <h4 class="faq-question" style="margin: 0 0 0.5em 0; color: var(--gray-dark); font-weight: 600;">${qMatch[1].replace(/Q\d+:\s*/, '')}</h4>\n`;
            html += `    <p class="faq-answer" style="margin: 0; color: #555;"><strong>Réponse :</strong> ${aMatch[1]}</p>\n`;
            html += `  </div>\n`;
        }
    }
    html += `</div>\n</div>\n`;
    return html;
}

const joaillerieDir = path.join(__dirname, 'joaillerie', 'src', 'content', 'blog');
const mdFiles = fs.readdirSync(joaillerieDir).filter(f => f.endsWith('.md') || f.endsWith('.mdx'));

for (const file of mdFiles) {
    const filePath = path.join(joaillerieDir, file);
    let content = fs.readFileSync(filePath, 'utf-8');
    
    // Decode HTML entities
    content = decodeHTMLEntities(content);

    // Inject FAQ
    const slugMatch = content.match(/slug:\s*"(.*?)"/);
    if (slugMatch && slugMatch[1]) {
        const slug = slugMatch[1];
        if (manualFaqMap[slug]) {
            // Remove old FAQ if it exists
            if (content.includes('<div class="faq-section"')) {
                content = content.replace(/<div class="faq-section"[\s\S]*<\/div>\n<\/div>/, '');
            }
            // Append new FAQ
            content += '\n\n' + buildFAQHTML(manualFaqMap[slug]);
            console.log(`Injected FAQ for ${slug}`);
        }
    }

    fs.writeFileSync(filePath, content, 'utf-8');
}
console.log('Entities decoded and FAQs injected successfully.');
