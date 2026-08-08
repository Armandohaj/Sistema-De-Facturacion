import { getDatabase } from '../database/connection'

import {
  getSaleDetail,
  type SaleDetail
} from './sale-history.service'

interface SaleRow {
  id: number
  status: 'COMPLETED' | 'CANCELED'
}

interface SaleItemRow {
  categoryId: number
  quantity: number
}

interface CategoryStockRow {
  stock: number
}

function validatePositiveInteger(
  value: number,
  fieldName: string
): void {
  if (
    !Number.isInteger(value) ||
    value <= 0
  ) {
    throw new Error(
      `${fieldName} no es válido.`
    )
  }
}

export function cancelSale(
  saleId: number,
  canceledByUserId: number
): SaleDetail {
  validatePositiveInteger(
    saleId,
    'El número de venta'
  )

  validatePositiveInteger(
    canceledByUserId,
    'El usuario'
  )

  const database =
    getDatabase()

  const cancelTransaction =
    database.transaction(
      (): void => {
        const sale =
          database
            .prepare(
              `
                SELECT
                  id,
                  status

                FROM sales

                WHERE id = ?
              `
            )
            .get(
              saleId
            ) as
              | SaleRow
              | undefined

        if (!sale) {
          throw new Error(
            'La venta no existe.'
          )
        }

        if (
          sale.status ===
          'CANCELED'
        ) {
          throw new Error(
            'La venta ya fue cancelada.'
          )
        }

        const items =
          database
            .prepare(
              `
                SELECT
                  category_id
                    AS categoryId,

                  quantity
                    AS quantity

                FROM sale_items

                WHERE sale_id = ?

                ORDER BY id ASC
              `
            )
            .all(
              saleId
            ) as SaleItemRow[]

        if (
          items.length === 0
        ) {
          throw new Error(
            'La venta no tiene productos registrados.'
          )
        }

        const saleUpdate =
          database
            .prepare(
              `
                UPDATE sales

                SET
                  status = 'CANCELED',

                  canceled_at =
                    CURRENT_TIMESTAMP,

                  canceled_by = ?

                WHERE
                  id = ?

                  AND
                  status = 'COMPLETED'
              `
            )
            .run(
              canceledByUserId,
              saleId
            )

        if (
          saleUpdate.changes !==
          1
        ) {
          throw new Error(
            'No se pudo cancelar la venta.'
          )
        }

        const getCategoryStock =
          database.prepare(
            `
              SELECT
                stock

              FROM categories

              WHERE id = ?
            `
          )

        const updateCategoryStock =
          database.prepare(
            `
              UPDATE categories

              SET
                stock = stock + ?,

                updated_at =
                  CURRENT_TIMESTAMP

              WHERE id = ?
            `
          )

        const insertMovement =
          database.prepare(
            `
              INSERT INTO inventory_movements (
                category_id,
                movement_type,
                quantity_change,
                stock_before,
                stock_after,
                note,
                user_id,
                sale_id
              )
              VALUES (
                ?,
                'SALE_CANCELLATION',
                ?,
                ?,
                ?,
                ?,
                ?,
                ?
              )
            `
          )

        for (
          const item
          of items
        ) {
          const category =
            getCategoryStock.get(
              item.categoryId
            ) as
              | CategoryStockRow
              | undefined

          if (!category) {
            throw new Error(
              'Una categoría asociada a la venta ya no existe.'
            )
          }

          const stockBefore =
            category.stock

          const stockAfter =
            stockBefore +
            item.quantity

          const updateResult =
            updateCategoryStock.run(
              item.quantity,
              item.categoryId
            )

          if (
            updateResult.changes !==
            1
          ) {
            throw new Error(
              'No se pudo restaurar el inventario.'
            )
          }

          insertMovement.run(
            item.categoryId,
            item.quantity,
            stockBefore,
            stockAfter,
            `Cancelación de venta #${saleId}`,
            canceledByUserId,
            saleId
          )
        }
      }
    )

  cancelTransaction()

  return getSaleDetail(
    saleId
  )
}