import {
  contextBridge,
  ipcRenderer
} from 'electron'

export interface AppInfo {
  name: string
  version: string
  platform: string
}

export interface DatabaseStatus {
  connected: boolean
  migrationVersion: number
  tables: string[]
  path: string
}

export interface Category {
  id: number
  name: string
  price: number
  stock: number
  discountPercent: number
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface CategoryInput {
  name: string
  price: number
  stock: number
  discountPercent: number
}

export interface UpdateCategoryInput
  extends CategoryInput {
  id: number
}

export interface IpcResult<T> {
  success: boolean
  data?: T
  message?: string
}

const posApi = {
  app: {
    getInfo: (): Promise<AppInfo> => {
      return ipcRenderer.invoke(
        'app:get-info'
      )
    }
  },

  database: {
    getStatus:
      (): Promise<DatabaseStatus> => {
        return ipcRenderer.invoke(
          'database:get-status'
        )
      }
  },

  categories: {
    list:
      (): Promise<IpcResult<Category[]>> => {
        return ipcRenderer.invoke(
          'categories:list'
        )
      },

    create: (
      input: CategoryInput
    ): Promise<IpcResult<Category>> => {
      return ipcRenderer.invoke(
        'categories:create',
        input
      )
    },

    update: (
      input: UpdateCategoryInput
    ): Promise<IpcResult<Category>> => {
      return ipcRenderer.invoke(
        'categories:update',
        input
      )
    },

    setActive: (
      id: number,
      active: boolean
    ): Promise<IpcResult<Category>> => {
      return ipcRenderer.invoke(
        'categories:set-active',
        {
          id,
          active
        }
      )
    }
  }
}

contextBridge.exposeInMainWorld(
  'pos',
  posApi
)