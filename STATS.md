# Статистика игроков

GitHub Pages сам не видит чужие телефоны. Нужна таблица.

## 1. Таблица
Google Таблица: колонки
time | id | name | email | phone | room | coins | best

## 2. Расширения → Apps Script
Вставь код, Запуск → развертывание → веб-приложение
- кто имеет доступ: все
- выполнить от: я
Скопируй URL в config.js → statsUrl

```
function sheet_() {
  return SpreadsheetApp.getActive().getSheets()[0];
}
function doPost(e) {
  const d = JSON.parse(e.postData.contents || "{}");
  const sh = sheet_();
  if (sh.getLastRow() === 0) sh.appendRow(["time","id","name","email","phone","room","coins","best"]);
  const rows = sh.getDataRange().getValues();
  let found = 0;
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][1]) === String(d.id)) { found = i + 1; break; }
  }
  const row = [new Date(), d.id||"", d.name||"", d.email||"", d.phone||"", d.room||0, d.coins||0, d.best||0];
  if (found) sh.getRange(found,1,1,8).setValues([row]);
  else sh.appendRow(row);
  return ContentService.createTextOutput(JSON.stringify({ok:true, players: sh.getLastRow()-1}))
    .setMimeType(ContentService.MimeType.JSON);
}
function doGet(e) {
  const sh = sheet_();
  const rows = sh.getDataRange().getValues();
  if (e.parameter.key !== "bip-owner") {
    return ContentService.createTextOutput(JSON.stringify({players: Math.max(0, rows.length-1)}))
      .setMimeType(ContentService.MimeType.JSON);
  }
  const list = [];
  for (let i = 1; i < rows.length; i++) {
    list.push({time: rows[i][0], id: rows[i][1], name: rows[i][2], email: rows[i][3], phone: rows[i][4], room: rows[i][5], coins: rows[i][6], best: rows[i][7]});
  }
  return ContentService.createTextOutput(JSON.stringify({players: list.length, list: list}))
    .setMimeType(ContentService.MimeType.JSON);
}
```

## 3. Смотреть данные
Открой саму таблицу. Или admin.html?key=bip-owner после того как statsUrl заполнен.
