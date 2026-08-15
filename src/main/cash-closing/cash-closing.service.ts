import {
  getDatabase
} from '../database/connection'

export type CashClosingStatus =
  | 'CLOSED'
  | 'REOPENED'

export type CashClosingEventType =
  | 'CLOSED'
  | 'REOPENED'

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

  status: CashClosingStatus

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

export interface CashClosingEvent {
  id: number
  cashClosingId: number
  eventType: CashClosingEventType
  userId: number
  username: string
  reason: string | null
  createdAt: string
}

export interface CashClosingDay {
  summary: DailyClosingSummary
  closing: CashClosing | null
  events: CashClosingEvent[]
}

export interface CreateCashClosingInput {
  date: string
  openingCash: number
  countedCash: number
}

export interface ReopenCashClosingInput {
  date: string
  reason: string
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

  status: CashClosingStatus

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

interface CashClosingEventRow {
  id: number
  cashClosingId: number
  eventType: CashClosingEventType
  userId: number
  username: string
  reason: string | null
  createdAt: string
}

interface SaleClosingRow {
  id: number
  businessDate: string
}

interface ExistingClosingRow {
  id: number
  status: CashClosingStatus
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

function validateReopenReason(
  reason: string
): string {
  const normalizedReason =
    reason.trim()

  if (
    normalizedReason.length < 3
  ) {
    throw new Error(
      'Debes indicar el motivo de la reapertura.'
    )
  }

  if (
    normalizedReason.length > 300
  ) {
    throw new Error(
      'El motivo de la reapertura es demasiado largo.'
    )
  }

  return normalizedReason
}

/*
 * Bloquea nuevas ventas únicamente
 * cuando la caja del día actual está
 * realmente CERRADA.
 *
 * Una caja REOPENED permite nuevamente
 * registrar ventas.
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

            AND
            status = 'CLOSED'

          LIMIT 1
        `
      )
      .get() as
        | { id: number }
        | undefined

  if (closing) {
    throw new Error(
      'La caja de hoy está cerrada. Debe ser reabierta por un administrador antes de registrar nuevas ventas.'
    )
  }
}

/*
 * Una venta solamente queda protegida
 * si la jornada a la que pertenece
 * está actualmente CLOSED.
 *
 * Si el administrador reabre esa caja,
 * la venta vuelve a poder cancelarse.
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

            AND
            cc.status = 'CLOSED'

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
      `La caja del ${closing.businessDate} está cerrada. Debe ser reabierta antes de modificar esta venta.`
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

            cc.status
              AS status,

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

export function getCashClosingEvents(
  cashClosingId: number
): CashClosingEvent[] {
  validatePositiveInteger(
    cashClosingId,
    'El cierre de caja'
  )

  const database =
    getDatabase()

  const rows =
    database
      .prepare(
        `
          SELECT
            cce.id AS id,

            cce.cash_closing_id
              AS cashClosingId,

            cce.event_type
              AS eventType,

            cce.user_id
              AS userId,

            u.username
              AS username,

            cce.reason
              AS reason,

            cce.created_at
              AS createdAt

          FROM cash_closing_events
            AS cce

          INNER JOIN users AS u
            ON u.id =
              cce.user_id

          WHERE
            cce.cash_closing_id = ?

          ORDER BY
            cce.id ASC
        `
      )
      .all(
        cashClosingId
      ) as CashClosingEventRow[]

  return rows
}

export function getCashClosingDay(
  date: string
): CashClosingDay {
  validateDate(
    date
  )

  const closing =
    getCashClosing(
      date
    )

  return {
    summary:
      getDailyClosingSummary(
        date
      ),

    closing,

    events:
      closing
        ? getCashClosingEvents(
            closing.id
          )
        : []
  }
}

/*
 * Registra un cierre nuevo o vuelve
 * a cerrar una caja que anteriormente
 * fue REOPENED.
 */
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
                  id,
                  status

                FROM cash_closings

                WHERE
                  business_date = ?

