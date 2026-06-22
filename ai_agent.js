const fs = require('fs');
const path = require('path');
const https = require('https');

// Sleep helper
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Parse Human Context by Chinese component labels
function parseHumanContext(hcText) {
    const result = { trigger: '', pain_point: '', details: '', bias: '', evidence: '' };
    const labelMap = { '觸發': 'trigger', '痛點': 'pain_point', '細節': 'details', '結論': 'bias', '偏見': 'bias', '證據': 'evidence' };
    const allLabels = Object.keys(labelMap);
    const pattern = new RegExp(`(${allLabels.join('|')})：`, 'g');
    const matches = [...hcText.matchAll(pattern)];
    for (let i = 0; i < matches.length; i++) {
        const match = matches[i];
        const key = labelMap[match[1]];
        const contentStart = match.index + match[0].length;
        const contentEnd = i + 1 < matches.length ? matches[i + 1].index : hcText.length;
        const content = hcText.substring(contentStart, contentEnd).trim();
        if (key && content && !result[key]) result[key] = content;
    }
    return result;
}

// Load API Keys
const apiKeysContent = fs.readFileSync(path.join(__dirname, 'API_Key'), 'utf8');
const apiKeys = {};
apiKeysContent.split('\n').forEach(line => {
    if (line.includes(':')) {
        // Find first colon index to allow URLs with colons (like https://)
        const colonIdx = line.indexOf(':');
        const key = line.substring(0, colonIdx).trim();
        const value = line.substring(colonIdx + 1).trim();
        apiKeys[key] = value;
    }
});

const SERPER_API_KEY = (apiKeys['Serper'] || '').replace(/[^\x21-\x7E]/g, '');
const GEMINI_API_KEY = (apiKeys['Gemini'] || '').replace(/[^\x21-\x7E]/g, '');
const GOOGLE_SHEET_URL = (apiKeys['GoogleSheet'] || '').trim();

// Debug: show parsed key names and sanitized key info
console.log('[Debug] API_Key 檔案中讀到的 key 名稱:', Object.keys(apiKeys));
console.log(`[Debug] Gemini key 長度: ${GEMINI_API_KEY.length}, 前5碼: "${GEMINI_API_KEY.slice(0, 5)}", 後5碼: "${GEMINI_API_KEY.slice(-5)}"`);
console.log(`[Debug] Serper key 長度: ${SERPER_API_KEY.length}, 前5碼: "${SERPER_API_KEY.slice(0, 5)}"`);

if (!SERPER_API_KEY || !GEMINI_API_KEY) {
    console.error("Missing API Keys in API_Key file!");
    process.exit(1);
}

// Helpers
const parseCSV = (content) => {
    const text = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    let pos = 0;

    const parseField = () => {
        let field = '';
        if (pos < text.length && text[pos] === '"') {
            pos++; // skip opening quote
            while (pos < text.length) {
                if (text[pos] === '"') {
                    if (pos + 1 < text.length && text[pos + 1] === '"') {
                        field += '"'; pos += 2; // escaped quote
                    } else {
                        pos++; break; // closing quote
                    }
                } else {
                    field += text[pos++];
                }
            }
        } else {
            while (pos < text.length && text[pos] !== ',' && text[pos] !== '\n') {
                field += text[pos++];
            }
        }
        return field;
    };

    const parseRow = () => {
        const row = [];
        while (pos < text.length && text[pos] !== '\n') {
            row.push(parseField());
            if (pos < text.length && text[pos] === ',') pos++;
            else break;
        }
        if (pos < text.length && text[pos] === '\n') pos++;
        return row;
    };

    const headers = parseRow().map(h => h.trim());
    const result = [];
    while (pos < text.length) {
        if (text[pos] === '\n') { pos++; continue; }
        const row = parseRow();
        if (row.length === headers.length && row.some(f => f.trim() !== '')) {
            const obj = {};
            headers.forEach((h, idx) => obj[h] = row[idx]);
            result.push(obj);
        }
    }
    return result;
};

// Site Mapping
const siteMap = {
    'Dream Interpretation': 'Dream',
    'Joaillerie et Symbolique': 'joaillerie',
    'Joaillerie': 'joaillerie',
    'ミニマリスト・デスクセットアップ': 'Desk',
    'Global Urban Legends Analysis': 'Legend'
};

