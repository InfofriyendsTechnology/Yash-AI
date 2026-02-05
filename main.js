const { app, BrowserWindow, ipcMain, shell, session } = require('electron');
const path = require('path');
const fs = require('fs');

// Auto-reload on file changes during development
try {
  require('electron-reload')(__dirname, {
    electron: path.join(__dirname, 'node_modules', '.bin', 'electron'),
    hardResetMethod: 'exit'
  });
} catch (e) {
  console.log('electron-reload not available');
}
const sqlite3 = require('sqlite3').verbose();
const Store = require('electron-store');
const { exec } = require('child_process');
const { encryptPassword, decryptPassword } = require('./crypto-utils');
const https = require('https');
const { WarpDesktopReader } = require('./warp-desktop-reader');

let store;
try {
  store = new Store();
} catch (err) {
  console.log('electron-store not fully initialized, will skip for now');
}
let mainWindow;
let warpDb;
let accountsDb;

// Path to Warp's SQLite database
const WARP_DB_PATH = path.join(
  process.env.LOCALAPPDATA,
  'warp',
  'Warp',
  'data',
  'warp.sqlite'
);

// Path to Warp executable
const WARP_EXE_PATH = path.join(
  process.env.LOCALAPPDATA,
  'Programs',
  'Warp',
  'warp.exe'
);

// Path to accounts database
const ACCOUNTS_DB_PATH = path.join(__dirname, 'accounts.db');

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: path.join(__dirname, 'LOGO.png'),
    title: 'Yash AI - Warp Automation',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  mainWindow.loadFile('index.html');
  
  // Open DevTools in development
  mainWindow.webContents.openDevTools();
}

// Initialize Warp database connection
function initWarpDb() {
  try {
    warpDb = new sqlite3.Database(WARP_DB_PATH, sqlite3.OPEN_READONLY, (err) => {
      if (err) {
        console.error('Error opening Warp database:', err);
      } else {
        console.log('Connected to Warp database');
      }
    });
  } catch (error) {
    console.error('Failed to connect to Warp database:', error);
  }
}

// Initialize accounts database
function initAccountsDb() {
  try {
    accountsDb = new sqlite3.Database(ACCOUNTS_DB_PATH, (err) => {
      if (err) {
        console.error('Error opening accounts database:', err);
      } else {
        console.log('Connected to accounts database');
      }
    });
  } catch (error) {
    console.error('Failed to connect to accounts database:', error);
  }
}

// Get user info from Warp database
ipcMain.handle('get-warp-user-info', async () => {
  return new Promise((resolve, reject) => {
    if (!warpDb) {
      reject('Database not initialized');
      return;
    }

    // Query actual user data from correct table
    warpDb.get('SELECT * FROM current_user_information LIMIT 1', [], (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row || {});
      }
    });
  });
});

// Get AI query count (conversations)
ipcMain.handle('get-conversations', async () => {
  return new Promise((resolve, reject) => {
    if (!warpDb) {
      reject('Database not initialized');
      return;
    }

    warpDb.all('SELECT COUNT(*) as count FROM ai_queries', [], (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows[0] || { count: 0 });
      }
    });
  });
});

// Launch Warp AI
ipcMain.handle('launch-warp', async () => {
  return new Promise((resolve, reject) => {
    exec(`"${WARP_EXE_PATH}"`, (error) => {
      if (error) {
        reject(error);
      } else {
        resolve(true);
      }
    });
  });
});

