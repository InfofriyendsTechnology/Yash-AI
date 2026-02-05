const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const WARP_DB_PATH = path.join(
  process.env.LOCALAPPDATA,
  'warp',
  'Warp',
  'data',
  'warp.sqlite'
);

const db = new sqlite3.Database(WARP_DB_PATH, sqlite3.OPEN_READONLY);

console.log('=== CURRENT USER INFORMATION ===\n');
db.all('SELECT * FROM current_user_information', [], (err, rows) => {
  if (err) console.error('Error:', err.message);
  else console.log(JSON.stringify(rows, null, 2));
});

console.log('\n=== USERS ===\n');
db.all('SELECT * FROM users', [], (err, rows) => {
  if (err) console.error('Error:', err.message);
  else console.log(JSON.stringify(rows, null, 2));
});

console.log('\n=== USER PROFILES ===\n');
db.all('SELECT * FROM user_profiles', [], (err, rows) => {
  if (err) console.error('Error:', err.message);
  else console.log(JSON.stringify(rows, null, 2));
});

console.log('\n=== AI QUERIES (recent 5) ===\n');
db.all('SELECT * FROM ai_queries ORDER BY id DESC LIMIT 5', [], (err, rows) => {
  if (err) console.error('Error:', err.message);
  else console.log(JSON.stringify(rows, null, 2));
  
  // Close after last query
  setTimeout(() => db.close(), 1000);
});
