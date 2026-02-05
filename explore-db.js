const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const WARP_DB_PATH = path.join(
  process.env.LOCALAPPDATA,
  'warp',
  'Warp',
  'data',
  'warp.sqlite'
);

console.log('Database path:', WARP_DB_PATH);

const db = new sqlite3.Database(WARP_DB_PATH, sqlite3.OPEN_READONLY, (err) => {
  if (err) {
    console.error('Error opening database:', err);
    process.exit(1);
  }
  console.log('Connected to Warp database!\n');
});

// Get all tables
db.all("SELECT name FROM sqlite_master WHERE type='table'", [], (err, tables) => {
  if (err) {
    console.error('Error getting tables:', err);
    db.close();
    return;
  }

  console.log('=== TABLES IN DATABASE ===');
  tables.forEach(table => {
    console.log(`- ${table.name}`);
  });
  console.log('\n');

  // For each table, show schema
  let processed = 0;
  tables.forEach((table, index) => {
    db.all(`PRAGMA table_info(${table.name})`, [], (err, columns) => {
      if (err) {
        console.error(`Error getting schema for ${table.name}:`, err);
      } else {
        console.log(`\n=== TABLE: ${table.name} ===`);
        columns.forEach(col => {
          console.log(`  ${col.name} (${col.type})`);
        });

        // Show sample data
        db.all(`SELECT * FROM ${table.name} LIMIT 1`, [], (err, rows) => {
          if (err) {
            console.log(`  [Error reading data: ${err.message}]`);
          } else if (rows.length > 0) {
            console.log('  Sample data:', JSON.stringify(rows[0], null, 2));
          } else {
            console.log('  [No data in table]');
          }

          processed++;
          if (processed === tables.length) {
            db.close();
          }
        });
      }
    });
  });
});
