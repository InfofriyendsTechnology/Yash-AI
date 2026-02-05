// Load dashboard data
async function loadDashboardData() {
  let hasError = false;
  
  try {
    // Get user info
    const userInfo = await window.warpAPI.getUserInfo();
    const email = userInfo.email || 'Not logged in';
    document.getElementById('account-email').textContent = email;
    
    // Set greeting name (extract first part of email)
    let name = 'User';
    if (email && email !== 'Not logged in') {
      name = email.split('@')[0] || 'User';
      name = name.charAt(0).toUpperCase() + name.slice(1);
    }
    document.getElementById('greeting-name').textContent = name + '!';
  } catch (error) {
    console.error('Error loading user info:', error);
    hasError = true;
  }
  
  try {
    // Get simple query count
    const convStats = await window.warpAPI.getConversationStats();
    const queryCount = convStats.total_queries || 0;
    document.getElementById('total-queries-display').textContent = queryCount.toLocaleString();
  } catch (error) {
    console.error('Error loading query count:', error);
    document.getElementById('total-queries-display').textContent = '0';
    hasError = true;
  }
  
  try {
    // Get comprehensive conversation stats
    const convStats = await window.warpAPI.getConversationStats();
    document.getElementById('total-conversations').textContent = (convStats.total_conversations || 0).toLocaleString();
  } catch (error) {
    console.error('Error loading conversation stats:', error);
    document.getElementById('total-conversations').textContent = '0';
    hasError = true;
  }
  
  try {
    // Get time period stats
    const periodStats = await window.warpAPI.getQueryStatsByPeriod();
    document.getElementById('queries-today').textContent = (periodStats.queries_today || 0).toLocaleString();
    document.getElementById('queries-week').textContent = (periodStats.queries_this_week || 0).toLocaleString();
    document.getElementById('queries-month').textContent = (periodStats.queries_this_month || 0).toLocaleString();
  } catch (error) {
    console.error('Error loading period stats:', error);
    document.getElementById('queries-today').textContent = '0';
    document.getElementById('queries-week').textContent = '0';
    document.getElementById('queries-month').textContent = '0';
    hasError = true;
  }
  
  try {
    // Load model usage breakdown
    await loadModelUsage();
  } catch (error) {
    console.error('Error loading model usage:', error);
    hasError = true;
  }
  
  try {
    // Load comprehensive database stats
    await loadDatabaseStats();
  } catch (error) {
    console.error('Error loading database stats:', error);
    hasError = true;
  }
  
  try {
    // Load query history table
    await loadQueryHistory();
  } catch (error) {
    console.error('Error loading query history:', error);
    hasError = true;
  }
  
  // Connection status
  if (hasError) {
    document.getElementById('connection-status').innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 14px; height: 14px; vertical-align: middle; margin-right: 4px;"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>Partial';
    document.getElementById('connection-status').style.color = '#f59e0b';
  } else {
    document.getElementById('connection-status').innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 14px; height: 14px; vertical-align: middle; margin-right: 4px;"><polyline points="20 6 9 17 4 12"></polyline></svg>Connected';
    document.getElementById('connection-status').style.color = '#22c55e';
  }
}

// Load code analytics
async function loadCodeAnalytics() {
  try {
    const analytics = await window.warpAPI.getCodeAnalytics();
    
    // Update stat cards
    document.getElementById('unique-folders').textContent = analytics.uniqueFoldersCount.toLocaleString();
    document.getElementById('coding-queries').textContent = analytics.codingQueries.toLocaleString();
    document.getElementById('coding-percentage').textContent = `${analytics.codingPercentage}% of total`;
    document.getElementById('file-edits').textContent = analytics.fileOperations.edits.toLocaleString();
    document.getElementById('file-creates').textContent = analytics.fileOperations.creates.toLocaleString();
    
    // Load top projects
    const projectsTbody = document.getElementById('top-projects-tbody');
    if (analytics.topProjects && analytics.topProjects.length > 0) {
      projectsTbody.innerHTML = analytics.topProjects.map(project => `
        <tr>
          <td style="font-size: 0.8rem;" title="${project.path}">${project.name}</td>
          <td><strong>${project.count}</strong></td>
        </tr>
      `).join('');
    } else {
      projectsTbody.innerHTML = '<tr><td colspan="2" class="loading-row">No projects detected</td></tr>';
    }
    
    // Load top languages
    const languagesTbody = document.getElementById('top-languages-tbody');
    if (analytics.topLanguages && analytics.topLanguages.length > 0) {
      languagesTbody.innerHTML = analytics.topLanguages.map(lang => `
        <tr>
          <td>${lang.lang}</td>
          <td><strong>${lang.count}</strong></td>
        </tr>
      `).join('');
    } else {
      languagesTbody.innerHTML = '<tr><td colspan="2" class="loading-row">No languages detected</td></tr>';
    }
    
  } catch (error) {
    console.error('Error loading code analytics:', error);
    document.getElementById('unique-folders').textContent = '0';
    document.getElementById('coding-queries').textContent = '0';
    document.getElementById('file-edits').textContent = '0';
    document.getElementById('file-creates').textContent = '0';
  }
}

