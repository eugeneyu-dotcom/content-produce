const fs = require('fs');
const path = require('path');

function parseCSV(content) {
    const records = [];
    let curCol = '';
    let row = [];
    let inQuotes = false;
    
    for (let i = 0; i < content.length; i++) {
        const char = content[i];
        const nextChar = content[i + 1];
        
        if (char === '"' && inQuotes && nextChar === '"') {
            curCol += '"';
            i++; 
        } else if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            row.push(curCol);
            curCol = '';
        } else if ((char === '\n' || char === '\r') && !inQuotes) {
            if (char === '\r' && nextChar === '\n') i++; 
            row.push(curCol);
            records.push(row);
            row = [];
            curCol = '';
        } else {
            curCol += char;
        }
    }
    if (curCol || row.length) {
        row.push(curCol);
        records.push(row);
    }
    
    const headers = records[0].map(h => h.trim());
    return records.slice(1).map(r => {
        const obj = {};
        headers.forEach((h, i) => {
            obj[h] = r[i] !== undefined ? r[i].trim() : '';
        });
        return obj;
    });
}

function getFiles(dir, filesList = []) {
    if (!fs.existsSync(dir)) return filesList;
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            getFiles(fullPath, filesList);
        } else if (fullPath.endsWith('.md')) {
            filesList.push(fullPath);
        }
    }
    return filesList;
}

function isSlugMatch(mdSlug, csvDimensionStr) {
    if (!mdSlug || !csvDimensionStr) return false;
    const cleanMd = mdSlug.toLowerCase().replace(/-/g, '').replace(/and/g, '');
    const cleanCsv = csvDimensionStr.toLowerCase().replace(/[^a-z0-9]/g, '');
    return cleanCsv.includes(cleanMd);
}

async function main() {
    console.log('🚀 開始執行 FAQ 注入腳本...');
    
    const csvPath = path.join(__dirname, 'SOP2-1_Dimension.csv');
    if (!fs.existsSync(csvPath)) {
        console.error('❌ 找不到 CSV 檔案:', csvPath);
        return;
    }
    
    const csvContent = fs.readFileSync(csvPath, 'utf8');
    const csvData = parseCSV(csvContent);
    console.log(`✅ 成功讀取 CSV，共解析出 ${csvData.length} 筆資料`);

    const blogDir = path.join(__dirname, 'Desk/src/content/blog');
    const mdFiles = getFiles(blogDir);
    console.log(`📂 找到 ${mdFiles.length} 個 Markdown 檔案\n`);

    let injectedCount = 0;

    for (const file of mdFiles) {
        const content = fs.readFileSync(file, 'utf8');
        
        let fileSlug = '';
        const slugMatch = content.match(/slug:\s*["']?([^"'\n]+)["']?/);
        
        // 【核心修正】：如果找不到 slug，就直接使用去除了 .md 的「檔案名稱」
        if (slugMatch) {
            fileSlug = slugMatch[1].trim();
        } else {
            fileSlug = path.basename(file, '.md');
        }
        
        const matchData = csvData.find(row => isSlugMatch(fileSlug, row['Pillar Post Dimension']));
        
        if (matchData && (matchData['Keyword slug'] || matchData['FAQ'])) {
            if (content.includes('### 相關文章關鍵字') || content.includes('### 常見問題 FAQ')) {
                console.log(`⚠️ 已跳過 (已存在): ${fileSlug}`);
                continue;
            }

            let appendContent = '\n\n';
            
            if (matchData['Keyword slug']) {
                appendContent += `### 相關文章關鍵字\n\n${matchData['Keyword slug']}\n\n`;
            }
            
            if (matchData['FAQ']) {
                appendContent += `### 常見問題 FAQ\n\n${matchData['FAQ']}\n`;
            }
            
            fs.appendFileSync(file, appendContent, 'utf8');
            injectedCount++;
            console.log(`✅ 成功注入: ${fileSlug}`);
        } else {
            // 加入這行可以讓你知道哪些檔案沒配對成功，方便除錯
            console.log(`❌ 未配對到 CSV 資料: ${fileSlug}`);
        }
    }

    console.log(`\n🎉 執行完畢！共成功注入 ${injectedCount} 個檔案`);
}

main().catch(console.error);