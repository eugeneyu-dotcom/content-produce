# 四站弱文章盤點（2026-10-13，為 AdSense「缺乏價值的內容」準備）

資料：四站 `src/content/blog` 共 187 篇 × Google Sheet 的 Human_Context（HC）欄 × GSC 90 天單篇數據（`gsc_article_report.json`，10-06 產生）。

## 判斷標準與限制（先讀）

- **曝光 0 不等於沒需求**：很多是剛發佈或還沒被 Google 發現的網址。所以「noindex」只放「無 HC、無曝光、題目又很泛用」的文章。
- **HC 欄位判斷**：以 Sheet 的 Post_Url 對應 slug。Dream 的 `why-do-i-dream-about-my-ex` 因 09-11 誤刪事件，HC 已無法完整復原，所以顯示為無 HC。
- **字數**：joaillerie、Dream、Legend 用單字數；Desk 是日文字元數，兩者不能互比。
- **只是盤點，沒有動任何檔案。** 合併要做 301，noindex 要改 frontmatter／layout，都要你確認後才做。
- **noindex 對 AdSense 的幫助有限**：AdSense 審的是網站上抓得到的內容。noindex 只是不進搜尋結果；若目的是降低審查時的「低價值頁比例」，**合併後 301／刪除比 noindex 更直接**。下面的清單保留 noindex 這一類，但建議優先用「合併、刪除」處理。

## 總覽

| 站 | 篇數 | 有 HC | 零曝光 | WP 殘留標記 |
|---|---|---|---|---|
| joaillerie | 51 | 22 | 21 | 34 |
| Dream | 47 | 17 | 4 | 31 |
| Desk | 50 | 20 | 9 | 6 |
| Legend | 39 | 24 | 11 | 4 |

---

## 一、合併（內容重複或意圖重疊，保留一篇，其餘 301）

### joaillerie
| 保留 | 併入（301） | 理由 |
|---|---|---|
| `bague-pouce-signification-psychologique`（曝光 31，剛重寫） | `signification-bague-pouce`（曝光 49、排名 26） | 同一主題「拇指戒」兩篇。保留內容較有特色的那篇；若想保留曝光較多的網址，可反過來保留 slug、改用新內容 |
| `bague-auriculaire-signification-pouvoir-intuition`（曝光 14） | `porter-bague-petit-doigt-signification`（0） | auriculaire＝小指，同一主題 |
| `signification-bague-doigt-guide-symbolique`（總覽，0） | `signification-bague-index`（0，HC 空白）、`bague-medius-signification-spirituelle`（4） | 可考慮把「食指、中指」寫成總覽的段落，不單獨成篇。這是「可選」，因為單指關鍵字各有搜尋，要不要併由你決定 |

### Dream
| 保留 | 併入（301） | 理由 |
|---|---|---|
| `manifest-vs-latent-content-of-dreams-simplified`（962） | `manifest-latent-content-dreams-simplified-guide`（106） | 待處理清單中的已知重複 |
| `why-do-dreams-feel-real-science`（28） | `why-do-my-dreams-feel-so-real-and-exhausting`（64，無 HC） | 同一問題兩篇。二選一，看哪篇內容較好 |
| `how-to-lucid-dream`系：`lucid-dreaming-beginners-fast`（24） | `lucid-dreaming-attainment`（3）、`lucid-dreaming-reality-checks-3`（20）、`how-to-wake-up-from-a-lucid-dream-fast`（7） | 清明夢共 6 篇，彼此重疊。保留 `mild-wild-lucid-mastery`（29）與 `lucid-dreaming-ptsd-healing`（18）各自獨立 |
| `rem-sleep-and-memory-consolidation-study`（43） | `brain-waves-during-rem-sleep`（9） | 同為 REM 科學 |
| `role-of-amygdala-in-dreams-guide`（7） | `dreams-brain-emotion-sleep`（6） | 同為大腦與情緒 |

### Desk
| 保留 | 併入（301） | 理由 |
|---|---|---|
| `focus-lighting-cct`（33，剛重寫） | `eye-friendly-desk-light-guide-2`（3，6,635 字）、`monitor-light-reflection-ergonomics`（1）、`monitor-light-desk-light-chigai`（3）、`desk-indirect-lighting-guide`（4） | 照明共 5 篇互相重疊，且都是長篇低曝光。`benq-screenbar-comparison-guide`（17，有點擊）是產品比較，獨立保留 |
| `no-drill-cable-management`（35） | `desk-cable-management-100yen`（10）、`power-tap-hiding-box-guide`（6） | 理線三篇重疊。`magnetic-cable-holder-guide-japan`（39）保留 |
| `desk-posture-correction-guide`（4） | `chair-selection-back-pain`（4） | 姿勢與椅子，可併 |

### Legend
| 保留 | 併入（301） | 理由 |
|---|---|---|
| `cryptids-vs-urban-legends-differences-mothman`（1） | `cultural-impact-of-cryptozoology`（2）、`biological-explanation-for-cryptid-sightings`（3） | 三篇都是「神秘生物的泛論」，曝光皆個位數 |
| `psychology-of-legend-tripping-guide`（21） | `why-teens-play-paranormal-games-digital-seance`（5） | 同為「為何玩儀式遊戲」 |
| `modern-internet-ghost-stories-2026`（6） | `evolution-of-internet-horror-characters-from-chain-m…`（HC，0） | 網路恐怖故事演變，可併或二選一 |

