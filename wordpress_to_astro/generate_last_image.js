const fs = require('fs');
const path = require('path');
const https = require('https');

const apiKeysContent = fs.readFileSync(path.join(__dirname, 'API_Key'), 'utf8');
const apiKeys = {};
apiKeysContent.split('\n').forEach(line => {
    if (line.includes(':')) {
        const parts = line.split(':');
        apiKeys[parts.shift().trim()] = parts.join(':').trim();
    }
});

const GEMINI_API_KEY = apiKeys['Gemini'];

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

const run = async () => {
    console.log("Generating the last missing image...");
    
    const promptReq = "A high-quality, cinematic photograph capturing a focused hand powerfully breaking through a dissolving, iridescent dreamscape, sending ripples of rich, textural light and crystalline fragments outward, symbolizing a swift awakening from a lucid dream. Do not include any text in the image.";
    
    try {
        const base64 = await generateImageWithImagen(promptReq);
        const targetPath = path.join(__dirname, 'Dream', 'public', 'media-images', 'posts', 'how-to-wake-up-from-a-lucid-dream-fast.png');
        fs.writeFileSync(targetPath, Buffer.from(base64, 'base64'));
        console.log("Successfully saved how-to-wake-up-from-a-lucid-dream-fast.png!");
    } catch (e) {
        console.error("Failed to generate image:", e);
    }
};

run();
