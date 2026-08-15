import {
  useCallback,
  useEffect,
  useMemo,
  useState
} from 'react'

interface PaymentSummary {
  cash: number
  card: number
  sinpe: number
}

interface ProductSummary {
  categoryId: number
  categoryName: string
  quantity: number
  total: number
}

interface DailySummary {
  date: string
  completedSalesCount: number
  canceledSalesCount: number
  total: number
  paymentMethods: PaymentSummary
  mostSold: ProductSummary | null
  leastSold: ProductSummary | null
}

type CashClosingStatus =
  | 'CLOSED'
  | 'REOPENED'

type CashClosingEventType =
  | 'CLOSED'
  | 'REOPENED'

interface CashClosing {
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

interface CashClosingEvent {
  id: number
  cashClosingId: number

  eventType:
    CashClosingEventType

  userId: number
  username: string

  reason: string | null

  createdAt: string
}

interface CashClosingDay {
  summary: DailySummary
  closing: CashClosing | null
  events: CashClosingEvent[]
}

interface Message {
  type: 'success' | 'error'
  text: string
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

const dateTimeFormatter =
  new Intl.DateTimeFormat(
    'es-CR',
    {
      dateStyle: 'medium',
      timeStyle: 'short'
    }
  )

function getLocalDateKey():
string {
  const date =
    new Date()

  const year =
    date.getFullYear()

  const month =
    String(
      date.getMonth() + 1
    ).padStart(
      2,
      '0'
    )

  const day =
    String(
      date.getDate()
    ).padStart(
      2,
      '0'
    )

  return `${year}-${month}-${day}`
}

function formatDate(
  date: string
): string {
  const parsed =
    new Date(
      `${date}T00:00:00`
    )

  return new Intl.DateTimeFormat(
    'es-CR',
    {
      dateStyle: 'full'
    }
  ).format(
    parsed
  )
}

function formatStoredDateTime(
  value: string
): string {
  const normalized =
    value.includes('T')
      ? value
      : value.replace(
          ' ',
          'T'
        )

  const date =
    new Date(
      `${normalized}Z`
    )

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value
  }

