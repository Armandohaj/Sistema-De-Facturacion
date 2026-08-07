import {
  getDatabase
} from '../database/connection'

export type PaymentMethod =
  | 'CASH'
  | 'CARD'
  | 'SINPE'

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

  status:
    | 'COMPLETED'
    | 'CANCELED'

  paymentMethod:
    PaymentMethod

  subtotal: number

  discountTotal:
    number

  total: number

  createdBy:
    number

  createdByUsername:
    string

  createdAt:
    string

  items:
    SaleItem[]
}

interface CategoryRow {
  id: number
  name: string
  price: number
  stock: number
  discount_percent: number
  active: number
}

interface CalculatedSaleItem {
  categoryId: number
  categoryName: string
  unitPrice: number
  discountPercent: number
  quantity: number
  stockBefore: number
  stockAfter: number
  subtotal: number
  discountTotal: number
  total: number
}

interface SaleRow {
  id: number

  status:
    'COMPLETED'
    | 'CANCELED'

  payment_method:
    PaymentMethod

  subtotal:
    number

  discount_total:
    number

  total:
    number

  created_by:
    number

  created_by_username:
    string

  created_at:
    string
}

interface SaleItemRow {
  id: number

  category_id:
    number

  category_name:
    string

  unit_price:
    number

  discount_percent:
    number

  quantity:
    number

  subtotal:
    number

  discount_total:
    number

