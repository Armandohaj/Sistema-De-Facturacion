import {
  useCallback,
  useEffect,
  useState,
  type FormEvent
} from 'react'

type PaymentMethod =
  | 'CASH'
  | 'CARD'
  | 'SINPE'

type SaleStatus =
  | 'COMPLETED'
  | 'CANCELED'

interface SaleHistoryItem {
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

interface SaleDetailItem {
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

interface SaleDetail
  extends SaleHistoryItem {
  items: SaleDetailItem[]
}

interface Message {
  type: 'success' | 'error'
  text: string
}

interface SalesHistoryPageProps {
  isAdmin: boolean
}

const currencyFormatter =
  new Intl.NumberFormat(
    'es-CR',
    {
      style: 'currency',
      currency: 'CRC',
      maximumFractionDigits: 0
    }
  )

const dateFormatter =
  new Intl.DateTimeFormat(
    'es-CR',
    {
      dateStyle: 'short',
      timeStyle: 'short'
    }
  )

function formatSaleNumber(
  id: number
): string {
  return String(id).padStart(
    6,
    '0'
  )
}

function formatDate(
  value: string
): string {
  const normalizedValue =
    value.includes('T')
      ? value
      : value.replace(
          ' ',
          'T'
        )

  const date =
    new Date(
      normalizedValue.endsWith('Z')
        ? normalizedValue
        : `${normalizedValue}Z`
    )

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value
  }

