const { BrowserWindow, session } = require('electron');

async function testWarpScraper() {
  console.log('🔍 Testing Warp Dashboard Scraper...');
  
  // Possible Warp URLs to try
  const warpUrls = [
    'https://app.warp.dev/',
    'https://app.warp.dev/settings',
    'https://app.warp.dev/account',
    'https://warp.dev/settings',
    'https://warp.dev/account'
  ];
  
  for (const url of warpUrls) {
    console.log(`\n📡 Trying URL: ${url}`);
    
    const scraperWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      show: true, // Show window so we can see what loads
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      }
    });
    
    try {
      await scraperWindow.loadURL(url);
      
      // Wait for page to load
      await new Promise(r => setTimeout(r, 5000));
      
      // Get page title
      const title = await scraperWindow.webContents.executeJavaScript('document.title');
      console.log(`✅ Page loaded: ${title}`);
      
      // Try to find credit elements
      const result = await scraperWindow.webContents.executeJavaScript(`
        (function() {
          // Get all text content
          const bodyText = document.body.innerText;
          
          // Look for credit-related text
          const creditMatches = bodyText.match(/\\d+\\s*\\/\\s*\\d+\\s*credits?/gi);
          const usageMatches = bodyText.match(/\\d+\\s*credits?\\s*used/gi);
          const remainingMatches = bodyText.match(/\\d+\\s*credits?\\s*remaining/gi);
          
          // Get all elements that might contain credits
          const elements = Array.from(document.querySelectorAll('*')).filter(el => {
            const text = el.textContent.toLowerCase();
            return text.includes('credit') || text.includes('usage') || text.includes('remaining');
          }).map(el => ({
            tag: el.tagName,
            class: el.className,
            text: el.textContent.trim().substring(0, 100)
          }));
          
          return {
            found: creditMatches || usageMatches || remainingMatches,
            creditMatches,
            usageMatches,
            remainingMatches,
            elements: elements.slice(0, 5),
            bodyPreview: bodyText.substring(0, 500)
          };
        })()
      `);
      
      console.log('🔎 Search results:', JSON.stringify(result, null, 2));
      
      // Keep window open for manual inspection
      console.log('⏸️  Window staying open for 10 seconds for inspection...');
      await new Promise(r => setTimeout(r, 10000));
      
      scraperWindow.close();
      
      if (result.found) {
        console.log('🎉 FOUND CREDITS DATA!');
        break;
      }
      
    } catch (error) {
      console.error(`❌ Error loading ${url}:`, error.message);
      scraperWindow.close();
    }
  }
}

module.exports = { testWarpScraper };