// Read credits from Warp DESKTOP application (running app)
ipcMain.handle('read-warp-desktop-credits', async () => {
  try {
    console.log('🖥️ Reading credits from Warp desktop app...');
    
    const reader = new WarpDesktopReader();
    const results = await reader.extractCredits(warpDb);
    
    console.log('📊 Desktop reader results:', JSON.stringify(results, null, 2));
    
    // Try to extract credit numbers from any successful method
    let creditData = null;
    
    // Method 1: Check logs
    if (results.logs.success && results.logs.found) {
      console.log('✅ Found credits in logs!');
      const matches = results.logs.matches;
      if (matches && matches.length > 0) {
        const match = matches[0].match(/(\d+)\s*\/\s*(\d+)/);
        if (match) {
          creditData = {
            used: parseInt(match[1]),
            total: parseInt(match[2]),
            remaining: parseInt(match[2]) - parseInt(match[1])
          };
        }
      }
    }
    
    // Method 2: Check window text
    if (!creditData && results.windowText.success && results.windowText.data) {
      console.log('✅ Found credits in window text!');
      const match = results.windowText.data.match(/(\d+)\s*\/\s*(\d+)\s*credit/i);
      if (match) {
        creditData = {
          used: parseInt(match[1]),
          total: parseInt(match[2]),
          remaining: parseInt(match[2]) - parseInt(match[1])
        };
      }
    }
    
    if (creditData) {
      return {
        success: true,
        credits: `${creditData.remaining}/${creditData.total}`,
        used: creditData.used,
        remaining: creditData.remaining,
        total: creditData.total,
        percentage: Math.round((creditData.remaining / creditData.total) * 100),
        model: 'claude-4-5-sonnet',
        status: creditData.remaining > 0 ? 'Active' : 'Limit Reached',
        source: 'desktop-app',
        method: 'warp-desktop-reader'
      };
    } else {
      return {
        success: false,
        message: 'Could not extract credits. Make sure Warp is running and showing credits in UI.',
        requiresWarpRunning: true,
        source: 'desktop-read-failed',
        debugInfo: results
      };
    }
    
  } catch (error) {
    console.error('❌ Desktop reader error:', error);
    return {
      success: false,
      error: error.message,
      source: 'error'
    };
  }
});

// Scrape credits from Warp web dashboard with REAL authentication
// Get Warp user tokens from database for API authentication
ipcMain.handle('get-warp-tokens', async () => {
  return new Promise((resolve, reject) => {
    if (!warpDb) {
      reject('Database not initialized');
      return;
    }

    // Try to find auth tokens in various tables
    const queries = [
      'SELECT * FROM current_user_information LIMIT 1',
      'SELECT * FROM sqlite_master WHERE type="table"'
    ];

    warpDb.get(queries[0], [], (err, user) => {
      if (err || !user) {
        resolve({ found: false, user: null });
        return;
      }

      // List all tables to find where tokens might be
      warpDb.all(queries[1], [], (err, tables) => {
        resolve({
          found: true,
          user: user,
          tables: tables ? tables.map(t => t.name) : [],
          email: user.email,
          id: user.id
        });
      });
    });
  });
});

// Get credits/usage info - Show query count ONLY (no estimation)
ipcMain.handle('get-credits', async () => {
  return new Promise((resolve) => {
    if (!warpDb) {
      resolve({ 
        credits: 'Database not initialized', 
        model: 'claude-4-5-sonnet',
        status: 'Unknown',
        source: 'error'
      });
      return;
    }

    // Just count queries - don't estimate credits
    warpDb.get('SELECT COUNT(*) as total FROM ai_queries', [], (err, row) => {
      if (err) {
        resolve({ 
          credits: 'Click "FETCH LIVE" to get real data', 
          model: 'claude-4-5-sonnet',
          status: 'Unknown',
          source: 'no-data',
          queryCount: 0
        });
      } else {
        const queryCount = row.total || 0;
        
        resolve({ 
          credits: 'Click "FETCH LIVE" to get real data',
          queryCount: queryCount,
          model: 'claude-4-5-sonnet',
          status: 'Unknown',
          source: 'local-query-count',
          note: `${queryCount} queries found in local database. Click "FETCH LIVE" to get actual credit count from Warp.`
        });
      }
    });
  });
});

// Get comprehensive conversation statistics
ipcMain.handle('get-conversation-stats', async () => {
  return new Promise((resolve, reject) => {
    if (!warpDb) {
      reject('Database not initialized');
      return;
    }

    const query = `
      SELECT 
        COUNT(DISTINCT conversation_id) as total_conversations,
        COUNT(*) as total_queries,
        COUNT(DISTINCT model_id) as models_used,
        MAX(start_ts) as last_query_time
      FROM ai_queries
    `;

    warpDb.get(query, [], (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row || { total_conversations: 0, total_queries: 0, models_used: 0, last_query_time: null });
      }
    });
  });
});

// Get query statistics by time period
ipcMain.handle('get-query-stats-by-period', async () => {
  return new Promise((resolve, reject) => {
    if (!warpDb) {
      reject('Database not initialized');
      return;
    }

    const now = Math.floor(Date.now() / 1000);
    const todayStart = now - (now % 86400);
    const weekStart = now - (7 * 86400);
    const monthStart = now - (30 * 86400);

    const query = `
      SELECT 
        COUNT(CASE WHEN start_ts >= ${todayStart} THEN 1 END) as queries_today,
        COUNT(CASE WHEN start_ts >= ${weekStart} THEN 1 END) as queries_this_week,
        COUNT(CASE WHEN start_ts >= ${monthStart} THEN 1 END) as queries_this_month,
        COUNT(*) as queries_all_time
      FROM ai_queries
    `;

    warpDb.get(query, [], (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row || { queries_today: 0, queries_this_week: 0, queries_this_month: 0, queries_all_time: 0 });
      }
    });
  });
});

