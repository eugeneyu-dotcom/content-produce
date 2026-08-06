# 部落格自動化更新操作手冊（編輯人員 / 代班人員專用）

這份手冊涵蓋目前實際在跑的流程：**選題規劃（Sheet）→ 資料蒐集（`--prepare`）→ 由 Claude Code
撰寫文章 → 生圖與組裝（`--finish`）→ 建置與發布（git push）**。從步驟 2 開始，**全部都在
Claude Code 對話視窗裡用講的完成**——你不用自己開終端機打指令，Claude Code 會自己執行，
你只需要看它做什麼、確認結果對不對。

---

## 📦 代班/交接打包清單（Eugene 要準備、交給對方的東西）

- [ ] **GitHub repo 協作者權限**：對方 `git clone` 下來就有程式碼、四站原始碼，以及已經
      checked-in 的 `content-farm-writer` skill，不用另外裝。
- [ ] **`API_Key` 檔案**：走密碼管理工具共用金庫或當面複製，**不要 email/Slack 明文傳**。
- [ ] **`.env` 檔案**：同上，安全管道傳遞。
- [ ] **Google Sheet（N8N_work - Workflow_Config）存取權限**：因為 Active + Human_Context
      已經由你先填好，對方其實有「讀」的權限就夠用；給編輯權限是保險，方便他需要時能微調。

**明確不要交給對方的東西**：`eugeneyu-bitbucket` 資料夾、Bitbucket 帳號或 token。那是
Eugene 自己的私人跨專案備份系統，跟這個代班流程完全無關（細節見步驟 5 最後）。代班同事只
需要處理到 GitHub push 完成，交接的部分就算做完了。

---

## 🚀 代班同事的環境設定（對方要做的事，第一次開始前）

