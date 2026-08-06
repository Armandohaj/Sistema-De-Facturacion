import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { join } from 'node:path'
import { electronApp, is, optimizer } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 700,
    show: false,
    autoHideMenuBar: true,

    ...(process.platform === 'linux' ? { icon } : {}),

    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),

      // Configuración de seguridad
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  // Los enlaces externos se abren en el navegador,
  // no dentro de la aplicación.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url)

    return {
      action: 'deny'
    }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    void mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    void mainWindow.loadFile(
      join(__dirname, '../renderer/index.html')
    )
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.pos.tienda')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  /*
   * Primer canal IPC.
   *
   * React solicitará esta información mediante el preload.
   */
  ipcMain.handle('app:get-info', () => {
    return {
      name: app.getName(),
      version: app.getVersion(),
      platform: process.platform
    }
  })

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})