// Get model usage breakdown
ipcMain.handle('get-model-usage', async () => {
  return new Promise((resolve, reject) => {
    if (!warpDb) {
      reject('Database not initialized');
      return;
    }

    const query = `
      SELECT 
        model_id,
        COUNT(*) as usage_count,
        MAX(start_ts) as last_used
      FROM ai_queries
      WHERE model_id IS NOT NULL
      GROUP BY model_id
      ORDER BY usage_count DESC
    `;

    warpDb.all(query, [], (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows || []);
      }
    });
  });
});

// Get query status breakdown
ipcMain.handle('get-query-status-breakdown', async () => {
  return new Promise((resolve, reject) => {
    if (!warpDb) {
      reject('Database not initialized');
      return;
    }

    const query = `
      SELECT 
        output_status,
        COUNT(*) as count
      FROM ai_queries
      GROUP BY output_status
    `;

    warpDb.all(query, [], (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows || []);
      }
    });
  });
});

// Get total account count
ipcMain.handle('get-account-count', async () => {
  return new Promise((resolve, reject) => {
    if (!accountsDb) {
      reject('Accounts database not initialized');
      return;
    }

    accountsDb.get('SELECT COUNT(*) as count FROM accounts', [], (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row || { count: 0 });
      }
    });
  });
});

// Get terminal command history count
ipcMain.handle('get-command-count', async () => {
  return new Promise((resolve, reject) => {
    if (!warpDb) {
      reject('Database not initialized');
      return;
    }

    warpDb.get('SELECT COUNT(*) as count FROM commands', [], (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row || { count: 0 });
      }
    });
  });
});

// Get agent conversation count
ipcMain.handle('get-agent-conversation-count', async () => {
  return new Promise((resolve, reject) => {
    if (!warpDb) {
      reject('Database not initialized');
      return;
    }

    warpDb.get('SELECT COUNT(*) as count FROM agent_conversations', [], (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row || { count: 0 });
      }
    });
  });
});

// Get comprehensive database stats
ipcMain.handle('get-database-stats', async () => {
  return new Promise((resolve, reject) => {
    if (!warpDb) {
      reject('Database not initialized');
      return;
    }

    const stats = {};
    let completed = 0;
    const tables = [
      'ai_queries',
      'commands', 
      'blocks',
      'agent_conversations',
      'agent_tasks',
      'terminal_panes',
      'notebooks'
    ];

    tables.forEach(table => {
      warpDb.get(`SELECT COUNT(*) as count FROM ${table}`, [], (err, row) => {
        if (!err) {
          stats[table] = row.count;
        } else {
          stats[table] = 0;
        }
        completed++;
        
        if (completed === tables.length) {
          resolve(stats);
        }
      });
    });
  });
});

// Get recent queries from ai_queries table (ALL queries, not limited)
ipcMain.handle('get-recent-queries', async () => {
  return new Promise((resolve, reject) => {
    if (!warpDb) {
      reject('Database not initialized');
      return;
    }

    const query = `
      SELECT 
        id,
        exchange_id,
        conversation_id,
        model_id,
        planning_model_id,
        coding_model_id,
        output_status,
        start_ts,
        input,
        working_directory
      FROM ai_queries 
      ORDER BY start_ts DESC
    `;

    warpDb.all(query, [], (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows || []);
      }
    });
  });
});

// ============ ACCOUNT MANAGEMENT IPC HANDLERS ============

// Get all accounts
ipcMain.handle('get-accounts', async () => {
  return new Promise((resolve, reject) => {
    if (!accountsDb) {
      reject('Accounts database not initialized');
      return;
    }

    accountsDb.all('SELECT id, email, status, queries_count, query_limit, last_used, created_at, notes FROM accounts ORDER BY created_at DESC', [], (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows || []);
      }
    });
  });
});

