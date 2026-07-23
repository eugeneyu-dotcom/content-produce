# 部落格自動化更新操作手冊（編輯人員 / 代班人員專用）

這份手冊涵蓋目前實際在跑的流程：**選題規劃（Sheet）→ 資料蒐集（`--prepare`）→ 由 Claude Code
撰寫文章 → 生圖與組裝（`--finish`）→ 建置與發布（git push）**。文章撰寫這一步現在是由
Claude Code 讀取素材後親自寫，不再是 `node ai_agent.js` 一鍵全自動跑完（那是舊版流程，已
停用）。

---

## 🚀 第一次使用必看的「環境設定與必備權限」

在你第一次開始之前，請確保你已經從主管或技術人員那裡取得以下權限與檔案：

1. **取得完整專案程式碼**：
   - 電腦要先裝好 **Git**，並取得這個 GitHub Repository 的協作者權限。
   - `git clone` 下來，裡面包含核心腳本 (`ai_agent.js`)、四個網站的原始碼，以及
     `.claude/skills/content-farm-writer/SKILL.md`——這份 skill 已經 checked in 到
     repo 裡，clone 下來後在專案目錄開 Claude Code 就會自動偵測到，**不需要另外安裝**。
2. **安裝 Node.js**：至 [Node.js 官網](https://nodejs.org/) 下載安裝，執行腳本需要。
3. **Claude Code 帳號**：你要用自己的帳號登入 Claude Code，在這個專案的資料夾底下開啟
   對話。文章撰寫這一步是直接在 Claude Code 裡跟它對話完成的，不是跑一個無人值守的指令。
4. **取得兩份機密憑證檔案**（都在 `.gitignore` 裡，不會跟著 `git clone` 過來，需要主管
   額外、安全地交給你——建議用密碼管理工具的共用金庫，**不要用 email/Slack 明文傳**）：
   - **`API_Key`**：Serper、Gemini 金鑰，以及 Google Sheet 讀取/寫回設定。放在專案最外層
     目錄，跟 `ai_agent.js` 同一層。
   - **`.env`**：Maxora 生圖 API 的憑證（`CF-Access-Client-Id`/`Secret`）。同樣放在最
     外層目錄。
5. **Google Sheet 編輯權限**：確認你能開啟並編輯團隊共用的 **N8N_work - Workflow_Config**
   試算表。

確認以上都準備就緒後，就可以開始日常更新了。

---

## 📝 日常更新工作流

### 步驟 1：企劃與派寫任務（操作 Google Sheet）

1. 打開 **N8N_work - Workflow_Config** 試算表。
2. 新增一列（或找到既有列），填好 `Topic`、`Keyword`、`Language` 等欄位。
3. **填寫 `Human_Context`（人類觀點）**：這是整篇文章的靈魂，用「觸發／痛點／細節／結論
   （偏見）／證據」五段格式寫下真實的個人經歷或觀點。
   *範例：「觸發：最近一直夢到蛇……」*（完整格式參考 `CLAUDE.md` 的 HC 架構說明）。
4. **選題前先查一下有沒有跟站內既有文章重複**——同一個核心主題別寫兩篇，會互相稀釋排名。
5. 確認沒問題後，把該列的 **`Status`** 改成 **`Active`**。

> 📌 **代班交接建議**：如果你即將請假一段時間、要交給同事代班，建議**先把要發的關鍵字都
> 準備好、`Human_Context` 都寫好、標成 `Active`**，讓代班同事的工作單純變成「執行」（跑
> 完流程、寫文章、發布），不用他去做選題研究或查重複判斷——判斷需要比較多脈絡，交給人在
> 的時候處理，代班期間只做純執行，風險最低。

---

### 步驟 2：資料蒐集（操作終端機，純腳本，不用 AI）

1. 打開終端機，`cd` 到專案資料夾（例如 `cd Desktop/Old_Content_Farm`）。
2. 執行：
   ```bash
   node ai_agent.js --prepare
   ```
3. 這一步**完全不會呼叫任何 AI**，只是抓 Serper 搜尋結果、掃描站內既有文章當內部連結
   候選、把 `Human_Context` 切成五段。跑完後，`writer_briefs/` 資料夾底下會出現一份
   `<關鍵字>.brief.json`，每個 `Active` 任務一份。

---

### 步驟 3：由 Claude Code 撰寫文章（在 Claude Code 對話視窗操作）

1. 在同一個專案資料夾底下，開啟 Claude Code 對話。
2. 跟它說類似「幫我讀 `writer_briefs/` 裡的 brief，撰寫文章」——`content-farm-writer`
   這個 skill 會自動被觸發，它會依序讀取每份 brief、挑寫作維度、挑內部連結、翻譯
   Human_Context、判斷要不要用表格、寫出約 1500 字的文章。
3. 每份 brief 對應寫出一份同名的 `<關鍵字>.result.json`，存在同一個 `writer_briefs/`
   資料夾。
4. 這一步需要你留意 Claude 的輸出，看看標題、內容方向是否符合預期，有問題可以直接在
   對話裡提出修改。

---

### 步驟 4：生圖、組裝、寫回 Sheet（操作終端機）

1. 回到終端機，執行：
   ```bash
   node ai_agent.js --finish
   ```
2. 這一步會：呼叫 Maxora API 生成每篇文章的頭尾兩張圖 ➔ 組裝成 Astro 的 Markdown 檔案，
   存進對應站台的 `src/content/blog/` ➔ 把 `Status=USED` 與 `Post_Url` 自動寫回 Google
   Sheet。
3. 成功後，`writer_briefs/` 裡對應的 `.brief.json`／`.result.json` 會被自動清掉。

---

### 步驟 5：建置與發布（操作終端機，Git）

1. **本地建置確認沒有錯誤**：對每個有新文章的站台跑一次 build，例如：
   ```bash
   cd Dream && npm run build && cd ..
   ```
   確認畫面顯示 `[build] Complete!`，沒有紅字錯誤。
2. **檢查要提交的檔案**：
   ```bash
   git status
   ```
   確認變更的都是預期中的新文章 `.md`、新圖片，以及 `N8N_work - Workflow_Config.csv`。
3. **提交並推送**——**務必指定具體檔案，絕對不要用 `git add -A` 或 `git add .`**（這是
   專案的安全規定，避免不小心把 `API_Key`、`.env` 或其他不該進版控的檔案一起 commit
   進去）：
   ```bash
   git add "N8N_work - Workflow_Config.csv" \
     Dream/src/content/blog/新文章檔名.md \
     Dream/public/media-images/posts/新圖片檔名.webp \
     Dream/public/media-images/posts/新圖片檔名-footer.webp
   git commit -m "Add new article"
   git push origin main
   ```
   （每個站台、每篇文章都要照這樣把實際新增/修改的檔案一一列出。）
4. Push 成功後，Vercel 會自動偵測並開始部署，約 1 分鐘後新文章就會在正式網站上線。
5. **同步備份到 Bitbucket**（2026-07-23 新增）：GitHub 這邊 push 完之後，另外切到獨立的
   umbrella repo 資料夾，把這次更新同步過去備份。這個備份跟 GitHub/Vercel 完全獨立，純粹
   是多留一份紀錄，**不會影響部署**，順序上沒有先後限制，通常跟著 GitHub push 一起做即可：
   ```bash
   cd "/Users/eugeneyu/Desktop/eugeneyu-bitbucket"
   git fetch old-content-farm
   git subtree pull --prefix=old-content-farm old-content-farm main -m "Sync old-content-farm updates"
   git push origin main
   ```
   （這個 umbrella repo 底下用資料夾分開存放好幾個專案，`old-content-farm/` 只是其中一個
   子資料夾；上面的指令只會同步這個專案自己的部分。如果 `git subtree pull` 顯示
   `Already up to date`，代表沒有新變更需要同步，屬於正常情況，直接跳過 `push` 也可以。）

🎉 **完成！**

---

## ⚠️ 安全提醒

- **絕不能 commit `API_Key` 或 `.env` 檔案**（已在 `.gitignore` 保護，正常操作不會誤觸，
  但如果看到 `git status` 顯示這兩個檔案是要被加入的，先停下來確認）。
- **`git add` 一律指定具體檔案**，不要用 `-A` 或 `.`。
- 憑證檔案交接時走安全管道（密碼管理工具、當面複製），不要用 email/Slack 明文傳送。