// Load model usage breakdown
async function loadModelUsage() {
  try {
    const modelUsage = await window.warpAPI.getModelUsage();
    const tbody = document.getElementById('model-usage-tbody');
    
    if (!modelUsage || modelUsage.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="3" class="loading-row">
            No model usage data available
          </td>
        </tr>
      `;
      return;
    }
    
    tbody.innerHTML = modelUsage.map(model => {
      const lastUsed = model.last_used ? 
        new Date(model.last_used * 1000).toLocaleString('en-US', { 
          month: 'short', 
          day: 'numeric', 
          hour: '2-digit', 
          minute: '2-digit' 
        }) : 
        'Never';
      
      return `
        <tr>
          <td>${model.model_id}</td>
          <td><strong>${model.usage_count.toLocaleString()}</strong></td>
          <td style="font-size: 0.75rem;">${lastUsed}</td>
        </tr>
      `;
    }).join('');
    
  } catch (error) {
    console.error('Error loading model usage:', error);
    const tbody = document.getElementById('model-usage-tbody');
    tbody.innerHTML = `
      <tr>
        <td colspan="3" class="loading-row" style="color: #ef4444;">
          Error loading model usage: ${error.message}
        </td>
      </tr>
    `;
  }
}

// Load comprehensive database stats
async function loadDatabaseStats() {
  try {
    const dbStats = await window.warpAPI.getDatabaseStats();
    
    // Update stat cards
    document.getElementById('terminal-commands').textContent = (dbStats.commands || 0).toLocaleString();
    document.getElementById('output-blocks').textContent = (dbStats.blocks || 0).toLocaleString();
    document.getElementById('agent-convs').textContent = (dbStats.agent_conversations || 0).toLocaleString();
    document.getElementById('agent-tasks').textContent = (dbStats.agent_tasks || 0).toLocaleString();
    
    // Update database overview table
    const tbody = document.getElementById('database-stats-tbody');
    const tableDescriptions = {
      'ai_queries': 'AI prompts and queries sent to Warp AI',
      'commands': 'Terminal commands executed in Warp',
      'blocks': 'Terminal output blocks and results',
      'agent_conversations': 'AI agent conversation sessions',
      'agent_tasks': 'AI agent tasks and workflows',
      'terminal_panes': 'Active terminal panes and tabs',
      'notebooks': 'Notebook documents created'
    };
    
    tbody.innerHTML = Object.entries(dbStats).map(([table, count]) => `
      <tr>
        <td><strong>${table}</strong></td>
        <td><strong>${count.toLocaleString()}</strong></td>
        <td style="font-size: 0.8125rem; color: var(--text-secondary);">${tableDescriptions[table] || 'Warp database table'}</td>
      </tr>
    `).join('');
    
  } catch (error) {
    console.error('Error loading database stats:', error);
    document.getElementById('terminal-commands').textContent = '0';
    document.getElementById('output-blocks').textContent = '0';
    document.getElementById('agent-convs').textContent = '0';
    document.getElementById('agent-tasks').textContent = '0';
  }
}

// Load query history into table
async function loadQueryHistory() {
  try {
    const queries = await window.warpAPI.getRecentQueries();
    const tbody = document.getElementById('queries-tbody');
    
    if (!queries || queries.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" class="loading-row">
            No query history found
          </td>
        </tr>
      `;
      return;
    }
    
    // Store queries globally for export
    window.allQueries = queries;
    
    // Auto-backup history to Desktop (auto-replaces old files)
    autoBackupHistory();
    
    // Populate table with actual data
    tbody.innerHTML = queries.map(query => {
      // Parse date properly - Warp stores as SQLite datetime string
      let formattedDate = 'Invalid Date';
      try {
        // Try parsing as ISO string first
        let date = new Date(query.start_ts);
        
        // If that fails, try as timestamp
        if (isNaN(date.getTime())) {
          date = new Date(query.start_ts * 1000);
        }
        
        // If still invalid, try parsing manually
        if (isNaN(date.getTime()) && typeof query.start_ts === 'string') {
          // Replace space with T for ISO format
          const isoString = query.start_ts.replace(' ', 'T').replace(/\.\d+/, '');
          date = new Date(isoString);
        }
        
        if (!isNaN(date.getTime())) {
          formattedDate = date.toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          });
        }
      } catch (e) {
        console.error('Date parsing error:', e, query.start_ts);
        formattedDate = query.start_ts; // Show raw value if parsing fails
      }
      
      // Format model name
      const model = query.model_id || 'Unknown';
      
      // Format status with badge
      const statusClass = query.output_status === 'completed' ? 'completed' : 
                         query.output_status === 'failed' ? 'failed' : 
                         query.output_status === 'pending' ? 'pending' : 'active';
      const statusText = query.output_status || 'Unknown';
      
      // Full conversation ID - NO truncation
      const convId = query.conversation_id || 'N/A';
      
      // Exchange ID - NO truncation
      const exchangeId = query.exchange_id || 'N/A';
      
      // Working directory - show full path
      const workingDir = query.working_directory || 'N/A';
      
      // Input preview (first 100 chars)
      let inputPreview = 'N/A';
      if (query.input) {
        try {
          // Try to parse JSON input
          const parsed = JSON.parse(query.input);
          if (Array.isArray(parsed) && parsed.length > 0) {
            inputPreview = JSON.stringify(parsed[0]).substring(0, 100) + '...';
          } else {
            inputPreview = query.input.substring(0, 100) + '...';
          }
        } catch (e) {
          inputPreview = query.input.substring(0, 100) + '...';
        }
      }
      
      // Escape quotes for onclick
      const escapedInput = inputPreview.replace(/'/g, "\\'").replace(/"/g, '&quot;');
      
      return `
        <tr>
          <td>#${query.id}</td>
          <td style="font-family: monospace; font-size: 0.7rem; max-width: 250px; word-break: break-all;">
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <span>${convId}</span>
              <button class="copy-btn" onclick="copyToClipboard('${convId}')" title="Copy">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
              </button>
            </div>
          </td>
          <td style="font-family: monospace; font-size: 0.7rem; max-width: 250px; word-break: break-all;">${exchangeId}</td>
          <td>${model}</td>
          <td><span class="status-badge status-${statusClass}">${statusText}</span></td>
          <td style="font-size: 0.75rem; white-space: nowrap;">${formattedDate}</td>
          <td style="font-size: 0.7rem; word-break: break-all; max-width: 250px;">${workingDir}</td>
          <td style="font-size: 0.75rem; max-width: 400px; white-space: normal;">
            <div style="display: flex; align-items: flex-start; gap: 0.5rem;">
              <span>${inputPreview}</span>
              <button class="copy-btn" onclick="copyToClipboard('${escapedInput}')" title="Copy Query">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
    
  } catch (error) {
    console.error('Error loading query history:', error);
    const tbody = document.getElementById('queries-tbody');
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="loading-row" style="color: #ef4444;">
          Error loading query history: ${error.message}
        </td>
      </tr>
    `;
  }
}