// Add new account
ipcMain.handle('add-account', async (event, accountData) => {
  return new Promise((resolve, reject) => {
    if (!accountsDb) {
      reject('Accounts database not initialized');
      return;
    }

    const { email, password, queryLimit, notes } = accountData;
    
    try {
      // Encrypt password
      const { encrypted, iv } = encryptPassword(password);
      
      accountsDb.run(
        'INSERT INTO accounts (email, password_encrypted, encryption_iv, query_limit, notes) VALUES (?, ?, ?, ?, ?)',
        [email, encrypted, iv, queryLimit || 50, notes || ''],
        function(err) {
          if (err) {
            if (err.message.includes('UNIQUE constraint')) {
              reject(new Error('Account with this email already exists'));
            } else {
              reject(err);
            }
          } else {
            resolve({ id: this.lastID, email });
          }
        }
      );
    } catch (error) {
      reject(error);
    }
  });
});

// Delete account
ipcMain.handle('delete-account', async (event, accountId) => {
  return new Promise((resolve, reject) => {
    if (!accountsDb) {
      reject('Accounts database not initialized');
      return;
    }

    accountsDb.run('DELETE FROM accounts WHERE id = ?', [accountId], function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ deleted: this.changes > 0 });
      }
    });
  });
});

// Update account usage
ipcMain.handle('update-account-usage', async (event, accountId) => {
  return new Promise((resolve, reject) => {
    if (!accountsDb) {
      reject('Accounts database not initialized');
      return;
    }

    accountsDb.run(
      'UPDATE accounts SET queries_count = queries_count + 1, last_used = CURRENT_TIMESTAMP WHERE id = ?',
      [accountId],
      function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ updated: this.changes > 0 });
        }
      }
    );
  });
});

// Get active account from settings
ipcMain.handle('get-active-account', async () => {
  return new Promise((resolve, reject) => {
    if (!accountsDb) {
      reject('Accounts database not initialized');
      return;
    }

    accountsDb.get('SELECT value FROM settings WHERE key = "active_account_id"', [], (err, row) => {
      if (err) {
        reject(err);
      } else {
        const accountId = row?.value;
        if (!accountId) {
          resolve(null);
          return;
        }

        // Get account details
        accountsDb.get('SELECT id, email, status, queries_count, query_limit FROM accounts WHERE id = ?', [accountId], (err, account) => {
          if (err) {
            reject(err);
          } else {
            resolve(account || null);
          }
        });
      }
    });
  });
});

// Set active account
ipcMain.handle('set-active-account', async (event, accountId) => {
  return new Promise((resolve, reject) => {
    if (!accountsDb) {
      reject('Accounts database not initialized');
      return;
    }

    accountsDb.run(
      'UPDATE settings SET value = ? WHERE key = "active_account_id"',
      [accountId.toString()],
      function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ success: true });
        }
      }
    );
  });
});

// Get app settings
ipcMain.handle('get-settings', async () => {
  return new Promise((resolve, reject) => {
    if (!accountsDb) {
      reject('Accounts database not initialized');
      return;
    }

    accountsDb.all('SELECT key, value FROM settings', [], (err, rows) => {
      if (err) {
        reject(err);
      } else {
        const settings = {};
        rows.forEach(row => {
          settings[row.key] = row.value;
        });
        resolve(settings);
      }
    });
  });
});

