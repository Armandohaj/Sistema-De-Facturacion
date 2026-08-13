import { getDatabase } from '../database/connection'

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

export interface ReportSummary {
  today: SalesPeriodSummary
  currentMonth: SalesPeriodSummary
  paymentMethods: PaymentMethodSummary
  mostSold: ProductSalesSummary | null
  leastSold: ProductSalesSummary | null
  dailyFlow: DailySalesPoint[]
  monthlyHistory: MonthlySalesPoint[]
}

interface SalesPeriodRow {
  salesCount: number
  total: number
}

interface PaymentMethodRow {
  cash: number
  card: number
  sinpe: number
}

interface ProductSalesRow {
  categoryId: number
  categoryName: string
  quantity: number
  total: number
}

interface DailySalesRow {
  date: string
  salesCount: number
  total: number
}

interface MonthlySalesRow {
  month: string
  salesCount: number
  total: number
}

interface CountRow {
  count: number
}

interface FirstSaleRow {
  date: string | null
}

function getCurrentMonthKey(): string {
  const currentDate =
    new Date()

  const year =
    currentDate.getFullYear()

  const month =
    String(
      currentDate.getMonth() + 1
    ).padStart(
      2,
      '0'
    )

  return `${year}-${month}`
}

function createDateKey(
  year: number,
  monthIndex: number,
  day: number
): string {
  const month =
    String(
      monthIndex + 1
    ).padStart(
      2,
      '0'
    )

  const dayValue =
    String(day).padStart(
      2,
      '0'
    )

  return `${year}-${month}-${dayValue}`
}

function createMonthKey(
  year: number,
  monthIndex: number
): string {
  const month =
    String(
      monthIndex + 1
    ).padStart(
      2,
      '0'
    )

  return `${year}-${month}`
}

function parseMonthKey(
  month: string
): {
  year: number
  monthIndex: number
} {
  const [
    yearValue,
    monthValue
  ] = month.split('-')

  return {
    year:
      Number(yearValue),

    monthIndex:
      Number(monthValue) - 1
  }
}

function validateMonth(
  month: string
): void {
  if (
    !/^\d{4}-\d{2}$/.test(
      month
    )
  ) {
    throw new Error(
      'El mes seleccionado no es válido.'
    )
  }

  const {
    year,
    monthIndex
  } =
    parseMonthKey(
      month
    )

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(monthIndex) ||
    monthIndex < 0 ||
    monthIndex > 11
  ) {
    throw new Error(
      'El mes seleccionado no es válido.'
    )
  }

  const currentMonth =
    getCurrentMonthKey()

  if (
    month >
    currentMonth
  ) {
    throw new Error(
      'No se pueden consultar meses futuros.'
    )
  }
}

function getFirstSaleDate():
string | null {
  const database =
    getDatabase()

  const row =
    database
      .prepare(
        `
          SELECT
            MIN(
              date(
                created_at,
                'localtime'
              )
            ) AS date

          FROM sales
        `
      )
      .get() as FirstSaleRow

  return row.date
}

function getTodaySummary():
SalesPeriodSummary {
  const database =
    getDatabase()

  const row =
    database
      .prepare(
        `
          SELECT
            COUNT(*) AS salesCount,

            COALESCE(
              SUM(total),
              0
            ) AS total

          FROM sales

          WHERE
            status = 'COMPLETED'

            AND date(
              created_at,
              'localtime'
            ) = date(
              'now',
              'localtime'
            )
        `
      )
      .get() as SalesPeriodRow

  return {
    salesCount:
      row.salesCount,

    total:
      row.total
  }
}

function getMonthSummary(
  month: string
): SalesPeriodSummary {
  validateMonth(
    month
  )

  const database =
    getDatabase()

  const row =
    database
      .prepare(
        `
          SELECT
            COUNT(*) AS salesCount,

            COALESCE(
              SUM(total),
              0
            ) AS total

          FROM sales

          WHERE
            status = 'COMPLETED'

            AND strftime(
              '%Y-%m',
              created_at,
              'localtime'
            ) = ?
        `
      )
      .get(
        month
      ) as SalesPeriodRow

  return {
    salesCount:
      row.salesCount,

    total:
      row.total
  }
}

function getCanceledSalesCount(
  month: string
): number {
  validateMonth(
    month
  )

  const database =
    getDatabase()

  const row =
    database
      .prepare(
        `
          SELECT
            COUNT(*) AS count

          FROM sales

          WHERE
            status = 'CANCELED'

            AND strftime(
              '%Y-%m',
              created_at,
              'localtime'
            ) = ?
        `
      )
      .get(
        month
      ) as CountRow

  return row.count
}

