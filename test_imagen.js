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

const data = JSON.stringify({
  instances: [
    { prompt: "A cinematic photo of a minimalist desk setup, warm lighting." }
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
                console.error("API Error:", parsed.error.message);
            } else if (parsed.predictions && parsed.predictions[0]) {
                console.log("Success! Received base64 image data.");
                console.log(parsed.predictions[0].bytesBase64Encoded.substring(0, 50) + "...");
            } else {
                console.log("Unknown response:", parsed);
            }
        } catch (e) {
            console.error("Parse Error:", e);
            console.log("Raw response:", resData);
        }
    });
});

req.on('error', (e) => {
    console.error(e);
});
req.write(data);
req.end();
