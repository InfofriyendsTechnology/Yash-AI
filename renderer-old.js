// Load initial data
async function loadWarpData() {
  try {
    // Get credits info
    const credits = await window.warpAPI.getCredits();
    document.getElementById('credits-value').textContent = credits.credits || 'N/A';
    
    // Get user info
    try {
      const userInfo = await window.warpAPI.getUserInfo();
      const email = userInfo.email || 'Not logged in';
      document.getElementById('account-email').textContent = email;
      
      // Get total AI queries made
      const convData = await window.warpAPI.getConversations();
      document.getElementById('requests-value').textContent = convData.count || 0;
    } catch (err) {
      console.error('Error loading user info:', err);
      document.getElementById('account-email').textContent = 'Unknown';
    }

    // Update status
    const statusEl = document.getElementById('status');
    statusEl.textContent = '✓ Connected to Warp';
    statusEl.className = 'status connected';
    
  } catch (error) {
    console.error('Error loading Warp data:', error);
    const statusEl = document.getElementById('status');
    statusEl.textContent = '✗ Connection Error';
    statusEl.className = 'status error';
  }
}

// Launch Warp AI button
document.getElementById('launch-warp-btn').addEventListener('click', async () => {
  try {
    await window.warpAPI.launchWarp();
    alert('Warp AI launched!');
  } catch (error) {
    alert('Failed to launch Warp AI: ' + error.message);
  }
});

// Refresh button
document.getElementById('refresh-btn').addEventListener('click', () => {
  loadWarpData();
});

// Initialize on load
loadWarpData();

// Refresh data every 10 seconds
setInterval(() => {
  loadWarpData();
}, 10000);