  return dateFormatter.format(
    date
  )
}

function getPaymentLabel(
  paymentMethod: PaymentMethod
): string {
  switch (paymentMethod) {
    case 'CASH':
      return 'Efectivo'

    case 'CARD':
      return 'Tarjeta'

    case 'SINPE':
      return 'SINPE'
  }
}

function SalesHistoryPage({
  isAdmin
}: SalesHistoryPageProps):
React.JSX.Element {
  const [
    sales,
    setSales
  ] =
    useState<SaleHistoryItem[]>(
      []
    )

  const [
    selectedSale,
    setSelectedSale
  ] =
    useState<SaleDetail | null>(
      null
    )

  const [
    saleNumber,
    setSaleNumber
  ] = useState('')

  const [
    selectedDate,
    setSelectedDate
  ] = useState('')

  const [
    loading,
    setLoading
  ] = useState(true)

  const [
    loadingDetail,
    setLoadingDetail
  ] = useState(false)

  const [
    canceling,
    setCanceling
  ] = useState(false)

  const [
    showCancelConfirmation,
    setShowCancelConfirmation
  ] = useState(false)

  const [
    message,
    setMessage
  ] =
    useState<Message | null>(
      null
    )

  const loadSales =
    useCallback(
      async (
        filters: {
          saleId?: number
          date?: string
        } = {}
      ): Promise<void> => {
        setLoading(true)
        setMessage(null)

        try {
          const result =
            await window.pos.sales
              .listHistory(
                filters
              )

          if (!result.success) {
            setMessage({
              type: 'error',
              text: result.message
            })

            return
          }

          setSales(
            result.data
          )
        } catch (
          error: unknown
        ) {
          console.error(
            '[sales-history] Error loading sales:',
            error
          )

          setMessage({
            type: 'error',
            text:
              'No se pudo cargar el historial de ventas.'
          })
        } finally {
          setLoading(false)
        }
      },
      []
    )

  useEffect(() => {
    void loadSales()
  }, [loadSales])

  function getCurrentFilters(): {
    saleId?: number
    date?: string
  } {
    const filters: {
      saleId?: number
      date?: string
    } = {}

    if (
      saleNumber.trim() !== ''
    ) {
      const parsedSaleId =
        Number(
          saleNumber
        )

      if (
        Number.isInteger(
          parsedSaleId
        ) &&
        parsedSaleId > 0
      ) {
        filters.saleId =
          parsedSaleId
      }
    }

    if (
      selectedDate !== ''
    ) {
      filters.date =
        selectedDate
    }

    return filters
  }

  async function handleSearch(
    event:
      FormEvent<HTMLFormElement>
  ): Promise<void> {
    event.preventDefault()

    const filters: {
      saleId?: number
      date?: string
    } = {}

    if (
      saleNumber.trim() !== ''
    ) {
      const parsedSaleId =
        Number(
          saleNumber
        )

      if (
        !Number.isInteger(
          parsedSaleId
        ) ||
        parsedSaleId <= 0
      ) {
        setMessage({
          type: 'error',
          text:
            'El número de venta no es válido.'
        })

        return
      }

      filters.saleId =
        parsedSaleId
    }

    if (
      selectedDate !== ''
    ) {
      filters.date =
        selectedDate
    }

    setSelectedSale(null)
    setShowCancelConfirmation(
      false
    )

    await loadSales(
      filters
    )
  }

  async function clearFilters():
  Promise<void> {
    setSaleNumber('')
    setSelectedDate('')
    setSelectedSale(null)

    setShowCancelConfirmation(
      false
    )

    await loadSales()
  }

  async function openSaleDetail(
    saleId: number
  ): Promise<void> {
    setLoadingDetail(true)
    setMessage(null)

    setShowCancelConfirmation(
      false
    )

    try {
      const result =
        await window.pos.sales
          .getDetail(
            saleId
          )

      if (!result.success) {
        setMessage({
          type: 'error',
          text: result.message
        })

        return
      }

      setSelectedSale(
        result.data
      )
    } catch (
      error: unknown
    ) {
      console.error(
        '[sales-history] Error loading detail:',
        error
      )

      setMessage({
        type: 'error',
        text:
          'No se pudo cargar el detalle de la venta.'
      })
    } finally {
      setLoadingDetail(
        false
      )
    }
  }

  async function cancelSelectedSale():
  Promise<void> {
    if (
      !selectedSale ||
      selectedSale.status !==
        'COMPLETED' ||
      canceling
    ) {
      return
    }

    setCanceling(true)
    setMessage(null)

    try {
      const result =
        await window.pos.sales
          .cancel(
            selectedSale.id
          )

      if (!result.success) {
        setMessage({
          type: 'error',
          text: result.message
        })

        return
      }

      setSelectedSale(
        result.data
      )

      setShowCancelConfirmation(
        false
      )

      setMessage({
        type: 'success',
        text:
          `Venta #${formatSaleNumber(
            result.data.id
          )} cancelada correctamente. El inventario fue restaurado.`
      })

      await loadSales(
        getCurrentFilters()
      )
    } catch (
      error: unknown
    ) {
      console.error(
        '[sales-history] Error canceling sale:',
        error
      )

      setMessage({
        type: 'error',
        text:
          'No se pudo cancelar la venta.'
      })
    } finally {
      setCanceling(false)
    }
  }

  return (
    <main className="page">
      <header className="page-header">
        <div>
          <h1>
            Historial de ventas
          </h1>

          <p>
            Consulta las ventas
            registradas en el sistema.
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

      <section className="card">
        <div className="card-header">
          <div>
            <h2>
              Buscar ventas
            </h2>

            <p>
              Busca por número,
              fecha o ambos.
            </p>
          </div>
        </div>

        <form
          className="history-filters"
          onSubmit={
            handleSearch
          }
        >
          <label>
            Número de venta

            <input
              type="number"
              min="1"
              step="1"
              placeholder="Ejemplo: 1"
              value={
                saleNumber
              }
              onChange={
                (event) =>
                  setSaleNumber(
                    event.target.value
                  )
              }
            />
          </label>

          <label>
            Fecha

            <input
              type="date"
              value={
                selectedDate
              }
              onChange={
                (event) =>
                  setSelectedDate(
                    event.target.value
                  )
              }
            />
          </label>

          <div className="history-filter-actions">
            <button
              type="submit"
              className="button button-primary"
              disabled={
                loading
              }
            >
              Buscar
            </button>

            <button
              type="button"
              className="button button-secondary"
              disabled={
                loading
              }
              onClick={() =>
                void clearFilters()
              }
            >
              Limpiar
            </button>
          </div>
        </form>
      </section>

      <section className="card">
        <div className="card-header">
          <div>
            <h2>
              Ventas registradas
            </h2>

            <p>
              {sales.length}{' '}
              {sales.length === 1
                ? 'venta encontrada'
                : 'ventas encontradas'}
            </p>
          </div>

          <button
            type="button"
            className="button button-secondary"
            disabled={
              loading
            }
            onClick={() =>
              void loadSales(
                getCurrentFilters()
              )
            }
          >
            Actualizar
          </button>
        </div>

        {loading ? (
          <p className="empty-state">
            Cargando ventas...
          </p>
        ) : sales.length === 0 ? (
          <p className="empty-state">
            No se encontraron ventas.
          </p>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Venta</th>
                  <th>Fecha</th>
                  <th>Vendedor</th>
                  <th>Pago</th>
                  <th>Total</th>
                  <th>Estado</th>
                  <th>Acción</th>
                </tr>
              </thead>

              <tbody>
                {sales.map(
                  (sale) => (
                    <tr
                      key={
                        sale.id
                      }
                      className={
                        sale.status ===
                        'CANCELED'
                          ? 'inactive-row'
                          : ''
                      }
                    >
                      <td>
                        <strong>
                          #
                          {formatSaleNumber(
                            sale.id
                          )}
                        </strong>
                      </td>

                      <td>
                        {formatDate(
                          sale.createdAt
                        )}
                      </td>

                      <td>
                        {
                          sale.createdByUsername
                        }
                      </td>

                      <td>
                        {getPaymentLabel(
                          sale.paymentMethod
                        )}
                      </td>

                      <td>
                        <strong>
                          {currencyFormatter.format(
                            sale.total
                          )}
                        </strong>
                      </td>

                      <td>
                        <span
                          className={
                            `status ${
                              sale.status ===
                              'COMPLETED'
                                ? 'status-active'
                                : 'status-inactive'
                            }`
                          }
                        >
                          {sale.status ===
                          'COMPLETED'
                            ? 'Completada'
                            : 'Cancelada'}
                        </span>
                      </td>

                      <td>
                        <button
                          type="button"
                          className="text-button"
                          disabled={
                            loadingDetail
                          }
                          onClick={() =>
                            void openSaleDetail(
                              sale.id
                            )
                          }
                        >
                          Ver detalle
                        </button>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selectedSale && (
        <div className="modal-backdrop">
          <section
            className="confirm-modal sale-detail-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="sale-detail-title"
          >
            <div className="sale-detail-header">
              <div>
                <h2 id="sale-detail-title">
                  Venta #
                  {formatSaleNumber(
                    selectedSale.id
                  )}
                </h2>

                <p>
                  {formatDate(
                    selectedSale.createdAt
                  )}
                </p>
              </div>

              <span
                className={
                  `status ${
                    selectedSale.status ===
                    'COMPLETED'
                      ? 'status-active'
                      : 'status-inactive'
                  }`
                }
              >
                {selectedSale.status ===
                'COMPLETED'
                  ? 'Completada'
                  : 'Cancelada'}
              </span>
            </div>

            <div className="sale-detail-info">
            <div className="sale-detail-info-row">
                <span>
                Vendedor:
                </span>

                <strong>
                {selectedSale.createdByUsername}
                </strong>
            </div>

            <div className="sale-detail-info-row">
                <span>
                Método de pago:
                </span>

                <strong>
                {getPaymentLabel(
                    selectedSale.paymentMethod
                )}
                </strong>
            </div>
            </div>

            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Precio</th>
                    <th>Cant.</th>
                    <th>Desc.</th>
                    <th>Total</th>
                  </tr>
                </thead>

                <tbody>
                  {selectedSale.items.map(
                    (item) => (
                      <tr
                        key={
                          item.id
                        }
                      >
                        <td>
                          {
                            item.categoryName
                          }
                        </td>

                        <td>
                          {currencyFormatter.format(
                            item.unitPrice
                          )}
                        </td>

                        <td>
                          {
                            item.quantity
                          }
                        </td>

                        <td>
                          {
                            item.discountPercent
                          }
                          %
                        </td>

                        <td>
                          <strong>
                            {currencyFormatter.format(
                              item.total
                            )}
                          </strong>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>

            <div className="sale-summary">
              <div>
                <span>
                  Subtotal
                </span>

                <strong>
                  {currencyFormatter.format(
                    selectedSale.subtotal
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
                    selectedSale.discountTotal
                  )}
                </strong>
              </div>

              <div className="sale-total">
                <span>
                  Total
                </span>

                <strong>
                  {currencyFormatter.format(
                    selectedSale.total
                  )}
                </strong>
              </div>
            </div>

                {selectedSale.status ===
                'CANCELED' && (
                <div className="sale-cancellation-info">
                    <strong>
                    Venta cancelada
                    </strong>

                    {selectedSale.canceledAt && (
                    <span>
                        {formatDate(
                        selectedSale.canceledAt
                        )}
                    </span>
                    )}

                    {selectedSale.canceledByUsername && (
                    <span>
                        Por:{' '}
                        <strong>
                        {selectedSale.canceledByUsername}
                        </strong>
                    </span>
                    )}
                </div>
                )}

            {showCancelConfirmation &&
              selectedSale.status ===
                'COMPLETED' && (
                <div className="sale-cancel-confirmation">
                  <strong>
                    ¿Confirmar cancelación?
                  </strong>

                  <p>
                    Esta acción marcará la venta
                    como cancelada y devolverá
                    automáticamente todos los
                    productos al inventario.
                  </p>

                  <p>
                    La venta no será eliminada
                    del historial.
                  </p>
                </div>
              )}

            <div className="modal-actions">
              {isAdmin &&
                selectedSale.status ===
                  'COMPLETED' &&
                !showCancelConfirmation && (
                  <button
                    type="button"
                    className="button button-danger"
                    disabled={
                      canceling
                    }
                    onClick={() =>
                      setShowCancelConfirmation(
                        true
                      )
                    }
                  >
                    Cancelar venta
                  </button>
                )}

              {showCancelConfirmation &&
                selectedSale.status ===
                  'COMPLETED' && (
                  <>
                    <button
                      type="button"
                      className="button button-secondary"
                      disabled={
                        canceling
                      }
                      onClick={() =>
                        setShowCancelConfirmation(
                          false
                        )
                      }
                    >
                      Volver
                    </button>

                    <button
                      type="button"
                      className="button button-danger"
                      disabled={
                        canceling
                      }
                      onClick={() =>
                        void cancelSelectedSale()
                      }
                    >
                      {canceling
                        ? 'Cancelando...'
                        : 'Confirmar cancelación'}
                    </button>
                  </>
                )}

              {!showCancelConfirmation && (
                <button
                  type="button"
                  className="button button-secondary"
                  disabled={
                    canceling
                  }
                  onClick={() => {
                    setSelectedSale(
                      null
                    )

                    setShowCancelConfirmation(
                      false
                    )
                  }}
                >
                  Cerrar
                </button>
              )}
            </div>
          </section>
        </div>
      )}
    </main>
  )
}

export default SalesHistoryPage