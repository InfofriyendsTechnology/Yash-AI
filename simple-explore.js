const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const WARP_DB_PATH = path.join(
  process.env.LOCALAPPDATA,
  'warp',
  'Warp',
  'data',
  'warp.sqlite'
);

console.log('Connecting to:', WARP_DB_PATH);
console.log('');

const db = new sqlite3.Database(WARP_DB_PATH, sqlite3.OPEN_READONLY, (err) => {
  if (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
});

// Get tables
db.all("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name", [], (err, tables) => {
  if (err) {
    console.error('Error getting tables:', err);
    db.close();
    return;
  }

  console.log('TABLES FOUND:');
  console.log('=============');
  tables.forEach(t => console.log(`  - ${t.name}`));
  console.log('');
  
  // Look for user-related tables
  const userTables = tables.filter(t => 
    t.name.toLowerCase().includes('user') || 
    t.name.toLowerCase().includes('credit') ||
    t.name.toLowerCase().includes('account') ||
    t.name.toLowerCase().includes('usage')
  );

  if (userTables.length > 0) {
    console.log('USER/CREDIT RELATED TABLES:');
    userTables.forEach(t => console.log(`  * ${t.name}`));
  }
  
  db.close();
});
