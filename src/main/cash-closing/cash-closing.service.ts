import {
  getDatabase
} from '../database/connection'

export interface PaymentMethodSummary {
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

  paymentMethods: PaymentMethodSummary

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

interface DailySalesRow {
  completedSalesCount: number
  total: number
  cash: number
  card: number
  sinpe: number
}

interface CountRow {
  count: number
}

interface ProductRow {
  categoryId: number
  categoryName: string
  quantity: number
  total: number
}

interface CashClosingRow {
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

interface SaleClosingRow {
  id: number
  businessDate: string
}

function getCurrentDateKey(): string {
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

  const day =
    String(
      currentDate.getDate()
    ).padStart(
      2,
      '0'
    )

  return `${year}-${month}-${day}`
}

function validateDate(
  date: string
): void {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      date
    )
  ) {
    throw new Error(
      'La fecha indicada no es válida.'
    )
  }

  const parsedDate =
    new Date(
      `${date}T00:00:00`
    )

  if (
    Number.isNaN(
      parsedDate.getTime()
    )
  ) {
    throw new Error(
      'La fecha indicada no es válida.'
    )
  }

  if (
    date >
    getCurrentDateKey()
  ) {
    throw new Error(
      'No se puede consultar o cerrar una fecha futura.'
    )
  }
}

function validateMoney(
  value: number,
  fieldName: string
): void {
  if (
    !Number.isInteger(
      value
    ) ||
    value < 0
  ) {
    throw new Error(
      `${fieldName} debe ser un monto entero mayor o igual a cero.`
    )
  }
}

function validatePositiveInteger(
  value: number,
  fieldName: string
): void {
  if (
    !Number.isInteger(
      value
    ) ||
    value <= 0
  ) {
    throw new Error(
      `${fieldName} no es válido.`
    )
  }
}

/*
 * Protege la creación de nuevas ventas.
 *
 * Si ya existe un cierre de caja
 * correspondiente al día actual,
 * ninguna nueva venta puede registrarse.
 */
export function assertCurrentBusinessDayOpen():
void {
  const database =
    getDatabase()

  const closing =
    database
      .prepare(
        `
          SELECT
            id

          FROM cash_closings

          WHERE
            business_date =
              date(
                'now',
                'localtime'
              )

          LIMIT 1
        `
      )
      .get() as
        | { id: number }
        | undefined

  if (closing) {
    throw new Error(
      'La caja de hoy ya fue cerrada. No se pueden registrar más ventas.'
    )
  }
}

/*
 * Protege las ventas históricas.
 *
 * Si el día al que pertenece una venta
 * ya tiene cierre de caja, esa venta
 * no puede modificarse ni cancelarse.
 */
export function assertSaleBusinessDayOpen(
  saleId: number
): void {
  validatePositiveInteger(
    saleId,
    'El número de venta'
  )

  const database =
    getDatabase()

  const closing =
    database
      .prepare(
        `
          SELECT
            cc.id AS id,

            cc.business_date
              AS businessDate

          FROM sales AS s

          INNER JOIN cash_closings AS cc
            ON cc.business_date =
              date(
                s.created_at,
                'localtime'
              )

          WHERE
            s.id = ?

          LIMIT 1
        `
      )
      .get(
        saleId
      ) as
        | SaleClosingRow
        | undefined

  if (closing) {
    throw new Error(
      `La caja del ${closing.businessDate} ya fue cerrada. Esta venta ya no puede modificarse.`
    )
  }
}

function getDailySales(
  date: string
): DailySalesRow {
  const database =
    getDatabase()

  const row =
    database
      .prepare(
        `
          SELECT
            COUNT(*) AS completedSalesCount,

            COALESCE(
              SUM(total),
              0
            ) AS total,

            COALESCE(
              SUM(
                CASE
                  WHEN payment_method = 'CASH'
                  THEN total
                  ELSE 0
                END
              ),
              0
            ) AS cash,

            COALESCE(
              SUM(
                CASE
                  WHEN payment_method = 'CARD'
                  THEN total
                  ELSE 0
                END
              ),
              0
            ) AS card,

            COALESCE(
              SUM(
                CASE
                  WHEN payment_method = 'SINPE'
                  THEN total
                  ELSE 0
                END
              ),
              0
            ) AS sinpe

          FROM sales

          WHERE
            status = 'COMPLETED'

            AND date(
              created_at,
              'localtime'
            ) = ?
        `
      )
      .get(
        date
      ) as DailySalesRow

  return row
}

