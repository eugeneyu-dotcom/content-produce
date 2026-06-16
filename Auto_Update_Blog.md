# AI Agent 自動更新部落格標準作業手冊 (Auto Update Blog SOP)

本手冊定義了專案從 N8N/WordPress 架構轉移至 Astro 靜態網站架構後，如何透過本地端 AI Agent 執行全自動 / 半自動的內容更新工作流。每次啟動更新任務時，AI Agent 需嚴格遵循以下 8 個步驟。

---

## 前置準備
執行腳本前，需確保專案根目錄下存在名為 `API_Key` 的文字檔，檔案內需正確配置以下 API 金鑰：
- `Serper`: 作為 Google 搜尋與資料收集的主力。
- `Serp`: 作為搜尋 API 的備用機制，若 Serper 失敗時可無縫切換。
- `Gemini`: 用於文字摘要、結構規劃、長文生成以及圖片生成。

---

## 步驟 1: 任務掃描 (Scan Tasks)
1. 讀取 `N8N_work - Workflow_Config.csv`。
2. 篩選任務列條件：
   - `Status` 欄位為 `Active`。
   - `Human_Context` 欄位必須有填入人類給予的觀點與背景設定（確保文章品質）。
3. 擷取符合條件的列，並取得其 `Keyword`、`Language`、`Topic` 等核心資訊。

---

## 步驟 2: 外部連結資料蒐集 (Scout Report & Strategy Plan)
1. 串接 **SerpAPI**，將 `Keyword` 送至 Google 搜尋，抓取前 10 篇自然搜尋結果 (Organic Results) 的標題與網址。
2. 串接 **Gemini API (Scout 模型)**，將搜尋結果餵給 AI，要求挑選最佳外部連結並決定寫作維度。
   - **使用 Prompt (供 AI Agent 參考執行)**：
     ```text
     ### 原始變數
     - 關鍵字：[Keyword]
     - 目標語言：[Language]
     
     ### 搜尋結果
     [SerpAPI 回傳的 JSON]
     
     ### 執行要求
     請執行 SOP 3-1 至 3-3：
     1. 挑選 2-5 個最相關連結並提供摘要，作為後續外部連結使用。
     2. 根據下列六大維度庫，為關鍵字挑選 3-5 個維度並註明撰寫方向。
     六大維度：
     核心本質 (Essence)：底層邏輯、科學原理。
     外部聯繫 (Connections)：文化歷史、社會演進、法律規範。
     感官實踐 (Practice)：五感描述、操作指南、儀式感。
     對比分析 (Comparison)：新舊對照、跨文化對比、優劣分析。
     未來展望 (Future)：預測演化、技術發展、心理變遷。
     真實案例 (Evidence)：歷史數據、名人軼事、實驗數據。
     
     ### 輸出格式 (JSON)
     {
       "scout_report": [{"title": "...", "url": "...", "summary": "..."}],
       "strategy_plan": [{"dimension": "...", "direction": "..."}]
     }
     ```

---

## 步驟 3: 內部連結池準備 (Internal Link Pool)
為了維持強大的 SEO 架構，必須準備內部連結供主文章引用：
1. **主要 Pillar 連結**：從 `N8N_work` 找出該 Keyword 所屬的 `Pillar Post Dimension`，並對應到 Astro 專案中 `/category/[slug]/` 的路由。
2. **一般文章連結**：在 `N8N_work` 篩選同站點中 `Status` 為 `USED` 的其他相關文章，挑選出 2-3 篇最相關的，取得其 Astro 路由 (`/blog/[slug]/`)。

---

## 步驟 4: 主文章生成 (Article Generation)
串接 **Gemini API (Writer 模型)** 進行 1500 字的長文生成。此步驟必須嚴格遵守「Anti-Detection Protocol（反 AI 偵測協議）」與「Short Anchor Mandate（短錨文本原則）」。

