import {
  app,
  BrowserWindow,
  ipcMain,
  shell
} from 'electron'

import { join } from 'node:path'

import {
  electronApp,
  is,
  optimizer
} from '@electron-toolkit/utils'

import icon from '../../resources/icon.png?asset'

import {
  closeDatabase,
  initializeDatabase
} from './database/connection'

import { registerCategoriesIpc } from './ipc/categories'
import { registerDatabaseIpc } from './ipc/database'

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,

    minWidth: 1024,
    minHeight: 700,

    show: false,
    autoHideMenuBar: true,

    ...(process.platform === 'linux'
      ? { icon }
      : {}),

    webPreferences: {
      preload: join(
        __dirname,
        '../preload/index.js'
      ),

      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler(
    ({ url }) => {
      try {
        const parsedUrl = new URL(url)

        if (
          parsedUrl.protocol === 'https:' ||
          parsedUrl.protocol === 'http:'
        ) {
          void shell.openExternal(url)
        }
      } catch (error: unknown) {
        console.error(
          '[window] Invalid external URL:',
          error
        )
      }

      return {
        action: 'deny'
      }
    }
  )

  if (
    is.dev &&
    process.env['ELECTRON_RENDERER_URL']
  ) {
    void mainWindow.loadURL(
      process.env['ELECTRON_RENDERER_URL']
    )
  } else {
    void mainWindow.loadFile(
      join(
        __dirname,
        '../renderer/index.html'
      )
    )
  }
}

function registerAppIpc(): void {
  ipcMain.removeHandler('app:get-info')

  ipcMain.handle('app:get-info', () => {
    return {
      name: app.getName(),
      version: app.getVersion(),
      platform: process.platform
    }
  })
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId(
    'com.pos.tienda'
  )

  app.on(
    'browser-window-created',
    (_, window) => {
      optimizer.watchWindowShortcuts(window)
    }
  )

  initializeDatabase()

  registerAppIpc()
  registerDatabaseIpc()
  registerCategoriesIpc()

  createWindow()

  app.on('activate', () => {
    if (
      BrowserWindow.getAllWindows().length === 0
    ) {
      createWindow()
    }
  })
})

app.on('before-quit', () => {
  closeDatabase()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})