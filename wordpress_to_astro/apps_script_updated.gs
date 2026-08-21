// 共用密鑰：改成一段隨機字串，並原封不動放進 API_Key 檔的 SheetWriteSecret
var SECRET = 'ahpghp2ohg93r5ln2pf0dlfj28hg2ldjguzyouvw';

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    if (body.token !== SECRET) {
      return json({ ok: false, error: 'unauthorized' });
    }

    if (body.action === 'append') {
      return handleAppend(body);
    }

    return handleUpdate(body);
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}

// 既有行為，完全不變：照 Keyword 比對，寫入 Status=USED 與 Post_Url。
function handleUpdate(body) {
  var items = body.items || [];   // [{ keyword, post_url }, ...]
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var kwCol     = headers.indexOf('Keyword');
  var statusCol = headers.indexOf('Status');
  var urlCol    = headers.indexOf('Post_Url');
  if (kwCol === -1 || statusCol === -1) {
    return json({ ok: false, error: 'Keyword/Status column not found' });
  }

  var map = {};
  items.forEach(function (it) { map[it.keyword] = it.post_url || ''; });

  var updated = [];
  for (var r = 1; r < data.length; r++) {
    var kw = data[r][kwCol];
    if (map.hasOwnProperty(kw)) {
      sheet.getRange(r + 1, statusCol + 1).setValue('USED');
      if (urlCol !== -1 && map[kw]) {
        sheet.getRange(r + 1, urlCol + 1).setValue(map[kw]);
      }
      updated.push(kw);
    }
  }
  return json({ ok: true, updated: updated });
}

// 新行為：新增列。
// body.rows = [{ Topic, Site_Url, 'Pillar Post Title', 'Pillar Post Dimesion',
//                'Pillar Post Url', 'Keyword Cluster', Keyword, Language, Used,
//                'API Key', Status, Post_Url, Post_ID, Human_Context }, ...]
// 每個物件的 key 要跟 Sheet 現有的欄位標題文字完全一致；缺的欄位自動補空字串。
// 已經存在同一個 Keyword 的列會被跳過，不會重複新增。
function handleAppend(body) {
  var rows = body.rows || [];
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var kwCol = headers.indexOf('Keyword');

  if (kwCol === -1) {
    return json({ ok: false, error: 'Keyword column not found' });
  }

  // 記錄目前已經存在的關鍵字，避免重複新增
  var existingKeywords = {};
  for (var r = 1; r < data.length; r++) {
    existingKeywords[data[r][kwCol]] = true;
  }

  var appended = [];
  var skipped = [];

  rows.forEach(function (rowObj) {
    var kw = rowObj['Keyword'] || '';
    if (!kw) {
      return; // 沒有 Keyword 的列直接跳過
    }
    if (existingKeywords[kw]) {
      skipped.push(kw);
      return;
    }
    var newRow = headers.map(function (h) {
      return rowObj.hasOwnProperty(h) ? rowObj[h] : '';
    });
    sheet.appendRow(newRow);
    existingKeywords[kw] = true; // 同一批次內也要防重複
    appended.push(kw);
  });

  return json({ ok: true, appended: appended, skipped: skipped });
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
