# Content Farm — Claude Code 移交文件

本文件供 Claude Code session 轉移時使用，記錄專案架構、運作邏輯、已實作功能、以及重要約束。

---

## 專案概覽

這是一個 **AI 自動生成部落格文章** 的 Content Farm 系統。  
核心腳本為 `ai_agent.js`，從 Google Sheet 讀取任務，呼叫 Gemini AI 生成文章與配圖，並寫入 4 個 Astro SSG 站台。

### 4 個站台

| 站台目錄 | 域名 | 語言 | 主題 |
|---|---|---|---|
| `joaillerie/` | joaillerie-et-symbolique.com | 法文 | 珠寶象徵學 |
| `Dream/` | encyclopedia-of-dreams.com | 英文 | 夢境解析 |
| `Desk/` | minimal-desk-studio.com | 日文 | 極簡桌面設置 |
| `Legend/` | global-urban-legends.com | 英文 | 都市傳說 |

全部部署於 **Vercel**（同一個 GitHub repo，4 個 Vercel 專案各自指定 Root Directory）。

---

## 如何執行

```bash
# 在專案根目錄執行
node ai_agent.js
```

Agent 自動完成以下流程：
1. 從 Google Sheet 下載最新 CSV（`N8N_work - Workflow_Config.csv`）
2. 找出 `Status=Active` 的列
3. 對每篇文章依序：搜尋(Serper) → Scout(Gemini) → 內部連結選擇 → HC解析翻譯 → Writer(Gemini) → 圖片生成(Imagen) → 儲存 .md
4. 完成後 batch 寫回 Google Sheet（Status=USED、Post_Url）

建置與部署：
```bash
cd joaillerie && npm run build
cd Dream && npm run build
cd Desk && npm run build
cd Legend && npm run build
git add [articles and images] && git commit -m "..." && git push origin main
```

---

## API Key 檔案格式

根目錄的 `API_Key` 檔（**已加入 .gitignore，絕對不可 commit**）：

```
Serper: [Serper API key]
Serp: [備用 SerpAPI key]
Gemini: [Google Gemini API key]
GoogleSheet: https://docs.google.com/spreadsheets/d/[DOC_ID]/edit?gid=[GID]
SheetWriteUrl: https://script.google.com/macros/s/[DEPLOYMENT_ID]/exec
SheetWriteSecret: [任意隨機字串，需與 Apps Script 中的 SECRET 一致]
```

`.env` 同樣在 `.gitignore`，不可 commit。

---

## Google Sheet 結構

CSV 欄位順序（`N8N_work - Workflow_Config.csv`）：

```
Topic, Site_Url, Pillar Post Title, Pillar Post Dimesion, Pillar Post Url,
Keyword Cluster, Keyword, Language, Used, API Key,
Status, Post_Url, Post_ID, Human_Context
```

- `Status=Active` → agent 會處理這一列
- `Status=USED` → 已處理，agent 跳過
- `Human_Context` 欄位是**多行 quoted CSV 欄位**，格式如下：

```
觸發：[觸發點描述]
痛點：[讀者痛點]
細節：[具體人事物細節]
結論（偏見）：[作者個人觀點]
證據：[佐證資料或連結]
```

---

## Human Context (HC) 架構

HC 是讓文章有「人味」的核心機制，分為 5 個部分：
- **觸發**：什麼情境觸發了作者關注這個主題
- **痛點**：讀者面臨的具體問題
- **細節**：具名人物、特定物件、地點等具體細節（AI 不可替換或刪除）
- **結論/偏見**：作者的主觀觀點
- **證據**：支持觀點的資料/連結

### Anchor Translator 架構
Agent 在 Writer 之前，先呼叫 Gemini Translator 將中文 HC 翻譯成目標語言（法/英/日），再傳給 Writer 使用。

Writer prompt 的關鍵規則：
- HC 必須**自然融入段落**，不可用粗體、引號、blockquote 包裝
- 具體細節（人名、物件名等）必須完整保留，不可泛化

---

## Google Sheet 自動寫回

使用 **Google Apps Script Web App** 接收 POST 請求更新 Sheet。

Apps Script 程式碼邏輯：
- 接收 `{token, items:[{keyword, post_url}]}`
- 驗證 token（對應 `API_Key` 中的 `SheetWriteSecret`）
- 按 Keyword 欄比對，設定 Status=USED 與 Post_Url
- Web App 部署設定：**執行身份=我、存取權限=所有人（Anyone）**

---

## Gemini API 使用

| 用途 | Model |
|---|---|
| Scout / Translator / Writer | `gemini-2.5-flash` |
| 圖片生成 | `imagen-4.0-generate-001` |

重要：各 API 呼叫之間有 rate limit 冷卻：
- Writer 完成後等 60 秒再生成圖片
- Header 圖片完成後等 60 秒再生成 Footer 圖片
- 每篇文章完成後等 30 秒再處理下一篇

---

## 已實作的重要修復

### 1. RFC 4180 CSV 解析
`Human_Context` 欄位是多行 quoted 欄位，舊的 `content.split('\n')` 會截斷。
已改為字元逐一解析（`parseCSV()` 函式）。

### 2. UTF-8 亂碼修復
所有 HTTP response 改用 Buffer 收集，統一在 `end` 時解碼：
```javascript
// 正確做法
const chunks = [];
res.on('data', chunk => chunks.push(chunk));
res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
```

