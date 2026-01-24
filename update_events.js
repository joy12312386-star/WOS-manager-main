const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, 'dev.db'));

const newConfig = {
  monday: 'none',
  tuesday: 'research',
  wednesday: 'none',
  thursday: 'training',
  friday: 'building',
  saturday: 'none',
  sunday: 'none'
};

const dates = ['2026-01-26', '2026-01-03'];

dates.forEach(date => {
  db.run(
    'UPDATE event SET dayConfig = ? WHERE eventDate = ?',
    [JSON.stringify(newConfig), date],
    function(err) {
      if (err) {
        console.error(`更新 ${date} 失敗:`, err);
      } else {
        console.log(`✓ 已更新 ${date}: ${this.changes} 筆記錄`);
      }
    }
  );
});

setTimeout(() => {
  db.close();
  console.log('資料庫連接已關閉');
}, 1000);