- **使用 Prompt (供 AI Agent 參考執行)**：
  ```text
  ### Role & Persona
  You are a highly opinionated, experienced human blogger and subject matter expert. You do not write like an AI. You write with visceral emotion, personal bias, and highly specific micro-details. 
  **[CRITICAL TONE CHECK]**: Do NOT be overly dramatic, aggressive, or "edgy." Express your frustrations with grounded, adult restraint. Maintain a real, slightly exhausted, yet deeply knowledgeable professional persona.
  
  ### Core Settings
  - Target Language: [Language]
  - Focus Keyword: [Keyword]
  - Strategic Dimensions: [由 Scout 產生的 strategy_plan]
  - Human Context (The Soul of the Article): [由 CSV 提供的 Human_Context]
  
  ### 🛑 THE "GHOSTWRITER" ANTI-DETECTION PROTOCOL (CRITICAL)
  1. **Strict Context Lock**: STRICTLY build the narrative around the EXACT characters, settings, and events in the [Human Context]. Add authentic human self-justification if absurd.
  2. **Anti-Cliché & Numbers**: NEVER end with "cold coffee" or "blinking cursor". NEVER use default AI numbers (30%, 50%, 80%). Use messy fractions (17%, 43%).
  3. **Structural Sabotage**: Asymmetrical lists (mix extremely short and rambling bullets). Destroy the "Hook->Debunk->Conclusion" format. No "Summary" headings.
  4. **Banned Words**: delve, crucial, tapestry, testament, undeniable, symphony, beacon, landscape, journey, navigating.
  
  ### 🔗 INTERNAL LINKING STRICT PROTOCOL (SHORT ANCHOR MANDATE)
  **[CRITICAL SEO RULE]**: You MUST keep the `href="URL"` exactly as provided below, BUT modify the "Anchor Text" to fit the conversational flow. 
  **SHORT ANCHOR MANDATE:** Anchor text MUST be extremely SHORT (1 to 3 words max).
  
  1. MANDATORY PILLAR LINK: Insert into the intro: [Pillar 路由網址]
  2. INTERNAL LINK POOL: Use 2-3 links: [內部相關文章路由網址]
  3. EXTERNAL AUTHORITY LINKS: Use 1-2 sources from Scout Report casually.
  
  ### Output JSON Structure
  {
    "title": "SEO Optimized Title",
    "slug": "url-slug-using-keywords",
    "focus_keyword": "...",
    "meta_description": "...",
    "image_prompt_header": "Professional cinematic photography, 16:9, Imagen-3 style.",
    "image_prompt_footer": "Detailed macro photography, 16:9, Imagen-3 style.",
    "content_blocks": [
      { "heading": "...", "text": "HTML content inside this section. MUST use standard HTML <table>, <tr>, <th>, <td> tags if making a comparison." }
    ]
  }
  ```

---

## 步驟 5: 自動化雙圖生成 (Image Generation & Download)
1. 取出步驟 4 產生的 `image_prompt_header` 與 `image_prompt_footer`。
2. 呼叫生圖 API 生成圖片。
3. **本地端儲存**：將生圖結果下載並儲存至該站點目錄下的 `/public/media-images/posts/`：
   - 頭部主圖儲存為：`[slug].png`
   - 結尾副圖儲存為：`[slug]-footer.png`

---

## 步驟 6: 組裝 Astro Markdown 檔案 (Markdown Assembly)
將生成的內容統一轉換為標準的 Markdown (`.md`) 檔案。
*(註：因採用 Astro 靜態架構，外觀風格如顏色、排版等皆由各站的 `global.css` 與 Astro 模板控制，因此組裝步驟不需區分站點，只要產出語意正確的 HTML/Markdown 標籤即可完美套用各自的風格！)*

1. **配置 Frontmatter**：
   ```yaml
   ---
   title: "[JSON 產生的 Title]"
   slug: "[JSON 產生的 Slug]"
   pubDate: [當下時間 ISO String]
   description: "[JSON 產生的 meta_description]"
   category: "[Pillar Dimension]"
   heroImage: "/media-images/posts/[slug].png"
   ---
   ```
2. **組合 HTML/Markdown 內文**：將 `content_blocks` 的內容寫入，並在結尾處插入副圖的 HTML：
   ```html
   <figure class="aligncenter size-large">
       <img src="/media-images/posts/[slug]-footer.png" alt="Footer illustration">
   </figure>
   ```
3. 儲存檔案至 `[Site]/src/content/blog/[slug].md`。

---

## 步驟 7: 狀態回寫 (Update CSV)
1. 打開 `N8N_work - Workflow_Config.csv`。
2. 找到剛才處理的任務列。
3. 將 `Status` 改為 `USED`。
4. 將 `Used` 改為 `USED`。
5. 將 `Post_Url` 填入實際網址 (例如：`https://[Site_Url]/blog/[slug]/`)。
6. 儲存 CSV 檔案。

---

## 步驟 8: 發布與搜尋引擎通知 (Deploy & Indexing)
1. 透過 Node.js 或 Shell 執行 Git 指令：
   ```bash
   git add .
   git commit -m "Auto-publish: [Keyword]"
   git push
   ```
2. Git Push 將自動觸發 GitHub 連結的 Vercel 或 Netlify 進行全站靜態頁面重建與發布。
3. (可選) 透過 Google Search Console API 提交更新的 URL 給 Google 進行爬取。

---
完成以上 8 個步驟，即完成了一次端到端的 AI 部落格全自動更新作業。