// Launch Warp AI button
document.getElementById('launch-warp-btn').addEventListener('click', async () => {
  try {
    await window.warpAPI.launchWarp();
    // Success feedback
    const btn = document.getElementById('launch-warp-btn');
    const originalText = btn.textContent;
    btn.textContent = '✓ Launched!';
    btn.style.background = 'linear-gradient(135deg, #22c55e, #16a34a)';
    setTimeout(() => {
      btn.textContent = originalText;
      btn.style.background = '';
    }, 2000);
  } catch (error) {
    console.error('Failed to launch Warp AI:', error);
    alert('Failed to launch Warp AI: ' + error.message);
  }
});

// Refresh button
document.getElementById('refresh-btn').addEventListener('click', () => {
  const btn = document.getElementById('refresh-btn');
  btn.style.transform = 'rotate(360deg)';
  btn.style.transition = 'transform 0.5s';
  loadDashboardData();
  setTimeout(() => {
    btn.style.transform = '';
  }, 500);
});

// Fetch button removed - credits not available from desktop

// Get time-based greeting
function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  if (hour < 21) return 'Good Evening';
  return 'Good Night';
}

// Load analytics page
async function loadAnalyticsPage() {
  try {
    const analytics = await window.warpAPI.getCodeAnalytics();
    
    // Update overview stats
    document.getElementById('analytics-projects').textContent = analytics.uniqueFoldersCount.toLocaleString();
    document.getElementById('analytics-coding').textContent = analytics.codingQueries.toLocaleString();
    document.getElementById('analytics-coding-pct').textContent = `${analytics.codingPercentage}% of queries`;
    document.getElementById('analytics-edits').textContent = analytics.fileOperations.edits.toLocaleString();
    document.getElementById('analytics-creates').textContent = analytics.fileOperations.creates.toLocaleString();
    
    // File operations counts
    document.getElementById('analytics-edit-count').textContent = analytics.fileOperations.edits.toLocaleString();
    document.getElementById('analytics-create-count').textContent = analytics.fileOperations.creates.toLocaleString();
    document.getElementById('analytics-delete-count').textContent = analytics.fileOperations.deletes.toLocaleString();
    
    // Load project breakdown table
    const projectsTbody = document.getElementById('analytics-projects-tbody');
    const allProjects = Object.entries(analytics.projectActivity)
      .sort((a, b) => b[1] - a[1])
      .map(([path, count]) => ({
        path,
        count,
        name: path.split('\\\\').pop() || path.split('/').pop() || 'Unknown',
        percentage: Math.round((count / analytics.totalQueries) * 100)
      }));
    
    if (allProjects.length > 0) {
      projectsTbody.innerHTML = allProjects.map((project, index) => `
        <tr>
          <td><strong>#${index + 1}</strong></td>
          <td><strong>${project.name}</strong></td>
          <td style="font-size: 0.75rem; color: var(--text-secondary);" title="${project.path}">${project.path}</td>
          <td><strong>${project.count}</strong></td>
          <td>
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <div style="flex: 1; height: 6px; background: rgba(255,255,255,0.1); border-radius: 3px; overflow: hidden;">
                <div style="width: ${project.percentage}%; height: 100%; background: var(--accent-color); transition: width 0.3s;"></div>
              </div>
              <span style="font-size: 0.875rem; font-weight: 600;">${project.percentage}%</span>
            </div>
          </td>
        </tr>
      `).join('');
    } else {
      projectsTbody.innerHTML = '<tr><td colspan="5" class="loading-row">No project data available</td></tr>';
    }
    
    // Load language usage table with visual bars
    const languagesTbody = document.getElementById('analytics-languages-tbody');
    const allLanguages = Object.entries(analytics.languages)
      .sort((a, b) => b[1] - a[1])
      .map(([lang, count]) => ({ lang, count }));
    
    const maxLangCount = allLanguages.length > 0 ? allLanguages[0].count : 1;
    
    if (allLanguages.length > 0) {
      languagesTbody.innerHTML = allLanguages.map((lang, index) => {
        const barWidth = Math.round((lang.count / maxLangCount) * 100);
        return `
          <tr>
            <td><strong>#${index + 1}</strong></td>
            <td><strong>${lang.lang}</strong></td>
            <td><strong>${lang.count}</strong></td>
            <td>
              <div style="display: flex; align-items: center; gap: 0.5rem;">
                <div style="flex: 1; height: 8px; background: rgba(255,255,255,0.1); border-radius: 4px; overflow: hidden;">
                  <div style="width: ${barWidth}%; height: 100%; background: linear-gradient(90deg, var(--accent-color), var(--accent-color-light)); transition: width 0.3s;"></div>
                </div>
                <span style="font-size: 0.75rem; color: var(--text-secondary);">${barWidth}%</span>
              </div>
            </td>
          </tr>
        `;
      }).join('');
    } else {
      languagesTbody.innerHTML = '<tr><td colspan="4" class="loading-row">No language data detected</td></tr>';
    }
    
    // Load file changes history
    const fileChangesTbody = document.getElementById('file-changes-tbody');
    if (analytics.fileChanges && analytics.fileChanges.length > 0) {
      fileChangesTbody.innerHTML = analytics.fileChanges.map(change => {
        const date = new Date(change.timestamp);
        const formattedDate = date.toLocaleString('en-US', { 
          month: 'short', 
          day: 'numeric',
          hour: '2-digit', 
          minute: '2-digit'
        });
        
        const operationColors = {
          'edit': '#3b82f6',
          'create': '#22c55e',
          'delete': '#ef4444'
        };
        
        const projectName = change.project ? (change.project.split('\\\\').pop() || change.project.split('/').pop()) : 'N/A';
        
        return `
          <tr>
            <td>
              <span style="display: inline-block; padding: 0.25rem 0.5rem; border-radius: 0.25rem; background: ${operationColors[change.operation] || '#6b7280'}; color: white; font-size: 0.75rem; font-weight: 600; text-transform: uppercase;">
                ${change.operation}
              </span>
            </td>
            <td style="font-size: 0.8rem; font-family: monospace;">
              ${change.files.slice(0, 2).join(', ')}${change.files.length > 2 ? ` +${change.files.length - 2}` : ''}
            </td>
            <td style="font-size: 0.8rem; color: var(--text-secondary);">${change.query}...</td>
            <td style="font-size: 0.75rem;">${formattedDate}</td>
            <td style="font-size: 0.75rem;" title="${change.project}">${projectName}</td>
          </tr>
        `;
      }).join('');
    } else {
      fileChangesTbody.innerHTML = '<tr><td colspan="5" class="loading-row">No file changes detected</td></tr>';
    }
    
    // Load all detected files
    document.getElementById('total-files-count').textContent = analytics.detectedFilesCount || 0;
    const filesListDiv = document.getElementById('all-files-list');
    if (analytics.detectedFilesArray && analytics.detectedFilesArray.length > 0) {
      filesListDiv.innerHTML = analytics.detectedFilesArray
        .sort()
        .map(file => {
          const ext = file.split('.').pop().toLowerCase();
          const colors = {
            'js': '#f7df1e',
            'ts': '#3178c6',
            'html': '#e34c26',
            'css': '#563d7c',
            'json': '#000000',
            'py': '#3776ab',
            'md': '#083fa1'
          };
          const bgColor = colors[ext] || '#6b7280';
          return `
            <span style="padding: 0.375rem 0.75rem; background: ${bgColor}22; border: 1px solid ${bgColor}; border-radius: 0.375rem; font-size: 0.8125rem; font-family: monospace; color: var(--text-primary);">
              ${file}
            </span>
          `;
        })
        .join('');
    } else {
      filesListDiv.innerHTML = '<span style="color: var(--text-secondary);">No files detected</span>';
    }
    
  } catch (error) {
    console.error('Error loading analytics page:', error);
  }
}