const callSerperAPI = (query) => {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify({ q: query, num: 10 });
        const options = {
            hostname: 'google.serper.dev',
            path: '/search',
            method: 'POST',
            headers: {
                'X-API-KEY': SERPER_API_KEY,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data)
            }
        };

        const req = https.request(options, (res) => {
            const chunks = [];
            res.on('data', (chunk) => chunks.push(chunk));
            res.on('end', () => resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))));
        });

        req.on('error', (error) => reject(error));
        req.write(data);
        req.end();
    });
};

const callGeminiAPI = (prompt, jsonMode = true) => {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: jsonMode ? { responseMimeType: "application/json" } : {}
        });
        
        const options = {
            hostname: 'generativelanguage.googleapis.com',
            path: `/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data)
            }
        };

        const req = https.request(options, (res) => {
            const chunks = [];
            res.on('data', (chunk) => chunks.push(chunk));
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(Buffer.concat(chunks).toString('utf8'));
                    if (parsed.error) {
                        reject(parsed.error);
                    } else {
                        resolve(parsed.candidates[0].content.parts[0].text);
                    }
                } catch (e) {
                    reject(e);
                }
            });
        });

        req.on('error', (error) => reject(error));
        req.write(data);
        req.end();
    });
};

const generateImageWithImagen = (prompt) => {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify({
            instances: [
                { prompt: prompt }
            ],
            parameters: {
                sampleCount: 1
            }
        });
        
        const options = {
            hostname: 'generativelanguage.googleapis.com',
            path: `/v1beta/models/imagen-4.0-generate-001:predict?key=${GEMINI_API_KEY}`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data)
            }
        };

        const req = https.request(options, (res) => {
            const chunks = [];
            res.on('data', (chunk) => chunks.push(chunk));
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(Buffer.concat(chunks).toString('utf8'));
                    if (parsed.error) {
                        reject(parsed.error);
                    } else if (parsed.predictions && parsed.predictions[0] && parsed.predictions[0].bytesBase64Encoded) {
                        resolve(parsed.predictions[0].bytesBase64Encoded);
                    } else {
                        reject(new Error(parsed.error ? parsed.error.message : "No image data returned."));
                    }
                } catch (e) {
                    reject(e);
                }
            });
        });

        req.on('error', (error) => reject(error));
        req.write(data);
        req.end();
    });
};

const generateImageWithRetry = async (prompt, retries = 3) => {
    for (let i = 0; i < retries; i++) {
        try {
            return await generateImageWithImagen(prompt);
        } catch (e) {
            console.error(`Failed to generate image (Attempt ${i + 1}/${retries}). Error: ${e.message || e}`);
            if (i < retries - 1) {
                console.log(`Waiting 60 seconds before retrying...`);
                await sleep(60000);
            } else {
                throw new Error("All retries failed.");
            }
        }
    }
};

const run = async () => {
    console.log("=== AI Agent 自動更新部落格系統 ===");
    
    // 1. Download CSV from Google Sheets if configured
    let n8nPath = path.join(__dirname, 'N8N_work - Workflow_Config.csv');
    if (!fs.existsSync(n8nPath)) {
        n8nPath = path.join(__dirname, 'N8N_work - Workflow_Config .csv');
    }
    
    if (GOOGLE_SHEET_URL) {
        console.log("Downloading latest task list from Google Sheets...");
        // Expecting a URL like: https://docs.google.com/spreadsheets/d/DOC_ID/edit?gid=SHEET_ID#gid=SHEET_ID
        const docIdMatch = GOOGLE_SHEET_URL.match(/\/d\/([a-zA-Z0-9-_]+)/);
        let exportUrl = '';
        if (docIdMatch) {
            exportUrl = `https://docs.google.com/spreadsheets/d/${docIdMatch[1]}/export?format=csv`;
            const gidMatch = GOOGLE_SHEET_URL.match(/gid=([0-9]+)/);
            if (gidMatch) {
                exportUrl += `&gid=${gidMatch[1]}`;
            }
        }
        
        if (exportUrl) {
            try {
                const csvData = await new Promise((resolve, reject) => {
                    https.get(exportUrl, (res) => {
                        if (res.statusCode === 307 || res.statusCode === 302) {
                            // handle redirect
                            https.get(res.headers.location, (redirectRes) => {
                                const chunks = [];
                                redirectRes.on('data', chunk => chunks.push(chunk));
                                redirectRes.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
                            }).on('error', reject);
                        } else {
                            const chunks = [];
                            res.on('data', chunk => chunks.push(chunk));
                            res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
                        }
                    }).on('error', reject);
                });
                fs.writeFileSync(n8nPath, csvData);
                console.log("Successfully downloaded and saved N8N_work.csv!");
            } catch (e) {
                console.error("Failed to download CSV from Google Sheets. Using local file instead. Error:", e.message);
            }
        } else {
            console.log("Invalid GoogleSheet URL format in API_Key file. Using local file instead.");
        }
    }
    
    // 2. Scan Tasks
    const n8nContent = fs.readFileSync(n8nPath, 'utf8');
    const n8nRows = parseCSV(n8nContent);
    
    // 2. Find all Active tasks
    const activeTasks = n8nRows.filter(row => row['Status'] === 'Active' || row['Status'] === 'active');

    if (activeTasks.length === 0) {
        console.log("No 'Active' tasks found. Set Status='Active' on the rows you want to process.");
        return;
    }

    console.log(`\nFound ${activeTasks.length} active task(s). Starting batch processing...\n`);
    const results = { success: [], failed: [] };

    for (let taskIndex = 0; taskIndex < activeTasks.length; taskIndex++) {
        const task = activeTasks[taskIndex];
        console.log(`\n${'='.repeat(55)}`);
        console.log(`Task ${taskIndex + 1} / ${activeTasks.length}: ${task['Keyword']}`);
        console.log('='.repeat(55));

        try {
            const keyword = task['Keyword'];
            const language = task['Language'];
            const topic = task['Topic'];
            const site = siteMap[topic];
            const pillarDim = task['Pillar Post Dimesion']; // notice typo in CSV header
            let humanContext = task['Human_Context'] || '';

            if (!site) {
                throw new Error(`Unknown Topic '${topic}' — not found in siteMap. Check CSV 'Topic' column.`);
            }

            console.log(`Site: ${site} | Keyword: ${keyword} | Pillar: ${pillarDim}`);

            if (!humanContext) {
                console.log("No Human_Context in CSV. Generating fallback context via Gemini...");
                const contextPrompt = `Please write a short, opinionated, personal paragraph (in ${language}) about "${keyword}" representing a blogger's real-life experience or frustration to be used as writing context. Do not use JSON, just text.`;
                humanContext = await callGeminiAPI(contextPrompt, false);
                console.log(`[Generated Human Context]:\n${humanContext}\n`);
            }

            // Scout Report & Strategy Plan
            console.log("Fetching Google Search results via Serper...");
            const searchResults = await callSerperAPI(keyword);

            console.log("Calling Gemini (Scout) for strategy...");
            const scoutPrompt = `
### 原始變數
- 關鍵字：${keyword}
- 目標語言：${language}

### 搜尋結果
${JSON.stringify(searchResults.organic)}

### 執行要求
請執行 SOP 3-1 至 3-3：
1. 挑選 2-5 個最相關連結並提供摘要，作為後續外部連結使用。
2. 根據下列六大維度庫，為關鍵字 [${keyword}] 挑選 3-5 個維度並註明撰寫方向。
六大維度：
核心本質 (Essence)：底層邏輯、科學原理。
外部聯繫 (Connections)：文化歷史、社會演進、法律規範。
感官實踐 (Practice)：五感描述、操作指南、儀式感。
對比分析 (Comparison)：新舊對照、跨文化對比、優劣分析。
未來展望 (Future)：預測演化、技術發展、心理變遷。
真實案例 (Evidence)：歷史數據、名人軼事、實驗數據。

### 輸出格式 (JSON)
{
  "scout_report": [{"title": "...", "url": "...", "summary": "..."}],
  "strategy_plan": [{"dimension": "...", "direction": "..."}]
}
`;

            const scoutResponseStr = await callGeminiAPI(scoutPrompt, true);
            let scoutData;
            try {
                scoutData = JSON.parse(scoutResponseStr);
            } catch(e) {
                scoutData = JSON.parse(scoutResponseStr.replace(/```json/g,'').replace(/```/g,''));
            }
            console.log(`[Scout Complete] Selected ${scoutData.strategy_plan.length} dimensions.`);

            // Resolve pillar category slug (used for the mandatory /category/ link in Writer prompt)
            const categoryDir = path.join(__dirname, site, 'src', 'pages', 'category');
            let pillarSlug = '';
            if (fs.existsSync(categoryDir)) {
                const catFiles = fs.readdirSync(categoryDir).filter(f => f.endsWith('.astro'));
                for (const f of catFiles) {
                    const content = fs.readFileSync(path.join(categoryDir, f), 'utf8');
                    if (content.includes(pillarDim)) {
                        pillarSlug = f.replace('.astro', '');
                        break;
                    }
                }
            }

            // Discover internal links by scanning actual blog posts, then rank via Gemini
            console.log("Discovering internal links from site blog posts...");
            const blogDir = path.join(__dirname, site, 'src', 'content', 'blog');
            const internalCandidates = [];

            if (fs.existsSync(blogDir)) {
                const mdFiles = fs.readdirSync(blogDir).filter(f => f.endsWith('.md'));
                for (const file of mdFiles) {
                    try {
                        const fileContent = fs.readFileSync(path.join(blogDir, file), 'utf8');
                        const fmMatch = fileContent.match(/^---\n([\s\S]*?)\n---/);
                        if (!fmMatch) continue;
                        const fm = fmMatch[1];
                        const stripQuotes = s => s.trim().replace(/^["']|["']$/g, '').replace(/\\"/g, '"');
                        const titleLine = fm.match(/^title:\s*(.+)$/m);
                        const slugLine  = fm.match(/^slug:\s*(.+)$/m);
                        const descLine  = fm.match(/^description:\s*(.+)$/m);
                        if (!titleLine || !slugLine) continue;
                        const slug = stripQuotes(slugLine[1]);
                        internalCandidates.push({
                            title:       stripQuotes(titleLine[1]),
                            slug,
                            description: descLine ? stripQuotes(descLine[1]) : '',
                            url:         `/blog/${slug}/`
                        });
                    } catch (_) { /* skip unreadable files */ }
                }
            }

            let selectedInternalLinks = [];

            if (internalCandidates.length > 0) {
                const candidateList = internalCandidates
                    .map(c => `slug: "${c.slug}" | title: "${c.title}" | desc: "${c.description}"`)
                    .join('\n');

                const linkPickPrompt = `You are an SEO specialist. A new blog post about "${keyword}" (language: ${language}) is being written.
Select the 2 to 3 most topically relevant articles from the list below to use as natural internal links.
Return ONLY a JSON array of the selected slugs, e.g. ["slug-a", "slug-b"].

Available articles:
${candidateList}`;

                try {
                    const pickResponseStr = await callGeminiAPI(linkPickPrompt, true);
                    let parsed = JSON.parse(pickResponseStr);
                    // Handle both ["slug"] and {"slugs":["slug"]} response formats
                    if (!Array.isArray(parsed)) {
                        parsed = Object.values(parsed).find(v => Array.isArray(v)) || [];
                    }
                    selectedInternalLinks = parsed
                        .slice(0, 3)
                        .map(slug => internalCandidates.find(c => c.slug === String(slug)))
                        .filter(Boolean)
                        .map(c => c.url);
                } catch (e) {
                    console.log("Gemini link-pick failed, falling back to first 2 candidates.");
                    selectedInternalLinks = internalCandidates.slice(0, 2).map(c => c.url);
                }
            }

            // Fallback: if fewer than 2 links, prepend the CSV Pillar Post URL
            const rawPillarUrl = task['Pillar Post Url'] || '';
            const pillarPostPath = rawPillarUrl
                ? rawPillarUrl.replace(/^https?:\/\/[^\/]+/, '').replace(/\/?$/, '/') || rawPillarUrl
                : '';

            if (selectedInternalLinks.length < 2 && pillarPostPath) {
                if (!selectedInternalLinks.includes(pillarPostPath)) {
                    selectedInternalLinks.unshift(pillarPostPath);
                }
            }

            console.log(`[Internal Links] ${selectedInternalLinks.length} link(s) selected: ${selectedInternalLinks.join(', ')}`);

            // Anchor Extractor: parse HC by code, then translate via Gemini
            console.log("Parsing Human Context sections...");
            const parsedSections = parseHumanContext(humanContext);
            const isValid = v => v && v.trim().length > 10 && v.trim() !== '...';
            console.log(`[HC Parser] trigger: ${isValid(parsedSections.trigger) ? '✓' : '✗'} | pain_point: ${isValid(parsedSections.pain_point) ? '✓' : '✗'} | details: ${isValid(parsedSections.details) ? '✓' : '✗'} | bias: ${isValid(parsedSections.bias) ? '✓' : '✗'} | evidence: ${isValid(parsedSections.evidence) ? '✓' : '✗'}`);

            let anchors = { ...parsedSections };

            console.log("Calling Gemini (Translator) to translate author anchors...");
            const translatorPrompt = `Translate each of the following 5 labeled sections from Chinese into ${language}.

Rules — translate the SPECIFIC THING, not the category it belongs to:
- Named person stays named: "女朋友" → "my girlfriend" / "ma petite amie" / "彼女"
- Specific object stays specific: "彩色串珠的友誼手鏈" → "a colorful beaded friendship bracelet" / "un bracelet d'amitié en perles colorées"
- Specific reason stays exact: "她可能是因為要收衣服所以沒有手敲門" → "she was probably carrying laundry and couldn't knock"
- First-person stays first-person: "我發現..." → "I found..." / "j'ai constaté..." / "私は気づいた..."
- Translate the FULL section text, not just a summary sentence.

TRIGGER: """${parsedSections.trigger}"""
PAIN_POINT: """${parsedSections.pain_point}"""
DETAILS: """${parsedSections.details}"""
BIAS: """${parsedSections.bias}"""
EVIDENCE: """${parsedSections.evidence}"""

Return ONLY this JSON, no explanation:
{
  "trigger": "full translation of TRIGGER",
  "pain_point": "full translation of PAIN_POINT",
  "details": "full translation of DETAILS",
  "bias": "full translation of BIAS",
  "evidence": "full translation of EVIDENCE"
}`;

            try {
                const translationStr = await callGeminiAPI(translatorPrompt, true);
                let translated;
                try { translated = JSON.parse(translationStr); }
                catch(e) { translated = JSON.parse(translationStr.replace(/```json/g,'').replace(/```/g,'')); }
                anchors = {
                    trigger:    isValid(translated.trigger)    ? translated.trigger    : parsedSections.trigger,
                    pain_point: isValid(translated.pain_point) ? translated.pain_point : parsedSections.pain_point,
                    details:    isValid(translated.details)    ? translated.details    : parsedSections.details,
                    bias:       isValid(translated.bias)       ? translated.bias       : parsedSections.bias,
                    evidence:   isValid(translated.evidence)   ? translated.evidence   : parsedSections.evidence,
                };
                console.log(`[Translator] trigger: "${anchors.trigger.slice(0,60)}..."`);
                console.log(`[Translator] pain_point: "${anchors.pain_point.slice(0,60)}..."`);
                console.log(`[Translator] details: "${anchors.details.slice(0,60)}..."`);
                console.log(`[Translator] bias: "${anchors.bias.slice(0,60)}..."`);
                console.log(`[Translator] evidence: "${anchors.evidence.slice(0,60)}..."`);
            } catch(e) {
                console.log(`[Translator] Failed (${e.message}), using parsed Chinese sections as anchors.`);
            }

            // Article Generation
            console.log("Calling Gemini (Writer) to generate 1500-word article...");
            const writerPrompt = `
### Role & Persona
You are a ghostwriter retelling the human author's own lived experiences in their first-person voice — not yours. You are invisible. The human author is the star.
**[CRITICAL TONE CHECK]**: Do NOT be overly dramatic, aggressive, or "edgy." Express frustrations with grounded, adult restraint. Maintain a real, slightly exhausted, yet deeply knowledgeable persona.

### ⚠️ MANDATORY AUTHOR EXPERIENCES — THE BACKBONE OF THE ARTICLE
Below are 5 real fragments of the human author's own life, memories, and opinions (already translated into ${language}). They are the soul of this article. Your job: retell each one in the author's first-person voice, woven SEAMLESSLY into the flowing prose around it.

**HOW TO USE THEM — read carefully, this is the #1 quality criterion:**
1. **They are NOT pull-quotes.** Do NOT wrap them in quotation marks ("..." / «...» / 「...」). Do NOT bold them, italicize them, or set them apart with <b>, <strong>, <em>, or <blockquote>. They must read as ordinary sentences inside your paragraphs — formatted identically to the text you write around them. A reader must NOT be able to tell where your writing ends and the author's memory begins.
2. **Preserve every CONCRETE SPECIFIC.** Keep the named person (e.g. "my girlfriend"), the specific object (e.g. "a colorful beaded bracelet from my elementary school graduation"), the specific reason (e.g. "she was carrying laundry and couldn't knock"), the specific place (e.g. "a small office I rented"). You MAY rephrase, split into several sentences, reorder, or merge them with your own words for natural flow — but you may NEVER swap a specific detail for a generic one, and you may NEVER delete it.
3. **Blend, don't paste.** Lead into each memory with a setup sentence, and follow it with your own reflection, so it feels like the author naturally recalling it mid-thought — not a quote dropped into the page.

[TRIGGER — open the article with this, as the hook]
${anchors.trigger}

[PAIN POINT — early, in the 2nd or 3rd section]
${anchors.pain_point}

[DETAILS — a concrete, personal example in the middle]
${anchors.details}

[BIAS / CONCLUSION — the author's honest opinion, near the end]
${anchors.bias}

[EVIDENCE — supporting proof, told in first person]
${anchors.evidence}

### Core Settings
- Target Language: ${language}
- Focus Keyword: ${keyword}
- Strategic Dimensions: ${JSON.stringify(scoutData.strategy_plan)}

### 🛑 ANTI-AI DETECTION PROTOCOL (CRITICAL)
1. **Anti-Cliché & Numbers**: NEVER end with "cold coffee" or "blinking cursor". NEVER use default AI numbers (30%, 50%, 80%). Use messy fractions (17%, 43%).
2. **Structural Sabotage**: Asymmetrical lists (mix extremely short and rambling bullets). Destroy the "Hook->Debunk->Conclusion" format. No "Summary" headings.
3. **Banned Words**: delve, crucial, tapestry, testament, undeniable, symphony, beacon, landscape, journey, navigating.

### 🔗 INTERNAL LINKING STRICT PROTOCOL (SHORT ANCHOR MANDATE)
**[CRITICAL SEO RULE]**: You MUST keep the href="URL" exactly as provided below, BUT modify the "Anchor Text" to fit the conversational flow.
**SHORT ANCHOR MANDATE:** Anchor text MUST be extremely SHORT (1 to 3 words max).

1. MANDATORY PILLAR LINK: Insert into the intro: /category/${pillarSlug}/
2. INTERNAL LINK POOL: Use these links: ${selectedInternalLinks.join(', ')}
3. EXTERNAL AUTHORITY LINKS: Use sources casually: ${scoutData.scout_report.map(s => s.url).join(', ')}

### Output JSON Structure
{
  "title": "SEO Optimized Title",
  "slug": "url-slug-using-keywords",
  "focus_keyword": "${keyword}",
  "meta_description": "...",
  "image_prompt_header": "Professional cinematic photography, 16:9, highly detailed.",
  "image_prompt_footer": "Detailed macro photography, 16:9, texture rich.",
  "content_blocks": [
    { "heading": "...", "text": "HTML content inside this section. MUST use standard HTML <table>, <tr>, <th>, <td> tags if making a comparison." }
  ]
}
`;

            const writerResponseStr = await callGeminiAPI(writerPrompt, true);
            let writerData;
            try {
                writerData = JSON.parse(writerResponseStr);
            } catch(e) {
                writerData = JSON.parse(writerResponseStr.replace(/```json/g,'').replace(/```/g,''));
            }
            console.log(`[Writer Complete] Generated article: ${writerData.title}`);

            console.log("Waiting 60 seconds to avoid Gemini API rate limits before generating images...");
            await sleep(60000);

            // Image Generation using Imagen-4.0 with Retry
            console.log("Calling Gemini Imagen-4.0 to generate images...");
            const postsDir = path.join(__dirname, site, 'public', 'media-images', 'posts');
            if (!fs.existsSync(postsDir)) fs.mkdirSync(postsDir, { recursive: true });

            const headerImagePath = path.join(postsDir, `${writerData.slug}.png`);
            const footerImagePath = path.join(postsDir, `${writerData.slug}-footer.png`);

            try {
                console.log(`Generating Header Image: ${writerData.image_prompt_header}`);
                const headerBase64 = await generateImageWithRetry(writerData.image_prompt_header, 3);
                fs.writeFileSync(headerImagePath, Buffer.from(headerBase64, 'base64'));
                console.log("Header image saved successfully.");

                console.log("Waiting 60 seconds before generating footer image to avoid rate limits...");
                await sleep(60000);

                console.log(`Generating Footer Image: ${writerData.image_prompt_footer}`);
                const footerBase64 = await generateImageWithRetry(writerData.image_prompt_footer, 3);
                fs.writeFileSync(footerImagePath, Buffer.from(footerBase64, 'base64'));
                console.log("Footer image saved successfully.");
            } catch(imgError) {
                console.error("Failed to generate images after retries:", imgError.message || imgError);
                console.log("Falling back to placeholder image.");
                const placeholderSource = path.join(__dirname, site, 'public', 'media-images', 'hero-bg.webp');
                if (fs.existsSync(placeholderSource)) {
                    fs.copyFileSync(placeholderSource, headerImagePath);
                    fs.copyFileSync(placeholderSource, footerImagePath);
                }
            }

            // Markdown Assembly
            console.log("Assembling Astro Markdown file...");
            const dateStr = new Date().toISOString();
            const headerImageSrc = `/media-images/posts/${writerData.slug}.png`;
            const footerImageSrc = `/media-images/posts/${writerData.slug}-footer.png`;

            let markdownContent = `---
title: "${writerData.title.replace(/"/g, '\\"')}"
slug: "${writerData.slug}"
pubDate: ${dateStr}
description: "${writerData.meta_description.replace(/"/g, '\\"')}"
category: "${pillarDim}"
heroImage: "${headerImageSrc}"
---

`;

            writerData.content_blocks.forEach(block => {
                markdownContent += `## ${block.heading}\n\n`;
                markdownContent += `${block.text}\n\n`;
            });

            markdownContent += `<figure class="aligncenter size-large" style="margin-top: 60px;">\n    <img src="${footerImageSrc}" alt="Footer Image" style="border-radius: 8px; width: 100%; height: auto;" />\n</figure>\n`;

            const mdPath = path.join(__dirname, site, 'src', 'content', 'blog', `${writerData.slug}.md`);
            fs.writeFileSync(mdPath, markdownContent);

            console.log(`[✓ Success] Saved: ${mdPath}`);
            results.success.push({ keyword, site, slug: writerData.slug, path: mdPath });

        } catch (taskError) {
            console.error(`[✗ Failed] "${task['Keyword']}": ${taskError.message || taskError}`);
            results.failed.push({ keyword: task['Keyword'], error: taskError.message || String(taskError) });
        }

        // Cool-down between tasks (skip after the last one)
        if (taskIndex < activeTasks.length - 1) {
            console.log(`\nCooling down 30 seconds before next task...`);
            await sleep(30000);
        }
    }

    // Batch summary
    console.log(`\n${'='.repeat(55)}`);
    console.log(`Batch complete: ${results.success.length} succeeded, ${results.failed.length} failed.`);
    if (results.success.length > 0) {
        console.log('\nArticles generated:');
        results.success.forEach(r => console.log(`  ✓ [${r.site}] ${r.slug}`));
    }
    if (results.failed.length > 0) {
        console.log('\nFailed tasks:');
        results.failed.forEach(r => console.log(`  ✗ ${r.keyword}: ${r.error}`));
    }
    console.log('\nNext steps: verify content → update CSV Status to USED → git commit + push');
};

run();
