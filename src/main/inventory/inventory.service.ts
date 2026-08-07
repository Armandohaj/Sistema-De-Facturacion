import {
  getDatabase
} from '../database/connection'

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

interface InventoryMovementRow {
  id: number
  category_id: number
  category_name: string
  movement_type:
    InventoryMovement['movementType']

  quantity_change: number
  stock_before: number
  stock_after: number
  note: string | null
  created_at: string
}

function mapMovement(
  row: InventoryMovementRow
): InventoryMovement {
  return {
    id: row.id,
    categoryId:
      row.category_id,

    categoryName:
      row.category_name,

    movementType:
      row.movement_type,

    quantityChange:
      row.quantity_change,

    stockBefore:
      row.stock_before,

    stockAfter:
      row.stock_after,

    note:
      row.note,

    createdAt:
      row.created_at
  }
}

export function listRecentInventoryMovements(
  limit = 50
): InventoryMovement[] {
  const database = getDatabase()

  const safeLimit =
    Number.isInteger(limit)
      ? Math.min(
          Math.max(limit, 1),
          200
        )
      : 50

  const rows = database
    .prepare(`
      SELECT
        inventory_movements.id,
        inventory_movements.category_id,

        categories.name
          AS category_name,

        inventory_movements.movement_type,
        inventory_movements.quantity_change,
        inventory_movements.stock_before,
        inventory_movements.stock_after,
        inventory_movements.note,
        inventory_movements.created_at

      FROM inventory_movements

      INNER JOIN categories
        ON categories.id =
           inventory_movements.category_id

      ORDER BY
        inventory_movements.id DESC

      LIMIT ?
    `)
    .all(
      safeLimit
    ) as InventoryMovementRow[]

  return rows.map(
    mapMovement
  )
}