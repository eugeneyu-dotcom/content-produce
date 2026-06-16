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

// Helper to recursively find markdown and astro files
const findFiles = (dir, fileList = []) => {
    if (!fs.existsSync(dir)) return fileList;
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            findFiles(fullPath, fileList);
        } else if (fullPath.endsWith('.md') || fullPath.endsWith('.astro')) {
            fileList.push(fullPath);
        }
    }
    return fileList;
};

const run = async () => {
    console.log("=== Scanning for 404 Missing Images ===");
    
    const tasks = []; // { site, targetPath, title }
    const missingPaths = new Set(); // to avoid duplicates

    for (const site of sites) {
        const searchDirs = [
            path.join(__dirname, site, 'src', 'content', 'blog'),
            path.join(__dirname, site, 'src', 'pages')
        ];
        
        const filesToScan = [];
        searchDirs.forEach(dir => findFiles(dir, filesToScan));

        for (const filePath of filesToScan) {
            const content = fs.readFileSync(filePath, 'utf8');
            let title = path.basename(filePath).replace(/\.(md|astro)$/, '').replace(/-/g, ' ');
            
            // Try to extract a better title
            const titleMatch = content.match(/^title:\s*"?([^"\n]+)"?/m) || content.match(/<h1>(.*?)<\/h1>/);
            if (titleMatch) title = titleMatch[1];
            
            // Regex to find local image paths
            // Matches src="/media-images/..." and heroImage: "/media-images/..." and ![...](/media-images/...)
            const localImgRegex = /(?:src=["']|heroImage:\s*"|!\s*\[.*?\]\()(\/media-images\/[^"' )]+)/gi;
            
            let match;
            while ((match = localImgRegex.exec(content)) !== null) {
                let imgPath = match[1];
                let physicalPath = path.join(__dirname, site, 'public', imgPath);
                
                if (!fs.existsSync(physicalPath) && !missingPaths.has(physicalPath)) {
                    missingPaths.add(physicalPath);
                    tasks.push({ site, targetPath: physicalPath, title });
                }
            }
        }
    }

    console.log(`Found ${tasks.length} missing 404 images to generate.`);

    for (let i = 0; i < tasks.length; i++) {
        const task = tasks[i];
        console.log(`\n[${i+1}/${tasks.length}] Generating image for ${task.site} - ${task.title}`);
        console.log(`Target: ${task.targetPath}`);
        
        const promptReq = `I need an image generation prompt for an article or page titled "${task.title}". The website theme is "${task.site}". 
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
        
        try {
            const base64 = await generateImageWithRetry(imagePrompt, 3);
            
            // Ensure directory exists
            const dir = path.dirname(task.targetPath);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            
            fs.writeFileSync(task.targetPath, Buffer.from(base64, 'base64'));
            console.log(`Successfully saved generated image, resolving the 404.`);
            
            if (i < tasks.length - 1) {
                console.log("Waiting 60 seconds before next image generation to avoid rate limits...");
                await sleep(60000);
            }
        } catch (e) {
            console.error("Failed to generate image completely, skipping this task.");
            // Generate fallback if all else fails
            const placeholderSource = path.join(__dirname, task.site, 'public', 'media-images', 'hero-bg.webp');
            if (fs.existsSync(placeholderSource)) {
                fs.copyFileSync(placeholderSource, task.targetPath);
                console.log(`Copied generic placeholder instead.`);
            }
        }
    }
    
    console.log("\n=== All 404 Images Handled ===");
};

run();
