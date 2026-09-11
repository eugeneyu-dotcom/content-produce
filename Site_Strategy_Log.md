# 四站差異化策略日誌

記錄每次「定案」的站台策略方向（非文章/SEO 層級的優化，而是首頁結構、內容系列、互動功能等
會改變網站定位的決策），以及後續用 GSC 數據回頭檢驗哪些真的有拉流量、哪些沒有效果。

**使用方式**：
- 每次跟 Eugene 定案一個新方向時，在下面加一列（日期、站台、方向、方法、狀態）。
- 狀態欄位：`已提案` → `進行中` → `已上線` → `已驗證有效` / `已驗證無效` / `效果不明顯`。
- 「已上線」超過約 4-6 週、GSC 有累積到足夠曝光後，回頭補上成效備註，並把狀態更新為驗證結果。
  沒有足夠曝光量可以量化前，不要急著下「有效/無效」的結論。
- 這份文件只記策略層級的決策，不是逐篇文章的清單——單篇文章的優化紀錄看
  `content-followups.md`（既有文章待改清單）跟 `new-keywords.csv`（待寫新關鍵字清單）。

---

## 日誌

| 日期 | 站台 | 方向 | 方法 | 狀態 | 成效備註 |
|---|---|---|---|---|---|
| 2026-08-25 | joaillerie | 珠寶 × 穿搭：從「這代表什麼」延伸到「怎麼穿搭」的實用內容 | 新增獨立分類（不掛在既有 Style et Sous-cultures 底下，因為那個分類是次文化認同框架，跟穿搭實用內容衝突）；首頁 Hero 下加穿搭靈感模組；內容如疊戴規則、依場合選珠寶、金銀混搭、季節膠囊珠寶盒；穿搭文章主動連回既有象徵學文章做內部連結；先寫 3-5 篇打底測搜尋量再決定要不要正式開分類頁 | 已上線（[6e44c28](https://github.com/eugeneyu-dotcom/content-produce/commit/6e44c28)）：新分類頁「Guide de Style」+ 首頁 Spotlight 模組 + 導覽列連結 + 2 篇種子文章（項鍊疊戴長度規則、金銀選擇破除膚色迷思），皆連回既有的金屬/墜飾象徵學文章 | 待 GSC 有數據後檢驗；季節膠囊珠寶盒、依場合選珠寶等候選題目留待下一輪 |
| 2026-08-25 | Legend | 恐怖傳說 × 遊戲/影視：現有 27 篇完全沒有「遊戲/電影裡的傳說原型」內容，是四站最乾淨的白地 | 新增「Legends on Screen」分類；內容如某遊戲裡的怪物原型、某電影背後的真實傳說；搭配新片/新遊戲上映時間點蹭熱度（這類查詢有明顯搜尋高峰期）；首頁加對應模組做成「近期焦點」區塊 | 已上線（[36716ea](https://github.com/eugeneyu-dotcom/content-produce/commit/36716ea)）：新分類頁 + 首頁 Spotlight 模組 + 導覽列「On Screen」連結 + 2 篇種子文章（Slender Man 遊戲起源、5 部改編自真實都市傳說的恐怖片） | 待 GSC 有數據後檢驗：這條內容線的自然搜尋表現是否真的比純百科型文章好；另外 Backrooms 遊戲類（Escape the Backrooms 等）是下一個候選題目，這次先跳過避免與現有 `how-did-the-backrooms-creepypasta-start` 重疊 |
| 2026-08-25 | Dream | 互動化：43 篇符號解夢文章目前只是靜態列表，加站內搜尋讓使用者直接查夢境關鍵字跳轉對應文章 | 首頁加搜尋框/搜尋介面，把既有文章關鍵字做成可搜尋清單，不用寫新內容；第二階段可延伸「Dreams in Pop Culture」系列（已有種子文章 `jungian-persona-mask-meaning`） | 已上線（[0336b5d](https://github.com/eugeneyu-dotcom/content-produce/commit/0336b5d)） | 待 GSC 有足夠數據後檢驗：搜尋框有沒有拉深單篇文章的內部導流、有沒有降低跳出率 |
| 2026-08-25 | Desk | 從「單品評測」整合成「情境套餐」：40 篇文章都是單一產品怎麼選，彼此獨立，沒有整套方案內容 | 新增「ワークスタイル別セットアップ」系列，依工作型態（居家辦公/專注型/內容創作者/學生）整合單品評測成套餐指南；首頁加「セットアップ診断」小測驗（選型態→跳轉對應整合文章）取代靜態最新文章列表 | 已上線（[62b3821](https://github.com/eugeneyu-dotcom/content-produce/commit/62b3821)）：新分類頁 + 首頁單題診斷模組（點選型態→揭示對應指南卡片，可重新診斷）+ 導覽列「セットアップ診断」連結 + 4 篇整合指南（Web会議/集中作業/配信創作者/學生），皆從既有 37 篇單品評測中挑選、交叉連結，沒有重複內容 | 待 GSC 有數據後檢驗；四個方向全數上線，下一輪可考慮：① 用實際點擊分佈驗證哪個型態的整合指南表現最好，② 視覺化「桌面展示/靈感」內容（目前四站裡最弱的一塊，本輪未處理） |
| 2026-09-11 | 全站 | 四站雖然色彩/字體早已分化（見下方附註），但 Header/Footer/首頁/文章頁的版面結構、元件造型、互動細節完全共用同一套骨架，才是「四站看起來很像」的真正原因，換色換字體治標不治本 | 保留各站既有配色/字體不動，改用四種完全不同的版面骨架語言：joaillerie＝雜誌式（置中報頭、頭條+編號目錄前台、filmstrip、首字放大+置中引言）；Dream＝字典/索引式（搜尋列常駐於 Header、字母編號章節列表、辭典詞條式文章標頭，取代原本的照片卡片牆）；Desk＝平面型錄式（細線分格標籤 Header、無陰影密集網格、規格表式文章 meta）；Legend＝檔案卷宗式（資料夾分頁式 Header、案件編號蓋章卡片、蓋章式文章日期）。四站原有的差異化互動模組（joaillerie 穿搭 Spotlight、Legend Legends on Screen、Dream 搜尋框、Desk 診斷測驗）全部保留不動，只重做外層骨架 | 已上線（[c4c64d8](https://github.com/eugeneyu-dotcom/content-produce/commit/c4c64d8)）：四站 Header/Footer/首頁/BlogPost layout 全數重寫；過程中發現並修正三個真實 bug（詳見下方附註） | 待 GSC 有數據後檢驗版面改版本身對跳出率/停留時間有沒有影響；7 個分類頁（各自獨立檔案、inline style 寫死 FAQ/關鍵字區塊）這輪未觸及，需要另外排一輪 |

---

## 附註：四站共通觀察

四站首頁原本是同一套模板（Hero → 7 個分類卡片格線 → 最新 6 篇文章），差異只在配色字體，
內容架構完全一樣。這輪四個方向的共通精神是**用互動/系列取代純列表**（joaillerie 穿搭模組、
Legend 時事模組、Dream 搜尋框、Desk 診斷測驗），讓四站在視覺主題之外，結構上也真正分化開來。

另外調查時發現兩個孤兒重複頁面（跟這次策略無關）：
- `joaillerie/src/pages/faune-flore-et-secrets-de-la-nature.astro`（跟同名 category 頁重複）
- `Desk/src/pages/functional-ergonomics.astro`（跟同名 category 頁重複）

**2026-08-26 已處理**：確認站上沒有任何內部連結指向這兩個根目錄頁面（`resolvePillarSlug()`
實際解析 pillar 連結時是掃描 `category/*.astro`，完全不讀 Sheet 的 Pillar Post Url 欄位），
但該欄位裡確實存過這兩個根目錄網址、頁面本身也有真實內容，可能已被 Google 索引，因此刪除
檔案的同時在各站 `vercel.json` 加了 301 轉址到對應的 `/category/<slug>/` 頁面，不留 404。

**2026-08-26 hero 圖 alt text 已處理**：稽核當時記的「hero/cover 圖是 CSS background-image、
完全沒有 alt text」實際只有 joaillerie 一站有這個問題——Dream/Desk/Legend 的 `BlogPost.astro`
本來就用真的 `<img alt={title}>`，只有 joaillerie 用 `<div style="background-image:...">`
疊 `<h1>` 的做法，導致每篇文章的 hero 圖對螢幕閱讀器完全不存在。修法是在該 `<div>` 加
`role="img"` 與 `aria-label={description || title}`，不改版面、不用重寫成 `<img>`，一次套用到
全站所有文章（因為是共用 layout，不是逐篇檔案）。

**2026-09-11 版面差異化改版時發現的 3 個 bug**（跟這次策略方向本身無關，是實作過程中順手抓到的）：
1. 四站首頁沿用同一招「跳脫 100vw 撐滿全寬」的 hero 寫法，在手機瀏覽器下會比真實 viewport
   多跑出 30 幾 px，造成不必要的水平捲動、右側露出底色——桌面版完全看不出來，只有實際切到
   手機寬度測試才會發現。四站 `global.css` 的 `body` 都加了 `overflow-x: hidden` 保險，
   不追根究柢是哪個瀏覽器的哪個像素差異造成的，直接把這類水平溢出攔下來。
2. Desk 手機版的分類展開面板一開始沒辦法收合——共用 class `.spec-row` 設了
   `display: flex`，蓋掉了 `hidden` 屬性原本該有的 `display: none`（兩者在 CSS 特異度打平時
   由原始碼順序決定，author stylesheet 晚於瀏覽器內建的 `[hidden]` 規則，所以贏了）。
   之後任何用 `hidden` 屬性做顯示/隱藏切換的地方，都要留意共用 class 有沒有無條件設
   `display`，蓋掉它。
3. Legend/Desk 各有縮圖用 `<span>` 但沒設 `display: block`，父層又不是 flex/grid 容器，
   導致瀏覽器把它當成 inline 元素，`width`/`aspect-ratio` 完全不生效、縮圖直接消失
   （寬高算出來是 0）。同樣手法用在別處時如果父層恰好是 flex 容器就會意外正常運作
   （flex/grid 的子項目會自動 blockify），這次就是靠這個巧合才沒讓全部縮圖一起壞掉——
   之後這類「背景圖當縮圖」的 span/div 元素，都應該明確寫 `display: block`，不要依賴
   父層的隱性行為。
