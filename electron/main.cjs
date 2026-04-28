const { app, BrowserWindow, shell } = require('electron')
const path = require('node:path')

const devServerUrl = process.env.ELECTRON_START_URL

function createWindow() {
  const win = new BrowserWindow({
    width: 430,
    height: 860,
    minWidth: 360,
    minHeight: 640,
    backgroundColor: '#0b1220',
    title: 'Zoo Empire',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url) || url.startsWith('mailto:')) {
      shell.openExternal(url)
    }

    return { action: 'deny' }
  })

  if (devServerUrl) {
    win.loadURL(devServerUrl)
  } else {
    win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  }
}

app.whenReady().then(() => {
  app.setAppUserModelId('com.zooempire.game')
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
