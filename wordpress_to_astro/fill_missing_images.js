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
        const parts = line.split(':');
        const key = parts.shift().trim();
        const value = parts.join(':').trim();
        apiKeys[key] = value;
    }
});

const GEMINI_API_KEY = apiKeys['Gemini'];

const callGeminiAPI = (prompt, jsonMode = false) => {
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

const sites = ['Dream', 'joaillerie', 'Desk', 'Legend'];

const run = async () => {
    console.log("=== Scanning for Missing Images ===");
    
    const tasks = []; // Array of { site, mdPath, title, targetPath, type: 'hero'|'body'|'append' }

    for (const site of sites) {
        const blogDir = path.join(__dirname, site, 'src', 'content', 'blog');
        if (!fs.existsSync(blogDir)) continue;

        const files = fs.readdirSync(blogDir).filter(f => f.endsWith('.md'));
        
        for (const file of files) {
            const mdPath = path.join(blogDir, file);
            const content = fs.readFileSync(mdPath, 'utf8');
            const slug = file.replace('.md', '');
            
            const titleMatch = content.match(/^title:\s*"?([^"\n]+)"?/m);
            const title = titleMatch ? titleMatch[1] : slug;
            
            // Check heroImage
            const heroMatch = content.match(/heroImage:\s*"([^"]+)"/);
            if (heroMatch) {
                let heroUrl = heroMatch[1];
                if (heroUrl.startsWith('/media-images/')) {
                    const localPath = path.join(__dirname, site, 'public', heroUrl);
                    if (!fs.existsSync(localPath)) {
                        tasks.push({ site, mdPath, title, targetPath: localPath, type: 'hero' });
                    }
                }
            } else {
                // missing heroImage field entirely
                const newHeroUrl = `/media-images/posts/${slug}-cover.png`;
                tasks.push({ site, mdPath, title, targetPath: path.join(__dirname, site, 'public', newHeroUrl), type: 'hero_missing_field' });
            }

            // Check body images
            let bodyImageCount = 0;
            const imgRegex = /<img[^>]+src=["']([^"']+)["']/gi;
            let match;
            while ((match = imgRegex.exec(content)) !== null) {
                bodyImageCount++;
                let src = match[1];
                if (src.startsWith('/media-images/')) {
                    const localPath = path.join(__dirname, site, 'public', src);
                    if (!fs.existsSync(localPath)) {
                        tasks.push({ site, mdPath, title, targetPath: localPath, type: 'body' });
                    }
                }
            }
            
            const mdImgRegex = /!\[[^\]]*\]\(([^)]+)\)/g;
            while ((match = mdImgRegex.exec(content)) !== null) {
                bodyImageCount++;
                let src = match[1].split(' ')[0];
                if (src.startsWith('/media-images/')) {
                    const localPath = path.join(__dirname, site, 'public', src);
                    if (!fs.existsSync(localPath)) {
                        tasks.push({ site, mdPath, title, targetPath: localPath, type: 'body' });
                    }
                }
            }
            
            // If completely no images in body, we append one
            if (bodyImageCount === 0) {
                const newFooterUrl = `/media-images/posts/${slug}-footer.png`;
                tasks.push({ site, mdPath, title, targetPath: path.join(__dirname, site, 'public', newFooterUrl), type: 'append' });
            }
        }
    }

    console.log(`Found ${tasks.length} missing images to generate.`);

    for (let i = 0; i < tasks.length; i++) {
        const task = tasks[i];
        console.log(`\n[${i+1}/${tasks.length}] Generating image for ${task.site} - ${task.title}`);
        console.log(`Target: ${task.targetPath}`);
        
        // 1. Create a prompt
        const promptReq = `I need an image generation prompt for an article titled "${task.title}". The website theme is "${task.site}". 
        Create a 1-sentence prompt describing a high-quality, cinematic, texture-rich photograph suitable for this context. Do not include any text in the image. Return ONLY the prompt text.`;
        
        let imagePrompt = "";
        try {
            imagePrompt = await callGeminiAPI(promptReq, false);
            imagePrompt = imagePrompt.trim().replace(/^"|"$/g, '');
            console.log(`Generated Prompt: ${imagePrompt}`);
        } catch (e) {
            console.error("Failed to generate prompt. Using default.");
            imagePrompt = `A cinematic, atmospheric photography representing the concept of ${task.title}, high quality, highly detailed.`;
        }
        
        // 2. Generate Image
        try {
            const base64 = await generateImageWithRetry(imagePrompt, 3);
            
            // Ensure directory exists
            const dir = path.dirname(task.targetPath);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            
            fs.writeFileSync(task.targetPath, Buffer.from(base64, 'base64'));
            console.log(`Successfully saved image.`);
            
            // 3. Update markdown if needed
            if (task.type === 'hero_missing_field') {
                let content = fs.readFileSync(task.mdPath, 'utf8');
                const relUrl = task.targetPath.split('/public')[1];
                content = content.replace(/^---\n/, `---\nheroImage: "${relUrl}"\n`);
                fs.writeFileSync(task.mdPath, content);
            } else if (task.type === 'append') {
                let content = fs.readFileSync(task.mdPath, 'utf8');
                const relUrl = task.targetPath.split('/public')[1];
                const figureHtml = `\n<figure class="aligncenter size-large" style="margin-top: 60px;">\n    <img src="${relUrl}" alt="Illustration for ${task.title.replace(/"/g, "'")}" style="border-radius: 8px; width: 100%; height: auto;" />\n</figure>\n`;
                
                // insert before category-keywords or category-faq-section or end of file
                if (content.includes('<section class="category-keywords"')) {
                    content = content.replace(/<section class="category-keywords"/, figureHtml + '<section class="category-keywords"');
                } else if (content.includes('<div class="category-faq-section"')) {
                    content = content.replace(/<div class="category-faq-section"/, figureHtml + '<div class="category-faq-section"');
                } else {
                    content += figureHtml;
                }
                fs.writeFileSync(task.mdPath, content);
            }
            
            // Wait 60s before next image to respect rate limits
            if (i < tasks.length - 1) {
                console.log("Waiting 60 seconds before next image generation to avoid rate limits...");
                await sleep(60000);
            }
        } catch (e) {
            console.error("Failed to generate image completely, skipping this task.");
        }
    }
    
    console.log("=== All Missing Images Filled ===");
};

run();
