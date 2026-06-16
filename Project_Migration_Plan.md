# 內容農場網站翻新與 AI Agent 自動化升級計畫 (Project Migration Plan)

## 1. 背景與目標 (Background & Goal)
目前手上有四個使用 N8N 串接 WordPress 的網站，主要用來產生與發布內容。為了擺脫 N8N 與 WordPress 系統較為臃腫的架構，並簡化未來發布的流程，計畫將這四個網站全面翻新為現代化的「靜態網站生成器 (SSG)」架構，並透過專屬的「本地端 AI Agent 腳本」來進行半自動化的內容更新。

## 2. 專案範圍 (Project Scope)
目前涵蓋以下四個網站的舊有內容轉移與架構重建：
1. **Desk**: 最小化桌面工作室 (minimal-desk-studio)
2. **Dream**: 夢境解析百科 (encyclopedia-of-dreams)
3. **Joaillerie**: 珠寶與象徵 (joaillerie-et-symbolique)
4. **Legend**: 全球都市傳說 (global-urban-legends)

## 3. 全新架構規劃 (New Architecture)
*   **前端框架**：採用 **Astro**，原生支援 Markdown/MDX 的內容集合 (Content Collections)，不僅載入速度極快，且有利於 SEO，非常適合內容型網站。
*   **內容儲存**：淘汰傳統資料庫，全數採用 Git 與 Markdown 管理。
*   **部署方式**：將推送到 GitHub，串接 Vercel 或 Netlify 進行自動建置與部署 (CI/CD)。

## 4. 升級版 AI Agent 工作流 (AI Agent Workflow)
未來的更新不需依賴複雜的 N8N，而是執行本地端編寫的 AI Agent 腳本 (Python 或 Node.js)，包含以下特色流程：

1. **資料讀取與人類介入 (Human-in-the-Loop)**
   - Agent 讀取 CSV 中排程的關鍵字。
   - 腳本在終端機暫停，提示使用者手動輸入專屬的 **大綱或個人觀點 (`Human_Context`)**，確保產出內容具有作者的真實溫度與獨特風格。
2. **高品質文章生成**
   - 結合「關鍵字」與「手寫大綱」，呼叫 LLM (如 GPT-4o 或 Claude) 自動生成結構完整的 Markdown 文章與 Frontmatter 屬性。
3. **自動化雙圖生成 (串接 Gemini 等生圖 API)**
   - Agent 分析文章內容，提煉圖片 Prompt。
   - 呼叫生圖 API 自動產生**頭部圖片 (Hero Image)** 與 **結尾補充圖片**。
   - 將圖片自動下載至專案的 `src/assets/images/`，並嵌入 Markdown 檔案中。
4. **發布與預覽**
   - 檔案自動歸檔至對應網站的資料夾，使用者可進行最終預覽，滿意後直接 Git Push 即可上線。

## 5. 預計實作步驟 (Implementation Steps)
- [x] 初始化四個網站的 Astro 專案。
- [x] 將舊有的 CSV 資料與發布記錄轉換為 Markdown 格式匯入 Astro，並保留舊有 URL 結構以利 SEO。
- [x] 抽離 AI Agent 中的敏感 API Keys 至 `.env`。
- [x] 開發支援「人類介入」的 CLI 介面，允許在生成前輸入個人大綱與觀點。
- [x] 開發 AI Agent 文字生成模組 (結合關鍵字與 Human_Context)。
- [x] 開發 AI Agent 圖片生成模組 (串接 Gemini 生圖 API，自動下載並插入文章)。
- [x] 微調四個網站的版型設計 (包含 Joaillerie 網站完整首頁設計：Hero 圖片背景, Pillar Posts, 最新文章卡片)。
- [x] 優化圖片管理與防呆機制 (處理 `ImageNotFound` 錯誤與圖片格式兼容)。
- [ ] 同步 Desk, Dream, Legend 的版型、圖片命名規則與 SEO 設定。
- [ ] 測試完整 AI Agent 流程與確認舊網址對應狀態。

