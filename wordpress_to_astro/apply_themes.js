const fs = require('fs');
const path = require('path');

const themes = {
  'joaillerie': {
    vars: `
  --accent: #b39ddb;
  --accent-dark: #7e57c2;
  --black: 40, 30, 50;
  --gray-light: 243, 238, 250;
  --gray-dark: 60, 45, 75;
  --gray-gradient: rgba(var(--gray-light), 50%), #fff;
    `,
    body: `
  background: linear-gradient(var(--gray-gradient)) no-repeat;
  color: rgb(var(--gray-dark));
    `
  },
  'Desk': {
    vars: `
  --accent: #333333;
  --accent-dark: #000000;
  --black: 0, 0, 0;
  --gray-light: 245, 245, 245;
  --gray-dark: 50, 50, 50;
  --gray-gradient: #ffffff, #fafafa;
    `,
    body: `
  background: #ffffff;
  color: #333333;
    `
  },
  'Dream': {
    vars: `
  --accent: #bb86fc;
  --accent-dark: #9965f4;
  --black: 200, 200, 200;
  --gray-light: 40, 40, 40;
  --gray-dark: 200, 200, 200;
  --gray-gradient: #121212, #1a1a1a;
    `,
    body: `
  background: #121212;
  color: #e0e0e0;
    `
  },
  'Legend': {
    vars: `
  --accent: #00ff00;
  --accent-dark: #00aa00;
  --black: 150, 255, 150;
  --gray-light: 20, 40, 20;
  --gray-dark: 180, 220, 180;
  --gray-gradient: #051005, #0a1a0a;
    `,
    body: `
  background: #051005;
  color: #aaddaa;
    `
  }
};

for (const [site, theme] of Object.entries(themes)) {
  const cssPath = path.join(__dirname, site, 'src/styles/global.css');
  if (fs.existsSync(cssPath)) {
    let css = fs.readFileSync(cssPath, 'utf8');
    
    // Replace :root
    css = css.replace(/:root\s*{[^}]*}/, `:root {${theme.vars}}`);
    
    // Replace body background & color
    css = css.replace(/background:\s*[^;]+;/g, '');
    css = css.replace(/color:\s*[^;]+;/g, '');
    css = css.replace(/body\s*{/, `body {${theme.body}`);
    
    fs.writeFileSync(cssPath, css);
    console.log(`Updated theme for ${site}`);
  }
}
