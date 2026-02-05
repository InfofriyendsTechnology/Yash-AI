# Build Instructions

## Prerequisites

1. **Create icon.ico file**:
   - Go to https://convertico.com/
   - Upload `LOGO.png`
   - Download as `icon.ico`
   - Save in project root (same folder as package.json)

2. **For Mac icon** (optional):
   - Go to https://cloudconvert.com/png-to-icns
   - Upload `LOGO.png`
   - Download as `icon.icns`
   - Save in project root

## Build Commands

### Windows Installer (.exe)
```bash
npm run build:electron
```

This creates:
- `dist/Yash AI Warp Manager Setup 1.0.0.exe` (single-click installer, ~70MB)

### Portable ZIP (all files)
```bash
npm run build:dir
```

This creates:
- `dist/win-unpacked/` (folder with all files)

### Mac DMG (on Mac only)
```bash
npm run build
```

## About Windows Warning

The "Windows protected your PC" warning appears because the app is **not code signed**.

### To remove the warning:
1. **Get a code signing certificate** ($100-400/year from DigiCert, Sectigo, etc.)
2. **Sign the installer** using the certificate
3. **Alternative**: Users can click "More info" → "Run anyway"

### For free distribution:
- The warning is normal for unsigned apps
- Users can safely bypass it
- Add note in README about this

## File Sizes

- **Installer EXE**: ~70-80MB (includes Electron + Chrome)
- **Portable ZIP**: ~135MB (uncompressed)
- **Mac DMG**: ~80-90MB

Electron apps are large because they include the entire Chromium browser.