## 6. 近期修改與討論紀錄 (Recent Updates & Discussions)
*   **Hero Block 滿版設計與描述文字**：針對 Joaillerie 網站，已將 Hero block 改為 100vw 滿版設計，提升了高度與 padding 強化視覺衝擊力，並在標題上方增加了 `Bienvenue sur Joaillerie et Symbolique` 的網站描述。
*   **圖片格式兼容與防呆**：
    *   新增了 `findImage` 輔助函數，在 `index.astro` 與 `BlogPost.astro` 中讓系統自動掃描路徑，兼容 `.webp`, `.jpg`, `.png`, `.jpeg` 等常見格式。
    *   移除 `content.config.ts` 中的 `z.optional(image())` 限制，改用 `z.string().optional()`，並加上 `onerror="this.style.display='none'"` 以及空白背景備援設計，徹底解決了 Astro 因為圖片遺失而導致的 `[ERROR] [ImageNotFound]` 網站崩潰問題。
*   **Logo 設定與無障礙優化 (Alt Text)**：
    *   Logo 放置於 Header 左上方，並更新 `BaseHead.astro` 將 `Logo.webp` 設為網站縮圖 (favicon)。
    *   透過 `rename_images.js` 腳本，將從 WordPress 爬蟲抓取的圖片重新命名為與所屬文章 `slug` 相同的名稱，並同步更新至 Markdown frontmatter 的 `heroImage`，確保命名規則統一。
    *   完善了所有圖片的 `alt` 屬性，包含 Logo 加上 `Joaillerie et Symbolique Logo`，文章內頁圖片自動帶入 `title`，以及 Pillar Posts 中加入 `.sr-only` 給螢幕閱讀器讀取。

## 7. 站點模板客製化與細節處理準則 (Guidelines for Site Customization)
這部分整理自 Joaillerie 網站的翻新經驗，未來修改 Desk、Dream 與 Legend 網站時請參照以下 8 項核心準則：

1.  **圖片-維度對應 (Image to Dimension Mapping)**：
    *   首頁 Pillar Posts (如 `SOP2-1_Dimension.csv` 定義的分類)，需手動在 `/public/media-images/` 目錄下建立對應的靜態圖片 (如 `pillar-xxx.webp`)。在 `index.astro` 中宣告固定陣列並映射對應圖片，方便使用者日後無程式碼修改背景圖。
2.  **文章連結對應 (Article Link Mapping)**：
    *   在 Astro v5 架構下，使用 `getCollection('blog')` 迴圈輸出文章時，連結請使用 **`post.id`** (`<a href={'/blog/${post.id}/'}>`) 而非 `post.slug`，以避免出現 `[404] /blog/undefined/` 錯誤。
    *   將整個文章卡片點擊範圍最大化：運用 `<a class="article-link"><span class="sr-only">{title}</span></a>` 配合 `position: absolute; top: 0; bottom: 0; left: 0; right: 0; z-index: 10;` 覆蓋整張卡片，提升 UX。
3.  **維度底下關鍵字對應 (Keyword Links Mapping)**：
    *   將爬取回來的 Markdown 內文中，帶有舊網站絕對路徑 (如 `https://www.old-site.com/xxx/`) 的 `#關鍵字` 標籤，透過腳本 (如 `fix_links.js`) 自動比對本地存在的 slug，並精準替換成 Astro 的相對路徑 `/blog/xxx/`。
    *   如果對應的文章尚不存在，則保留原連結或 `#` 字號不處理。
4.  **Footer 相關設定 (Footer Configuration)**：
    *   淘汰預設模板，建立帶有品牌質感 (如奢華深色背景 `var(--accent-dark)`) 的新 Footer。
    *   需包含 `Maxora.ai` 品牌 Logo (若無圖片可用優雅字型 `Playfair Display` 呈現) 與網站理念描述。
    *   加入「Privacy Policy (隱私權政策)」與「Contact Us (聯絡我們 - 使用 `mailto:` 連結)」等實用按鈕，並加上 Hover 動畫。
5.  **Menu 相關設定 (Header / Menu Configuration)**：
    *   在 `Header.astro` 實作原生 CSS Hover 下拉選單 (Dropdown)。
    *   下拉選單需自動帶入該網站於 `SOP2-1_Dimension.csv` 中規劃的 Pillar Post (維度) 標題與文章連結。
    *   選單右側獨立凸顯「聯絡我們」按鈕。
