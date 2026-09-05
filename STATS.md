# Счётчик реальных игроков

Игра на GitHub сама никого не считает. Нужна Google Таблица + скрипт.

## Шаг 1. Таблица
1. https://sheets.google.com
2. Новая таблица «Bip игроки»
3. Первая строка: time | id | name | email | phone | room | coins | best

## Шаг 2. Скрипт
1. Расширения → Apps Script
2. Вставь код ниже, сохрани
3. Развернуть → Новое развёртывание → Веб-приложение
4. Запуск от имени: меня
5. Кто имеет доступ: Все
6. Развернуть, разрешить доступ
7. Скопировать URL .../exec

function doGet(e) {
  var p = e.parameter || {};
  var sh = SpreadsheetApp.getActive().getSheets()[0];
  if (sh.getLastRow() === 0) {
    sh.appendRow(["time","id","name","email","phone","room","coins","best"]);
  }
  if (p.id) {
    var data = sh.getDataRange().getValues();
    var row = [new Date(), p.id, p.name||"", p.email||"", p.phone||"", p.room||0, p.coins||0, p.best||0];
    var found = 0;
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][1]) === String(p.id)) { found = i + 1; break; }
    }
    if (found) sh.getRange(found, 1, 1, 8).setValues([row]);
    else sh.appendRow(row);
  }
  var players = Math.max(0, sh.getLastRow() - 1);
  if (p.key === "bip-owner") {
    var data2 = sh.getDataRange().getValues();
    var list = [];
    for (var i = 1; i < data2.length; i++) {
      list.push({
        time: data2[i][0], id: data2[i][1], name: data2[i][2],
        email: data2[i][3], phone: data2[i][4],
        room: data2[i][5], coins: data2[i][6], best: data2[i][7]
      });
    }
    return ContentService.createTextOutput(JSON.stringify({players: players, list: list})).setMimeType(ContentService.MimeType.JSON);
  }
  return ContentService.createTextOutput(JSON.stringify({players: players})).setMimeType(ContentService.MimeType.JSON);
}

## Шаг 3. config.js
statsUrl: "https://script.google.com/macros/s/XXXX/exec",

Залить config.js в корень репы.

## Проверка
Открой URL скрипта — увидишь {"players":0}
Потом игру. В меню «Играют N». В таблице новая строка.
Админка: /admin.html?key=bip-owner
