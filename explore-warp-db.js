const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Path to Warp's SQLite database
const WARP_DB_PATH = path.join(
  process.env.LOCALAPPDATA,
  'warp',
  'Warp',
  'data',
  'warp.sqlite'
);

console.log('Connecting to Warp database at:', WARP_DB_PATH);

const db = new sqlite3.Database(WARP_DB_PATH, sqlite3.OPEN_READONLY, (err) => {
  if (err) {
    console.error('Error opening database:', err);
    process.exit(1);
  }
  console.log('\n✓ Connected to Warp database\n');
  
  // Get all tables
  db.all("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name", [], (err, tables) => {
    if (err) {
      console.error('Error getting tables:', err);
      return;
    }
    
    console.log('='.repeat(80));
    console.log('ALL TABLES IN WARP DATABASE:');
    console.log('='.repeat(80));
    tables.forEach((table, index) => {
      console.log(`${index + 1}. ${table.name}`);
    });
    
    console.log('\n' + '='.repeat(80));
    console.log('DETAILED SCHEMA FOR EACH TABLE:');
    console.log('='.repeat(80) + '\n');
    
    // Get schema for each table
    let processed = 0;
    tables.forEach((table) => {
      db.all(`PRAGMA table_info(${table.name})`, [], (err, columns) => {
        if (err) {
          console.error(`Error getting schema for ${table.name}:`, err);
        } else {
          console.log(`\nTable: ${table.name}`);
          console.log('-'.repeat(80));
          console.log('Columns:');
          columns.forEach((col) => {
            console.log(`  - ${col.name} (${col.type}) ${col.notnull ? 'NOT NULL' : ''} ${col.pk ? 'PRIMARY KEY' : ''}`);
          });
          
          // Get row count
          db.get(`SELECT COUNT(*) as count FROM ${table.name}`, [], (err, row) => {
            if (!err) {
              console.log(`Row count: ${row.count}`);
              
              // Show sample data for important tables
              if (row.count > 0 && ['ai_queries', 'current_user_information', 'conversations'].includes(table.name)) {
                db.all(`SELECT * FROM ${table.name} LIMIT 3`, [], (err, rows) => {
                  if (!err && rows.length > 0) {
                    console.log('Sample data (first 3 rows):');
                    rows.forEach((r, i) => {
                      console.log(`  Row ${i + 1}:`, JSON.stringify(r, null, 2).substring(0, 200) + '...');
                    });
                  }
                });
              }
            }
          });
        }
        
        processed++;
        if (processed === tables.length) {
          setTimeout(() => {
            console.log('\n' + '='.repeat(80));
            console.log('DATABASE EXPLORATION COMPLETE');
            console.log('='.repeat(80));
            db.close();
            process.exit(0);
          }, 2000);
        }
      });
    });
  });
});
