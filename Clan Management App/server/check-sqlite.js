const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./prisma/dev.db', (err) => {
  if (err) {
    console.error(err.message);
  }
  console.log('Connected to the dev.db SQlite database.');
});

db.serialize(() => {
  db.get('SELECT COUNT(*) as count FROM Member', (err, row) => {
    if (err) {
      console.error(err.message);
    } else {
      console.log(`There are ${row.count} members in local dev.db`);
    }
  });
});

db.close();
