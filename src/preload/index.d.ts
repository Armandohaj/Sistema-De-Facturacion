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


export interface SalesPeriodSummary {
  salesCount: number
  total: number
}

export interface ProductSalesSummary {
  categoryId: number
  categoryName: string
  quantity: number
  total: number
}

export interface PaymentMethodSummary {
  cash: number
  card: number
  sinpe: number
}

export interface DailySalesPoint {
  date: string
  salesCount: number
  total: number
}

export interface MonthlySalesPoint {
  month: string
  salesCount: number
  total: number
}

export interface ReportSummary {
  today: SalesPeriodSummary
  currentMonth: SalesPeriodSummary
  paymentMethods: PaymentMethodSummary
  mostSold: ProductSalesSummary | null
  leastSold: ProductSalesSummary | null
  dailyFlow: DailySalesPoint[]
  monthlyHistory: MonthlySalesPoint[]
}


export interface MonthlyReport {
  month: string
  completedSalesCount: number
  canceledSalesCount: number
  total: number
  paymentMethods: PaymentMethodSummary
  mostSold: ProductSalesSummary | null
  leastSold: ProductSalesSummary | null
  dailyFlow: DailySalesPoint[]
}

export interface CashClosingPaymentSummary {
  cash: number
  card: number
  sinpe: number
}

export interface DailyProductSummary {
  categoryId: number
  categoryName: string
  quantity: number
  total: number
}

export interface DailyClosingSummary {
  date: string

  completedSalesCount: number
  canceledSalesCount: number

  total: number

  paymentMethods: CashClosingPaymentSummary

  mostSold: DailyProductSummary | null
  leastSold: DailyProductSummary | null
}

export interface CashClosing {
  id: number
  businessDate: string

  completedSalesCount: number
  canceledSalesCount: number

  salesTotal: number

  cashSales: number
  cardSales: number
  sinpeSales: number

  openingCash: number
  expectedCash: number
  countedCash: number
  cashDifference: number

  closedBy: number
  closedByUsername: string
  closedAt: string
}

export interface CashClosingDay {
  summary: DailyClosingSummary
  closing: CashClosing | null
}

export interface CreateCashClosingInput {
  date: string
  openingCash: number
  countedCash: number
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

  reports: {
  getSummary: () => Promise<
    IpcResult<ReportSummary>
  >

  getMonthlyReport: (
    month: string
  ) => Promise<
    IpcResult<MonthlyReport>
  >
}

cashClosing: {
  getDay: (
    date: string
  ) => Promise<
    IpcResult<CashClosingDay>
  >

  create: (
    input: CreateCashClosingInput
  ) => Promise<
    IpcResult<CashClosing>
  >
}

}

declare global {
  interface Window {
    pos: PosApi
  }
}