// Auto-backup history to desktop
ipcMain.handle('auto-backup-history', async (event, queries, userEmail) => {
  try {
    // Get current Warp user email from database
    let currentEmail = userEmail || 'unknown';
    
    // If no email provided, try to get from Warp database
    if (!userEmail || userEmail === 'unknown') {
      try {
        const userInfo = await new Promise((resolve) => {
          warpDb.get('SELECT email FROM current_user_information LIMIT 1', [], (err, row) => {
            resolve(row?.email || 'unknown');
          });
        });
        currentEmail = userInfo;
      } catch (e) {
        console.log('Could not get user email, using unknown');
      }
    }
    
    // Create account-specific backup folder
    const sanitizedEmail = currentEmail.replace(/[@.]/g, '_');
    const backupDir = path.join(process.env.USERPROFILE || process.env.HOME, 'Desktop', 'Yash AI History', sanitizedEmail);
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    // Check if files already exist and compare data
    const historyFile = path.join(backupDir, `history-${sanitizedEmail}.json`);
    const fileExisted = fs.existsSync(historyFile);
    
    // If file exists, check if data has changed
    if (fileExisted) {
      const oldData = JSON.parse(fs.readFileSync(historyFile, 'utf8'));
      
      // Compare query count and last query ID
      if (oldData.length === queries.length && 
          oldData.length > 0 && 
          queries.length > 0 &&
          oldData[oldData.length - 1].id === queries[queries.length - 1].id) {
        // No new data - skip backup
        return {
          success: true,
          skipped: true,
          action: 'no_change',
          message: 'No new data - backup skipped',
          queryCount: queries.length
        };
      }
    }
    
    // Save complete JSON (new data detected or first time)
    fs.writeFileSync(historyFile, JSON.stringify(queries, null, 2));

    // Create AI-formatted context file
    const aiContext = queries.map((q, i) => {
      const date = new Date(q.start_ts);
      let input = 'N/A';
      try {
        const parsed = JSON.parse(q.input);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].Query) {
          input = parsed[0].Query.userQuery || JSON.stringify(parsed[0]);
        }
      } catch (e) {
        input = q.input || 'N/A';
      }

      return `
=== Conversation ${i + 1} ===
Date: ${date.toLocaleString()}
Conversation ID: ${q.conversation_id}
Model: ${q.model_id}
Status: ${q.output_status}
Working Directory: ${q.working_directory || 'N/A'}

Query:
${input}

${'='.repeat(80)}`;
    }).join('\n\n');

    const aiFormattedFile = path.join(backupDir, `ai-context-${sanitizedEmail}.txt`);
    fs.writeFileSync(aiFormattedFile, `WARP AI CONVERSATION HISTORY
Account: ${currentEmail}
Generated: ${new Date().toLocaleString()}
Total Conversations: ${queries.length}
${'='.repeat(80)}\n\n${aiContext}`);

    // Create README
    const readmeFile = path.join(backupDir, 'README.txt');
    fs.writeFileSync(readmeFile, `YASH AI - WARP HISTORY BACKUP
${'='.repeat(50)}

Account: ${currentEmail}

This folder contains your complete Warp AI history for this account ONLY.
It auto-updates whenever you use the app with this account.

Files:
- history-${sanitizedEmail}.json: Full database export (raw data)
- ai-context-${sanitizedEmail}.txt: Human-readable format for feeding to new AI chats
- README.txt: This file

Last updated: ${new Date().toLocaleString()}
Total queries: ${queries.length}

IMPORTANT: Each Warp account gets its own folder!
- When you switch accounts, a NEW folder is created
- Your history is safe and separated by account
- Files are automatically replaced when data changes

To use in new AI chat:
Copy contents of ai-context-${sanitizedEmail}.txt and paste into AI chat with:
"Here is my previous conversation history for context:"`);

    return { 
      success: true, 
      path: backupDir,
      email: currentEmail,
      action: fileExisted ? 'replaced' : 'created',
      queryCount: queries.length
    };
  } catch (error) {
    console.error('Auto-backup failed:', error);
    return { success: false, error: error.message };
  }
});

