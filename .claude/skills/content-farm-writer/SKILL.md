---
name: content-farm-writer
version: 2.0.0
description: |
  研究這個專案 4 個內容站(joaillerie-et-symbolique.com、encyclopedia-of-dreams.com、
  minimal-desk-studio.com、global-urban-legends.com)的關鍵字機會,並用 Human_Context(HC)
  驅動的擬人寫作系統撰寫 SEO 文章,作為 ai_agent.js --prepare/--finish 流程裡「由 Claude
  來寫」的那一步。當使用者想要新的關鍵字/選題靈感、要求依照 writer_briefs/*.brief.json
  撰寫文章、想新增 pillar post,或想參考 Search Console 成效數據來決定內容方向時使用。
  內含 2026-07-17 GSC 逐篇文章層級稽核的經驗教訓:評斷內容品質前先排除「死網址/轉址」
  問題的干擾,並在選新題目前先檢查是否與既有文章關鍵字互打。
license: MIT
compatibility: claude-code
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Grep
  - Glob
  - AskUserQuestion
---

# Content Farm Writer(內容農場撰稿員)

你是這個專案內容流程裡「由 Claude 來寫」的那一半。`node ai_agent.js --prepare` 只做純資料
蒐集(Serper 搜尋結果、內部連結候選、切好的 Human_Context),完全不呼叫任何 LLM,對每一列
Active 的 Sheet 任務產出一份 `writer_briefs/<slug>.brief.json`。你的工作就是接手原本 Gemini
在做的所有事:挑寫作維度、挑內部/外部連結、翻譯 Human Context、撰寫文章——存成對應的
`writer_briefs/<slug>.result.json`。之後 `node ai_agent.js --finish` 會生成圖片(Maxora
API)、組裝 Astro Markdown,並把 `Status=USED` 寫回 Sheet。

## 什麼時候該用這個 skill

- 使用者說類似「幫我讀 brief 寫文章」「跑完 --prepare 了,你寫一下」→ 直接跳到
  **從 brief 撰寫文章**。
- 使用者想要某一站的新關鍵字/選題靈感 → **關鍵字與選題研究**。
- 使用者想新增 pillar post(基石匯總頁)→ 看 **Pillar Post** 那一節。
- 使用者想知道哪些文章表現好、或這套擬人寫法到底有沒有效 → **衡量成效**,動手下結論前
  一定要先讀完裡面的但書與警語。

## 關鍵字與選題研究

1. 用 Serper(`curl https://google.serper.dev/search`,key 在 `API_Key` 檔裡)對目標語言
   的候選關鍵字查詢。讀 `organic` 結果——標題/摘要能告訴你真實的搜尋意圖,以及目前誰在排名。
2. 挑選意圖明確、且能對到目標站既有 category/pillar 的關鍵字(檢查
   `src/pages/category/*.astro` 裡的標題——文章內的 pillar 連結只有在 Sheet 的
   `Pillar Post Dimesion` 跟某個 category 標題完全一致時才會正確解析)。
3. **重複主題檢查(強制執行,2026-07-17 新增)**:選定新關鍵字前,先把目標站既有的文章
   標題/slug 拿去比對,去掉修飾詞後看核心主題是否重複(例如「土耳其藍眼」已經寫過,就不要
   再寫一篇同主題,除非角度明顯不同)。joaillerie 有兩篇土耳其藍眼文章
   (`oeil-bleu-grec-signification-protection` vs `...-matiasma`)、Dream 有兩篇
   manifest-vs-latent-content 文章,都在互相稀釋同一個查詢詞的排名——這是整套流程裡
   最容易避免、卻最常發生的錯誤。如果已經有高度重疊的文章存在,要嘛選一個真正不同的角度/
   關鍵字,要嘛把新角度直接併進既有文章裡,不要重複發一篇新的。
4. 優先選有真實搜尋量訊號(Serper 查得到 organic 結果)、且競爭度中低(前 10 名裡有一些
   小型部落格/論壇,不是清一色大型媒體)的題目,不要選那種完全沒證據顯示有人在搜的自創
   長尾詞。

## 從 brief 撰寫文章

讀取 `writer_briefs/<slug>.brief.json`。裡面包含 `search_results`、`internal_candidates`、
`human_context_zh`(中文五段式)、`pillar_post_path`,以及一個帶著完整 prompt 的
`instructions` 欄位。以下判斷全部要你自己做,沒有任何一步是預先處理好的:

1. **挑 3-5 個寫作維度**,從六大維度庫(核心本質 Essence / 外部聯繫 Connections / 感官實踐
   Practice / 對比分析 Comparison / 未來展望 Future / 真實案例 Evidence)裡挑,根據
   `search_results` 揭露出的主題內容來決定。
2. **挑 2-3 個內部連結**,從 `internal_candidates` 裡選跟新關鍵字最相關的(不足 2 篇好的
   候選時,補上 `pillar_post_path`)。跳過那些本身就跟新主題重複、會造成互打的候選。
3. **翻譯 Human Context**(`human_context_zh`:trigger / pain_point / details / bias /
   evidence)成目標語言。翻「具體的那個東西」,不要泛化:具名的人保持具名、特定物件保持
   特定、特定理由保持精確、第一人稱保持第一人稱。要翻整段,不是只翻一句摘要。
4. **撰寫文章**(約 1500 字、5-6 個段落),以 Human Context 為骨幹:
   - 你是捉刀人,用人類作者自己的真實經歷、第一人稱口吻重述——你是隱形的,不是用你自己
     的語氣寫。口吻要成年人克制、有分寸,不要戲劇化或裝酷。
   - 翻譯好的五段絕對不是引言塊。絕不要用引號、粗體、斜體或 `<blockquote>` 包起來。
     必須讀起來像普通的散文句子,跟你寫的其他文字格式完全一致,讀者分不出界線。
   - 保留每一個具體細節(具名的人、特定物件、特定理由、特定地點)。你可以改寫、拆句、
     重排、跟自己的話融合,但絕對不能把具體細節換成泛稱,也絕對不能刪掉。
   - 每段記憶前面用一句話鋪陳,後面接你自己的反思,讓它讀起來像作者講到一半自然想起來的。
   - 建議段落安排:trigger 當開場鉤子;pain_point 放第 2-3 段;details 放中段當具體例子;
     bias/結論放接近結尾;evidence 用第一人稱帶出佐證。
5. **反 AI 偵測協定**:
   - 不要用陳腔濫調的結尾(「冷掉的咖啡」「閃爍的游標」)。不要用 AI 慣用的整數
     (30%/50%/80%)——改用零碎的分數(17%、43%)。
   - 打破「鉤子→破解→結論」這套公式。清單長短不對稱(短的 bullet 跟長的混在一起)。
     不要下「總結」這種小標。
   - 禁用字(英文寫作時):delve, crucial, tapestry, testament, undeniable, symphony,
     beacon, landscape, journey, navigating。
6. **內部連結**:開場必放 pillar 連結(`/category/<pillarSlug>/`);每個內部/外部連結的
   錨點文字都要極短(1-3 個字);href 完全照給定的不要改。
7. 把結果存成 `writer_briefs/<slug>.result.json`,格式要對上 brief 裡 `instructions` 欄位
   給的 schema:`title`、`slug`、`focus_keyword`、`meta_description`、
   `image_prompt_header`、`image_prompt_footer`、`content_blocks`(陣列,每項是
   `{heading, text}`,`text` 是 HTML——一般段落用純文字、連結用 `<a href="...">`、
   比較內容用 `<table>`)。
8. 如果某份 brief 沒有 Human_Context(`has_human_context: false`),你需要自己先用目標
   語言構思一段合理、有觀點的個人軼事才能繼續——這件事要告訴使用者,因為 Sheet 裡真實的
   人類經歷永遠比你自己編的更好,值得請他們補上。

寫完之後,執行 `node ai_agent.js --finish` 生成圖片、組裝 Markdown、把 `Status=USED`
寫回 Sheet——接著在受影響的站台目錄裡跑 `npm run build`,再照這個專案平常的 git 流程推送。

## Pillar Post(基石匯總頁)

Sheet 裡的「Pillar Post Url」欄位一定要指向一個真實存在的頁面,否則會 404(先前有兩個
維度就是這樣才被發現——可參考 git 歷史裡的
`joaillerie/src/pages/faune-flore-et-secrets-de-la-nature.astro` 與
`Desk/src/pages/functional-ergonomics.astro` 當範本)。被要求新增 pillar 時:在站台
**根目錄**建立 `src/pages/<slug>.astro`(不是放在 `category/` 底下),沿用該站既有的
`Header`/`Footer`/`BaseHead` 元件與配色/字體主題,內容包含 hero 區塊、導論、串接該維度
既有文章的 cluster 卡片區、簡短 FAQ,以及連到對應 `/category/<slug>/` 頁與首頁的 CTA。
容器寬度要對齊該站 `global.css` 裡 `main { width: ... }` 的設定值——寫得比容器寬(例如在
720px 上限的站台用 `75vw`)會破版。

## 衡量成效

`Search_Console_Check/` 裡的 `run_update.py` 永遠只會輸出**網域層級的彙總數字**——
`analyze_domain_homepage()` 會把 page 維度的查詢結果收攏成每站一列,而逐關鍵字的深入分析
只有在每週曝光超過 1000 次才會觸發,這幾個站沒有一個達到這個門檻。它沒辦法告訴你哪一篇
文章表現好。

改用 `Search_Console_Check/gsc_article_report.js`(Node 寫的,不依賴 Python——這個專案的
`python3` 執行環境在 2026-07-17 那次分析中途曾經被暫時擋下,所以才改用 Node 對著同一份
`search_console.json` 憑證重寫這支工具):

```bash
cd "/Users/eugeneyu/Desktop/Routine_work/Search_Console_Check"
node gsc_article_report.js --days 90 --out gsc_article_report.json
```

這支工具會拉出真實的 `page` 與 `page+query` 維度資料列(不做彙總),涵蓋全部 5 個「其他
內容站」。要公平比較文章表現,排名前記得先把同一個 slug 在不同網址變體(根目錄、`/blog/`、
`/en/`)底下的點擊/曝光合併——原因看下面的死網址問題就懂了。

**死網址問題——已於 2026-07-17 修復**:這個專案的 4 個站原本每篇文章都同時存在兩個網址——
一個是 WordPress 時代遺留的根目錄舊網址(`/slug/`,404),一個是現行的 Astro 網址
(`/blog/slug/`,200)——而 Google 索引裡至今仍在搜尋結果中曝光那個死網址(每站 29-75%
的點擊、最高 59% 的曝光都落在 404 頁面上)。現在每一站都有一份 `vercel.json`,針對每個
現存的 blog slug 設定 301(308)轉址:`/slug/` → `/blog/slug/`(規則是從各站
`content/blog` 實際存在的 slug 產生的,產生前有先比對 `src/pages/*.astro` 避免撞名)。
**結尾斜線很重要**:第一版轉址規則寫的是不含斜線的路徑,結果完全沒匹配到任何真實請求,
因為 Astro 預設所有網址都帶結尾斜線——修好之後務必實測確認真的對帶斜線的網址回傳 308,
不要只相信規則寫對了就沒事。

**2026-07-17 發現的關鍵字互打案例,以及怎麼分辨成因**:發現兩組主題高度重疊的文章
(joaillerie 的兩篇土耳其藍眼文章;Dream 的兩篇 manifest-vs-latent-content 文章)。
決定合併或留哪篇之前,要先判斷這是**流程 bug** 還是**規劃疏漏**——兩者的處理方式不同:
- **流程 bug(joaillerie 那組)**:兩篇發表時間只差約 2.5 分鐘,CSV 裡對應的關鍵字
  自始至終只有一列,軼事/結構/外部來源幾乎一樣只是換句話說——幾乎可以確定是舊版全自動
  `node ai_agent.js` 把同一個任務跑了兩次。內容真的高度重複時 → 留下較新的檔案,刪掉
  舊的連同它的圖片,修正任何指向被刪除 slug 的內部連結,並把被刪除 slug 的網址直接轉址到
  倖存文章的 `/blog/` 網址(不要讓它轉到另一個也會變成 404 的中間網址)。
- **規劃疏漏(Dream 那組)**:發表時間相差整整一個月,角度確實不同(一篇是中性的「怎麼
  解讀你的夢」教學,一篇是批判性的「這套理論根本是錯的」論述文)——不是 bug,只是選新
  關鍵字時沒有人檢查站內是否已經覆蓋過這個主題。不要自動刪除;這種情況需要人來決定要
  差異化、合併,還是幫其中一篇重新定位角度。這正是上面**關鍵字與選題研究**那一節新增的
  「重複主題檢查」要在關鍵字進到 `--prepare` 之前就攔下來的狀況。

**誠實面對統計強度,2026-07-20 更新為完整跨站比較**:把每一站的文章分類成「舊文」
(WordPress 遷移、沒有 Human_Context——4 個站都共用同一個批次匯入時間戳
`2026-06-10T04:19:59.9xx`,這就是辨識依據)與「HC 驅動文」(這個時間點之後、透過
Sheet+Human_Context 系統寫的文章,不論是舊版 Gemini 全自動寫的,還是 Claude 透過
`--prepare`/`--finish` 寫的)。排除掉在 GSC 報表本身 `endDate` 前 3 天內才發布的文章——
它們在被量測的時間窗口內根本沒有時間累積任何數據,硬算進去只會不公平地拉低 HC 組的平均值。

| 站點 | 舊文平均點擊 | HC文平均點擊 | 舊文平均曝光 | HC文平均曝光 | 舊文有點擊比例 | HC文有點擊比例 |
|---|---|---|---|---|---|---|
| joaillerie | 0.375 | 1.167 | 18.0 | 175.8 | 22% | 50% |
| Dream | 0.000 | 0.000 | 8.8 | 12.1 | 0% | 0% |
| Desk | 0.069 | 0.167 | 4.4 | 4.5 | 7% | 17% |
| Legend | 0.200 | 0.167 | 10.8 | 5.7 | 7% | 17% |
| **4 站合計** | **0.159** | **0.360** | **10.6** | **48.0** | **9.3%** | **20%** |

合計 107 篇舊文 vs 25 篇 HC 驅動文章,HC 驅動文章平均點擊是舊文的 **2.3 倍**、平均曝光是
**4.5 倍**、「至少有 1 次點擊」的比例是 **2.1 倍**。四項指標方向一致,這是有意義的,但要
講清楚真正是什麼在支撐這個結論:joaillerie(4 站裡流量遙遙領先的一站)貢獻了合計數字的
絕大部分;Dream 兩邊都是零(是「沒有訊息」,不是「牴觸」);Legend 的舊文平均是被單一一篇
異常值文章撐起來的。之後隨著 HC 文章數量增加,建議每個月重跑一次:

```bash
cd "/Users/eugeneyu/Desktop/Routine_work/Search_Console_Check"
node gsc_article_report.js --days 90        # 先重新拉最新的逐頁原始數據
node gsc_content_farm_effectiveness.js      # 4 站舊文 vs HC文的比較
```

這是 2026-07-20 當下真實、可量化、可重現的結果,不代表永遠成立,應該持續重新檢驗,
不要當成已經蓋棺論定的結論。

這份比較也順帶記錄了字數,但**在 Desk 站(日文)上這個數字沒有意義**:日文字與字之間
不用空格分隔,用空白字元切字數的算法會把日文字數低估到只剩原本的十分之一左右。跨語言比較
字數之前,要先修好斷詞邏輯,不然數字沒有參考價值。

**位置(Position)比 CTR 更能說明問題**:不要看到「高曝光、幾乎零點擊」就假設是標題/描述
不吸引人。先查該頁面對應真實查詢詞的平均位置(用 `page_query` 維度)。位置 ≤5 但 CTR 低
→ 值得重寫標題/描述。位置 ≥8 而 CTR 低,其實接近正常現象——第一頁末段的自然點擊率本來
就趨近於零,尤其是那種帶有商業意圖、被購物廣告/圖片區塊卡位的查詢詞;這種情況真正該做的
是加深內容、爭取反向連結把排名往前推,而不是改文案。

完整的、附日期的原始分析寫在
`Search_Console_Check/gsc_article_diagnostic_other_content_20260717.md`,這份 skill 就是
從那份報告提煉出來的。
