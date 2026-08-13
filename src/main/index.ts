import {
  app,
  BrowserWindow,
  ipcMain
} from 'electron'

import {
  registerSalesIpc
} from './ipc/sales'

import {
  registerUsersIpc
} from './ipc/users'

import {
  join
} from 'node:path'

import {
  electronApp,
  is,
  optimizer
} from '@electron-toolkit/utils'

import icon
  from '../../resources/icon.png?asset'

import {
  closeDatabase,
  initializeDatabase
} from './database/connection'

import {
  registerAuthIpc
} from './ipc/auth'

import {
  registerCategoriesIpc
} from './ipc/categories'

import {
  registerDatabaseIpc
} from './ipc/database'

import {
  registerInventoryIpc
} from './ipc/inventory'

import {
  registerReportsIpc
} from './ipc/reports'

import {
  registerCashClosingIpc
} from './ipc/cash-closing'

function createWindow(): void {
  const mainWindow =
    new BrowserWindow({
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

  mainWindow.once(
    'ready-to-show',
    () => {
      mainWindow.show()
    }
  )

  /*
   * Nuestro POS no necesita abrir
   * ventanas externas.
   */
  mainWindow.webContents
    .setWindowOpenHandler(
      () => {
        return {
          action: 'deny'
        }
      }
    )

  if (
    is.dev &&
    process.env[
      'ELECTRON_RENDERER_URL'
    ]
  ) {
    void mainWindow.loadURL(
      process.env[
        'ELECTRON_RENDERER_URL'
      ]
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

function registerAppIpc():
void {
  ipcMain.removeHandler(
    'app:get-info'
  )

  ipcMain.handle(
    'app:get-info',
    () => {
      return {
        name:
          app.getName(),

        version:
          app.getVersion(),

        platform:
          process.platform
      }
    }
  )
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId(
    'com.pos.tienda'
  )

  app.on(
    'browser-window-created',

    (_, window) => {
      optimizer.watchWindowShortcuts(
        window
      )
    }
  )

  initializeDatabase()

  registerAppIpc()
  registerAuthIpc()
  registerDatabaseIpc()
  registerCategoriesIpc()
  registerInventoryIpc()
  registerUsersIpc()
  registerSalesIpc()
  registerReportsIpc()
  registerCashClosingIpc()

  createWindow()

  app.on(
    'activate',
    () => {
      if (
        BrowserWindow
          .getAllWindows()
          .length === 0
      ) {
        createWindow()
      }
    }
  )
})

app.on(
  'before-quit',
  () => {
    closeDatabase()
  }
)

app.on(
  'window-all-closed',
  () => {
    if (
      process.platform !== 'darwin'
    ) {
      app.quit()
    }
  }
)