function getCanceledSalesCount(
  date: string
): number {
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

            AND date(
              created_at,
              'localtime'
            ) = ?
        `
      )
      .get(
        date
      ) as CountRow

  return row.count
}

function getProductSummary(
  date: string,
  direction: 'ASC' | 'DESC'
): DailyProductSummary | null {
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

          FROM sale_items AS si

          INNER JOIN sales AS s
            ON s.id =
              si.sale_id

          WHERE
            s.status = 'COMPLETED'

            AND date(
              s.created_at,
              'localtime'
            ) = ?

          GROUP BY
            si.category_id,
            si.category_name

          ORDER BY
            quantity ${direction},
            total ${direction},
            si.category_name ASC

          LIMIT 1
        `
      )
      .get(
        date
      ) as
        | ProductRow
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

export function getDailyClosingSummary(
  date: string
): DailyClosingSummary {
  validateDate(
    date
  )

  const sales =
    getDailySales(
      date
    )

  return {
    date,

    completedSalesCount:
      sales.completedSalesCount,

    canceledSalesCount:
      getCanceledSalesCount(
        date
      ),

    total:
      sales.total,

    paymentMethods: {
      cash:
        sales.cash,

      card:
        sales.card,

      sinpe:
        sales.sinpe
    },

    mostSold:
      getProductSummary(
        date,
        'DESC'
      ),

    leastSold:
      getProductSummary(
        date,
        'ASC'
      )
  }
}

export function getCashClosing(
  date: string
): CashClosing | null {
  validateDate(
    date
  )

  const database =
    getDatabase()

  const row =
    database
      .prepare(
        `
          SELECT
            cc.id AS id,

            cc.business_date
              AS businessDate,

            cc.completed_sales_count
              AS completedSalesCount,

            cc.canceled_sales_count
              AS canceledSalesCount,

            cc.sales_total
              AS salesTotal,

            cc.cash_sales
              AS cashSales,

            cc.card_sales
              AS cardSales,

            cc.sinpe_sales
              AS sinpeSales,

            cc.opening_cash
              AS openingCash,

            cc.expected_cash
              AS expectedCash,

            cc.counted_cash
              AS countedCash,

            cc.cash_difference
              AS cashDifference,

            cc.closed_by
              AS closedBy,

            u.username
              AS closedByUsername,

            cc.closed_at
              AS closedAt

          FROM cash_closings AS cc

          INNER JOIN users AS u
            ON u.id =
              cc.closed_by

          WHERE
            cc.business_date = ?

          LIMIT 1
        `
      )
      .get(
        date
      ) as
        | CashClosingRow
        | undefined

  if (!row) {
    return null
  }

  return row
}

export function getCashClosingDay(
  date: string
): CashClosingDay {
  validateDate(
    date
  )

  return {
    summary:
      getDailyClosingSummary(
        date
      ),

    closing:
      getCashClosing(
        date
      )
  }
}

export function createCashClosing(
  input: CreateCashClosingInput,
  closedByUserId: number
): CashClosing {
  validateDate(
    input.date
  )

  validateMoney(
    input.openingCash,
    'El fondo inicial'
  )

  validateMoney(
    input.countedCash,
    'El efectivo contado'
  )

  validatePositiveInteger(
    closedByUserId,
    'El usuario que realiza el cierre'
  )

  const database =
    getDatabase()

  const transaction =
    database.transaction(
      (): void => {
        const existingClosing =
          database
            .prepare(
              `
                SELECT
                  id

                FROM cash_closings

                WHERE
                  business_date = ?

                LIMIT 1
              `
            )
            .get(
              input.date
            ) as
              | { id: number }
              | undefined

        if (
          existingClosing
        ) {
          throw new Error(
            'Esta fecha ya tiene un cierre de caja registrado.'
          )
        }

        const summary =
          getDailyClosingSummary(
            input.date
          )

        const expectedCash =
          input.openingCash +
          summary.paymentMethods.cash

        const cashDifference =
          input.countedCash -
          expectedCash

        database
          .prepare(
            `
              INSERT INTO cash_closings (
                business_date,

                completed_sales_count,
                canceled_sales_count,

                sales_total,

                cash_sales,
                card_sales,
                sinpe_sales,

                opening_cash,
                expected_cash,
                counted_cash,
                cash_difference,

                closed_by
              )
              VALUES (
                ?,
                ?,
                ?,
                ?,
                ?,
                ?,
                ?,
                ?,
                ?,
                ?,
                ?,
                ?
              )
            `
          )
          .run(
            input.date,

            summary.completedSalesCount,
            summary.canceledSalesCount,

            summary.total,

            summary.paymentMethods.cash,
            summary.paymentMethods.card,
            summary.paymentMethods.sinpe,

            input.openingCash,

            expectedCash,

            input.countedCash,

            cashDifference,

            closedByUserId
          )
      }
    )

  transaction()

  const closing =
    getCashClosing(
      input.date
    )

  if (!closing) {
    throw new Error(
      'El cierre se guardó, pero no pudo recuperarse.'
    )
  }

  return closing
}