// Backup entire database
ipcMain.handle('backup-database', async (event, queries) => {
  try {
    const backupDir = path.join(process.env.USERPROFILE || process.env.HOME, 'Desktop', 'Yash AI Backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupSubDir = path.join(backupDir, `backup-${timestamp}`);
    fs.mkdirSync(backupSubDir, { recursive: true });

    // Copy databases
    fs.copyFileSync(WARP_DB_PATH, path.join(backupSubDir, 'warp.sqlite'));
    fs.copyFileSync(ACCOUNTS_DB_PATH, path.join(backupSubDir, 'accounts.db'));

    // Export query history as JSON
    if (queries && queries.length > 0) {
      fs.writeFileSync(
        path.join(backupSubDir, 'query-history.json'),
        JSON.stringify(queries, null, 2)
      );
    }

    // Open backup folder
    shell.openPath(backupSubDir);

    return { success: true, path: backupSubDir };
  } catch (error) {
    console.error('Backup failed:', error);
    return { success: false, error: error.message };
  }
});

// Restore backup - Replace Warp database with backup file
ipcMain.handle('restore-backup', async (event, backupFilePath) => {
  try {
    // Check if backup file exists
    if (!fs.existsSync(backupFilePath)) {
      return { success: false, error: 'Backup file not found' };
    }

    // Close Warp database connection
    if (warpDb) {
      await new Promise((resolve) => {
        warpDb.close(() => resolve());
      });
    }

    // Create a safety backup of current Warp database before replacing
    const safetyBackupPath = WARP_DB_PATH + '.backup-' + Date.now();
    fs.copyFileSync(WARP_DB_PATH, safetyBackupPath);

    // Delete old Warp database
    fs.unlinkSync(WARP_DB_PATH);

    // Copy backup file to Warp location
    fs.copyFileSync(backupFilePath, WARP_DB_PATH);

    // Reconnect to new database
    initWarpDb();

    return { 
      success: true, 
      message: 'Backup restored successfully',
      safetyBackup: safetyBackupPath
    };
  } catch (error) {
    console.error('Restore failed:', error);
    return { success: false, error: error.message };
  }
});

// Quick restore from account-specific backup folder
ipcMain.handle('quick-restore-backup', async (event, userEmail) => {
  try {
    // Get account-specific backup file
    const sanitizedEmail = userEmail.replace(/[@.]/g, '_');
    const backupDir = path.join(process.env.USERPROFILE || process.env.HOME, 'Desktop', 'Yash AI History', sanitizedEmail);
    const backupFile = path.join(backupDir, `history-${sanitizedEmail}.json`);

    if (!fs.existsSync(backupFile)) {
      return { success: false, error: 'No backup found for this account' };
    }

    // Read backup data
    const backupData = JSON.parse(fs.readFileSync(backupFile, 'utf8'));

    // Close Warp database
    if (warpDb) {
      await new Promise((resolve) => {
        warpDb.close(() => resolve());
      });
    }

    // Create safety backup
    const safetyBackupPath = WARP_DB_PATH + '.backup-' + Date.now();
    fs.copyFileSync(WARP_DB_PATH, safetyBackupPath);

    // Note: We can't directly inject JSON into SQLite
    // We need to either:
    // 1. Use a complete .sqlite file backup
    // 2. Or rebuild the database from JSON
    
    // For now, let's use the timestamped backup if available
    const backupFolder = path.join(process.env.USERPROFILE || process.env.HOME, 'Desktop', 'Yash AI Backups');
    if (!fs.existsSync(backupFolder)) {
      return { success: false, error: 'No database backups found. Use "Backup Database" first.' };
    }

    // Get most recent backup folder
    const backupFolders = fs.readdirSync(backupFolder)
      .filter(f => f.startsWith('backup-'))
      .sort()
      .reverse();

    if (backupFolders.length === 0) {
      return { success: false, error: 'No database backups found. Use "Backup Database" first.' };
    }

    const latestBackup = path.join(backupFolder, backupFolders[0], 'warp.sqlite');
    
    if (!fs.existsSync(latestBackup)) {
      return { success: false, error: 'Backup database file not found' };
    }

    // Delete old database
    fs.unlinkSync(WARP_DB_PATH);

    // Restore from backup
    fs.copyFileSync(latestBackup, WARP_DB_PATH);

    // Reconnect
    initWarpDb();

    return {
      success: true,
      message: 'Database restored from latest backup',
      backupUsed: backupFolders[0],
      safetyBackup: safetyBackupPath
    };
  } catch (error) {
    console.error('Quick restore failed:', error);
    return { success: false, error: error.message };
  }
});

app.whenReady().then(() => {
  initWarpDb();
  initAccountsDb();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', async () => {
  // Auto-backup history before closing
  console.log('📦 Auto-saving history before close...');
  try {
    if (warpDb) {
      // Get current user email
      const userInfo = await new Promise((resolve) => {
        warpDb.get('SELECT * FROM current_user_information LIMIT 1', [], (err, row) => {
          resolve(row || { email: 'unknown' });
        });
      });
      
      // Get all queries
      const queries = await new Promise((resolve) => {
        warpDb.all('SELECT * FROM ai_queries ORDER BY start_ts DESC', [], (err, rows) => {
          resolve(rows || []);
        });
      });
      
      if (queries.length > 0) {
        const currentEmail = userInfo.email || 'unknown';
        const sanitizedEmail = currentEmail.replace(/[@.]/g, '_');
        const backupDir = path.join(process.env.USERPROFILE || process.env.HOME, 'Desktop', 'Yash AI History', sanitizedEmail);
        
        // Create backup directory
        if (!fs.existsSync(backupDir)) {
          fs.mkdirSync(backupDir, { recursive: true });
        }
        
        // Save JSON backup
        const jsonFile = path.join(backupDir, `history-${sanitizedEmail}.json`);
        fs.writeFileSync(jsonFile, JSON.stringify(queries, null, 2));
        
        console.log(`✅ Auto-backup saved: ${queries.length} queries for ${currentEmail}`);
      }
    }
  } catch (error) {
    console.error('Auto-backup failed:', error);
  }
  
  // Close databases
  if (warpDb) {
    warpDb.close();
  }
  if (accountsDb) {
    accountsDb.close();
  }
  
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
