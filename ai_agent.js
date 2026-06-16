const fs = require('fs');
const path = require('path');
const https = require('https');

// Sleep helper
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

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

const SERPER_API_KEY = apiKeys['Serper'];
const GEMINI_API_KEY = apiKeys['Gemini'];
const GOOGLE_SHEET_URL = apiKeys['GoogleSheet'];

if (!SERPER_API_KEY || !GEMINI_API_KEY) {
    console.error("Missing API Keys in API_Key file!");
    process.exit(1);
}

// Helpers
const parseCSV = (content) => {
    const lines = content.split('\n').filter(line => line.trim() !== '');
    const headers = lines[0].split(',').map(h => h.trim());
    
    const result = [];
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        let current = '';
        let inQuotes = false;
        const row = [];
        
        for (let j = 0; j < line.length; j++) {
            const char = line[j];
            if (char === '"' && line[j+1] === '"') {
                current += '"';
                j++;
            } else if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                row.push(current);
                current = '';
            } else {
                current += char;
            }
        }
        row.push(current);
        
        if (row.length === headers.length) {
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
            let resData = '';
            res.on('data', (chunk) => resData += chunk);
            res.on('end', () => resolve(JSON.parse(resData)));
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
            let resData = '';
            res.on('data', (chunk) => resData += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(resData);
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
            let resData = '';
            res.on('data', (chunk) => resData += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(resData);
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
                                let data = '';
                                redirectRes.on('data', chunk => data += chunk);
                                redirectRes.on('end', () => resolve(data));
                            }).on('error', reject);
                        } else {
                            let data = '';
                            res.on('data', chunk => data += chunk);
                            res.on('end', () => resolve(data));
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
    
    let task = n8nRows.find(row => row['Status'] === 'Active' || row['Status'] === 'active');
    
    // For testing: fallback if not saved
    if (!task) {
        console.log("Warning: No 'Active' row found. Using a fallback row for testing.");
        task = n8nRows.find(row => row['Used'] === '否' && row['Topic'] === 'Dream Interpretation');
    }
    
    if (!task) {
        console.log("No valid task found.");
        return;
    }
    
    const keyword = task['Keyword'];
    const language = task['Language'];
    const topic = task['Topic'];
    const site = siteMap[topic];
    const pillarDim = task['Pillar Post Dimesion']; // notice typo in CSV header
    let humanContext = task['Human_Context'] || '';
    
    console.log(`\n[Task Selected]`);
    console.log(`Site: ${site}`);
    console.log(`Keyword: ${keyword}`);
    console.log(`Pillar: ${pillarDim}`);
    
    if (!humanContext) {
        console.log("Generating fallback Human Context...");
        const contextPrompt = `Please write a short, opinionated, personal paragraph (in ${language}) about "${keyword}" representing a blogger's real-life experience or frustration to be used as writing context. Do not use JSON, just text.`;
        humanContext = await callGeminiAPI(contextPrompt, false);
        console.log(`[Generated Human Context]:\n${humanContext}\n`);
    }
    
    // 2. Scout Report & Strategy Plan
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
    
    // 3. Internal Link Pool
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
    
    const internalLinkPool = [];
    n8nRows.forEach(r => {
        if (r['Topic'] === topic && r['Status'] === 'USED' && r['Post_Url']) {
            const match = r['Post_Url'].match(/https?:\/\/[^\/]+\/(.+?)[\/]?$/);
            if (match) internalLinkPool.push(`/blog/${match[1]}/`);
        }
    });
    // Shuffle and pick 3
    const selectedInternalLinks = internalLinkPool.sort(() => 0.5 - Math.random()).slice(0, 3);
    
    // 4. Article Generation
    console.log("Calling Gemini (Writer) to generate 1500-word article...");
    const writerPrompt = `
### Role & Persona
You are a highly opinionated, experienced human blogger and subject matter expert. You do not write like an AI. You write with visceral emotion, personal bias, and highly specific micro-details. 
**[CRITICAL TONE CHECK]**: Do NOT be overly dramatic, aggressive, or "edgy." Express your frustrations with grounded, adult restraint. Maintain a real, slightly exhausted, yet deeply knowledgeable professional persona.

### Core Settings
- Target Language: ${language}
- Focus Keyword: ${keyword}
- Strategic Dimensions: ${JSON.stringify(scoutData.strategy_plan)}
- Human Context (The Soul of the Article): ${humanContext}

### 🛑 THE "GHOSTWRITER" ANTI-DETECTION PROTOCOL (CRITICAL)
1. **Strict Context Lock**: STRICTLY build the narrative around the EXACT characters, settings, and events in the [Human Context]. Add authentic human self-justification if absurd.
2. **Anti-Cliché & Numbers**: NEVER end with "cold coffee" or "blinking cursor". NEVER use default AI numbers (30%, 50%, 80%). Use messy fractions (17%, 43%).
3. **Structural Sabotage**: Asymmetrical lists (mix extremely short and rambling bullets). Destroy the "Hook->Debunk->Conclusion" format. No "Summary" headings.
4. **Banned Words**: delve, crucial, tapestry, testament, undeniable, symphony, beacon, landscape, journey, navigating.

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
    
    // 5. Image Generation using Imagen-4.0 with Retry
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
    } catch(e) {
        console.error("Failed to generate images after retries. Error:", e);
        console.log("Falling back to placeholder image generation.");
        // fallback
        const placeholderSource = path.join(__dirname, site, 'public', 'media-images', 'hero-bg.webp');
        if (fs.existsSync(placeholderSource)) {
            fs.copyFileSync(placeholderSource, headerImagePath);
            fs.copyFileSync(placeholderSource, footerImagePath);
        }
    }
    
    // 6. Markdown Assembly
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
    
    // Add footer image
    markdownContent += `<figure class="aligncenter size-large" style="margin-top: 60px;">\n    <img src="${footerImageSrc}" alt="Footer Image" style="border-radius: 8px; width: 100%; height: auto;" />\n</figure>\n`;

    const mdPath = path.join(__dirname, site, 'src', 'content', 'blog', `${writerData.slug}.md`);
    fs.writeFileSync(mdPath, markdownContent);
    
    console.log(`[Success] Article saved to ${mdPath}`);
    console.log(`Please verify the content. (CSV Update and Git Push are manual for this test run)`);
};

run();
