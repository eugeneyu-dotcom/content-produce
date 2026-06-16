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
    console.log("=== Regenerating Placeholder Images ===");
    
    const tasks = [];

    for (const site of sites) {
        const postsDir = path.join(__dirname, site, 'public', 'media-images', 'posts');
        const blogDir = path.join(__dirname, site, 'src', 'content', 'blog');
        if (!fs.existsSync(postsDir) || !fs.existsSync(blogDir)) continue;

        const images = fs.readdirSync(postsDir);
        for (const img of images) {
            const imgPath = path.join(postsDir, img);
            const stat = fs.statSync(imgPath);
            
            // Check if it's the exact size of the placeholder (hero-bg.webp)
            if (stat.size === 84786) {
                // Find matching markdown file to get the title
                let slug = img.replace('.png', '').replace('.webp', '').replace('-footer', '');
                let mdPath = path.join(blogDir, `${slug}.md`);
                
                let title = slug.replace(/-/g, ' ');
                if (fs.existsSync(mdPath)) {
                    const content = fs.readFileSync(mdPath, 'utf8');
                    const titleMatch = content.match(/^title:\s*"?([^"\n]+)"?/m);
                    if (titleMatch) title = titleMatch[1];
                }
                
                tasks.push({ site, targetPath: imgPath, title, isFooter: img.includes('-footer') });
            }
        }
    }

    console.log(`Found ${tasks.length} placeholder images to regenerate.`);

    for (let i = 0; i < tasks.length; i++) {
        const task = tasks[i];
        console.log(`\n[${i+1}/${tasks.length}] Generating image for ${task.site} - ${task.title} (${task.isFooter ? 'Footer' : 'Header'})`);
        console.log(`Target: ${task.targetPath}`);
        
        const promptReq = `I need an image generation prompt for an article titled "${task.title}". The website theme is "${task.site}". 
        Create a 1-sentence prompt describing a high-quality, cinematic, texture-rich photograph suitable for this context. Make it suitable for a ${task.isFooter ? "detailed macro or closing/footer" : "hero/header"} image. Do not include any text in the image. Return ONLY the prompt text.`;
        
        let imagePrompt = "";
        try {
            imagePrompt = await callGeminiAPI(promptReq, false);
            imagePrompt = imagePrompt.trim().replace(/^"|"$/g, '');
            console.log(`Generated Prompt: ${imagePrompt}`);
        } catch (e) {
            console.error("Failed to generate prompt. Using default.");
            imagePrompt = `A cinematic, atmospheric photography representing the concept of ${task.title}, high quality, highly detailed.`;
        }
        
        try {
            const base64 = await generateImageWithRetry(imagePrompt, 3);
            fs.writeFileSync(task.targetPath, Buffer.from(base64, 'base64'));
            console.log(`Successfully saved generated image, overwriting placeholder.`);
            
            if (i < tasks.length - 1) {
                console.log("Waiting 60 seconds before next image generation to avoid rate limits...");
                await sleep(60000);
            }
        } catch (e) {
            console.error("Failed to generate image completely, skipping this task.");
        }
    }
    
    console.log("\n=== All Placeholders Regenerated ===");
};

run();