  return dateTimeFormatter.format(
    date
  )
}

function parseMoneyInput(
  value: string
): number | null {
  if (
    value.trim() === ''
  ) {
    return null
  }

  const parsed =
    Number(value)

  if (
    !Number.isInteger(
      parsed
    ) ||
    parsed < 0
  ) {
    return null
  }

  return parsed
}

function CashClosingPage():
React.JSX.Element {
  const today =
    getLocalDateKey()

  const [
    selectedDate,
    setSelectedDate
  ] = useState(
    today
  )

  const [
    day,
    setDay
  ] =
    useState<
      CashClosingDay | null
    >(null)

  const [
    openingCash,
    setOpeningCash
  ] = useState('0')

  const [
    countedCash,
    setCountedCash
  ] = useState('')

  const [
    loading,
    setLoading
  ] = useState(true)

  const [
    saving,
    setSaving
  ] = useState(false)

  const [
    reopening,
    setReopening
  ] = useState(false)

  const [
    message,
    setMessage
  ] =
    useState<
      Message | null
    >(null)

  const [
    showClosingConfirmation,
    setShowClosingConfirmation
  ] = useState(false)

  const [
    showReopenConfirmation,
    setShowReopenConfirmation
  ] = useState(false)

  const [
    reopenReason,
    setReopenReason
  ] = useState('')

  const loadDay =
    useCallback(
      async (
        date: string,
        clearMessage = true
      ): Promise<void> => {
        setLoading(true)

        if (
          clearMessage
        ) {
          setMessage(null)
        }

        try {
          const result =
            await window.pos
              .cashClosing
              .getDay(
                date
              )

          if (!result.success) {
            setMessage({
              type: 'error',
              text:
                result.message
            })

            setDay(null)

            return
          }

          setDay(
            result.data
          )

          const closing =
            result.data.closing

          if (
            closing
          ) {
            setOpeningCash(
              String(
                closing.openingCash
              )
            )

            /*
             * Si está reabierta,
             * obligamos a volver a
             * contar el efectivo antes
             * del siguiente cierre.
             */
            if (
              closing.status ===
              'REOPENED'
            ) {
              setCountedCash(
                ''
              )
            } else {
              setCountedCash(
                String(
                  closing.countedCash
                )
              )
            }
          } else {
            setOpeningCash(
              '0'
            )

            setCountedCash(
              ''
            )
          }
        } catch (
          error: unknown
        ) {
          console.error(
            '[cash-closing] Error loading day:',
            error
          )

          setMessage({
            type: 'error',
            text:
              'No se pudo cargar el resumen del día.'
          })

          setDay(null)
        } finally {
          setLoading(false)
        }
      },
      []
    )

  useEffect(() => {
    void loadDay(
      selectedDate
    )
  }, [
    selectedDate,
    loadDay
  ])

  const isClosed =
    day?.closing?.status ===
    'CLOSED'

  const isReopened =
    day?.closing?.status ===
    'REOPENED'

  const openingCashValue =
    useMemo(
      () =>
        parseMoneyInput(
          openingCash
        ),
      [
        openingCash
      ]
    )

  const countedCashValue =
    useMemo(
      () =>
        parseMoneyInput(
          countedCash
        ),
      [
        countedCash
      ]
    )

  const expectedCash =
    useMemo(
      () => {
        if (
          !day ||
          openingCashValue ===
            null
        ) {
          return null
        }

        return (
          openingCashValue +
          day.summary
            .paymentMethods
            .cash
        )
      },
      [
        day,
        openingCashValue
      ]
    )

  const difference =
    useMemo(
      () => {
        if (
          expectedCash === null ||
          countedCashValue ===
            null
        ) {
          return null
        }

        return (
          countedCashValue -
          expectedCash
        )
      },
      [
        countedCashValue,
        expectedCash
      ]
    )

  function handleOpenClosingConfirmation():
  void {
    setMessage(null)

    if (
      !day ||
      isClosed
    ) {
      return
    }

    if (
      openingCashValue ===
      null
    ) {
      setMessage({
        type: 'error',
        text:
          'El fondo inicial debe ser un monto entero mayor o igual a cero.'
      })

      return
    }

    if (
      countedCashValue ===
      null
    ) {
      setMessage({
        type: 'error',
        text:
          'Debes indicar cuánto efectivo fue contado físicamente.'
      })

      return
    }

    setShowClosingConfirmation(
      true
    )
  }

  function closeClosingConfirmation():
  void {
    if (
      saving
    ) {
      return
    }

    setShowClosingConfirmation(
      false
    )
  }

  async function handleConfirmClosing():
  Promise<void> {
    if (
      saving ||
      !day ||
      isClosed ||
      openingCashValue ===
        null ||
      countedCashValue ===
        null
    ) {
      return
    }

    setSaving(true)
    setMessage(null)

    try {
      const wasReopened =
        isReopened

      const result =
        await window.pos
          .cashClosing
          .create({
            date:
              selectedDate,

            openingCash:
              openingCashValue,

            countedCash:
              countedCashValue
          })

      if (!result.success) {
        setMessage({
          type: 'error',
          text:
            result.message
        })

        return
      }

      setShowClosingConfirmation(
        false
      )

      setMessage({
        type: 'success',
        text:
          wasReopened
            ? 'La caja fue cerrada nuevamente correctamente.'
            : 'Cierre de caja registrado correctamente.'
      })

      await loadDay(
        selectedDate,
        false
      )
    } catch (
      error: unknown
    ) {
      console.error(
        '[cash-closing] Error creating closing:',
        error
      )

      setMessage({
        type: 'error',
        text:
          'No se pudo registrar el cierre de caja.'
      })
    } finally {
      setSaving(false)
    }
  }

  function handleOpenReopenConfirmation():
  void {
    setMessage(null)

    if (
      !day?.closing ||
      day.closing.status !==
        'CLOSED'
    ) {
      return
    }

    setReopenReason(
      ''
    )

    setShowReopenConfirmation(
      true
    )
  }

  function closeReopenConfirmation():
  void {
    if (
      reopening
    ) {
      return
    }

    setShowReopenConfirmation(
      false
    )

    setReopenReason(
      ''
    )
  }

  async function handleConfirmReopen():
  Promise<void> {
    if (
      reopening ||
      !day?.closing ||
      day.closing.status !==
        'CLOSED'
    ) {
      return
    }

    const normalizedReason =
      reopenReason.trim()

    if (
      normalizedReason.length <
      3
    ) {
      setMessage({
        type: 'error',
        text:
          'Debes indicar el motivo de la reapertura.'
      })

      return
    }

    if (
      normalizedReason.length >
      300
    ) {
      setMessage({
        type: 'error',
        text:
          'El motivo de la reapertura no puede superar los 300 caracteres.'
      })

      return
    }

    setReopening(true)
    setMessage(null)

    try {
      const result =
        await window.pos
          .cashClosing
          .reopen({
            date:
              selectedDate,

            reason:
              normalizedReason
          })

      if (!result.success) {
        setMessage({
          type: 'error',
          text:
            result.message
        })

        return
      }

      setShowReopenConfirmation(
        false
      )

      setReopenReason(
        ''
      )

      setMessage({
        type: 'success',
        text:
          'La caja fue reabierta correctamente. Las operaciones de la jornada vuelven a estar habilitadas.'
      })

      await loadDay(
        selectedDate,
        false
      )
    } catch (
      error: unknown
    ) {
      console.error(
        '[cash-closing] Error reopening closing:',
        error
      )

      setMessage({
        type: 'error',
        text:
          'No se pudo reabrir la caja.'
      })
    } finally {
      setReopening(false)
    }
  }

  function getDifferenceText(
    value: number
  ): string {
    if (
      value === 0
    ) {
      return 'Caja exacta'
    }

    if (
      value > 0
    ) {
      return `Sobrante de ${currencyFormatter.format(
        value
      )}`
    }

    return `Faltante de ${currencyFormatter.format(
      Math.abs(value)
    )}`
  }

  function getEventTitle(
    event:
      CashClosingEvent
  ): string {
    if (
      event.eventType ===
      'REOPENED'
    ) {
      return 'Caja reabierta'
    }

    return 'Caja cerrada'
  }

  return (
    <main className="page">
      <header className="page-header">
        <div>
          <h1>
            Cierre de caja
          </h1>

          <p>
            Consulta el resumen diario,
            cierra la jornada o reabre
            una caja cuando sea necesario.
          </p>
        </div>

        <label className="cash-closing-date">
          Fecha

          <input
            type="date"
            value={
              selectedDate
            }
            max={
              today
            }
            disabled={
              loading ||
              saving ||
              reopening
            }
            onChange={
              (event) =>
                setSelectedDate(
                  event.target
                    .value
                )
            }
          />
        </label>
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

      {loading ? (
        <section className="card">
          <p className="empty-state">
            Cargando resumen del día...
          </p>
        </section>
      ) : !day ? (
        <section className="card">
          <p className="empty-state">
            No se pudo cargar la información.
          </p>
        </section>
      ) : (
        <>
          <section className="card cash-closing-heading">
            <div>
              <span className="report-stat-label">
                Jornada
              </span>

              <h2>
                {formatDate(
                  day.summary.date
                )}
              </h2>
            </div>

            {isClosed ? (
              <span className="cash-closing-status cash-closing-status-closed">
                Caja cerrada
              </span>
            ) : isReopened ? (
              <span className="cash-closing-status">
                Caja reabierta
              </span>
            ) : (
              <span className="cash-closing-status">
                Pendiente de cierre
              </span>
            )}
          </section>

          <section className="report-summary-grid cash-summary-grid">
            <article className="card report-stat-card">
              <span className="report-stat-label">
                Total vendido
              </span>

              <strong className="report-stat-value">
                {currencyFormatter.format(
                  day.summary.total
                )}
              </strong>

              <small>
                {
                  day.summary
                    .completedSalesCount
                }{' '}
                {day.summary.completedSalesCount ===
                1
                  ? 'venta completada'
                  : 'ventas completadas'}
              </small>
            </article>

            <article className="card report-stat-card">
              <span className="report-stat-label">
                Ventas canceladas
              </span>

              <strong className="report-stat-value">
                {
                  day.summary
                    .canceledSalesCount
                }
              </strong>

              <small>
                No se incluyen en ingresos
              </small>
            </article>

            <article className="card report-stat-card">
              <span className="report-stat-label">
                Más vendido
              </span>

              <strong className="report-product-name">
                {day.summary.mostSold
                  ? day.summary
                      .mostSold
                      .categoryName
                  : 'Sin ventas'}
              </strong>

              {day.summary.mostSold && (
                <small>
                  {
                    day.summary
                      .mostSold
                      .quantity
                  }{' '}
                  unidades
                </small>
              )}
            </article>

            <article className="card report-stat-card">
              <span className="report-stat-label">
                Menos vendido
              </span>

              <strong className="report-product-name">
                {day.summary.leastSold
                  ? day.summary
                      .leastSold
                      .categoryName
                  : 'Sin ventas'}
              </strong>

              {day.summary.leastSold && (
                <small>
                  {
                    day.summary
                      .leastSold
                      .quantity
                  }{' '}
                  unidades
                </small>
              )}
            </article>
          </section>

          <section className="reports-two-columns">
            <article className="card">
              <div className="card-header">
                <div>
                  <h2>
                    Resumen del día
                  </h2>

                  <p>
                    Distribución de las ventas
                    completadas.
                  </p>
                </div>
              </div>

              <div className="payment-report-list">
                <div>
                  <span>
                    Efectivo
                  </span>

                  <strong>
                    {currencyFormatter.format(
                      day.summary
                        .paymentMethods
                        .cash
                    )}
                  </strong>
                </div>

                <div>
                  <span>
                    Tarjeta
                  </span>

                  <strong>
                    {currencyFormatter.format(
                      day.summary
                        .paymentMethods
                        .card
                    )}
                  </strong>
                </div>

                <div>
                  <span>
                    SINPE
                  </span>

                  <strong>
                    {currencyFormatter.format(
                      day.summary
                        .paymentMethods
                        .sinpe
                    )}
                  </strong>
                </div>

                <div className="payment-report-total">
                  <span>
                    Total
                  </span>

                  <strong>
                    {currencyFormatter.format(
                      day.summary.total
                    )}
                  </strong>
                </div>
              </div>
            </article>

            <article className="card">
              {isClosed &&
              day.closing ? (
                <>
                  <div className="card-header">
                    <div>
                      <h2>
                        Cierre registrado
                      </h2>

                      <p>
                        La jornada está cerrada.
                        Las ventas y modificaciones
                        están bloqueadas.
                      </p>
                    </div>
                  </div>

                  <div className="cash-control-list">
                    <div>
                      <span>
                        Fondo inicial
                      </span>

                      <strong>
                        {currencyFormatter.format(
                          day.closing
                            .openingCash
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>
                        Ventas en efectivo
                      </span>

                      <strong>
                        {currencyFormatter.format(
                          day.closing
                            .cashSales
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>
                        Efectivo esperado
                      </span>

                      <strong>
                        {currencyFormatter.format(
                          day.closing
                            .expectedCash
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>
                        Efectivo contado
                      </span>

                      <strong>
                        {currencyFormatter.format(
                          day.closing
                            .countedCash
                        )}
                      </strong>
                    </div>

                    <div className="cash-control-difference">
                      <span>
                        Diferencia
                      </span>

                      <strong>
                        {currencyFormatter.format(
                          day.closing
                            .cashDifference
                        )}
                      </strong>

                      <small>
                        {getDifferenceText(
                          day.closing
                            .cashDifference
                        )}
                      </small>
                    </div>
                  </div>

                  <div className="cash-closing-metadata">
                    <span>
                      Cerrado por:{' '}
                      <strong>
                        {
                          day.closing
                            .closedByUsername
                        }
                      </strong>
                    </span>

                    <span>
                      {formatStoredDateTime(
                        day.closing
                          .closedAt
                      )}
                    </span>
                  </div>

                  <div className="modal-actions">
                    <button
                      type="button"
                      className="button button-secondary"
                      disabled={
                        reopening ||
                        saving
                      }
                      onClick={
                        handleOpenReopenConfirmation
                      }
                    >
                      Reabrir caja
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="card-header">
                    <div>
                      <h2>
                        {isReopened
                          ? 'Volver a cerrar caja'
                          : 'Control de efectivo'}
                      </h2>

                      <p>
                        {isReopened
                          ? 'La caja fue reabierta. Cuando termine la jornada, cuenta nuevamente el efectivo y registra un nuevo cierre.'
                          : 'Compara lo que debería haber en caja con el efectivo contado.'}
                      </p>
                    </div>
                  </div>

                  {isReopened && (
                    <div
                      className="message message-success"
                      role="status"
                    >
                      La caja está reabierta.
                      Las operaciones de esta
                      jornada están habilitadas.
                    </div>
                  )}

                  <div className="cash-closing-form">
                    <label>
                      Fondo inicial

                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={
                          openingCash
                        }
                        disabled={
                          saving ||
                          reopening
                        }
                        onChange={
                          (event) =>
                            setOpeningCash(
                              event.target
                                .value
                            )
                        }
                      />
                    </label>

                    <div className="cash-calculated-row">
                      <span>
                        Ventas en efectivo
                      </span>

                      <strong>
                        {currencyFormatter.format(
                          day.summary
                            .paymentMethods
                            .cash
                        )}
                      </strong>
                    </div>

                    <div className="cash-calculated-row">
                      <span>
                        Efectivo esperado
                      </span>

                      <strong>
                        {expectedCash ===
                        null
                          ? '—'
                          : currencyFormatter.format(
                              expectedCash
                            )}
                      </strong>
                    </div>

                    <label>
                      Efectivo contado físicamente

                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={
                          countedCash
                        }
                        placeholder="Ejemplo: 99500"
                        disabled={
                          saving ||
                          reopening
                        }
                        onChange={
                          (event) =>
                            setCountedCash(
                              event.target
                                .value
                            )
                        }
                      />
                    </label>

                    <div className="cash-difference-preview">
                      <span>
                        Diferencia
                      </span>

                      <strong>
                        {difference ===
                        null
                          ? '—'
                          : currencyFormatter.format(
                              difference
                            )}
                      </strong>

                      {difference !==
                        null && (
                        <small>
                          {getDifferenceText(
                            difference
                          )}
                        </small>
                      )}
                    </div>

                    <button
                      type="button"
                      className="button button-primary"
                      disabled={
                        saving ||
                        reopening
                      }
                      onClick={
                        handleOpenClosingConfirmation
                      }
                    >
                      {isReopened
                        ? 'Volver a cerrar caja'
                        : 'Confirmar cierre'}
                    </button>
                  </div>
                </>
              )}
            </article>
          </section>

          {day.events.length >
            0 && (
            <section className="card">
              <div className="card-header">
                <div>
                  <h2>
                    Historial de la caja
                  </h2>

                  <p>
                    Registro de cierres y
                    reaperturas de esta jornada.
                  </p>
                </div>
              </div>

              <div className="payment-report-list">
                {day.events.map(
                  (event) => (
                    <div
                      key={
                        event.id
                      }
                    >
                      <div>
                        <strong>
                          {getEventTitle(
                            event
                          )}
                        </strong>

                        <small>
                          {' '}
                          por{' '}
                          {
                            event.username
                          }
                        </small>
                      </div>

                      <div>
                        <strong>
                          {formatStoredDateTime(
                            event.createdAt
                          )}
                        </strong>

                        {event.reason && (
                          <small>
                            {' '}
                            · Motivo:{' '}
                            {
                              event.reason
                            }
                          </small>
                        )}
                      </div>
                    </div>
                  )
                )}
              </div>
            </section>
          )}
        </>
      )}

      {showClosingConfirmation &&
        day &&
        expectedCash !== null &&
        countedCashValue !==
          null &&
        difference !== null && (
        <div className="modal-backdrop">
          <section
            className="confirm-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby=
              "cash-closing-confirm-title"
          >
            <h2
              id="cash-closing-confirm-title"
            >
              {isReopened
                ? 'Volver a cerrar caja'
                : 'Confirmar cierre de caja'}
            </h2>

            <p>
              Vas a registrar el cierre
              correspondiente al{' '}
              <strong>
                {formatDate(
                  selectedDate
                )}
              </strong>
              .
            </p>

            <div className="cash-closing-confirm-summary">
              <div>
                <span>
                  Total vendido
                </span>

                <strong>
                  {currencyFormatter.format(
                    day.summary.total
                  )}
                </strong>
              </div>

              <div>
                <span>
                  Fondo inicial
                </span>

                <strong>
                  {currencyFormatter.format(
                    openingCashValue ??
                      0
                  )}
                </strong>
              </div>

              <div>
                <span>
                  Efectivo esperado
                </span>

                <strong>
                  {currencyFormatter.format(
                    expectedCash
                  )}
                </strong>
              </div>

              <div>
                <span>
                  Efectivo contado
                </span>

                <strong>
                  {currencyFormatter.format(
                    countedCashValue
                  )}
                </strong>
              </div>

              <div>
                <span>
                  Diferencia
                </span>

                <strong>
                  {currencyFormatter.format(
                    difference
                  )}
                </strong>
              </div>
            </div>

            <p>
              Al cerrar la caja,
              las ventas y cancelaciones
              de esta jornada quedarán
              bloqueadas hasta que un
              administrador vuelva a
              reabrirla.
            </p>

            <div className="modal-actions">
              <button
                type="button"
                className="button button-secondary"
                disabled={
                  saving
                }
                onClick={
                  closeClosingConfirmation
                }
              >
                Volver
              </button>

              <button
                type="button"
                className="button button-primary"
                disabled={
                  saving
                }
                onClick={() =>
                  void handleConfirmClosing()
                }
              >
                {saving
                  ? 'Guardando...'
                  : isReopened
                    ? 'Cerrar nuevamente'
                    : 'Registrar cierre'}
              </button>
            </div>
          </section>
        </div>
      )}

      {showReopenConfirmation &&
        day?.closing &&
        day.closing.status ===
          'CLOSED' && (
        <div className="modal-backdrop">
          <section
            className="confirm-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby=
              "cash-closing-reopen-title"
          >
            <h2
              id="cash-closing-reopen-title"
            >
              Reabrir caja
            </h2>

            <p>
              Vas a reabrir la caja
              correspondiente al{' '}
              <strong>
                {formatDate(
                  selectedDate
                )}
              </strong>
              .
            </p>

            <p>
              Después de reabrirla,
              las operaciones de la
              jornada volverán a estar
              habilitadas hasta que
              registres un nuevo cierre.
            </p>

            <label>
              Motivo de la reapertura

              <textarea
                className="cash-closing-reopen-reason"
                value={
                  reopenReason
                }
                maxLength={
                  300
                }
                rows={
                  4
                }
                placeholder="Ejemplo: La caja se cerró antes de terminar la jornada."
                disabled={
                  reopening
                }
                onChange={
                  (event) =>
                    setReopenReason(
                      event.target
                        .value
                    )
                }
              />
            </label>

            <small>
              {
                reopenReason.trim()
                  .length
              } / 300 caracteres
            </small>

            <div className="modal-actions">
              <button
                type="button"
                className="button button-secondary"
                disabled={
                  reopening
                }
                onClick={
                  closeReopenConfirmation
                }
              >
                Cancelar
              </button>

              <button
                type="button"
                className="button button-primary"
                disabled={
                  reopening ||
                  reopenReason.trim()
                    .length < 3
                }
                onClick={() =>
                  void handleConfirmReopen()
                }
              >
                {reopening
                  ? 'Reabriendo...'
                  : 'Reabrir caja'}
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  )
}

export default CashClosingPage