6.  **Privacy Policy 製作方式與設定 (Privacy Policy Setup)**：
    *   刪除從舊站匯出且夾雜大量 HTML 的 `.md` 檔案，改為在 `src/pages/` 目錄建立原生的 `.astro` 頁面 (如 `politique-de-confidentialite.astro`)。
    *   文字內容需全數手動清洗為乾淨的 Markdown / HTML 結構，去除原本編輯器 (如 Spectra) 的複雜 class。
    *   使用奢華排版：寬度限制為 `75vw`，並使用進階置中技巧：`margin-left: calc(-37.5vw + 50%); margin-right: calc(-37.5vw + 50%);`，以突破 `<main>` 的 960px 最大寬度限制，確保左右兩側完美保留 12.5% 的對稱留白。
7.  **About Us 製作方式與設定 (About Us Setup)**：
    *   刪除預設的 `about.astro` (Lorem ipsum) 與夾雜髒代碼的 `.md` 舊文，重新建立客製化的 `a-propos.astro` (或對應語系命名)。
    *   版面套用上述的 `75vw` 進階對稱置中排版。
    *   如需三個特色重點並排顯示，請使用 CSS Grid (`grid-template-columns: 1fr 1fr 1fr;`)，讓各欄位剛好等於 25vw，呈現完美的橫列卡片排版。
    *   依據需求更換高品質的 AI 生成圖片。
8.  **其他需要注意事項 (Other Important Notes)**：
    *   為確保防呆與穩定性，凡是使用圖片的地方 (特別是動態產生的文章封面)，一定要結合 `findImage` 迴圈探測 `.webp`, `.jpg`, `.png` 檔案，並在 `<img>` 標籤上加入 `onerror="this.style.display='none';"` 作為最終容錯機制。
    *   主題色碼 (`var(--accent)` 等) 要統一在 `global.css` 中維護，確保深色/淺色/高亮顏色能一致替換。
9.  **FAQ 製作方式與設定 (FAQ Section Setup)**：
    *   FAQ 區塊需維持「非折疊式 (Non-collapsible)」的清單呈現，以增加閱讀順暢度。
    *   針對 Q (問題) 與 A (解答) 必須使用不同顏色進行強調，讓視覺層次更分明（例如 Q 使用亮色/主題色加粗，A 使用對比色或稍微低調的文字色）。
10. **Category 頁面 (Pillar Pages) 重建與優化 (Category Pages Reconstruction & Optimization)**：
    *   **極簡化內容**：徹底清除從 WordPress 轉移過來的冗餘區塊 (如舊 FAQ、無效按鈕、影片等)，只保留「大標題、內文、以及至多兩張圖片」，確保版面乾淨。
    *   **排版寬度**：使用 `width: 75%; max-width: none; margin: 0 auto; padding: 20px;`，讓左右兩側各留 12.5% 的完美對稱空白。
    *   **自訂 FAQ 卡片**：依據各站點主題，將 FAQ 獨立為精美卡片。Dream 採深紫粉、Joaillerie 採優雅紫金、Desk 採極簡灰白、Legend 採暗黑血紅，提升沈浸感。
    *   **自動化 Keyword 連結**：比對 `SOP2-2_Keyword.csv`，在 Category 頁面動態生成相關文章按鈕。若文章尚未產出則以灰色呈現 (not-allowed)；若文章已存在，確保連結指向本地端絕對正確的 Astro 路由 (`post.id`) 以防 404。
11. **文章縮圖、內部連結與分類管理 (Blog Content & Internal Links)**：
    *   **修復佔位符與 N8N ID**：避免檔案儲存為不具讀取價值的 N8N API Key，需透過腳本 (`finalize_content_and_thumbnails.js`) 比對對應真正的 WordPress Slug，重新命名並串接 API 討回真實內文。
    *   **自動抓取文章縮圖**：透過掃描 Markdown 內文的第一張圖片，將其寫入 Frontmatter 的 `heroImage:` 屬性，並強制對應本地端圖庫路徑 (`/media-images/posts/[slug].png`)，確保 Archive 列表縮圖正常顯示。
    *   **可視化 Category**：在 Markdown 檔案自動加上 `category: "分類名稱"` 的 Frontmatter，更新 `content.config.ts`，並於 `index.astro` 列表與內頁顯示專屬的分類標籤。
    *   **維護內部連結**：全站掃描文章內文，將連向舊網址（如 WP 舊網域）的內部連結全數自動升級為正確的 Astro 相對路徑 (`/blog/[slug]` 或是 `/category/[slug]`)，確保 SEO 權重不流失。
