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
const SHEET_WRITE_URL = (apiKeys['SheetWriteUrl'] || '').trim();
const SHEET_WRITE_SECRET = (apiKeys['SheetWriteSecret'] || '').trim();

// Maxora image-API credentials (loaded from .env; both `: ` and `=` separators supported).
const MAXORA_IMAGE_HOST = 'image.aidsagent.net';
let MAXORA_CF_ID = '';
let MAXORA_CF_SECRET = '';
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
    fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
        const m = line.match(/^\s*(CF-Access-Client-Id|CF-Access-Client-Secret)\s*[:=]\s*(.+?)\s*$/);
        if (!m) return;
        if (m[1] === 'CF-Access-Client-Id') MAXORA_CF_ID = m[2].trim();
        else MAXORA_CF_SECRET = m[2].trim();
    });
}

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

// Write Status=USED and Post_Url back to Google Sheet via Apps Script Web App
const markRowsUsed = (items) => {
    return new Promise((resolve, reject) => {
        const payload = JSON.stringify({ token: SHEET_WRITE_SECRET, items });
        const u = new URL(SHEET_WRITE_URL);
        const options = {
            hostname: u.hostname,
            path: u.pathname + u.search,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload)
            }
        };
        const req = https.request(options, (res) => {
            const chunks = [];
            res.on('data', (chunk) => chunks.push(chunk));
            res.on('end', () => {
                const body = Buffer.concat(chunks).toString('utf8');
                // Apps Script redirects (302) to script.googleusercontent.com; follow it
                if ((res.statusCode === 302 || res.statusCode === 301) && res.headers.location) {
                    https.get(res.headers.location, (r2) => {
                        const c2 = [];
                        r2.on('data', (c) => c2.push(c));
                        r2.on('end', () => resolve(Buffer.concat(c2).toString('utf8')));
                    }).on('error', reject);
                } else {
                    resolve(body);
                }
            });
        });
        req.on('error', reject);
        req.write(payload);
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

// Maxora image API (image.aidsagent.net). Returns base64 WebP (data[0].b64_json).
// Replaces Imagen for the --finish path. Synchronous mode blocks ~10-30s per image.
const generateImageWithMaxora = (prompt, size = '16:9', format = 'webp') => {
    return new Promise((resolve, reject) => {
        if (!MAXORA_CF_ID || !MAXORA_CF_SECRET) {
            return reject(new Error('Missing Maxora credentials (CF-Access-Client-Id / -Secret) in .env'));
        }
        const data = JSON.stringify({ prompt, size, format, user: 'content-agent' });
        const options = {
            hostname: MAXORA_IMAGE_HOST,
            path: '/v1/images/generations',
            method: 'POST',
            headers: {
                'CF-Access-Client-Id': MAXORA_CF_ID,
                'CF-Access-Client-Secret': MAXORA_CF_SECRET,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data)
            }
        };

        const req = https.request(options, (res) => {
            const chunks = [];
            res.on('data', (chunk) => chunks.push(chunk));
            res.on('end', () => {
                const body = Buffer.concat(chunks).toString('utf8');
                if (res.statusCode !== 200) {
                    return reject(new Error(`Maxora API HTTP ${res.statusCode}: ${body.slice(0, 200)}`));
                }
                try {
                    const parsed = JSON.parse(body);
                    const b64 = parsed.data && parsed.data[0] && parsed.data[0].b64_json;
                    if (b64) resolve(b64);
                    else reject(new Error('No image data in Maxora response.'));
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

// Retry wrapper shared by the legacy Imagen path and the Maxora path.
// `generator` is the image function; `retryWaitMs` is the pause between attempts
// (Imagen needs ~60s for rate limits; Maxora needs almost none).
const generateImageWithRetry = async (prompt, retries = 3, generator = generateImageWithImagen, retryWaitMs = 60000) => {
    for (let i = 0; i < retries; i++) {
        try {
            return await generator(prompt);
        } catch (e) {
            console.error(`Failed to generate image (Attempt ${i + 1}/${retries}). Error: ${e.message || e}`);
            if (i < retries - 1) {
                console.log(`Waiting ${Math.round(retryWaitMs / 1000)} seconds before retrying...`);
                await sleep(retryWaitMs);
            } else {
                throw new Error("All retries failed.");
            }
        }
    }
};

// Download the latest task CSV from Google Sheets (shared by run(), runPrepare()).
// Falls back to whatever local CSV file is already on disk if the download fails.
const loadTasksCSV = async () => {
    let n8nPath = path.join(__dirname, 'N8N_work - Workflow_Config.csv');
    if (!fs.existsSync(n8nPath)) {
        n8nPath = path.join(__dirname, 'N8N_work - Workflow_Config .csv');
    }

    if (GOOGLE_SHEET_URL) {
        console.log("Downloading latest task list from Google Sheets...");
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

    const n8nContent = fs.readFileSync(n8nPath, 'utf8');
    return parseCSV(n8nContent);
};

// Resolve the /category/ slug for a pillar dimension by scanning the site's category pages.
const resolvePillarSlug = (site, pillarDim) => {
    const categoryDir = path.join(__dirname, site, 'src', 'pages', 'category');
    if (!fs.existsSync(categoryDir)) return '';
    const catFiles = fs.readdirSync(categoryDir).filter(f => f.endsWith('.astro'));
    for (const f of catFiles) {
        const content = fs.readFileSync(path.join(categoryDir, f), 'utf8');
        if (content.includes(pillarDim)) return f.replace('.astro', '');
    }
    return '';
};

// Scan a site's existing blog posts and return raw internal-link candidates.
// Pure filesystem work — no LLM involved. Used by both --prepare (Claude selects)
// and the legacy Gemini path.
const gatherInternalCandidates = (site) => {
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
    return internalCandidates;
};

// Normalize the CSV Pillar Post URL down to a site-relative path (for internal linking).
const pillarPathFromTask = (task) => {
    const rawPillarUrl = task['Pillar Post Url'] || '';
    return rawPillarUrl
        ? rawPillarUrl.replace(/^https?:\/\/[^\/]+/, '').replace(/\/?$/, '/') || rawPillarUrl
        : '';
};

// Discover and rank internal-link candidates from a site's existing blog posts (Gemini path).
const discoverInternalLinks = async (site, keyword, language, task) => {
    const internalCandidates = gatherInternalCandidates(site);

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

    const pillarPostPath = pillarPathFromTask(task);

    if (selectedInternalLinks.length < 2 && pillarPostPath) {
        if (!selectedInternalLinks.includes(pillarPostPath)) {
            selectedInternalLinks.unshift(pillarPostPath);
        }
    }

    return selectedInternalLinks;
};

// Build the exact Writer prompt/instructions — shared by the Gemini auto-writer and
// the Claude-writes-it-yourself brief (see runPrepare()).
const buildWriterPrompt = ({ keyword, language, anchors, scoutData, pillarSlug, selectedInternalLinks }) => `
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

// Build the writing brief handed to Claude (chat session). Unlike buildWriterPrompt
// (Gemini path, pre-chewed), this gives Claude the RAW materials and asks Claude to do
// the dimension selection, internal-link selection, HC translation, AND the writing —
// so no Gemini text call is needed anywhere in --prepare.
const buildClaudeBrief = ({ keyword, language, pillarDim, pillarSlug }) => `
### 你的任務
你是這篇文章的捉刀人（ghostwriter），用「人類作者」的第一人稱口吻重述他本人的真實經歷 —— 不是你的口吻。你是隱形的，人類作者才是主角。
**[語氣檢查]**：不要過度戲劇化、激進或裝酷。用成年人克制、略帶疲憊卻很懂的口吻表達。

### 這份 brief 是原料，不是成品 —— 以下判斷全部由你（Claude）自己做：
1. **挑維度**：從 brief 的 search_results 理解這個主題，並從下列六大維度庫挑 3-5 個維度、各自訂出撰寫方向。
   核心本質 (Essence)：底層邏輯、科學原理。
   外部聯繫 (Connections)：文化歷史、社會演進、法律規範。
   感官實踐 (Practice)：五感描述、操作指南、儀式感。
   對比分析 (Comparison)：新舊對照、跨文化對比、優劣分析。
   未來展望 (Future)：預測演化、技術發展、心理變遷。
   真實案例 (Evidence)：歷史數據、名人軼事、實驗數據。
2. **選內部連結**：從 brief 的 internal_candidates 挑 2-3 篇最相關的，用它們的 url 當內部連結。若不足 2 個，補上 brief 的 pillar_post_path。
3. **翻譯 HC**：brief 的 human_context_zh 是中文五段（trigger / pain_point / details / bias / evidence）。把它們完整翻成 ${language}。翻「具體的那個東西」，不要泛化：具名的人保持具名、特定物件保持特定、特定理由保持精確、第一人稱保持第一人稱、整段翻完別只翻一句摘要。
4. **選外部權威連結**：從 brief 的 search_results 挑 2-4 個可信來源的 url，在文中自然帶到。

### ⚠️ 人類作者經歷 = 文章骨幹（最高品質標準）
把翻好的五段當作文章的靈魂，用作者第一人稱重述，無縫融進你寫的段落裡：
1. **它們不是引言塊。** 不要用引號（"..." / «...» / 「...」）、粗體、斜體、<b>/<strong>/<em>/<blockquote> 包起來。要跟你寫的文字格式一模一樣，讀者不該分得出哪句是你寫的、哪句是作者的記憶。
2. **保留每一個具體細節。** 具名的人、特定物件、特定理由、特定地點都要留。你可以改寫、拆句、重排、跟你自己的話合併，但絕不可把具體細節換成泛稱、也絕不可刪掉。
3. **要融合，不要貼上。** 每段記憶前面用一句話鋪陳，後面接你自己的反思，像作者講到一半自然想起來的。

段落安排建議：trigger 當開場鉤子；pain_point 放第 2-3 段；details 放中段當具體例子；bias/結論放接近結尾；evidence 用第一人稱帶出佐證。

### 核心設定
- 目標語言：${language}
- 焦點關鍵字：${keyword}
- 文章長度：約 1500 字

### 🛑 反 AI 偵測（重要）
1. **反陳腔 & 數字**：結尾別用「冷掉的咖啡」「閃爍的游標」。別用 AI 慣用整數（30%、50%、80%），改用零碎分數（17%、43%）。
2. **結構破壞**：清單長短不對稱（極短 bullet 混很長的 bullet）。破壞「鉤子→破解→結論」的公式。不要「總結」小標。
3. **禁用字**：delve, crucial, tapestry, testament, undeniable, symphony, beacon, landscape, journey, navigating。

### 🔗 內部連結規則（短錨點）
1. 開場必放 Pillar 連結：/category/${pillarSlug}/
2. 內部連結池：用你在步驟 2 選出的 url。
3. 外部權威連結：用你在步驟 4 選出的 url，語氣自然。
**錨點文字必須極短（1 到 3 個字）**，href 用完整 url 不要改。

### 輸出：存成同名 *.result.json，格式如下
{
  "title": "SEO 優化標題（${language}）",
  "slug": "url-slug-using-keywords",
  "focus_keyword": "${keyword}",
  "meta_description": "...",
  "image_prompt_header": "Professional cinematic photography, 16:9, highly detailed. <針對本文主題的英文場景描述>",
  "image_prompt_footer": "Detailed macro photography, 16:9, texture rich. <針對本文主題的英文特寫描述>",
  "content_blocks": [
    { "heading": "小標", "text": "本段 HTML 內容（一般段落用 <p>；要比較時用標準 <table><tr><th><td>）。內部/外部連結用 <a href=\\"...\\">短錨</a>。" }
  ]
}
`;

const WRITER_BRIEFS_DIR = path.join(__dirname, 'writer_briefs');
const safeSlug = (str) => String(str).toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'task';

// --prepare: pure data-gathering, NO Gemini text calls. For every Active task it fetches
// Serper results, scans the site for internal-link candidates, and splits the Chinese
// Human_Context into its 5 sections, then writes a *.brief.json. Claude (chat session)
// reads each brief and does all the reasoning itself — dimension selection, link selection,
// HC translation, and the writing — saving a matching *.result.json. Then --finish handles
// images + Markdown + Sheet write-back.
const runPrepare = async () => {
    console.log("=== AI Agent — 準備模式（純資料蒐集：Serper + 掃檔 + 切 HC，判斷與撰寫全交給 Claude）===");

    const n8nRows = await loadTasksCSV();
    const activeTasks = n8nRows.filter(row => row['Status'] === 'Active' || row['Status'] === 'active');

    if (activeTasks.length === 0) {
        console.log("No 'Active' tasks found. Set Status='Active' on the rows you want to process.");
        return;
    }

    console.log(`\nFound ${activeTasks.length} active task(s). Preparing briefs...\n`);
    if (!fs.existsSync(WRITER_BRIEFS_DIR)) fs.mkdirSync(WRITER_BRIEFS_DIR, { recursive: true });

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
            const pillarDim = task['Pillar Post Dimesion'];
            const humanContext = task['Human_Context'] || '';

            if (!site) {
                throw new Error(`Unknown Topic '${topic}' — not found in siteMap. Check CSV 'Topic' column.`);
            }

            console.log(`Site: ${site} | Keyword: ${keyword} | Pillar: ${pillarDim}`);

            console.log("Fetching Google Search results via Serper...");
            const searchResults = await callSerperAPI(keyword);
            const organic = (searchResults.organic || []).map(r => ({
                title: r.title, url: r.link, snippet: r.snippet
            }));
            console.log(`[Serper] ${organic.length} organic result(s).`);

            const pillarSlug = resolvePillarSlug(site, pillarDim);

            console.log("Scanning site for internal-link candidates...");
            const internalCandidates = gatherInternalCandidates(site);
            console.log(`[Internal] ${internalCandidates.length} candidate post(s).`);

            console.log("Splitting Human Context into sections...");
            const humanContextZh = parseHumanContext(humanContext);
            const isValid = v => v && v.trim().length > 10 && v.trim() !== '...';
            console.log(`[HC] trigger: ${isValid(humanContextZh.trigger) ? '✓' : '✗'} | pain_point: ${isValid(humanContextZh.pain_point) ? '✓' : '✗'} | details: ${isValid(humanContextZh.details) ? '✓' : '✗'} | bias: ${isValid(humanContextZh.bias) ? '✓' : '✗'} | evidence: ${isValid(humanContextZh.evidence) ? '✓' : '✗'}`);
            if (!humanContext) {
                console.log("[HC] ⚠️ 這一列沒有 Human_Context。Claude 需自行構思一段合理的作者經歷。");
            }

            const brief = {
                site, keyword, language, topic, pillarDim, pillarSlug,
                siteUrl: task['Site_Url'] || '',
                pillar_post_path: pillarPathFromTask(task),
                search_results: organic,
                internal_candidates: internalCandidates,
                human_context_zh: humanContextZh,
                has_human_context: !!humanContext,
                instructions: buildClaudeBrief({ keyword, language, pillarDim, pillarSlug })
            };

            const fileBase = safeSlug(keyword);
            const briefPath = path.join(WRITER_BRIEFS_DIR, `${fileBase}.brief.json`);
            fs.writeFileSync(briefPath, JSON.stringify(brief, null, 2));
            console.log(`[✓ Brief saved] ${briefPath}`);
        } catch (taskError) {
            console.error(`[✗ Failed] "${task['Keyword']}": ${taskError.message || taskError}`);
        }
    }

    console.log(`\n完成（過程未使用任何 Gemini）。請讀取 writer_briefs/*.brief.json，依 "instructions" 撰寫文章，存成同名 *.result.json（foo.brief.json → foo.result.json）。`);
    console.log(`全部寫完後執行: node ai_agent.js --finish`);
};

// --finish: for every *.brief.json that has a matching *.result.json (written by Claude),
// generate the header/footer images, assemble the Astro Markdown, save it, and write
// Status=USED + Post_Url back to the Google Sheet. Consumes (deletes) the brief/result
// pair once successfully published.
const runFinish = async () => {
    console.log("=== AI Agent — 完成模式（生圖、組裝 Markdown、寫回 Sheet）===");

    if (!fs.existsSync(WRITER_BRIEFS_DIR)) {
        console.log("找不到 writer_briefs/ 資料夾，請先執行 node ai_agent.js --prepare");
        return;
    }

    const briefFiles = fs.readdirSync(WRITER_BRIEFS_DIR).filter(f => f.endsWith('.brief.json'));
    const ready = briefFiles
        .map(f => ({ briefFile: f, resultFile: f.replace(/\.brief\.json$/, '.result.json') }))
        .filter(({ resultFile }) => fs.existsSync(path.join(WRITER_BRIEFS_DIR, resultFile)));

    if (ready.length === 0) {
        console.log("沒有找到已完成的 *.result.json。請先讓 Claude 依 brief 撰寫文章並存檔。");
        return;
    }

    console.log(`\n找到 ${ready.length} 篇已完成文章，開始生圖與發布...\n`);
    const results = { success: [], failed: [] };

    for (let i = 0; i < ready.length; i++) {
        const { briefFile, resultFile } = ready[i];
        const brief = JSON.parse(fs.readFileSync(path.join(WRITER_BRIEFS_DIR, briefFile), 'utf8'));
        const writerData = JSON.parse(fs.readFileSync(path.join(WRITER_BRIEFS_DIR, resultFile), 'utf8'));

        console.log(`\n${'='.repeat(55)}`);
        console.log(`Publishing ${i + 1} / ${ready.length}: ${writerData.title}`);
        console.log('='.repeat(55));

        try {
            const { site, keyword, pillarDim, siteUrl } = brief;
            const postsDir = path.join(__dirname, site, 'public', 'media-images', 'posts');
            if (!fs.existsSync(postsDir)) fs.mkdirSync(postsDir, { recursive: true });

            const headerImagePath = path.join(postsDir, `${writerData.slug}.webp`);
            const footerImagePath = path.join(postsDir, `${writerData.slug}-footer.webp`);
            const placeholderSource = path.join(__dirname, site, 'public', 'media-images', 'hero-bg.webp');
            const makeImage = (prompt) => generateImageWithRetry(prompt, 3, generateImageWithMaxora, 5000);

            console.log("Calling Maxora image API (WebP, 16:9) to generate images...");
            try {
                console.log(`Generating Header Image: ${writerData.image_prompt_header}`);
                const headerBase64 = await makeImage(writerData.image_prompt_header);
                fs.writeFileSync(headerImagePath, Buffer.from(headerBase64, 'base64'));
                console.log("Header image saved successfully.");
            } catch (imgError) {
                console.error("Failed to generate header image after retries:", imgError.message || imgError);
                console.log("Falling back to placeholder image for header.");
                if (fs.existsSync(placeholderSource)) fs.copyFileSync(placeholderSource, headerImagePath);
            }

            try {
                console.log(`Generating Footer Image: ${writerData.image_prompt_footer}`);
                const footerBase64 = await makeImage(writerData.image_prompt_footer);
                fs.writeFileSync(footerImagePath, Buffer.from(footerBase64, 'base64'));
                console.log("Footer image saved successfully.");
            } catch (imgError) {
                console.error("Failed to generate footer image after retries:", imgError.message || imgError);
                console.log("Falling back to placeholder image for footer.");
                if (fs.existsSync(placeholderSource)) fs.copyFileSync(placeholderSource, footerImagePath);
            }

            console.log("Assembling Astro Markdown file...");
            const dateStr = new Date().toISOString();
            const headerImageSrc = `/media-images/posts/${writerData.slug}.webp`;
            const footerImageSrc = `/media-images/posts/${writerData.slug}-footer.webp`;

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

            const footerAltText = writerData.title.replace(/"/g, '');
            markdownContent += `<figure class="aligncenter size-large" style="margin-top: 60px;">\n    <img src="${footerImageSrc}" alt="${footerAltText}" style="border-radius: 8px; width: 100%; height: auto;" />\n</figure>\n`;

            const mdPath = path.join(__dirname, site, 'src', 'content', 'blog', `${writerData.slug}.md`);
            fs.writeFileSync(mdPath, markdownContent);
            console.log(`[✓ Success] Saved: ${mdPath}`);

            const postUrl = `${(siteUrl || '').replace(/\/+$/, '')}/blog/${writerData.slug}/`;
            results.success.push({ keyword, site, slug: writerData.slug, path: mdPath, post_url: postUrl });

            fs.unlinkSync(path.join(WRITER_BRIEFS_DIR, briefFile));
            fs.unlinkSync(path.join(WRITER_BRIEFS_DIR, resultFile));
        } catch (taskError) {
            console.error(`[✗ Failed] "${writerData.title}": ${taskError.message || taskError}`);
            results.failed.push({ keyword: brief.keyword, error: taskError.message || String(taskError) });
        }

        if (i < ready.length - 1) {
            console.log(`\nCooling down 5 seconds before next task...`);
            await sleep(5000);
        }
    }

    console.log(`\n${'='.repeat(55)}`);
    console.log(`Publish complete: ${results.success.length} succeeded, ${results.failed.length} failed.`);
    if (results.success.length > 0) {
        console.log('\nArticles published:');
        results.success.forEach(r => console.log(`  ✓ [${r.site}] ${r.slug}`));
    }
    if (results.failed.length > 0) {
        console.log('\nFailed tasks:');
        results.failed.forEach(r => console.log(`  ✗ ${r.keyword}: ${r.error}`));
    }

    if (results.success.length > 0 && SHEET_WRITE_URL && SHEET_WRITE_SECRET) {
        console.log('\nWriting Status=USED and Post_Url back to Google Sheet...');
        try {
            const items = results.success.map(r => ({ keyword: r.keyword, post_url: r.post_url }));
            const resp = await markRowsUsed(items);
            let parsed;
            try { parsed = JSON.parse(resp); } catch (e) { parsed = null; }
            if (parsed && parsed.ok) {
                console.log(`[Sheet] Updated ${parsed.updated.length} row(s): ${parsed.updated.join(', ')}`);
            } else {
                console.log(`[Sheet] Write-back response was not OK: ${resp.slice(0, 300)}`);
            }
        } catch (e) {
            console.log(`[Sheet] Write-back failed (${e.message}). Update Status/Post_Url manually.`);
        }
    } else if (results.success.length > 0) {
        console.log('\n[Sheet] SheetWriteUrl/SheetWriteSecret not set in API_Key — skipping auto write-back.');
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

            const placeholderSource = path.join(__dirname, site, 'public', 'media-images', 'hero-bg.webp');

            try {
                console.log(`Generating Header Image: ${writerData.image_prompt_header}`);
                const headerBase64 = await generateImageWithRetry(writerData.image_prompt_header, 3);
                fs.writeFileSync(headerImagePath, Buffer.from(headerBase64, 'base64'));
                console.log("Header image saved successfully.");
            } catch(imgError) {
                console.error("Failed to generate header image after retries:", imgError.message || imgError);
                console.log("Falling back to placeholder image for header.");
                if (fs.existsSync(placeholderSource)) fs.copyFileSync(placeholderSource, headerImagePath);
            }

            console.log("Waiting 60 seconds before generating footer image to avoid rate limits...");
            await sleep(60000);

            try {
                console.log(`Generating Footer Image: ${writerData.image_prompt_footer}`);
                const footerBase64 = await generateImageWithRetry(writerData.image_prompt_footer, 3);
                fs.writeFileSync(footerImagePath, Buffer.from(footerBase64, 'base64'));
                console.log("Footer image saved successfully.");
            } catch(imgError) {
                console.error("Failed to generate footer image after retries:", imgError.message || imgError);
                console.log("Falling back to placeholder image for footer.");
                if (fs.existsSync(placeholderSource)) fs.copyFileSync(placeholderSource, footerImagePath);
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

            const footerAltText = writerData.title.replace(/"/g, '');
            markdownContent += `<figure class="aligncenter size-large" style="margin-top: 60px;">\n    <img src="${footerImageSrc}" alt="${footerAltText}" style="border-radius: 8px; width: 100%; height: auto;" />\n</figure>\n`;

            const mdPath = path.join(__dirname, site, 'src', 'content', 'blog', `${writerData.slug}.md`);
            fs.writeFileSync(mdPath, markdownContent);

            console.log(`[✓ Success] Saved: ${mdPath}`);
            const postUrl = `${(task['Site_Url'] || '').replace(/\/+$/, '')}/blog/${writerData.slug}/`;
            results.success.push({ keyword, site, slug: writerData.slug, path: mdPath, post_url: postUrl });

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

    // Write Status=USED + Post_Url back to the Google Sheet (only for succeeded tasks)
    if (results.success.length > 0 && SHEET_WRITE_URL && SHEET_WRITE_SECRET) {
        console.log('\nWriting Status=USED and Post_Url back to Google Sheet...');
        try {
            const items = results.success.map(r => ({ keyword: r.keyword, post_url: r.post_url }));
            const resp = await markRowsUsed(items);
            let parsed;
            try { parsed = JSON.parse(resp); } catch (e) { parsed = null; }
            if (parsed && parsed.ok) {
                console.log(`[Sheet] Updated ${parsed.updated.length} row(s): ${parsed.updated.join(', ')}`);
            } else {
                console.log(`[Sheet] Write-back response was not OK: ${resp.slice(0, 300)}`);
            }
        } catch (e) {
            console.log(`[Sheet] Write-back failed (${e.message}). Update Status/Post_Url manually.`);
        }
    } else if (results.success.length > 0) {
        console.log('\n[Sheet] SheetWriteUrl/SheetWriteSecret not set in API_Key — skipping auto write-back.');
        console.log('Next steps: verify content → update Sheet Status to USED + paste Post_Url → git commit + push');
    }
};

const mode = process.argv[2];
if (mode === '--prepare') {
    runPrepare();
} else if (mode === '--finish') {
    runFinish();
} else {
    run();
}
