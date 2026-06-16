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

const options = {
    hostname: 'generativelanguage.googleapis.com',
    path: `/v1beta/models?key=${GEMINI_API_KEY}`,
    method: 'GET'
};

https.get(options, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        const parsed = JSON.parse(data);
        if (parsed.models) {
            const imagenModels = parsed.models.filter(m => m.name.includes('imagen'));
            console.log(imagenModels);
        } else {
            console.log(parsed);
        }
    });
});
