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

export type IpcResult<T> =
  | {
      success: true
      data: T
    }
  | {
      success: false
      message: string
    }

export interface PosApi {
  app: {
    getInfo: () => Promise<AppInfo>
  }

  database: {
    getStatus: () => Promise<DatabaseStatus>
  }

  categories: {
    list: () => Promise<
      IpcResult<Category[]>
    >

    create: (
      input: CategoryInput
    ) => Promise<IpcResult<Category>>

    update: (
      input: UpdateCategoryInput
    ) => Promise<IpcResult<Category>>

    setActive: (
      id: number,
      active: boolean
    ) => Promise<IpcResult<Category>>
  }
}

declare global {
  interface Window {
    pos: PosApi
  }
}