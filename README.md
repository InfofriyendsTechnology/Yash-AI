# Yash AI - Warp Query History Manager

**Yash AI** is a desktop application that helps you track, backup, and manage your Warp AI query history. Built with Electron.js, it provides a clean interface to view your AI interactions and automatically backs up your data.

## Features

- **Dashboard Overview**: View total queries, conversations, and comprehensive database statistics
- **Query History**: Browse all your Warp AI queries with conversation IDs, timestamps, and input previews
- **Automatic Backup**: Query history is automatically backed up to your Desktop when you close the app
- **Export & Restore**: Manually export full history or restore from previous backups
- **Database Stats**: See detailed breakdowns of terminal commands, output blocks, model usage, and more
- **Clean Interface**: Simple 2-page design focused on what matters

## How It Works

Yash AI connects to your local Warp database and reads your AI query history. All data stays on your machine - nothing is uploaded to external servers.

**Database Location**: `C:\Users\YOUR_USERNAME\AppData\Local\warp\Warp\data\warp.sqlite`

## Backup System

- **Auto-backup on close**: History saved to `Desktop/Yash AI History/[your-email]/`
- **Manual backup**: Create timestamped database copies at `Desktop/Yash AI Backups/`
- **Quick restore**: One-click restoration from latest backup

## Installation

1. Download the latest release from the [Releases](https://github.com/YOUR_USERNAME/yash-ai-warp-manager/releases) page
2. Run the installer (.exe file)
3. Launch Yash AI from your desktop

## Development

```bash
# Install dependencies
 npm install

# Run in development mode
npm start

# Build for production
npm run build
```

## Tech Stack

- **Electron.js** - Desktop app framework
- **SQLite** - Local database access
- **Node.js** - Backend runtime
- **Vanilla JavaScript** - Frontend logic

## Requirements

- Windows 10/11
- Warp AI installed on your system

## License

MIT License - feel free to use and modify!

## Disclaimer

This is an independent tool and is not affiliated with or endorsed by Warp. It simply reads your local Warp database to help you manage your query history.

---

Built with ❤️ by Yash