---

## 二、改寫（題目有訊號或有 HC 可用，原地重寫，流程用 Modify Pending → Modify Active）

### joaillerie
- **需要你補 HC**：`signification-bague-index`（0）、`saphir-bleu-pouvoirs-esoteriques`（10）、`bijoux-serpent-signification-spirituelle`（16）、`plume-bijoux-symbolisme`（21）、`papillon-pendant-renaissance-symbol`（11）。
- **偏薄，需擴寫（約 640 字）**：`superposer-colliers-guide-longueurs`（曝光 94，排名 17，有點擊）、`or-argent-choisir-carnation-mythe`（曝光 31，排名 24）。
- **零曝光但題目有搜尋需求**：`scarabee-egyptien-joaillerie`（新 cuivre 文章有連過去）、`engagement-ring-history-odyssey`、`wedding-ring-right-hand`、`signification-collier-choker-histoire`。
- **已有 HC 但仍有 WP 殘留標記**（只需清理，不必重寫）：`bienfaits-emeraude-chakra-coeur-guerison-amitie`、`lithotherapie-pierres-protection`、`pierre-de-lune-signification-spirituelle-crise-carriere`、`pouvoir-des-pierres-precieuses-experience-sceptique`。

### Dream
- **需要你補 HC**：`why-do-i-dream-about-my-ex`（28，HC 因誤刪遺失）、`chased-dreams-psychology-meaning`（31）、`collective-unconscious-vs-personal-unconscious-examp…`（78）、`jungian-dream-symbols-guide`（55）。
- **已改過、先等成效**：`jungian-shadow-dreams`、`dream-about-being-pregnant-meaning`、`why-do-i-keep-dreaming-about-the-same-house`。

### Desk
- **偏薄需擴寫（約 900 字元）**：08-26 的四篇情境指南 `focus-worker-desk-setup-guide`、`setup-web-kaigi-multi-worker`、`student-budget-desk-setup-guide`、`creator-streamer-desk-setup-guide`。它們是「セットアップ診断」模組的結果頁，不能直接 noindex，只能擴寫或合併成一頁。
- **有曝光的長篇**：`felt-desk-mat-non-slip-guide-japan`（111）、`white-desk-stains-conspicuous-measures`（84）、`desk-mat-felt-demerit`（62）— 內容尚可，先不動。

### Legend
- **需要你補 HC**：`how-did-the-backrooms-creepypasta-start`（27）、`historical-evidence-of-the-mothman`（23）、`history-of-spirit-summoning-games`（24）。
- **⚠ 偏薄的新 HC 文章**（460–650 字）：`midnight-game-ritual-history-origin`、`chupacabra-sightings-map`、`kuchisake-onna-origin-story-explained`、`light-as-a-feather-stiff-as-a-board-origin`、`wendigo-psychosis-real-or-cultural-label`、`bigfoot-sightings-pop-culture-image`、`jersey-devil-origin-leeds-1909`。這些是有立場的文章，但字數偏少，對審查可能算「內容單薄」。

---

## 三、noindex（或直接刪除）候選：無 HC、無曝光、題目泛用、沒有合適的併入對象

### joaillerie（7）
`abeille-bijoux-symbolisme`、`bague-anti-stress-signification-guide-symbolique`、`bijoux-gothiques-symbolisme-evolution`、`boho-chic-jewelry-evolution`、`fleur-de-lys-royal-jewelry`、`platine-symbolisme-force-eternite`、`tendance-bijoux-minimalistes`

### Dream（4）
`biblical-meaning-of-dreams-and-visions-guide`（0）、`secular-spirituality-in-modern-dream-work`（4）、`shamanic-dream-healing-journey`（9）、`egyptian-dream-symbols`（17，僅 833 字）

### Desk（5）
`matte-black-gadget-recommendations`（0，3,833 字）、`4k-monitor-arm-guide`（5）、`ergonomics-keyboard-merit-guide`（1）、`desk-aroma-focus-diffuser`（6，排名 46）、`zaikin-desk-takasa-keisan`（2，4,177 字）

### Legend（3）
`hitori-kakurenbo-instructions-safety-guide`（0，2,323 字，儀式遊戲系列之一；若要保留，改歸「改寫」）、`why-are-humans-scared-of-uncanny-valley`（1）、`mirror-rituals-digital-folklore-analysis`（6，有 1 次點擊，要留）

---

## 四、保留不動（已有成效，避免誤傷）

`argent-vertus-spirituelles`（243）、`bijoux-de-deuil-victoriens-memoire-chagrin`（111）、`jungian-shadow-dreams`（225）、`dream-about-being-pregnant-meaning`（377）、`felt-desk-mat-non-slip-guide-japan`（111）、`digital-folder-mastery`（有點擊，排名 5）。

## 數量小結

- 合併：約 14 組（涉及約 30 篇，合併後少約 16 篇）。
- noindex／刪除候選：約 19 篇。
- 改寫：約 35 篇（其中約 17 篇需要你補 HC，約 6 篇只需擴寫或清理）。

> 注意：合併與刪除都會影響已被連結的內鏈與 category 頁的關鍵字標籤，執行時需同步修正，並用 301 轉址（Vercel `vercel.json` 或 Astro redirects）。
