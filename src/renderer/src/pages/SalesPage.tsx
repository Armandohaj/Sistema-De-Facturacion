import {
  useCallback,
  useEffect,
  useMemo,
  useState
} from 'react'

type PaymentMethod =
  | 'CASH'
  | 'CARD'
  | 'SINPE'

interface Category {
  id: number
  name: string
  price: number
  stock: number
  discountPercent: number
  active: boolean
}

interface CartItem {
  category: Category
  quantity: number
}

interface Message {
  type: 'success' | 'error'
  text: string
}

const currencyFormatter = new Intl.NumberFormat(
  'es-CR',
  {
    style: 'currency',
    currency: 'CRC',
    maximumFractionDigits: 0
  }
)

function formatSaleNumber(
  id: number
): string {
  return String(id).padStart(6, '0')
}

function calculateLine(
  item: CartItem
): {
  subtotal: number
  discount: number
  total: number
} {
  const subtotal =
    item.category.price *
    item.quantity

  const discount = Math.round(
    subtotal *
      item.category.discountPercent /
      100
  )

  return {
    subtotal,
    discount,
    total: subtotal - discount
  }
}

function SalesPage(): React.JSX.Element {
  const [
    categories,
    setCategories
  ] = useState<Category[]>([])

  const [
    cart,
    setCart
  ] = useState<CartItem[]>([])

  const [
    paymentMethod,
    setPaymentMethod
  ] = useState<PaymentMethod>('CASH')

  const [
    loading,
    setLoading
  ] = useState(true)

  const [
    saving,
    setSaving
  ] = useState(false)

  const [
    message,
    setMessage
  ] = useState<Message | null>(null)

  const [
    showConfirmSale,
    setShowConfirmSale
  ] = useState(false)

  const loadCategories =
    useCallback(
      async (): Promise<void> => {
        setLoading(true)

        try {
          const result =
            await window.pos.categories.list()

          if (!result.success) {
            setMessage({
              type: 'error',
              text: result.message
            })

            return
          }

          setCategories(
            result.data.filter(
              (category) =>
                category.active
            )
          )
        } catch (error: unknown) {
          console.error(
            '[sales] Error loading categories:',
            error
          )

          setMessage({
            type: 'error',
            text:
              'No se pudieron cargar los productos.'
          })
        } finally {
          setLoading(false)
        }
      },
      []
    )

  useEffect(() => {
    void loadCategories()
  }, [loadCategories])

  function addCategory(
    category: Category
  ): void {
    setMessage(null)

    if (category.stock <= 0) {
      setMessage({
        type: 'error',
        text:
          `"${category.name}" no tiene existencias.`
      })

      return
    }

    setCart(
      (currentCart) => {
        const existingItem =
          currentCart.find(
            (item) =>
              item.category.id ===
              category.id
          )

        if (!existingItem) {
          return [
            ...currentCart,
            {
              category,
              quantity: 1
            }
          ]
        }

        if (
          existingItem.quantity >=
          category.stock
        ) {
          setMessage({
            type: 'error',
            text:
              `Solo hay ${category.stock} unidades disponibles de "${category.name}".`
          })

          return currentCart
        }

        return currentCart.map(
          (item) =>
            item.category.id ===
            category.id
              ? {
                  ...item,
                  quantity:
                    item.quantity + 1
                }
              : item
        )
      }
    )
  }

  function increaseQuantity(
    categoryId: number
  ): void {
    const category =
      categories.find(
        (item) =>
          item.id === categoryId
      )

    if (!category) {
      return
    }

    addCategory(category)
  }

  function decreaseQuantity(
    categoryId: number
  ): void {
    setMessage(null)

    setCart(
      (currentCart) =>
        currentCart
          .map(
            (item) =>
              item.category.id ===
              categoryId
                ? {
                    ...item,
                    quantity:
                      item.quantity - 1
                  }
                : item
          )
          .filter(
            (item) =>
              item.quantity > 0
          )
    )
  }

  function removeItem(
    categoryId: number
  ): void {
    setMessage(null)

    setCart(
      (currentCart) =>
        currentCart.filter(
          (item) =>
            item.category.id !==
            categoryId
        )
    )
  }

  function clearCart(): void {
    setCart([])
    setPaymentMethod('CASH')
    setMessage(null)
  }

  const totals =
    useMemo(() => {
      let subtotal = 0
      let discount = 0

      for (const item of cart) {
        const line =
          calculateLine(item)

        subtotal +=
          line.subtotal

        discount +=
          line.discount
      }

      return {
        subtotal,
        discount,
        total:
          subtotal -
          discount
      }
    }, [cart])

  async function finalizeSale():
  Promise<void> {
    if (cart.length === 0) {
      setMessage({
        type: 'error',
        text:
          'Debes agregar al menos un producto.'
      })

      return
    }

    setSaving(true)
    setMessage(null)

    try {
      const result =
        await window.pos.sales.create({
          paymentMethod,

          items:
            cart.map(
              (item) => ({
                categoryId:
                  item.category.id,

                quantity:
                  item.quantity
              })
            )
        })

      if (!result.success) {
        setMessage({
          type: 'error',
          text: result.message
        })

        return
      }

      setShowConfirmSale(false)

      setMessage({
        type: 'success',

        text:
          `Venta #${formatSaleNumber(
            result.data.id
          )} guardada correctamente. Total: ${currencyFormatter.format(
            result.data.total
          )}`
      })

      setCart([])
      setPaymentMethod('CASH')

      await loadCategories()
    } catch (error: unknown) {
      console.error(
        '[sales] Error creating sale:',
        error
      )

      setShowConfirmSale(false)

      setMessage({
        type: 'error',
        text:
          'No se pudo finalizar la venta.'
      })
    } finally {
      setSaving(false)
    }
  }

  function openSaleConfirmation():
  void {
    if (cart.length === 0) {
      setMessage({
        type: 'error',
        text:
          'Debes agregar al menos un producto.'
      })

      return
    }

    setMessage(null)
    setShowConfirmSale(true)
  }

  function closeSaleConfirmation():
  void {
    if (saving) {
      return
    }

    setShowConfirmSale(false)
  }

  return (
    <main className="page">
      <header className="page-header">
        <div>
          <h1>
            Realizar venta
          </h1>

          <p>
            Selecciona las categorías
            que desea comprar el cliente.
          </p>
        </div>
      </header>

      {message && (
        <div
          className={
            `message message-${message.type}`
          }
          role="alert"
        >
          {message.text}
        </div>
      )}

      <section className="sales-layout">
        <article className="card">
          <div className="card-header">
            <div>
              <h2>
                Productos
              </h2>

              <p>
                Presiona una categoría
                para agregar una unidad.
              </p>
            </div>

            <button
              type="button"
              className="button button-secondary"
              disabled={loading}
              onClick={() =>
                void loadCategories()
              }
            >
              Actualizar
            </button>
          </div>

          {loading ? (
            <p className="empty-state">
              Cargando productos...
            </p>
          ) : categories.length === 0 ? (
            <p className="empty-state">
              No hay categorías disponibles.
            </p>
          ) : (
            <div className="product-grid">
              {categories.map(
                (category) => (
                  <button
                    key={category.id}
                    type="button"
                    className="product-button"
                    disabled={
                      category.stock <= 0
                    }
                    onClick={() =>
                      addCategory(
                        category
                      )
                    }
                  >
                    <strong>
                      {category.name}
                    </strong>

                    <span>
                      {currencyFormatter.format(
                        category.price
                      )}
                    </span>

                    {category.discountPercent >
                      0 && (
                      <span className="product-discount">
                        {
                          category.discountPercent
                        }
                        % descuento
                      </span>
                    )}

                    <small>
                      Disponible:{' '}
                      {category.stock}
                    </small>
                  </button>
                )
              )}
            </div>
          )}
        </article>

        <aside className="card sale-cart">
          <div className="card-header">
            <div>
              <h2>
                Venta actual
              </h2>

              <p>
                {cart.length === 0
                  ? 'Sin productos'
                  : `${cart.length} ${
                      cart.length === 1
                        ? 'producto'
                        : 'productos'
                    }`}
              </p>
            </div>

            {cart.length > 0 && (
              <button
                type="button"
                className="text-button"
                disabled={saving}
                onClick={
                  clearCart
                }
              >
                Vaciar
              </button>
            )}
          </div>

          {cart.length === 0 ? (
            <p className="empty-state">
              No hay productos agregados.
            </p>
          ) : (
            <div className="cart-items">
              {cart.map(
                (item) => {
                  const line =
                    calculateLine(
                      item
                    )

                  return (
                    <div
                      key={
                        item.category.id
                      }
                      className="cart-item"
                    >
                      <div className="cart-item-header">
                        <div>
                          <strong>
                            {
                              item.category
                                .name
                            }
                          </strong>

                          <small>
                            {currencyFormatter.format(
                              item.category
                                .price
                            )}
                            {' '}c/u
                          </small>
                        </div>

                        <button
                          type="button"
                          className="text-button"
                          disabled={saving}
                          onClick={() =>
                            removeItem(
                              item.category
                                .id
                            )
                          }
                        >
                          Quitar
                        </button>
                      </div>

                      <div className="cart-item-controls">
                        <button
                          type="button"
                          className="quantity-button"
                          disabled={saving}
                          aria-label={
                            `Disminuir ${item.category.name}`
                          }
                          onClick={() =>
                            decreaseQuantity(
                              item.category
                                .id
                            )
                          }
                        >
                          −
                        </button>

                        <span>
                          {item.quantity}
                        </span>

                        <button
                          type="button"
                          className="quantity-button"
                          disabled={
                            saving ||
                            item.quantity >=
                              item.category
                                .stock
                          }
                          aria-label={
                            `Aumentar ${item.category.name}`
                          }
                          onClick={() =>
                            increaseQuantity(
                              item.category
                                .id
                            )
                          }
                        >
                          +
                        </button>

                        <strong>
                          {currencyFormatter.format(
                            line.total
                          )}
                        </strong>
                      </div>

                      {line.discount >
                        0 && (
                        <small className="discount-detail">
                          Descuento:{' '}
                          -
                          {currencyFormatter.format(
                            line.discount
                          )}
                        </small>
                      )}
                    </div>
                  )
                }
              )}
            </div>
          )}

          <div className="sale-summary">
            <div>
              <span>
                Subtotal
              </span>

              <strong>
                {currencyFormatter.format(
                  totals.subtotal
                )}
              </strong>
            </div>

            <div>
              <span>
                Descuentos
              </span>

              <strong>
                -
                {currencyFormatter.format(
                  totals.discount
                )}
              </strong>
            </div>

            <div className="sale-total">
              <span>
                Total
              </span>

              <strong>
                {currencyFormatter.format(
                  totals.total
                )}
              </strong>
            </div>
          </div>

          <label>
            Método de pago

            <select
              value={paymentMethod}
              disabled={
                saving
              }
              onChange={(event) =>
                setPaymentMethod(
                  event.target
                    .value as
                    PaymentMethod
                )
              }
            >
              <option value="CASH">
                Efectivo
              </option>

              <option value="CARD">
                Tarjeta
              </option>

              <option value="SINPE">
                SINPE
              </option>
            </select>
          </label>

          <button
            type="button"
            className="button button-primary finalize-sale-button"
            disabled={
              cart.length === 0 ||
              saving
            }
            onClick={
              openSaleConfirmation
            }
          >
            Finalizar venta
          </button>
        </aside>
      </section>

      {showConfirmSale && (
        <div
          className="modal-backdrop"
          role="presentation"
        >
          <section
            className="confirm-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-sale-title"
          >
            <h2 id="confirm-sale-title">
              Confirmar venta
            </h2>

            <p>
              ¿Deseas finalizar esta venta por{' '}
              <strong>
                {currencyFormatter.format(
                  totals.total
                )}
              </strong>
              ?
            </p>

            <div className="confirm-sale-details">
              <div>
                <span>
                  Productos
                </span>

                <strong>
                  {cart.reduce(
                    (
                      total,
                      item
                    ) =>
                      total +
                      item.quantity,
                    0
                  )}
                </strong>
              </div>

              <div>
                <span>
                  Método de pago
                </span>

                <strong>
                  {paymentMethod ===
                  'CASH'
                    ? 'Efectivo'
                    : paymentMethod ===
                        'CARD'
                      ? 'Tarjeta'
                      : 'SINPE'}
                </strong>
              </div>

              {totals.discount >
                0 && (
                <div>
                  <span>
                    Descuento
                  </span>

                  <strong>
                    -
                    {currencyFormatter.format(
                      totals.discount
                    )}
                  </strong>
                </div>
              )}
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="button button-secondary"
                disabled={saving}
                onClick={
                  closeSaleConfirmation
                }
              >
                Cancelar
              </button>

              <button
                type="button"
                className="button button-primary"
                disabled={saving}
                onClick={() =>
                  void finalizeSale()
                }
              >
                {saving
                  ? 'Guardando...'
                  : 'Confirmar venta'}
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  )
}

export default SalesPage