  total:
    number
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

function validatePaymentMethod(
  paymentMethod: unknown
): asserts paymentMethod is PaymentMethod {
  if (
    paymentMethod !== 'CASH' &&
    paymentMethod !== 'CARD' &&
    paymentMethod !== 'SINPE'
  ) {
    throw new Error(
      'El método de pago no es válido.'
    )
  }
}

function validateItems(
  items: unknown
): asserts items is CreateSaleItemInput[] {
  if (
    !Array.isArray(items) ||
    items.length === 0
  ) {
    throw new Error(
      'La venta debe contener al menos un producto.'
    )
  }

  if (
    items.length > 100
  ) {
    throw new Error(
      'La venta contiene demasiados productos.'
    )
  }

  const categoryIds =
    new Set<number>()

  for (const item of items) {
    if (
      !Number.isInteger(
        item?.categoryId
      ) ||
      item.categoryId <= 0
    ) {
      throw new Error(
        'Una categoría de la venta no es válida.'
      )
    }

    if (
      !Number.isInteger(
        item?.quantity
      ) ||
      item.quantity <= 0
    ) {
      throw new Error(
        'Las cantidades deben ser números enteros mayores que cero.'
      )
    }

    if (
      item.quantity > 999
    ) {
      throw new Error(
        'La cantidad solicitada es demasiado alta.'
      )
    }

    if (
      categoryIds.has(
        item.categoryId
      )
    ) {
      throw new Error(
        'Una categoría está repetida en la venta.'
      )
    }

    categoryIds.add(
      item.categoryId
    )
  }
}

function calculateItem(
  category:
    CategoryRow,

  quantity:
    number
): CalculatedSaleItem {
  if (
    category.active !== 1
  ) {
    throw new Error(
      `"${category.name}" está inactiva y no puede venderse.`
    )
  }

  if (
    category.stock <
    quantity
  ) {
    throw new Error(
      `No hay suficientes existencias de "${category.name}". Disponible: ${category.stock}.`
    )
  }

  const subtotal =
    category.price *
    quantity

  /*
   * Costa Rica utiliza colones,
   * por lo que guardamos valores
   * enteros.
   */
  const discountTotal =
    Math.round(
      subtotal *
      category.discount_percent /
      100
    )

  const total =
    subtotal -
    discountTotal

  return {
    categoryId:
      category.id,

    categoryName:
      category.name,

    unitPrice:
      category.price,

    discountPercent:
      category.discount_percent,

    quantity,

    stockBefore:
      category.stock,

    stockAfter:
      category.stock -
      quantity,

    subtotal,
    discountTotal,
    total
  }
}

function getSaleById(
  saleId: number
): Sale {
  const database =
    getDatabase()

  const saleRow =
    database
      .prepare(`
        SELECT
          sales.id,
          sales.status,
          sales.payment_method,
          sales.subtotal,
          sales.discount_total,
          sales.total,
          sales.created_by,

          users.username
            AS created_by_username,

          sales.created_at

        FROM sales

        INNER JOIN users
          ON users.id =
             sales.created_by

        WHERE sales.id = ?
      `)
      .get(
        saleId
      ) as
        | SaleRow
        | undefined

  if (!saleRow) {
    throw new Error(
      'La venta no existe.'
    )
  }

  const itemRows =
    database
      .prepare(`
        SELECT
          id,
          category_id,
          category_name,
          unit_price,
          discount_percent,
          quantity,
          subtotal,
          discount_total,
          total
        FROM sale_items
        WHERE sale_id = ?
        ORDER BY id
      `)
      .all(
        saleId
      ) as SaleItemRow[]

  return {
    id:
      saleRow.id,

    status:
      saleRow.status,

    paymentMethod:
      saleRow.payment_method,

    subtotal:
      saleRow.subtotal,

    discountTotal:
      saleRow.discount_total,

    total:
      saleRow.total,

    createdBy:
      saleRow.created_by,

    createdByUsername:
      saleRow.created_by_username,

    createdAt:
      saleRow.created_at,

    items:
      itemRows.map(
        (item) => ({
          id:
            item.id,

          categoryId:
            item.category_id,

          categoryName:
            item.category_name,

          unitPrice:
            item.unit_price,

          discountPercent:
            item.discount_percent,

          quantity:
            item.quantity,

          subtotal:
            item.subtotal,

          discountTotal:
            item.discount_total,

          total:
            item.total
        })
      )
  }
}

export function createSale(
  input: CreateSaleInput,
  userId: number
): Sale {
  validateUserId(
    userId
  )

  validatePaymentMethod(
    input?.paymentMethod
  )

  validateItems(
    input?.items
  )

  const database =
    getDatabase()

  /*
   * Preparamos las consultas una vez.
   */
  const findCategory =
    database.prepare(`
      SELECT
        id,
        name,
        price,
        stock,
        discount_percent,
        active
      FROM categories
      WHERE id = ?
    `)

  const insertSale =
    database.prepare(`
      INSERT INTO sales (
        status,
        payment_method,
        subtotal,
        discount_total,
        total,
        created_by
      )
      VALUES (
        'COMPLETED',
        ?,
        ?,
        ?,
        ?,
        ?
      )
    `)

  const insertSaleItem =
    database.prepare(`
      INSERT INTO sale_items (
        sale_id,
        category_id,
        category_name,
        unit_price,
        discount_percent,
        quantity,
        subtotal,
        discount_total,
        total
      )
      VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?
      )
    `)

  const updateStock =
    database.prepare(`
      UPDATE categories
      SET
        stock = stock - ?,
        updated_at =
          CURRENT_TIMESTAMP
      WHERE id = ?
        AND stock >= ?
    `)

  const insertMovement =
    database.prepare(`
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
        'SALE',
        ?,
        ?,
        ?,
        ?,
        ?,
        ?
      )
    `)

  /*
   * ESTA ES LA PARTE MÁS IMPORTANTE.
   *
   * Todo sucede dentro de una sola
   * transacción.
   */
  const saveSale =
    database.transaction(() => {
      const calculatedItems:
        CalculatedSaleItem[] = []

      for (
        const inputItem
        of input.items
      ) {
        /*
         * No confiamos en el precio,
         * descuento ni stock enviados
         * por React.
         *
         * Los leemos nuevamente
         * directamente de SQLite.
         */
        const category =
          findCategory.get(
            inputItem.categoryId
          ) as
            | CategoryRow
            | undefined

        if (!category) {
          throw new Error(
            'Una categoría seleccionada ya no existe.'
          )
        }

        calculatedItems.push(
          calculateItem(
            category,
            inputItem.quantity
          )
        )
      }

      const subtotal =
        calculatedItems.reduce(
          (
            accumulator,
            item
          ) =>
            accumulator +
            item.subtotal,
          0
        )

      const discountTotal =
        calculatedItems.reduce(
          (
            accumulator,
            item
          ) =>
            accumulator +
            item.discountTotal,
          0
        )

      const total =
        subtotal -
        discountTotal

      const saleResult =
        insertSale.run(
          input.paymentMethod,
          subtotal,
          discountTotal,
          total,
          userId
        )

      const saleId =
        Number(
          saleResult.lastInsertRowid
        )

      for (
        const item
        of calculatedItems
      ) {
        insertSaleItem.run(
          saleId,
          item.categoryId,
          item.categoryName,
          item.unitPrice,
          item.discountPercent,
          item.quantity,
          item.subtotal,
          item.discountTotal,
          item.total
        )

        /*
         * El WHERE stock >= ?
         * agrega otra protección contra
         * inventario negativo.
         */
        const stockResult =
          updateStock.run(
            item.quantity,
            item.categoryId,
            item.quantity
          )

        if (
          stockResult.changes !== 1
        ) {
          throw new Error(
            `No hay suficientes existencias de "${item.categoryName}".`
          )
        }

        insertMovement.run(
          item.categoryId,

          -item.quantity,

          item.stockBefore,

          item.stockAfter,

          `Venta #${saleId}`,

          userId,

          saleId
        )
      }

      return saleId
    })

  const saleId =
    saveSale()

  return getSaleById(
    saleId
  )
}