function getPaymentMethodSummary(
  month: string
): PaymentMethodSummary {
  validateMonth(
    month
  )

  const database =
    getDatabase()

  const row =
    database
      .prepare(
        `
          SELECT
            COALESCE(
              SUM(
                CASE
                  WHEN payment_method =
                    'CASH'
                  THEN total
                  ELSE 0
                END
              ),
              0
            ) AS cash,

            COALESCE(
              SUM(
                CASE
                  WHEN payment_method =
                    'CARD'
                  THEN total
                  ELSE 0
                END
              ),
              0
            ) AS card,

            COALESCE(
              SUM(
                CASE
                  WHEN payment_method =
                    'SINPE'
                  THEN total
                  ELSE 0
                END
              ),
              0
            ) AS sinpe

          FROM sales

          WHERE
            status = 'COMPLETED'

            AND strftime(
              '%Y-%m',
              created_at,
              'localtime'
            ) = ?
        `
      )
      .get(
        month
      ) as PaymentMethodRow

  return {
    cash:
      row.cash,

    card:
      row.card,

    sinpe:
      row.sinpe
  }
}

function getMostSoldProduct(
  month: string
): ProductSalesSummary | null {
  validateMonth(
    month
  )

  const database =
    getDatabase()

  const row =
    database
      .prepare(
        `
          SELECT
            si.category_id
              AS categoryId,

            si.category_name
              AS categoryName,

            SUM(
              si.quantity
            ) AS quantity,

            SUM(
              si.total
            ) AS total

          FROM sale_items
            AS si

          INNER JOIN sales
            AS s
            ON s.id =
              si.sale_id

          WHERE
            s.status =
              'COMPLETED'

            AND strftime(
              '%Y-%m',
              s.created_at,
              'localtime'
            ) = ?

          GROUP BY
            si.category_id,
            si.category_name

          ORDER BY
            quantity DESC,
            total DESC,
            si.category_name ASC

          LIMIT 1
        `
      )
      .get(
        month
      ) as
        | ProductSalesRow
        | undefined

  if (!row) {
    return null
  }

  return {
    categoryId:
      row.categoryId,

    categoryName:
      row.categoryName,

    quantity:
      row.quantity,

    total:
      row.total
  }
}

function getLeastSoldProduct(
  month: string
): ProductSalesSummary | null {
  validateMonth(
    month
  )

  const database =
    getDatabase()

  const row =
    database
      .prepare(
        `
          SELECT
            si.category_id
              AS categoryId,

            si.category_name
              AS categoryName,

            SUM(
              si.quantity
            ) AS quantity,

            SUM(
              si.total
            ) AS total

          FROM sale_items
            AS si

          INNER JOIN sales
            AS s
            ON s.id =
              si.sale_id

          WHERE
            s.status =
              'COMPLETED'

            AND strftime(
              '%Y-%m',
              s.created_at,
              'localtime'
            ) = ?

          GROUP BY
            si.category_id,
            si.category_name

          ORDER BY
            quantity ASC,
            total ASC,
            si.category_name ASC

          LIMIT 1
        `
      )
      .get(
        month
      ) as
        | ProductSalesRow
        | undefined

  if (!row) {
    return null
  }

  return {
    categoryId:
      row.categoryId,

    categoryName:
      row.categoryName,

    quantity:
      row.quantity,

    total:
      row.total
  }
}

function getDailyFlow(
  month: string
): DailySalesPoint[] {
  validateMonth(
    month
  )

  const database =
    getDatabase()

  const firstSaleDate =
    getFirstSaleDate()

  if (!firstSaleDate) {
    return []
  }

  const firstSaleMonth =
    firstSaleDate.slice(
      0,
      7
    )

  if (
    month <
    firstSaleMonth
  ) {
    return []
  }

  const {
    year,
    monthIndex
  } =
    parseMonthKey(
      month
    )

  const currentDate =
    new Date()

  const currentMonth =
    getCurrentMonthKey()

  const startDay =
    month === firstSaleMonth
      ? Number(
          firstSaleDate.slice(
            8,
            10
          )
        )
      : 1

  const endDay =
    month === currentMonth
      ? currentDate.getDate()
      : new Date(
          year,
          monthIndex + 1,
          0
        ).getDate()

  const rows =
    database
      .prepare(
        `
          SELECT
            date(
              created_at,
              'localtime'
            ) AS date,

            COUNT(*) AS salesCount,

            COALESCE(
              SUM(total),
              0
            ) AS total

          FROM sales

          WHERE
            status = 'COMPLETED'

            AND strftime(
              '%Y-%m',
              created_at,
              'localtime'
            ) = ?

          GROUP BY
            date

          ORDER BY
            date ASC
        `
      )
      .all(
        month
      ) as DailySalesRow[]

  const rowsByDate =
    new Map<
      string,
      DailySalesRow
    >()

  for (
    const row
    of rows
  ) {
    rowsByDate.set(
      row.date,
      row
    )
  }

  const result:
    DailySalesPoint[] = []

  for (
    let day = startDay;
    day <= endDay;
    day += 1
  ) {
    const date =
      createDateKey(
        year,
        monthIndex,
        day
      )

    const row =
      rowsByDate.get(
        date
      )

    result.push({
      date,

      salesCount:
        row?.salesCount ??
        0,

      total:
        row?.total ??
        0
    })
  }

  return result
}