// Update greeting prefix
document.querySelector('.greeting-prefix').textContent = getGreeting() + ',';

// ============ PAGE NAVIGATION ============

const pages = {
  dashboard: { title: 'Dashboard', subtitle: 'Overview of your Warp AI automation' },
  queries: { title: 'Query History', subtitle: 'View all AI interactions and conversations' }
};

// Navigate between pages
function navigateToPage(pageName) {
  // Hide all pages
  document.querySelectorAll('.page-content').forEach(page => {
    page.style.display = 'none';
  });
  
  // Show selected page
  const pageElement = document.getElementById(`${pageName}-page`);
  if (pageElement) {
    pageElement.style.display = 'block';
  }
  
  // Update header
  if (pages[pageName]) {
    document.getElementById('page-title').textContent = pages[pageName].title;
    document.getElementById('page-subtitle').textContent = pages[pageName].subtitle;
  }
  
  // Update active nav item
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.remove('active');
  });
  document.querySelector(`[data-page="${pageName}"]`)?.classList.add('active');
  
  // Load data for specific pages
  if (pageName === 'queries') {
    loadQueryHistory();
  } else if (pageName === 'dashboard') {
    loadDashboardData();
  }
}

// Handle nav clicks
document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', (e) => {
    e.preventDefault();
    const pageName = item.getAttribute('data-page');
    navigateToPage(pageName);
  });
});

