const fs = require('fs');
const path = require('path');

const csvFilePath = path.join(__dirname, 'N8N_work - Workflow_Config .csv');
const rawData = fs.readFileSync(csvFilePath, 'utf-8');

// Basic CSV parse
const lines = rawData.split('\n');
const headers = lines[0].split(',');

// Site mapping to folders
const siteMap = {
  'Joaillerie': 'joaillerie',
  'Dream Interpretation': 'Dream',
  'ミニマリスト・デスクセットアップ': 'Desk',
  'Global Urban Legends Analysis': 'Legend'
};

// Create folders if they don't exist
Object.values(siteMap).forEach(folder => {
  const contentPath = path.join(__dirname, folder, 'src/content/blog');
  fs.mkdirSync(contentPath, { recursive: true });
});

for (let i = 1; i < lines.length; i++) {
  const line = lines[i];
  if (!line.trim()) continue;
  
  // Note: Simple split by comma may break if content has commas inside quotes, 
  // but for a quick demo this demonstrates the concept.
  const row = line.split(',');
  const site = row[0];
  const folder = siteMap[site];
  
  if (!folder) continue;

  const url = row[4] || '';
  const keyword = row[6] || '';
  const status = row[10] || '';
  const postUrl = row[11] || '';
  
  // Only migrate USED posts
  if (status !== 'USED') continue;

  let slug = postUrl.split('/').filter(Boolean).pop();
  if (!slug) slug = `post-${i}`;
  
  const mdContent = `---
title: "${keyword}"
slug: "${slug}"
date: "${new Date().toISOString()}"
---

# ${keyword}

This is migrated content for the keyword **${keyword}**.

`;
  
  const contentPath = path.join(__dirname, folder, 'src/content/blog');
  fs.writeFileSync(path.join(contentPath, `${slug}.md`), mdContent, 'utf-8');
}

console.log('Migration complete!');