### 3. 圖片生成故障隔離
Header 和 Footer 圖片各自有獨立的 try/catch，任一失敗只 fallback 那張，不影響另一張。

### 4. Image fallback
如果圖片生成失敗，複製 `{site}/public/media-images/hero-bg.webp` 作為 placeholder。

---

## Astro 站台架構

每個站台的結構相同：
```
{site}/
  src/
    content/blog/       ← 文章 .md 檔案
    layouts/BlogPost.astro
    components/BaseHead.astro
    styles/global.css
    pages/
      index.astro
      category/*.astro
  public/
    media-images/posts/ ← 文章圖片（header + footer）
    robots.txt
```

### 已實作的 SEO 功能
- `robots.txt`（允許所有爬蟲，指向 sitemap）
- `og:image`（BlogPost 傳遞 heroImage 給 BaseHead）
- JSON-LD BlogPosting schema（在 `<head>` 內 inline）
- 描述性 image alt text

### 各站視覺設計
| 站台 | 主題 | 字體 |
|---|---|---|
| joaillerie | 奢華百科（紫金色，深色背景） | Playfair Display |
| Dream | Aurora Dreamscape（深夜靛藍，玻璃擬態） | Cormorant Garamond + Manrope |
| Desk | Japandi Minimalism（暖奶油色，細線邊框） | Shippori Mincho + IBM Plex Sans JP |
| Legend | Classified Archive（近黑背景，舊報紙卡片） | Special Elite + Courier Prime |

---

## 文章 Frontmatter 格式

```yaml
---
title: "文章標題"
slug: "url-friendly-slug"
pubDate: 2026-07-01T09:00:00.000Z
description: "meta description"
category: "分類名稱"
heroImage: "/media-images/posts/[slug].png"
---
```

圖片命名規則：
- Header：`/media-images/posts/[slug].png`
- Footer：`/media-images/posts/[slug]-footer.png`

---

## 安全約束（絕對禁止）

1. **不可 commit `API_Key` 檔案**（已在 `.gitignore`）
2. **不可 commit `.env` 檔案**（已在 `.gitignore`）
3. **不可 commit `*/dist/` 目錄**（各站建置輸出）
4. `git add` 時必須指定具體檔案，不可用 `git add -A` 或 `git add .`

---

## 常用指令速查

```bash
# 執行 agent（處理所有 Active 任務）
node ai_agent.js

# 建置單一站台
cd joaillerie && npm run build

# 建置 4 站（依序）
for site in joaillerie Dream Desk Legend; do cd "$site" && npm run build && cd ..; done

# 確認文章是否上線（替換 slug）
curl -s -o /dev/null -w "%{http_code}" "https://www.joaillerie-et-symbolique.com/blog/[slug]/"

# 查看 agent 執行紀錄（若用重導向跑）
tail -f /tmp/agent_run.log

# 同步備份到 Bitbucket（GitHub push 完之後照跑，不影響 Vercel 部署，只有 Eugene 自己做）
cd "/Users/eugeneyu/Desktop/eugeneyu-bitbucket"
./sync-all.sh
```

**Bitbucket 備份**（2026-07-23 新增，2026-07-24 改為腳本化）：GitHub（`origin`）依然是唯一
的部署來源，Vercel 只接 GitHub，不受影響。另外維護一份獨立的 umbrella repo 於
`/Users/eugeneyu/Desktop/eugeneyu-bitbucket`，對應 Bitbucket 上 `maxoraai/eugeneyu.git`，
底下用 `projects.txt` 登記好幾個個人專案（各自一個子資料夾備份，這個專案對應
`old-content-farm/`），跑 `./sync-all.sh` 就會照清單自動對每個登記的專案做
`git subtree add/pull`，有變更的話統一 push 一次。詳細操作見 `Editor_SOP.md` 步驟 5。

⚠️ 這個 umbrella repo **只存在 Eugene 自己的電腦上，是私人的跨專案備份，跟代班/協作同事的
工作流程無關**——代班交接時**不要**把 `eugeneyu-bitbucket` 資料夾、Bitbucket 帳號或 token
一併交給對方；同事只需要處理 GitHub（`origin`）這條線，Bitbucket 備份留給 Eugene 自己事後
補跑即可，不會卡到代班進度。

---

## 專案文件

- `AGENTS.md` — AI agent 架構說明
- `Auto_Update_Blog.md` — 自動更新流程文件
- `Editor_SOP.md` — 編輯 SOP
- `Project_Migration_Plan.md` — 專案遷移計畫
- `N8N_work - Workflow_Config.csv` — 工作任務清單（從 Google Sheet 下載）
- `new-keywords.csv` — 全新關鍵字待寫清單（尚未派工到 Sheet 的候選關鍵字）
- `content-followups.md` — 既有文章待重寫/待重新定位的追蹤清單（跟 new-keywords.csv 不同，
  這裡是舊文章要修，不是新關鍵字要寫）
- `Site_Strategy_Log.md` — 四站差異化策略日誌（首頁結構/內容系列/互動功能等定位層級的決策，
  非單篇文章優化），每次定案新方向都要記錄，並在有足夠 GSC 數據後回頭補上成效驗證
