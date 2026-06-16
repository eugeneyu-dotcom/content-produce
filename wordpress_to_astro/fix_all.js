const fs = require('fs');
const path = require('path');

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

function parseFAQ(faqText) {
    // 預期格式: "1. 問題內容?(答案內容) 2. ..."
    // 我們可以利用正則表達式來分割
    const regex = /\d+\.\s*([^\?？]+[\?？])\s*\(([^)]+)\)/g;
    const faqs = [];
    let match;
    while ((match = regex.exec(faqText)) !== null) {
        faqs.push({ q: match[1].trim(), a: match[2].trim() });
    }
    return faqs;
}

async function main() {
    const blogDir = path.join(__dirname, 'Desk/src/content/blog');
    const mdFiles = getFiles(blogDir);
    console.log(`找到 ${mdFiles.length} 個 Markdown 檔案，開始處理...`);

    let processedCount = 0;

    for (const file of mdFiles) {
        let content = fs.readFileSync(file, 'utf8');
        let modified = false;

        // 1. 清除垃圾 HTML (包含黑三角形 SVG)
        // 使用正則表達式匹配從 <div class="wp-block-uagb-container...style="width: 75vw... 到 </div></div>
        const garbageRegex1 = /<div class="wp-block-uagb-container[^>]*style="width:\s*75vw[^>]*>[\s\S]*?<\/div><\/div>/g;
        // 也刪除 MAXORA 相關區塊
        const garbageRegex2 = /<div class="wp-block-uagb-container[^>]*alignfull[^>]*>[\s\S]*?<svg[\s\S]*?<\/svg>[\s\S]*?<\/div><\/div>/g;

        if (garbageRegex1.test(content) || garbageRegex2.test(content)) {
            content = content.replace(garbageRegex1, '');
            content = content.replace(garbageRegex2, '');
            modified = true;
        }

        // 刪除可能殘留的空的 <style></style> 等
        if (content.includes('<style></style>')) {
            content = content.replace(/<style><\/style>/g, '');
            modified = true;
        }

        // 2. 翻譯標題
        if (content.includes('### 相關文章關鍵字')) {
            content = content.replace(/### 相關文章關鍵字/g, '### 関連キーワード');
            modified = true;
        }
        if (content.includes('### 常見問題 FAQ')) {
            content = content.replace(/### 常見問題 FAQ/g, '### よくある質問 (FAQ)');
            modified = true;
        }

        // 3. FAQ 區塊化
        // 尋找 ### よくある質問 (FAQ) 下方的文字
        const faqRegex = /### よくある質問 \(FAQ\)\s+([\s\S]+)$/;
        const match = content.match(faqRegex);
        if (match) {
            const faqText = match[1];
            // 避免重複處理
            if (!faqText.includes('<div class="faq-container">')) {
                const faqs = parseFAQ(faqText);
                if (faqs.length > 0) {
                    let faqHtml = '\n\n<div class="faq-container">\n';
                    for (const faq of faqs) {
                        faqHtml += `    <div class="faq-block">\n`;
                        faqHtml += `        <div class="faq-q">Q: ${faq.q}</div>\n`;
                        faqHtml += `        <div class="faq-a">A: ${faq.a}</div>\n`;
                        faqHtml += `    </div>\n`;
                    }
                    faqHtml += '</div>\n';
                    
                    content = content.replace(faqRegex, `### よくある質問 (FAQ)${faqHtml}`);
                    modified = true;
                }
            }
        }

        if (modified) {
            fs.writeFileSync(file, content, 'utf8');
            processedCount++;
            console.log(`處理完成: ${path.basename(file)}`);
        }
    }

    console.log(`執行完畢！共修改 ${processedCount} 個檔案`);
}

main().catch(console.error);