1. 電腦裝好 **Git** 與 **Node.js**（[Node.js 官網](https://nodejs.org/)），並取得上面
   打包清單裡的 GitHub repo 協作者權限，把 repo `git clone` 下來。
2. 把拿到的 `API_Key`、`.env` 兩份檔案放進專案最外層目錄，跟 `ai_agent.js` 同一層。
3. 用自己的帳號登入 **Claude Code**，在這個專案的資料夾底下開啟對話——之後日常流程的每
   一步都在這個對話視窗裡用講的完成。
4. 確認能開啟 **N8N_work - Workflow_Config** 這份 Google Sheet。

準備就緒後，就可以開始日常更新了。

---

## 📝 日常更新工作流

### 步驟 1：企劃與派寫任務（操作 Google Sheet，代班期間通常已由 Eugene 事先完成）

1. 打開 **N8N_work - Workflow_Config** 試算表。
2. 新增一列（或找到既有列），填好 `Topic`、`Keyword`、`Language` 等欄位。
3. **填寫 `Human_Context`（人類觀點）**：這是整篇文章的靈魂，用「觸發／痛點／細節／結論
   （偏見）／證據」五段格式寫下真實的個人經歷或觀點。
   *範例：「觸發：最近一直夢到蛇……」*（完整格式參考 `CLAUDE.md` 的 HC 架構說明）。
4. **選題前先查一下有沒有跟站內既有文章重複**——同一個核心主題別寫兩篇，會互相稀釋排名。
5. 確認沒問題後，把該列的 **`Status`** 改成 **`Active`**。

> 📌 判斷選題、查重複需要比較多脈絡，這一步建議 Eugene 自己在的時候處理完、標好
> `Active` 再交接出去，讓代班同事的工作單純變成「執行」（跑完流程、寫文章、發布），風險
> 最低。代班期間如果同事只負責執行，這一步驟可以整個跳過，直接從步驟 2 開始。

---

### 步驟 2：資料蒐集（在 Claude Code 對話視窗跟它說）

在專案資料夾底下的 Claude Code 對話裡說：

> 「幫我跑 prepare，抓這次 Active 任務的搜尋資料。」

Claude Code 會自己執行 `node ai_agent.js --prepare`——**完全不會呼叫任何 AI**，只是抓
Serper 搜尋結果、掃描站內既有文章當內部連結候選、把 `Human_Context` 切成五段。跑完後，
`writer_briefs/` 資料夾底下會出現一份 `<關鍵字>.brief.json`，每個 `Active` 任務一份。

---

### 步驟 3：由 Claude Code 撰寫文章

接著在同一個對話裡說：

> 「幫我讀 `writer_briefs/` 裡的 brief，撰寫文章。」

`content-farm-writer` 這個 skill 會自動被觸發，依序讀取每份 brief、挑寫作維度、挑內部
連結、翻譯 Human_Context、判斷要不要用表格、寫出約 1500 字的文章。每份 brief 對應寫出一份
同名的 `<關鍵字>.result.json`，存在同一個 `writer_briefs/` 資料夾。

這一步需要你留意 Claude 的輸出，看看標題、內容方向是否符合預期，有問題可以直接在對話裡
提出修改。

---

### 步驟 4：生圖、組裝、寫回 Sheet

素材都寫完後，跟 Claude Code 說：

> 「素材都寫好了，幫我跑 finish，生圖並組裝成文章。」

Claude Code 會執行 `node ai_agent.js --finish`：呼叫 Maxora API 生成每篇文章的頭尾兩張圖
➔ 組裝成 Astro 的 Markdown 檔案，存進對應站台的 `src/content/blog/` ➔ 把 `Status=USED`
與 `Post_Url` 自動寫回 Google Sheet。成功後，`writer_briefs/` 裡對應的
`.brief.json`／`.result.json` 會被自動清掉。

---

### 步驟 5：建置與發布

跟 Claude Code 說：

> 「幫我建置有新文章的站台、確認沒有錯誤，然後檢查要提交的檔案，加進 git 並 commit
> push。」

Claude Code 會依序處理：

1. 對每個有新文章的站台跑 `npm run build`，確認顯示 `[build] Complete!`、沒有紅字錯誤。
2. 跑 `git status`，確認變更的都是預期中的新文章 `.md`、新圖片，以及
   `N8N_work - Workflow_Config.csv`。**如果看到 `API_Key`、`.env` 或其他不該出現的檔案，
   Claude 會先停下來跟你確認，不會自動加進去**——這是專案內建的安全規定。
3. `git add` 明確列出實際新增/修改的檔案（絕不用 `-A` 或 `.`）、`git commit`、
   `git push origin main`。

Push 成功後，Vercel 會自動偵測並開始部署，約 1 分鐘後新文章就會在正式網站上線。

> 背後實際執行的指令大致長這樣（給想知道細節或需要手動除錯時參考，正常操作不需要自己
> 打）：
> ```bash
> cd Dream && npm run build && cd ..
> git status
> git add "N8N_work - Workflow_Config.csv" \
>   Dream/src/content/blog/新文章檔名.md \
>   Dream/public/media-images/posts/新圖片檔名.webp \
>   Dream/public/media-images/posts/新圖片檔名-footer.webp
> git commit -m "Add new article"
> git push origin main
> ```

**同步備份到 Bitbucket**（2026-07-23 新增，2026-07-24 改為腳本化，**只有 Eugene 自己
做，代班同事這一步整個跳過**）：GitHub push 完之後，Eugene 自己找時間切到獨立的
umbrella repo 資料夾同步備份，跟 GitHub/Vercel 完全獨立，不會影響部署，也不急著馬上做：

```bash
cd "/Users/eugeneyu/Desktop/eugeneyu-bitbucket"
./sync-all.sh
```

這個 umbrella repo 底下用 `projects.txt` 登記好幾個 Eugene 的個人專案，各自對應一個子
資料夾（`old-content-farm/` 是其中一個）；`sync-all.sh` 會照清單逐一 fetch +
`git subtree add/pull`，有變更的專案最後統一 push 一次，沒有變更會印出「沒有需要推送的
變更」直接結束，都屬於正常情況。這個資料夾、Bitbucket 帳號/token 都只存在 Eugene 自己的
電腦上，跟代班同事完全無關，不需要交接。

🎉 **完成！**

---

## ⚠️ 安全提醒

- **絕不能 commit `API_Key` 或 `.env` 檔案**（已在 `.gitignore` 保護，正常操作不會誤觸，
  但如果看到 `git status` 顯示這兩個檔案是要被加入的，先停下來確認）。
- **`git add` 一律指定具體檔案**，不要用 `-A` 或 `.`。
- 憑證檔案交接時走安全管道（密碼管理工具、當面複製），不要用 email/Slack 明文傳送。
