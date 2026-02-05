const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

/**
 * Extract credit info from Warp desktop application
 * Methods:
 * 1. Read Warp window title/UI text using Windows automation
 * 2. Parse Warp's log files
 * 3. Monitor Warp's network requests
 * 4. Read Warp's in-memory data
 */

class WarpDesktopReader {
  
  /**
   * Method 1: Try to read Warp window UI text using PowerShell
   */
  async readWarpWindowText() {
    try {
      console.log('🔍 Reading Warp window UI...');
      
      // PowerShell script to get Warp window automation elements
      const psScript = `
        Add-Type -AssemblyName UIAutomationClient
        Add-Type -AssemblyName UIAutomationTypes
        
        $warpProcess = Get-Process -Name "warp" -ErrorAction SilentlyContinue
        if ($warpProcess) {
          $automation = [System.Windows.Automation.AutomationElement]::RootElement
          $condition = New-Object System.Windows.Automation.PropertyCondition(
            [System.Windows.Automation.AutomationElement]::NameProperty,
            "Warp"
          )
          $warpWindow = $automation.FindFirst([System.Windows.Automation.TreeScope]::Children, $condition)
          
          if ($warpWindow) {
            # Try to find credit text in the window
            $textCondition = New-Object System.Windows.Automation.PropertyCondition(
              [System.Windows.Automation.AutomationElement]::ControlTypeProperty,
              [System.Windows.Automation.ControlType]::Text
            )
            $textElements = $warpWindow.FindAll([System.Windows.Automation.TreeScope]::Descendants, $textCondition)
            
            foreach ($element in $textElements) {
              $text = $element.Current.Name
              if ($text -match "credit") {
                Write-Output "FOUND: $text"
              }
            }
          }
        }
      `;
      
      const { stdout } = await execPromise(`powershell -Command "${psScript.replace(/"/g, '\\"')}"`);
      return { success: true, data: stdout };
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Method 2: Parse Warp's log files for credit information
   */
  async parseWarpLogs() {
    try {
      console.log('📄 Parsing Warp log files...');
      
      const logPath = `${process.env.LOCALAPPDATA}\\warp\\Warp\\data\\logs`;
      
      // Read recent log files
      const { stdout } = await execPromise(
        `powershell -Command "Get-ChildItem '${logPath}' -Filter *.log | Sort-Object LastWriteTime -Descending | Select-Object -First 5 | ForEach-Object { Get-Content $_.FullName | Select-String -Pattern 'credit|usage|limit' -CaseSensitive }"`
      );
      
      // Parse credit info from logs
      const creditMatches = stdout.match(/(\d+)\s*\/\s*(\d+)|(\d+)\s*credit/gi);
      
      if (creditMatches) {
        return { success: true, found: true, matches: creditMatches };
      }
      
      return { success: true, found: false };
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Method 3: Monitor Warp's network traffic to intercept API responses
   */
  async monitorWarpNetwork() {
    try {
      console.log('🌐 Monitoring Warp network traffic...');
      
      // Get Warp process ID
      const { stdout: pidOutput } = await execPromise(
        `powershell -Command "Get-Process -Name 'warp' -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Id"`
      );
      
      const pid = pidOutput.trim();
      if (!pid) {
        return { success: false, error: 'Warp is not running' };
      }
      
      // Use netstat to see Warp's connections
      const { stdout: netstat } = await execPromise(
        `netstat -ano | findstr ${pid}`
      );
      
      // Look for warp.dev API connections
      const connections = netstat.split('\n').filter(line => 
        line.includes('warp.dev') || line.includes('api')
      );
      
      return { success: true, pid, connections };
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Method 4: Read Warp's SQLite database for recent API responses
   */
  async readWarpDatabase(warpDb) {
    try {
      console.log('💾 Reading Warp database for credit info...');
      
      return new Promise((resolve) => {
        // Try to find any cached API response data
        warpDb.all(
          "SELECT name FROM sqlite_master WHERE type='table'",
          [],
          (err, tables) => {
            if (err) {
              resolve({ success: false, error: err.message });
              return;
            }
            
            // Look for tables that might contain credit info
            const relevantTables = tables.filter(t => 
              t.name.toLowerCase().includes('user') ||
              t.name.toLowerCase().includes('credit') ||
              t.name.toLowerCase().includes('usage') ||
              t.name.toLowerCase().includes('api')
            );
            
            resolve({ success: true, tables: relevantTables.map(t => t.name) });
          }
        );
      });
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Method 5: Read Warp's settings/config files
   */
  async readWarpConfig() {
    try {
      console.log('⚙️ Reading Warp config files...');
      
      const configPath = `${process.env.LOCALAPPDATA}\\warp\\Warp\\data`;
      
      // List all files in Warp data directory
      const { stdout } = await execPromise(
        `powershell -Command "Get-ChildItem '${configPath}' -File | Select-Object Name, Length, LastWriteTime | ConvertTo-Json"`
      );
      
      const files = JSON.parse(stdout);
      
      return { success: true, files };
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Master function to try all methods
   */
  async extractCredits(warpDb) {
    const results = {
      windowText: await this.readWarpWindowText(),
      logs: await this.parseWarpLogs(),
      network: await this.monitorWarpNetwork(),
      database: await this.readWarpDatabase(warpDb),
      config: await this.readWarpConfig()
    };
    
    return results;
  }
}

module.exports = { WarpDesktopReader };
