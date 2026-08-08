import {
  contextBridge,
  ipcRenderer
} from 'electron'

export type UserRole =
  | 'ADMIN'
  | 'EMPLOYEE'

export interface AuthUser {
  id: number
  username: string
  role: UserRole
}

export type PaymentMethod =
  | 'CASH'
  | 'CARD'
  | 'SINPE'

export type SaleStatus =
  | 'COMPLETED'
  | 'CANCELED'

export interface CreateSaleItemInput {
  categoryId: number
  quantity: number
}

export interface CreateSaleInput {
  paymentMethod: PaymentMethod
  items: CreateSaleItemInput[]
}

export interface SaleItem {
  id: number
  categoryId: number
  categoryName: string
  unitPrice: number
  discountPercent: number
  quantity: number
  subtotal: number
  discountTotal: number
  total: number
}

export interface Sale {
  id: number
  status: SaleStatus
  paymentMethod: PaymentMethod
  subtotal: number
  discountTotal: number
  total: number
  createdBy: number
  createdByUsername: string
  createdAt: string
  items: SaleItem[]
}

export interface SaleHistoryFilters {
  saleId?: number
  date?: string
}

export interface SaleHistoryItem {
  id: number
  status: SaleStatus
  paymentMethod: PaymentMethod
  subtotal: number
  discountTotal: number
  total: number
  createdBy: number
  createdByUsername: string
  createdAt: string
  canceledAt: string | null
  canceledBy: number | null
  canceledByUsername: string | null
}

export interface SaleDetail
  extends SaleHistoryItem {
  items: SaleItem[]
}

export interface AuthStatus {
  setupRequired: boolean
  user: AuthUser | null
}

export interface SetupAdminInput {
  username: string
  password: string
}

export interface LoginInput {
  username: string
  password: string
}

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

export interface InventoryMovement {
  id: number
  categoryId: number
  categoryName: string

  movementType:
    | 'INITIAL_STOCK'
    | 'MANUAL_ADDITION'
    | 'MANUAL_REMOVAL'
    | 'SALE'
    | 'SALE_CANCELLATION'

  quantityChange: number
  stockBefore: number
  stockAfter: number
  note: string | null
  createdAt: string
}

export interface UserRecord {
  id: number
  username: string
  role: UserRole
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateUserInput {
  username: string
  password: string
  role: UserRole
}

export interface UpdateUserInput {
  id: number
  username: string
  password?: string
  role: UserRole
  active: boolean
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

const posApi = {
  app: {
    getInfo: (): Promise<AppInfo> => {
      return ipcRenderer.invoke(
        'app:get-info'
      )
    }
  },

  auth: {
    getStatus: (): Promise<
      IpcResult<AuthStatus>
    > => {
      return ipcRenderer.invoke(
        'auth:get-status'
      )
    },

    setup: (
      input: SetupAdminInput
    ): Promise<
      IpcResult<AuthUser>
    > => {
      return ipcRenderer.invoke(
        'auth:setup',
        input
      )
    },

    login: (
      input: LoginInput
    ): Promise<
      IpcResult<AuthUser>
    > => {
      return ipcRenderer.invoke(
        'auth:login',
        input
      )
    },

    logout: (): Promise<
      IpcResult<null>
    > => {
      return ipcRenderer.invoke(
        'auth:logout'
      )
    }
  },

  database: {
    getStatus: (): Promise<
      DatabaseStatus
    > => {
      return ipcRenderer.invoke(
        'database:get-status'
      )
    }
  },

  categories: {
    list: (): Promise<
      IpcResult<Category[]>
    > => {
      return ipcRenderer.invoke(
        'categories:list'
      )
    },

    create: (
      input: CategoryInput
    ): Promise<
      IpcResult<Category>
    > => {
      return ipcRenderer.invoke(
        'categories:create',
        input
      )
    },

    update: (
      input: UpdateCategoryInput
    ): Promise<
      IpcResult<Category>
    > => {
      return ipcRenderer.invoke(
        'categories:update',
        input
      )
    },

    setActive: (
      id: number,
      active: boolean
    ): Promise<
      IpcResult<Category>
    > => {
      return ipcRenderer.invoke(
        'categories:set-active',
        {
          id,
          active
        }
      )
    }
  },

  inventory: {
    listRecent: (
      limit = 50
    ): Promise<
      IpcResult<
        InventoryMovement[]
      >
    > => {
      return ipcRenderer.invoke(
        'inventory:list-recent',
        limit
      )
    }
  },

  users: {
    list: (): Promise<
      IpcResult<UserRecord[]>
    > => {
      return ipcRenderer.invoke(
        'users:list'
      )
    },

    create: (
      input: CreateUserInput
    ): Promise<
      IpcResult<UserRecord>
    > => {
      return ipcRenderer.invoke(
        'users:create',
        input
      )
    },

    update: (
      input: UpdateUserInput
    ): Promise<
      IpcResult<UserRecord>
    > => {
      return ipcRenderer.invoke(
        'users:update',
        input
      )
    }
  },

  sales: {
    create: (
      input: CreateSaleInput
    ): Promise<IpcResult<Sale>> => {
      return ipcRenderer.invoke(
        'sales:create',
        input
      )
    },

    listHistory: (
      filters: SaleHistoryFilters = {}
    ): Promise<IpcResult<SaleHistoryItem[]>> => {
      return ipcRenderer.invoke(
        'sales:list-history',
        filters
      )
    },

    getDetail: (
      saleId: number
    ): Promise<IpcResult<SaleDetail>> => {
      return ipcRenderer.invoke(
        'sales:get-detail',
        saleId
      )
    },

    cancel: (
      saleId: number
    ): Promise<IpcResult<SaleDetail>> => {
      return ipcRenderer.invoke(
        'sales:cancel',
        saleId
      )
    }
  }
}

contextBridge.exposeInMainWorld(
  'pos',
  posApi
)