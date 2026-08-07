import type Database
  from 'better-sqlite3'

import {
  getDatabase
} from '../database/connection'

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

interface CategoryRow {
  id: number
  name: string
  price: number
  stock: number
  discount_percent: number
  active: number
  created_at: string
  updated_at: string
}

interface InventoryMovementInput {
  categoryId: number

  movementType:
    | 'INITIAL_STOCK'
    | 'MANUAL_ADDITION'
    | 'MANUAL_REMOVAL'

  quantityChange: number

  stockBefore: number
  stockAfter: number

  userId: number

  note: string
}

function mapCategory(
  row: CategoryRow
): Category {
  return {
    id: row.id,
    name: row.name,
    price: row.price,
    stock: row.stock,

    discountPercent:
      row.discount_percent,

    active:
      row.active === 1,

    createdAt:
      row.created_at,

    updatedAt:
      row.updated_at
  }
}

function validateId(
  id: number
): void {
  if (
    !Number.isInteger(id) ||
    id <= 0
  ) {
    throw new Error(
      'El identificador de la categoría no es válido.'
    )
  }
}

function validateUserId(
  userId: number
): void {
  if (
    !Number.isInteger(userId) ||
    userId <= 0
  ) {
    throw new Error(
      'El usuario no es válido.'
    )
  }
}

function validateCategoryInput(
  input: CategoryInput
): CategoryInput {
  const name =
    typeof input?.name === 'string'
      ? input.name
          .trim()
          .replace(/\s+/g, ' ')
      : ''

  if (name.length < 2) {
    throw new Error(
      'El nombre debe contener al menos dos caracteres.'
    )
  }

  if (name.length > 80) {
    throw new Error(
      'El nombre no puede superar los 80 caracteres.'
    )
  }

  if (
    !Number.isInteger(
      input?.price
    ) ||
    input.price < 0
  ) {
    throw new Error(
      'El precio debe ser un número entero igual o mayor que cero.'
    )
  }

  if (
    !Number.isInteger(
      input?.stock
    ) ||
    input.stock < 0
  ) {
    throw new Error(
      'La cantidad disponible debe ser un número entero igual o mayor que cero.'
    )
  }

  if (
    !Number.isInteger(
      input?.discountPercent
    ) ||
    input.discountPercent < 0 ||
    input.discountPercent > 100
  ) {
    throw new Error(
      'El descuento debe estar entre 0 y 100.'
    )
  }

  return {
    name,
    price: input.price,
    stock: input.stock,

    discountPercent:
      input.discountPercent
  }
}

function translateDatabaseError(
  error: unknown
): never {
  if (
    error instanceof Error &&
    error.message.includes(
      'UNIQUE constraint failed: categories.name'
    )
  ) {
    throw new Error(
      'Ya existe una categoría con ese nombre.'
    )
  }

  throw error
}

function insertInventoryMovement(
  database: Database.Database,
  input: InventoryMovementInput
): void {
  database
    .prepare(`
      INSERT INTO inventory_movements (
        category_id,
        movement_type,
        quantity_change,
        stock_before,
        stock_after,
        note,
        user_id
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      input.categoryId,
      input.movementType,
      input.quantityChange,
      input.stockBefore,
      input.stockAfter,
      input.note,
      input.userId
    )
}

export function listCategories():
Category[] {
  const database =
    getDatabase()

  const rows = database
    .prepare(`
      SELECT
        id,
        name,
        price,
        stock,
        discount_percent,
        active,
        created_at,
        updated_at
      FROM categories
      ORDER BY
        active DESC,
        name COLLATE NOCASE ASC
    `)
    .all() as CategoryRow[]

  return rows.map(
    mapCategory
  )
}

export function createCategory(
  input: CategoryInput,
  userId: number
): Category {
  validateUserId(userId)

  const database =
    getDatabase()

  const validatedInput =
    validateCategoryInput(
      input
    )

  const create =
    database.transaction(() => {
      const result = database
        .prepare(`
          INSERT INTO categories (
            name,
            price,
            stock,
            discount_percent,
            active
          )
          VALUES (?, ?, ?, ?, 1)
        `)
        .run(
          validatedInput.name,
          validatedInput.price,
          validatedInput.stock,
          validatedInput.discountPercent
        )

      const categoryId =
        Number(
          result.lastInsertRowid
        )

      if (
        validatedInput.stock > 0
      ) {
        insertInventoryMovement(
          database,
          {
            categoryId,

            movementType:
              'INITIAL_STOCK',

            quantityChange:
              validatedInput.stock,

            stockBefore: 0,

            stockAfter:
              validatedInput.stock,

            userId,

            note:
              'Inventario inicial de la categoría.'
          }
        )
      }

      return categoryId
    })

  try {
    const categoryId =
      create()

    return getCategoryById(
      categoryId
    )
  } catch (error: unknown) {
    return translateDatabaseError(
      error
    )
  }
}

export function updateCategory(
  id: number,
  input: CategoryInput,
  userId: number
): Category {
  validateId(id)
  validateUserId(userId)

  const database =
    getDatabase()

  const validatedInput =
    validateCategoryInput(
      input
    )

  try {
    const update =
      database.transaction(() => {
        const currentCategory =
          getCategoryById(id)

        database
          .prepare(`
            UPDATE categories
            SET
              name = ?,
              price = ?,
              stock = ?,
              discount_percent = ?,
              updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `)
          .run(
            validatedInput.name,
            validatedInput.price,
            validatedInput.stock,
            validatedInput.discountPercent,
            id
          )

        const stockDifference =
          validatedInput.stock -
          currentCategory.stock

        if (
          stockDifference !== 0
        ) {
          insertInventoryMovement(
            database,
            {
              categoryId: id,

              movementType:
                stockDifference > 0
                  ? 'MANUAL_ADDITION'
                  : 'MANUAL_REMOVAL',

              quantityChange:
                stockDifference,

              stockBefore:
                currentCategory.stock,

              stockAfter:
                validatedInput.stock,

              userId,

              note:
                'Ajuste manual desde inventario.'
            }
          )
        }
      })

    update()

    return getCategoryById(id)
  } catch (error: unknown) {
    return translateDatabaseError(
      error
    )
  }
}

export function setCategoryActive(
  id: number,
  active: boolean
): Category {
  validateId(id)

  if (
    typeof active !== 'boolean'
  ) {
    throw new Error(
      'El estado de la categoría no es válido.'
    )
  }

  const database =
    getDatabase()

  const result = database
    .prepare(`
      UPDATE categories
      SET
        active = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `)
    .run(
      active ? 1 : 0,
      id
    )

  if (
    result.changes === 0
  ) {
    throw new Error(
      'La categoría indicada no existe.'
    )
  }

  return getCategoryById(id)
}

function getCategoryById(
  id: number
): Category {
  validateId(id)

  const database =
    getDatabase()

  const row = database
    .prepare(`
      SELECT
        id,
        name,
        price,
        stock,
        discount_percent,
        active,
        created_at,
        updated_at
      FROM categories
      WHERE id = ?
    `)
    .get(id) as
      | CategoryRow
      | undefined

  if (!row) {
    throw new Error(
      'La categoría indicada no existe.'
    )
  }

  return mapCategory(row)
}