const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods to renderer process
contextBridge.exposeInMainWorld('warpAPI', {
  // Warp database methods
  getUserInfo: () => ipcRenderer.invoke('get-warp-user-info'),
  getConversations: () => ipcRenderer.invoke('get-conversations'),
  getCredits: () => ipcRenderer.invoke('get-credits'),
  readWarpDesktopCredits: () => ipcRenderer.invoke('read-warp-desktop-credits'),
  launchWarp: () => ipcRenderer.invoke('launch-warp'),
  getRecentQueries: () => ipcRenderer.invoke('get-recent-queries'),
  
  // Comprehensive statistics methods
  getCodeAnalytics: () => ipcRenderer.invoke('get-code-analytics'),
  getConversationStats: () => ipcRenderer.invoke('get-conversation-stats'),
  getQueryStatsByPeriod: () => ipcRenderer.invoke('get-query-stats-by-period'),
  getModelUsage: () => ipcRenderer.invoke('get-model-usage'),
  getQueryStatusBreakdown: () => ipcRenderer.invoke('get-query-status-breakdown'),
  getAccountCount: () => ipcRenderer.invoke('get-account-count'),
  getCommandCount: () => ipcRenderer.invoke('get-command-count'),
  getAgentConversationCount: () => ipcRenderer.invoke('get-agent-conversation-count'),
  getDatabaseStats: () => ipcRenderer.invoke('get-database-stats'),
  
  // Account management methods
  getAccounts: () => ipcRenderer.invoke('get-accounts'),
  addAccount: (accountData) => ipcRenderer.invoke('add-account', accountData),
  deleteAccount: (accountId) => ipcRenderer.invoke('delete-account', accountId),
  updateAccountUsage: (accountId) => ipcRenderer.invoke('update-account-usage', accountId),
  getActiveAccount: () => ipcRenderer.invoke('get-active-account'),
  setActiveAccount: (accountId) => ipcRenderer.invoke('set-active-account', accountId),
  getSettings: () => ipcRenderer.invoke('get-settings'),
  
  // Backup methods
  autoBackupHistory: (queries, userEmail) => ipcRenderer.invoke('auto-backup-history', queries, userEmail),
  backupDatabase: (queries) => ipcRenderer.invoke('backup-database', queries),
  
  // Restore methods
  restoreBackup: (backupFilePath) => ipcRenderer.invoke('restore-backup', backupFilePath),
  quickRestoreBackup: (userEmail) => ipcRenderer.invoke('quick-restore-backup', userEmail)
});
