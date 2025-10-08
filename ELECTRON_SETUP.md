# Baranex Electron Desktop App Setup

## ✅ Installation Complete

All Electron dependencies and configuration files have been installed and created.

## 📋 Required Manual Steps

### 1. Add NPM Scripts to package.json

Add these scripts to your `package.json` file:

```json
{
  "scripts": {
    "electron:dev": "cross-env ELECTRON=true vite",
    "electron:build": "cross-env ELECTRON=true vite build && electron-builder",
    "electron:pack": "cross-env ELECTRON=true vite build && electron-builder --dir",
    "electron:dist:win": "cross-env ELECTRON=true vite build && electron-builder --win",
    "electron:dist:mac": "cross-env ELECTRON=true vite build && electron-builder --mac",
    "electron:dist:linux": "cross-env ELECTRON=true vite build && electron-builder --linux"
  }
}
```

### 2. Install cross-env (if needed)

```bash
npm install --save-dev cross-env
```

### 3. Create Application Icons

You need to create icons for each platform:

#### Windows (`build/icon.ico`)
- Size: 256x256 pixels
- Format: .ico
- Tool: Use online converters or GIMP

#### macOS (`build/icon.icns`)
- Size: 512x512@2x pixels
- Format: .icns
- Tool: Use `iconutil` on Mac or online converters

#### Linux (`build/icon.png`)
- Size: 512x512 pixels
- Format: .png

**Quick tip:** You can use your existing logo from `public/` and convert it using online tools like:
- https://cloudconvert.com/png-to-ico
- https://cloudconvert.com/png-to-icns

### 4. Optional: macOS Entitlements

For macOS builds, create `build/entitlements.mac.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>com.apple.security.cs.allow-unsigned-executable-memory</key>
    <true/>
    <key>com.apple.security.cs.allow-jit</key>
    <true/>
</dict>
</plist>
```

## 🚀 Running the Desktop App

### Development Mode

```bash
# Start the development server
npm run dev

# In another terminal, start Electron
npm run electron:dev
```

### Build for Production

```bash
# Build for all platforms (requires proper setup on each OS)
npm run electron:build

# Build for specific platform
npm run electron:dist:win    # Windows
npm run electron:dist:mac    # macOS
npm run electron:dist:linux  # Linux
```

### Build without creating installer (for testing)

```bash
npm run electron:pack
```

## 📦 Output

Built applications will be in `release/{version}/` directory:

- **Windows**: `Baranex-Setup-{version}.exe`
- **macOS**: `Baranex-{version}-mac.dmg` and `.zip`
- **Linux**: `Baranex-{version}-linux.AppImage`, `.deb`, `.rpm`

## 🔧 Electron Features Implemented

### Core Features
✅ Main process with window management
✅ Preload script for secure IPC
✅ Custom application menu (File, Edit, View, Help)
✅ Deep linking support (`baranex://` protocol)
✅ External link handling (opens in default browser)
✅ DevTools in development mode
✅ Platform detection

### Security
✅ Context isolation enabled
✅ Node integration disabled
✅ Sandbox enabled
✅ Secure IPC through context bridge

### Window Features
✅ Default size: 1280x720
✅ Custom icon
✅ Auto-hide menu bar
✅ Proper window lifecycle management

## 🔐 Authentication in Electron

The app is configured to handle Supabase OAuth redirects:

1. Custom protocol: `baranex://`
2. Deep link handler in main process
3. Auth callback listener in preload script

To use OAuth in Electron, update your Supabase redirect URL to:
```
baranex://auth/callback
```

## 📝 Configuration Files Created

- ✅ `electron/main.ts` - Main Electron process
- ✅ `electron/preload.ts` - Preload script for IPC
- ✅ `electron-builder.json5` - Build configuration
- ✅ `vite.config.ts` - Updated with Electron plugin
- ✅ `build/` - Icon directory (add your icons here)

## 🌐 Multi-Platform Support

Your app now supports:
- 🌍 Web (existing)
- 📱 Mobile via Capacitor (existing)
- 💻 Windows Desktop (new)
- 🍎 macOS Desktop (new)
- 🐧 Linux Desktop (new)

All using the same React codebase!

## ⚙️ Advanced Configuration

### Auto-Updates

To enable auto-updates, update `electron-builder.json5`:

```json5
{
  publish: {
    provider: "github",
    owner: "your-github-username",
    repo: "baranex"
  }
}
```

Then in your main process, add electron-updater integration.

### Code Signing

#### Windows
- Requires code signing certificate
- Set `WIN_CSC_LINK` and `WIN_CSC_KEY_PASSWORD` environment variables

#### macOS
- Requires Apple Developer account
- Set `APPLE_ID`, `APPLE_ID_PASSWORD`, and signing certificate

### Environment Variables

For production builds, set:
```bash
# GitHub token for releases
GH_TOKEN=your_github_token

# Windows code signing
WIN_CSC_LINK=path_to_certificate.pfx
WIN_CSC_KEY_PASSWORD=your_password

# macOS code signing
APPLE_ID=your_apple_id@email.com
APPLE_ID_PASSWORD=app_specific_password
```

## 🐛 Troubleshooting

### Build fails on macOS
- Ensure Xcode Command Line Tools are installed: `xcode-select --install`

### Build fails on Windows
- Install Windows Build Tools: `npm install --global windows-build-tools`

### Icons not showing
- Ensure icon files are in `build/` directory
- Check icon file names match configuration

### App won't start
- Check console for errors
- Ensure all dependencies are installed
- Try: `rm -rf node_modules && npm install`

## 📚 Resources

- [Electron Documentation](https://www.electronjs.org/docs/latest/)
- [electron-builder Documentation](https://www.electron.build/)
- [Vite Plugin Electron](https://github.com/electron-vite/vite-plugin-electron)

## 🎉 Next Steps

1. Add scripts to `package.json` (see above)
2. Create application icons in `build/` directory
3. Install `cross-env`: `npm install --save-dev cross-env`
4. Test in development: `npm run electron:dev`
5. Build installers: `npm run electron:dist:win` (or your platform)

Your desktop app is ready to go! 🚀
