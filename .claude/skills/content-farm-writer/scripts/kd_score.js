#!/usr/bin/env node
// KD（Keyword Difficulty）啟發式評分 —— 把 SERP 訊號換算成 0-100 分數，
// 取代「讀幾個 organic 結果、憑印象講競爭度中低」的目測判斷。
//
// 改編自 /Users/eugeneyu/Desktop/keyword check/gambling-keyword-research-planning.skill
// 裡的 kd_from_serp_signals.py（博弈站專案，7 市場×50分類的版本）。這裡是給
// Old_Content_Farm 四站（joaillerie/Dream/Desk/Legend）用的簡化版：
//   - 只有 4 個站、各自單一語言市場，不需要博弈站那套「市場代碼×分類」key 結構
//   - 沒有「官方監理機關」這種網域類型，改成 authority（權威/寡佔難打）跟
//     minor（小站/部落格，容易打進前十）兩層，不是三層
//   - 不追蹤 GKP 搜尋量（那是另一個問題，等 Google Ads 帳號申請下來後再處理），
//     這支腳本只回答「這個字打進前十難不難」，不回答「這個字有沒有人搜」
//   - Serper API 不會回傳「About X results」這種總結果數字，所以拿掉這個因子
//
// 網域分層清單是這個 session 實際查 Serper 累積出來的起始清單，不是窮舉——
// 之後查到新的常見網域，直接補進對應站台的清單即可，做法跟原始腳本的維護
// 邏輯一樣：分層依據是「這個網域在這個站的主題領域裡，實際查到時是不是
// 大者恆大、幾乎打不下來」，不是憑印象排的。
//
// 用法：
//   1. 即時查詢模式（直接呼叫 Serper，自動抽網域/ads/shopping，算完印出分數）：
//        node kd_score.js --live --site joaillerie --keyword "oeil bleu grec"
//
//   2. 批次模式（先自己準備好 JSON，一次算一批）：
//        node kd_score.js --batch input.json [output.csv]
//      input.json 格式（一個關鍵字一筆）：
//        [{ "keyword": "...", "site": "joaillerie", "top10_domains": ["a.com", ...],
//           "ads_present": false, "shopping_present": false }, ...]

const fs = require('fs');
const path = require('path');
const https = require('https');

const TIER_POINTS = { authority: 15, minor: 5 };

// ---- 網域分層清單（起始版，持續累積） ----
const SITE_TIERS = {
  joaillerie: {
    authority: [
      'wikipedia.org', 'gia.edu', 'reddit.com', 'geo.fr', 'davidyurman.com',
    ],
    minor: [
      'perlesandco.com', 'celinni.com', 'myrollerstone.com', 'ajoya.fr',
      'aglaiaco.com', 'vuillermoz.fr', 'univers-quantic-shop.com',
      'laval-europe.com', 'gemmyo.com', 'mediamsuisse.ch', 'histoiredor.com',
      'lancastrianjewellers.com', 'klenota.fr', 'my-jewellery.com',
      'trendhim.fr', 'creolissime.com', 'latelierdumaraisparis.com',
      'bijouterie-rigal.com', 'hellomoon-shop.com', 'charlesgarnierparis.com',
      'janedeboy.com', 'silverson.art', 'sloya.fr', 'blog-bijoux.fr',
      'mineraljoaillerie.com', 'chaine-bijoux.com', 'mademoisellenuage.fr',
      'gamme-blanche.com', 'petits-tresors.fr', 'atelierlavoisier.com',
      'centreclea.fr', 'vivreathenes.com', 'ma-fleur-de-vie.com',
      'alphaomega.ms', 'santorin-grece.com',
    ],
  },
  Dream: {
    authority: ['wikipedia.org', 'reddit.com', 'huffpost.com', 'verywellmind.com', 'cosmopolitan.com'],
    minor: ['dreams.co.uk', 'everdear.co', 'leahannbolen.com', 'medium.com', 'quora.com'],
  },
  Desk: {
    authority: ['wikipedia.org', 'note.com', 'kanademono.design', 'bauhutte.jp'],
    minor: [
      'irodorimadori.com', 'goodrooms.jp', 'rincostyle.blog',
      'gadget.mahoroba148.com', 'kurashi-ec.jp',
    ],
  },
  Legend: {
    authority: [
      'wikipedia.org', 'britannica.com', 'reddit.com', 'bfro.net',
      'imdb.com', 'fandom.com',
    ],
    minor: [
      'thelandcle.org', 'foxtopus.ink', 'scottishtours.co.uk',
      'theghostinmymachine.com', 'wattpad.com', 'arcadiapod.com', 'jfdb.jp',
    ],
  },
};

function tiersFor(site) {
  const t = SITE_TIERS[site];
  if (!t) {
    throw new Error(`未知站台 "${site}"，必須是 ${Object.keys(SITE_TIERS).join('/')} 其中之一`);
  }
  return t;
}

function matchTier(domain, tiers) {
  for (const tierName of ['authority', 'minor']) {
    if (tiers[tierName].some((h) => domain.includes(h))) return tierName;
  }
  return null;
}

