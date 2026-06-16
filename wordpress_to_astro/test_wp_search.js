const https = require('https');

const url = 'https://www.encyclopedia-of-dreams.com/wp-json/wp/v2/posts?search=how%20to%20wake%20up%20from%20a%20lucid%20dream%20fast';

https.get(url, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        const posts = JSON.parse(data);
        if (posts && posts.length > 0) {
            console.log("Found post slug:", posts[0].slug);
        } else {
            console.log("No posts found.");
        }
    });
});
