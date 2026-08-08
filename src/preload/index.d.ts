export type UserRole = 'ADMIN' | 'EMPLOYEE'

export type PaymentMethod = 'CASH' | 'CARD' | 'SINPE'

export type SaleStatus = 'COMPLETED' | 'CANCELED'

export interface AuthUser {
  id: number
  username: string
  role: UserRole
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

export interface UpdateCategoryInput extends CategoryInput {
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

export interface SaleDetailItem {
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

export interface SaleDetail extends SaleHistoryItem {
  items: SaleDetailItem[]
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

  auth: {
    getStatus: () => Promise<IpcResult<AuthStatus>>

    setup: (
      input: SetupAdminInput
    ) => Promise<IpcResult<AuthUser>>

    login: (
      input: LoginInput
    ) => Promise<IpcResult<AuthUser>>

    logout: () => Promise<IpcResult<null>>
  }

  database: {
    getStatus: () => Promise<DatabaseStatus>
  }

  categories: {
    list: () => Promise<IpcResult<Category[]>>

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

  inventory: {
    listRecent: (
      limit?: number
    ) => Promise<IpcResult<InventoryMovement[]>>
  }

  users: {
    list: () => Promise<IpcResult<UserRecord[]>>

    create: (
      input: CreateUserInput
    ) => Promise<IpcResult<UserRecord>>

    update: (
      input: UpdateUserInput
    ) => Promise<IpcResult<UserRecord>>
  }

  sales: {
    create: (
      input: CreateSaleInput
    ) => Promise<IpcResult<Sale>>

    listHistory: (
      filters?: SaleHistoryFilters
    ) => Promise<IpcResult<SaleHistoryItem[]>>

    getDetail: (
      saleId: number
    ) => Promise<IpcResult<SaleDetail>>

    cancel: (
      saleId: number
    ) => Promise<IpcResult<SaleDetail>>
  }
}

declare global {
  interface Window {
    pos: PosApi
  }
}