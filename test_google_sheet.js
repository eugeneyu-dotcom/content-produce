const https = require('https');
const url = 'https://docs.google.com/spreadsheets/d/1klqyKenNzDbD_QQp-TJ63_0GGetDOefBdEFt258q3R8/export?format=csv';

const testFetch = () => {
    https.get(url, (res) => {
        if (res.statusCode === 307 || res.statusCode === 302) {
            console.log("Redirecting to:", res.headers.location);
            https.get(res.headers.location, (redirectRes) => {
                let data = '';
                redirectRes.on('data', chunk => data += chunk);
                redirectRes.on('end', () => {
                    console.log("Successfully fetched CSV!");
                    console.log("First 200 characters of CSV:");
                    console.log(data.substring(0, 200));
                });
            }).on('error', e => console.error(e));
        } else {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                console.log("Successfully fetched CSV!");
                console.log("First 200 characters of CSV:");
                console.log(data.substring(0, 200));
            });
        }
    }).on('error', e => console.error(e));
};

testFetch();