// ============ EXPORT & BACKUP FUNCTIONALITY ============

// Show notification helper function
function showNotification(message, backgroundColor = '#22c55e') {
  const notification = document.createElement('div');
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${backgroundColor};
    color: white;
    padding: 0.75rem 1.5rem;
    border-radius: 0.5rem;
    font-family: 'Khand', sans-serif;
    font-weight: 600;
    z-index: 10000;
    animation: slideIn 0.3s ease;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  `;
  document.body.appendChild(notification);
  setTimeout(() => notification.remove(), 3000);
}

// Copy to clipboard function (global)
window.copyToClipboard = (text) => {
  navigator.clipboard.writeText(text).then(() => {
    showNotification('Copied!');
  }).catch(err => {
    console.error('Copy failed:', err);
    alert('Failed to copy');
  });
};

// Auto-backup to fixed location
async function autoBackupHistory() {
  try {
    if (!window.allQueries || window.allQueries.length === 0) {
      return;
    }
    
    // Get current user email
    let userEmail = 'unknown';
    try {
      const userInfo = await window.warpAPI.getUserInfo();
      userEmail = userInfo.email || 'unknown';
    } catch (e) {
      console.log('Could not get user email');
    }
    
    const result = await window.warpAPI.autoBackupHistory(window.allQueries, userEmail);
    
    if (result.success) {
      const accountInfo = result.email ? `[${result.email}]` : '';
      
      if (result.skipped) {
        // No new data
        console.log(`${result.message} - ${result.queryCount} queries (unchanged)`);
      } else {
        // Data changed - replaced or created
        const actionText = result.action === 'replaced' 
          ? `${accountInfo} Replaced backup: ${result.queryCount} queries` 
          : `${accountInfo} Created new backup: ${result.queryCount} queries`;
        
        console.log(`${actionText} at: ${result.path}`);
      }
    } else {
      console.error('Auto-backup failed:', result.error);
    }
  } catch (error) {
    console.error('Auto-backup failed:', error);
  }
}

// Export full query history to JSON file (manual download)
document.getElementById('export-history-btn').addEventListener('click', () => {
  if (!window.allQueries || window.allQueries.length === 0) {
    alert('No query history available to export!');
    return;
  }
  
  const dataStr = JSON.stringify(window.allQueries, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  
  const downloadLink = document.createElement('a');
  downloadLink.href = URL.createObjectURL(dataBlob);
  downloadLink.download = `warp-query-history-${new Date().toISOString().split('T')[0]}.json`;
  downloadLink.click();
  
  // Also trigger auto-backup
  autoBackupHistory();
});

// Backup entire database
document.getElementById('backup-database-btn').addEventListener('click', async () => {
  try {
    const result = await window.warpAPI.backupDatabase(window.allQueries || []);
    
    if (result.success) {
      alert(`Full backup created!\n\nLocation: ${result.path}\n\nIncludes:\n- warp.sqlite (Warp database)\n- accounts.db (Your accounts)\n- query-history.json (Readable history)`);
    } else {
      alert('Backup failed: ' + result.error);
    }
  } catch (error) {
    console.error('Backup failed:', error);
    alert('Backup failed: ' + error.message);
  }
});

// Restore latest backup
document.getElementById('restore-backup-btn').addEventListener('click', async () => {
  // Confirm with user
  const confirmed = confirm(
    '⚠️ WARNING: This will REPLACE your current Warp database!\n\n' +
    'Your current data will be backed up as a safety copy.\n' +
    'The app will restore from your LATEST backup.\n\n' +
    'Make sure Warp is CLOSED before proceeding.\n\n' +
    'Continue with restore?'
  );
  
  if (!confirmed) {
    return;
  }
  
  try {
    // Get current user email
    let userEmail = 'unknown';
    try {
      const userInfo = await window.warpAPI.getUserInfo();
      userEmail = userInfo.email || 'unknown';
    } catch (e) {
      console.log('Could not get user email');
    }
    
    const result = await window.warpAPI.quickRestoreBackup(userEmail);
    
    if (result.success) {
      alert(
        `✓ Backup Restored Successfully!\n\n` +
        `Restored from: ${result.backupUsed}\n` +
        `Safety backup saved at: ${result.safetyBackup}\n\n` +
        `Please RESTART Warp to see your restored data!`
      );
      
      // Reload dashboard data
      setTimeout(() => {
        loadDashboardData();
      }, 1000);
    } else {
      alert('Restore failed: ' + result.error);
    }
  } catch (error) {
    console.error('Restore failed:', error);
    alert('Restore failed: ' + error.message);
  }
});

// Set initial greeting before async load
document.getElementById('greeting-name').textContent = 'User!';

// Initialize dashboard
loadDashboardData();

// Auto-refresh every 30 seconds
setInterval(loadDashboardData, 30000);