                LIMIT 1
              `
            )
            .get(
              input.date
            ) as
              | ExistingClosingRow
              | undefined

        /*
         * Si ya está CLOSED no podemos
         * cerrarla otra vez.
         *
         * Primero tendría que reabrirse.
         */
        if (
          existingClosing?.status ===
          'CLOSED'
        ) {
          throw new Error(
            'Esta fecha ya tiene una caja cerrada.'
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

        let cashClosingId:
          number

        /*
         * Primera vez que se cierra
         * esta jornada.
         */
        if (
          !existingClosing
        ) {
          const result =
            database
              .prepare(
                `
                  INSERT INTO cash_closings (
                    business_date,

                    status,

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

                    closed_by,
                    closed_at
                  )
                  VALUES (
                    ?,
                    'CLOSED',
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
                    CURRENT_TIMESTAMP
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

          cashClosingId =
            Number(
              result.lastInsertRowid
            )

          if (
            !Number.isInteger(
              cashClosingId
            ) ||
            cashClosingId <= 0
          ) {
            throw new Error(
              'No se pudo registrar el cierre de caja.'
            )
          }
        } else {
          /*
           * La caja existe pero está
           * REOPENED.
           *
           * Actualizamos el mismo cierre
           * con los nuevos valores de la
           * jornada.
           */
          cashClosingId =
            existingClosing.id

          const updateResult =
            database
              .prepare(
                `
                  UPDATE cash_closings

                  SET
                    status = 'CLOSED',

                    completed_sales_count = ?,

                    canceled_sales_count = ?,

                    sales_total = ?,

                    cash_sales = ?,

                    card_sales = ?,

                    sinpe_sales = ?,

                    opening_cash = ?,

                    expected_cash = ?,

                    counted_cash = ?,

                    cash_difference = ?,

                    closed_by = ?,

                    closed_at =
                      CURRENT_TIMESTAMP

                  WHERE
                    id = ?

                    AND
                    status = 'REOPENED'
                `
              )
              .run(
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

                closedByUserId,

                existingClosing.id
              )

          if (
            updateResult.changes !==
            1
          ) {
            throw new Error(
              'No se pudo volver a cerrar la caja.'
            )
          }
        }

        /*
         * Cada cierre queda registrado
         * en el historial.
         */
        database
          .prepare(
            `
              INSERT INTO cash_closing_events (
                cash_closing_id,
                event_type,
                user_id,
                reason
              )
              VALUES (
                ?,
                'CLOSED',
                ?,
                NULL
              )
            `
          )
          .run(
            cashClosingId,
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

/*
 * Reabre una caja cerrada.
 *
 * No borramos el cierre original.
 * Cambiamos su estado y registramos
 * un evento REOPENED.
 */
export function reopenCashClosing(
  input: ReopenCashClosingInput,
  reopenedByUserId: number
): CashClosing {
  validateDate(
    input.date
  )

  validatePositiveInteger(
    reopenedByUserId,
    'El usuario que realiza la reapertura'
  )

  const reason =
    validateReopenReason(
      input.reason
    )

  const database =
    getDatabase()

  const transaction =
    database.transaction(
      (): void => {
        const closing =
          database
            .prepare(
              `
                SELECT
                  id,
                  status

                FROM cash_closings

                WHERE
                  business_date = ?

                LIMIT 1
              `
            )
            .get(
              input.date
            ) as
              | ExistingClosingRow
              | undefined

        if (!closing) {
          throw new Error(
            'No existe un cierre de caja para esta fecha.'
          )
        }

        if (
          closing.status ===
          'REOPENED'
        ) {
          throw new Error(
            'Esta caja ya se encuentra reabierta.'
          )
        }

        const updateResult =
          database
            .prepare(
              `
                UPDATE cash_closings

                SET
                  status = 'REOPENED'

                WHERE
                  id = ?

                  AND
                  status = 'CLOSED'
              `
            )
            .run(
              closing.id
            )

        if (
          updateResult.changes !==
          1
        ) {
          throw new Error(
            'No se pudo reabrir la caja.'
          )
        }

        database
          .prepare(
            `
              INSERT INTO cash_closing_events (
                cash_closing_id,
                event_type,
                user_id,
                reason
              )
              VALUES (
                ?,
                'REOPENED',
                ?,
                ?
              )
            `
          )
          .run(
            closing.id,
            reopenedByUserId,
            reason
          )
      }
    )

  transaction()

  const reopenedClosing =
    getCashClosing(
      input.date
    )

  if (!reopenedClosing) {
    throw new Error(
      'La caja fue reabierta, pero no pudo recuperarse.'
    )
  }

  return reopenedClosing
}