function getMonthlyHistory():
MonthlySalesPoint[] {
  const database =
    getDatabase()

  const firstSaleDate =
    getFirstSaleDate()

  if (!firstSaleDate) {
    return []
  }

  const firstSaleMonth =
    firstSaleDate.slice(
      0,
      7
    )

  const firstMonth =
    parseMonthKey(
      firstSaleMonth
    )

  const currentDate =
    new Date()

  const currentYear =
    currentDate.getFullYear()

  const currentMonthIndex =
    currentDate.getMonth()

  const monthKeys:
    string[] = []

  let year =
    firstMonth.year

  let monthIndex =
    firstMonth.monthIndex

  while (
    year < currentYear ||
    (
      year === currentYear &&
      monthIndex <=
        currentMonthIndex
    )
  ) {
    monthKeys.push(
      createMonthKey(
        year,
        monthIndex
      )
    )

    monthIndex += 1

    if (
      monthIndex > 11
    ) {
      monthIndex = 0
      year += 1
    }
  }

  const visibleMonthKeys =
    monthKeys.length > 12
      ? monthKeys.slice(
          -12
        )
      : monthKeys

  const firstVisibleMonth =
    visibleMonthKeys[0]

  const rows =
    database
      .prepare(
        `
          SELECT
            strftime(
              '%Y-%m',
              created_at,
              'localtime'
            ) AS month,

            COUNT(*) AS salesCount,

            COALESCE(
              SUM(total),
              0
            ) AS total

          FROM sales

          WHERE
            status = 'COMPLETED'

            AND strftime(
              '%Y-%m',
              created_at,
              'localtime'
            ) >= ?

          GROUP BY
            month

          ORDER BY
            month ASC
        `
      )
      .all(
        firstVisibleMonth
      ) as MonthlySalesRow[]

  const rowsByMonth =
    new Map<
      string,
      MonthlySalesRow
    >()

  for (
    const row
    of rows
  ) {
    rowsByMonth.set(
      row.month,
      row
    )
  }

  return visibleMonthKeys.map(
    (month) => {
      const row =
        rowsByMonth.get(
          month
        )

      return {
        month,

        salesCount:
          row?.salesCount ??
          0,

        total:
          row?.total ??
          0
      }
    }
  )
}

export function getMonthlyReport(
  month: string
): MonthlyReport {
  validateMonth(
    month
  )

  const summary =
    getMonthSummary(
      month
    )

  return {
    month,

    completedSalesCount:
      summary.salesCount,

    canceledSalesCount:
      getCanceledSalesCount(
        month
      ),

    total:
      summary.total,

    paymentMethods:
      getPaymentMethodSummary(
        month
      ),

    mostSold:
      getMostSoldProduct(
        month
      ),

    leastSold:
      getLeastSoldProduct(
        month
      ),

    dailyFlow:
      getDailyFlow(
        month
      )
  }
}

export function getReportSummary():
ReportSummary {
  const currentMonth =
    getCurrentMonthKey()

  const monthlyReport =
    getMonthlyReport(
      currentMonth
    )

  return {
    today:
      getTodaySummary(),

    currentMonth: {
      salesCount:
        monthlyReport
          .completedSalesCount,

      total:
        monthlyReport.total
    },

    paymentMethods:
      monthlyReport
        .paymentMethods,

    mostSold:
      monthlyReport
        .mostSold,

    leastSold:
      monthlyReport
        .leastSold,

    dailyFlow:
      monthlyReport
        .dailyFlow,

    monthlyHistory:
      getMonthlyHistory()
  }
}