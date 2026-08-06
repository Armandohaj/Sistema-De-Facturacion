import { getDatabase } from '../database/connection'

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

function mapCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    name: row.name,
    price: row.price,
    stock: row.stock,
    discountPercent: row.discount_percent,
    active: row.active === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

function validateId(id: number): void {
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error('El identificador de la categoría no es válido.')
  }
}

function validateCategoryInput(
  input: CategoryInput
): CategoryInput {
  const name =
    typeof input.name === 'string'
      ? input.name.trim().replace(/\s+/g, ' ')
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
    !Number.isInteger(input.price) ||
    input.price < 0
  ) {
    throw new Error(
      'El precio debe ser un número entero igual o mayor que cero.'
    )
  }

  if (
    !Number.isInteger(input.stock) ||
    input.stock < 0
  ) {
    throw new Error(
      'La cantidad disponible debe ser un número entero igual o mayor que cero.'
    )
  }

  if (
    !Number.isInteger(input.discountPercent) ||
    input.discountPercent < 0 ||
    input.discountPercent > 100
  ) {
    throw new Error(
      'El descuento debe ser un número entero entre 0 y 100.'
    )
  }

  return {
    name,
    price: input.price,
    stock: input.stock,
    discountPercent: input.discountPercent
  }
}

function translateDatabaseError(error: unknown): never {
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

export function listCategories(): Category[] {
  const database = getDatabase()

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
      ORDER BY active DESC, name COLLATE NOCASE ASC
    `)
    .all() as CategoryRow[]

  return rows.map(mapCategory)
}

export function createCategory(
  input: CategoryInput
): Category {
  const database = getDatabase()
  const validatedInput = validateCategoryInput(input)

  try {
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

    const categoryId = Number(
      result.lastInsertRowid
    )

    return getCategoryById(categoryId)
  } catch (error: unknown) {
    return translateDatabaseError(error)
  }
}

export function updateCategory(
  id: number,
  input: CategoryInput
): Category {
  validateId(id)

  const database = getDatabase()
  const validatedInput = validateCategoryInput(input)

  try {
    const result = database
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

    if (result.changes === 0) {
      throw new Error(
        'La categoría indicada no existe.'
      )
    }

    return getCategoryById(id)
  } catch (error: unknown) {
    return translateDatabaseError(error)
  }
}

export function setCategoryActive(
  id: number,
  active: boolean
): Category {
  validateId(id)

  if (typeof active !== 'boolean') {
    throw new Error(
      'El estado de la categoría no es válido.'
    )
  }

  const database = getDatabase()

  const result = database
    .prepare(`
      UPDATE categories
      SET
        active = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `)
    .run(active ? 1 : 0, id)

  if (result.changes === 0) {
    throw new Error(
      'La categoría indicada no existe.'
    )
  }

  return getCategoryById(id)
}

function getCategoryById(id: number): Category {
  validateId(id)

  const database = getDatabase()

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
    .get(id) as CategoryRow | undefined

  if (!row) {
    throw new Error(
      'La categoría indicada no existe.'
    )
  }

  return mapCategory(row)
}