function kdScore(domains, adsPresent, shoppingPresent, site) {
  const tiers = tiersFor(site);
  const matched = domains.map((d) => matchTier(d, tiers)).filter(Boolean);
  let tierScore = matched.reduce((sum, t) => sum + TIER_POINTS[t], 0);
  tierScore = Math.min(60, tierScore);

  let score = 20;
  score += tierScore;
  score += adsPresent ? 8 : 0;
  score += shoppingPresent ? 5 : 0;
  if (matched.length === 0) score -= 10;
  score = Math.max(5, Math.min(95, Math.round(score)));

  let bucket;
  if (score <= 30) bucket = '低';
  else if (score <= 60) bucket = '中';
  else bucket = '高';

  return { score, bucket, highAuthCount: matched.length };
}

function extractHostname(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

function serperSearch(keyword, apiKey, gl, hl) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ q: keyword, gl, hl });
    const options = {
      hostname: 'google.serper.dev',
      path: '/search',
      method: 'POST',
      headers: {
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
    };
    const req = https.request(options, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        try {
          resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// 各站對應的 Serper gl/hl（地區/語言）參數，查詢時要跟站台語言一致，
// 不要每次都用預設的 us/en，不然查到的 SERP 是錯誤市場的排名情況。
const SITE_LOCALE = {
  joaillerie: { gl: 'fr', hl: 'fr' },
  Dream: { gl: 'us', hl: 'en' },
  Desk: { gl: 'jp', hl: 'ja' },
  Legend: { gl: 'us', hl: 'en' },
};

async function runLive(site, keyword) {
  const apiKeyPath = path.join(__dirname, '..', '..', '..', '..', 'API_Key');
  const apiKeyFile = fs.readFileSync(apiKeyPath, 'utf8');
  const m = apiKeyFile.match(/^Serper:\s*(.+)$/m);
  if (!m) throw new Error('找不到 API_Key 檔案裡的 Serper key');
  const apiKey = m[1].trim();

  const locale = SITE_LOCALE[site] || { gl: 'us', hl: 'en' };
  const result = await serperSearch(keyword, apiKey, locale.gl, locale.hl);
  const domains = (result.organic || []).slice(0, 10).map((r) => extractHostname(r.link));
  const adsPresent = !!(result.ads && result.ads.length);
  const shoppingPresent = !!(result.shopping && result.shopping.length);

  const { score, bucket, highAuthCount } = kdScore(domains, adsPresent, shoppingPresent, site);

  console.log(`關鍵字："${keyword}"（${site}, gl=${locale.gl} hl=${locale.hl}）`);
  console.log(`前 10 名網域：${domains.join(', ')}`);
  console.log(`ads_present=${adsPresent}  shopping_present=${shoppingPresent}`);
  console.log(`匹配到分層清單的網域數：${highAuthCount}`);
  console.log(`KD 分數：${score}（${bucket}）`);
  console.log('');
  console.log('四象限判斷（搜尋量待 GKP 補上後才能完整判斷，這裡只算出 KD 這一半）：');
  console.log(`  KD ≤60（低/中）→ 排名機會較好；KD >60（高）→ 需要長期布局或直接避開`);
}

function runBatch(inputPath, outputPath) {
  const entries = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  const rows = entries.map((e) => {
    const { score, bucket, highAuthCount } = kdScore(
      e.top10_domains || [],
      !!e.ads_present,
      !!e.shopping_present,
      e.site
    );
    return {
      keyword: e.keyword || '',
      site: e.site || '',
      kd_score: score,
      kd_bucket: bucket,
      high_auth_count: highAuthCount,
      ads_present: !!e.ads_present,
      shopping_present: !!e.shopping_present,
    };
  });

  const out = outputPath || 'kd_scores_output.csv';
  const header = Object.keys(rows[0] || { keyword: '', site: '', kd_score: '', kd_bucket: '', high_auth_count: '', ads_present: '', shopping_present: '' });
  const lines = [header.join(',')];
  for (const row of rows) {
    lines.push(header.map((k) => String(row[k]).replace(/,/g, ';')).join(','));
  }
  fs.writeFileSync(out, lines.join('\n'), 'utf8');
  console.log(`算完 ${rows.length} 個關鍵字的 KD，輸出到 ${out}`);
}

async function main() {
  const args = process.argv.slice(2);
  if (args[0] === '--live') {
    const siteIdx = args.indexOf('--site');
    const kwIdx = args.indexOf('--keyword');
    if (siteIdx === -1 || kwIdx === -1) {
      console.error('用法：node kd_score.js --live --site <joaillerie|Dream|Desk|Legend> --keyword "<關鍵字>"');
      process.exit(1);
    }
    await runLive(args[siteIdx + 1], args[kwIdx + 1]);
  } else if (args[0] === '--batch') {
    if (!args[1]) {
      console.error('用法：node kd_score.js --batch <input.json> [output.csv]');
      process.exit(1);
    }
    runBatch(args[1], args[2]);
  } else {
    console.error('用法：\n  node kd_score.js --live --site <站名> --keyword "<關鍵字>"\n  node kd_score.js --batch <input.json> [output.csv]');
    process.exit(1);
  }
}

main().catch((e) => {
  console.error('錯誤：', e.message || e);
  process.exit(1);
});
