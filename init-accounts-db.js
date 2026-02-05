const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const crypto = require('crypto');

// Create accounts database
const ACCOUNTS_DB_PATH = path.join(__dirname, 'accounts.db');

const db = new sqlite3.Database(ACCOUNTS_DB_PATH, (err) => {
  if (err) {
    console.error('Error creating accounts database:', err);
    return;
  }
  console.log('Connected to accounts database');
});

// Create tables
db.serialize(() => {
  // Accounts table - stores multiple Warp AI accounts
  db.run(`
    CREATE TABLE IF NOT EXISTS accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_encrypted TEXT NOT NULL,
      encryption_iv TEXT NOT NULL,
      status TEXT DEFAULT 'active',
      queries_count INTEGER DEFAULT 0,
      query_limit INTEGER DEFAULT 50,
      last_used DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      notes TEXT
    )
  `, (err) => {
    if (err) {
      console.error('Error creating accounts table:', err);
    } else {
      console.log('✓ Accounts table created');
    }
  });

  // Usage logs table - tracks query usage over time
  db.run(`
    CREATE TABLE IF NOT EXISTS usage_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_id INTEGER NOT NULL,
      query_count INTEGER DEFAULT 0,
      date DATE DEFAULT CURRENT_DATE,
      FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
    )
  `, (err) => {
    if (err) {
      console.error('Error creating usage_logs table:', err);
    } else {
      console.log('✓ Usage logs table created');
    }
  });

  // App settings table - stores app configuration
  db.run(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `, (err) => {
    if (err) {
      console.error('Error creating settings table:', err);
    } else {
      console.log('✓ Settings table created');
    }
  });

  // Insert default settings
  db.run(`
    INSERT OR IGNORE INTO settings (key, value) VALUES 
    ('active_account_id', ''),
    ('auto_switch_enabled', 'true'),
    ('default_query_limit', '50'),
    ('rotation_count', '0'),
    ('reinstall_after_rotations', '3')
  `, (err) => {
    if (err) {
      console.error('Error inserting default settings:', err);
    } else {
      console.log('✓ Default settings inserted');
    }
  });
});

db.close((err) => {
  if (err) {
    console.error('Error closing database:', err);
  } else {
    console.log('\n✅ Accounts database initialized successfully!');
    console.log(`Location: ${ACCOUNTS_DB_PATH}`);
  }
});
