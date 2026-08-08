import { getDatabase } from '../database/connection'

export type SaleStatus =
  | 'COMPLETED'
  | 'CANCELED'

export type PaymentMethod =
  | 'CASH'
  | 'CARD'
  | 'SINPE'

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

export interface SaleDetail
  extends SaleHistoryItem {
  items: SaleDetailItem[]
}

interface SaleHistoryRow {
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

interface SaleDetailItemRow {
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

function validateSaleId(
  saleId: number
): void {
  if (
    !Number.isInteger(saleId) ||
    saleId <= 0
  ) {
    throw new Error(
      'El número de venta no es válido.'
    )
  }
}

function validateDate(
  date: string
): void {
  const trimmedDate =
    date.trim()

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      trimmedDate
    )
  ) {
    throw new Error(
      'La fecha no es válida.'
    )
  }

  const parsedDate =
    new Date(
      `${trimmedDate}T00:00:00`
    )

  if (
    Number.isNaN(
      parsedDate.getTime()
    )
  ) {
    throw new Error(
      'La fecha no es válida.'
    )
  }
}

export function listSales(
  filters: SaleHistoryFilters = {}
): SaleHistoryItem[] {
  const database =
    getDatabase()

  const conditions: string[] =
    []

  const parameters:
    Array<number | string> =
      []

  if (
    filters.saleId !==
    undefined
  ) {
    validateSaleId(
      filters.saleId
    )

    conditions.push(
      's.id = ?'
    )

    parameters.push(
      filters.saleId
    )
  }

  if (
    filters.date !==
    undefined &&
    filters.date.trim() !== ''
  ) {
    validateDate(
      filters.date
    )

    conditions.push(
      `
        date(
          s.created_at,
          'localtime'
        ) = ?
      `
    )

    parameters.push(
      filters.date.trim()
    )
  }

  const whereClause =
    conditions.length > 0
      ? `WHERE ${conditions.join(
          ' AND '
        )}`
      : ''

  const rows =
    database
      .prepare(
        `
          SELECT
            s.id AS id,

            s.status AS status,

            s.payment_method
              AS paymentMethod,

            s.subtotal
              AS subtotal,

            s.discount_total
              AS discountTotal,

            s.total
              AS total,

            s.created_by
              AS createdBy,

            creator.username
              AS createdByUsername,

            s.created_at
              AS createdAt,

            s.canceled_at
              AS canceledAt,

            s.canceled_by
              AS canceledBy,

            canceler.username
              AS canceledByUsername

          FROM sales AS s

          INNER JOIN users
            AS creator
            ON creator.id =
              s.created_by

          LEFT JOIN users
            AS canceler
            ON canceler.id =
              s.canceled_by

          ${whereClause}

          ORDER BY
            s.id DESC

          LIMIT 200
        `
      )
      .all(
        ...parameters
      ) as SaleHistoryRow[]

  return rows
}

export function getSaleDetail(
  saleId: number
): SaleDetail {
  validateSaleId(
    saleId
  )

  const database =
    getDatabase()

  const sale =
    database
      .prepare(
        `
          SELECT
            s.id AS id,

            s.status AS status,

            s.payment_method
              AS paymentMethod,

            s.subtotal
              AS subtotal,

            s.discount_total
              AS discountTotal,

            s.total
              AS total,

            s.created_by
              AS createdBy,

            creator.username
              AS createdByUsername,

            s.created_at
              AS createdAt,

            s.canceled_at
              AS canceledAt,

            s.canceled_by
              AS canceledBy,

            canceler.username
              AS canceledByUsername

          FROM sales AS s

          INNER JOIN users
            AS creator
            ON creator.id =
              s.created_by

          LEFT JOIN users
            AS canceler
            ON canceler.id =
              s.canceled_by

          WHERE
            s.id = ?
        `
      )
      .get(
        saleId
      ) as
        | SaleHistoryRow
        | undefined

  if (!sale) {
    throw new Error(
      'La venta no existe.'
    )
  }

  const items =
    database
      .prepare(
        `
          SELECT
            id AS id,

            category_id
              AS categoryId,

            category_name
              AS categoryName,

            unit_price
              AS unitPrice,

            discount_percent
              AS discountPercent,

            quantity
              AS quantity,

            subtotal
              AS subtotal,

            discount_total
              AS discountTotal,

            total
              AS total

          FROM sale_items

          WHERE
            sale_id = ?

          ORDER BY
            id ASC
        `
      )
      .all(
        saleId
      ) as SaleDetailItemRow[]

  return {
    ...sale,
    items
  }
}