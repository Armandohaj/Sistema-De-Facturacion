import {
  useCallback,
  useEffect,
  useMemo,
  useState
} from 'react'

interface SalesPeriodSummary {
  salesCount: number
  total: number
}

interface ProductSalesSummary {
  categoryId: number
  categoryName: string
  quantity: number
  total: number
}

interface PaymentMethodSummary {
  cash: number
  card: number
  sinpe: number
}

interface DailySalesPoint {
  date: string
  salesCount: number
  total: number
}

interface MonthlySalesPoint {
  month: string
  salesCount: number
  total: number
}

interface ReportSummary {
  today: SalesPeriodSummary
  currentMonth: SalesPeriodSummary
  paymentMethods: PaymentMethodSummary
  mostSold: ProductSalesSummary | null
  leastSold: ProductSalesSummary | null
  dailyFlow: DailySalesPoint[]
  monthlyHistory: MonthlySalesPoint[]
}

interface MonthlyReport {
  month: string
  completedSalesCount: number
  canceledSalesCount: number
  total: number
  paymentMethods: PaymentMethodSummary
  mostSold: ProductSalesSummary | null
  leastSold: ProductSalesSummary | null
  dailyFlow: DailySalesPoint[]
}

interface Message {
  type: 'success' | 'error'
  text: string
}

interface MonthOption {
  value: string
  label: string
}

/*
 * Inicio oficial de operación de la tienda.
 *
 * Los reportes mensuales nunca mostrarán
 * meses anteriores a agosto de 2026.
 */
const STORE_OPENING_MONTH =
  '2026-08'

const currencyFormatter =
  new Intl.NumberFormat(
    'es-CR',
    {
      style: 'currency',
      currency: 'CRC',
      maximumFractionDigits: 0
    }
  )

const monthFormatter =
  new Intl.DateTimeFormat(
    'es-CR',
    {
      month: 'long',
      year: 'numeric'
    }
  )

function getCurrentMonthKey():
string {
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

  return `${year}-${month}`
}

function createMonthKey(
  year: number,
  monthIndex: number
): string {
  const month =
    String(
      monthIndex + 1
    ).padStart(
      2,
      '0'
    )

  return `${year}-${month}`
}

function parseMonthKey(
  month: string
): {
  year: number
  monthIndex: number
} {
  const [
    yearValue,
    monthValue
  ] =
    month.split('-')

  return {
    year:
      Number(yearValue),

    monthIndex:
      Number(monthValue) - 1
  }
}

function formatDay(
  date: string
): string {
  const day =
    Number(
      date.slice(-2)
    )

  return `Día ${day}`
}

function formatMonth(
  month: string
): string {
  const date =
    new Date(
      `${month}-01T00:00:00`
    )

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return month
  }

  return monthFormatter.format(
    date
  )
}

function getAvailableMonthOptions(
  currentMonthKey: string
): MonthOption[] {
  /*
   * Si por alguna razón la fecha de
   * Windows está antes de la apertura
   * de la tienda, no mostramos meses
   * anteriores.
   */
  if (
    currentMonthKey <
    STORE_OPENING_MONTH
  ) {
    return []
  }

  const openingMonth =
    parseMonthKey(
      STORE_OPENING_MONTH
    )

  const currentMonth =
    parseMonthKey(
      currentMonthKey
    )

  const options:
    MonthOption[] = []

  let year =
    openingMonth.year

  let monthIndex =
    openingMonth.monthIndex

  while (
    year <
      currentMonth.year ||
    (
      year ===
        currentMonth.year &&
      monthIndex <=
        currentMonth.monthIndex
    )
  ) {
    const value =
      createMonthKey(
        year,
        monthIndex
      )

    options.push({
      value,

      label:
        formatMonth(
          value
        )
    })

    monthIndex += 1

    if (
      monthIndex > 11
    ) {
      monthIndex = 0
      year += 1
    }
  }

  return options
}

function ReportsPage():
React.JSX.Element {
  const [
    currentMonthKey,
    setCurrentMonthKey
  ] = useState(
    getCurrentMonthKey()
  )

  const [
    summary,
    setSummary
  ] =
    useState<
      ReportSummary | null
    >(null)

  const [
    selectedMonth,
    setSelectedMonth
  ] = useState(
    () => {
      const currentMonth =
        getCurrentMonthKey()

      if (
        currentMonth <
        STORE_OPENING_MONTH
      ) {
        return ''
      }

      return currentMonth
    }
  )

  const [
    monthlyReport,
    setMonthlyReport
  ] =
    useState<
      MonthlyReport | null
    >(null)

  const [
    loading,
    setLoading
  ] = useState(true)

  const [
    loadingMonthly,
    setLoadingMonthly
  ] = useState(false)

  const [
    message,
    setMessage
  ] =
    useState<
      Message | null
    >(null)

  /*
   * Selector independiente de ventas.
   *
   * Siempre muestra todos los meses
   * desde agosto de 2026 hasta el mes
   * actual de Windows.
   */
  const monthOptions =
    useMemo(
      () =>
        getAvailableMonthOptions(
          currentMonthKey
        ),
      [
        currentMonthKey
      ]
    )

  /*
   * Filtramos también visualmente el
   * histórico para nunca presentar
   * meses anteriores a la apertura.
   *
   * Esto NO elimina ningún dato
   * de SQLite.
   */
  const visibleMonthlyHistory =
    useMemo(
      () => {
        if (!summary) {
          return []
        }

        return summary
          .monthlyHistory
          .filter(
            (item) =>
              item.month >=
              STORE_OPENING_MONTH
          )
      },
      [
        summary
      ]
    )

  const refreshCalendar =
    useCallback(
      (): void => {
        const newCurrentMonth =
          getCurrentMonthKey()

        setCurrentMonthKey(
          newCurrentMonth
        )
      },
      []
    )

  const loadSummary =
    useCallback(
      async (): Promise<void> => {
        setLoading(true)
        setMessage(null)

        try {
          const result =
            await window.pos
              .reports
              .getSummary()

          if (!result.success) {
            setMessage({
              type: 'error',
              text:
                result.message
            })

            return
          }

          setSummary(
            result.data
          )
        } catch (
          error: unknown
        ) {
          console.error(
            '[reports] Error loading summary:',
            error
          )

          setMessage({
            type: 'error',
            text:
              'No se pudieron cargar los reportes.'
          })
        } finally {
          setLoading(false)
        }
      },
      []
    )

  const loadMonthlyReport =
    useCallback(
      async (
        month: string
      ): Promise<void> => {
        if (
          month === ''
        ) {
          setMonthlyReport(
            null
          )

          return
        }

        if (
          month <
          STORE_OPENING_MONTH
        ) {
          setMonthlyReport(
            null
          )

          setMessage({
            type: 'error',
            text:
              'No existen reportes anteriores a agosto de 2026.'
          })

          return
        }

        setLoadingMonthly(
          true
        )

        setMessage(null)

        try {
          const result =
            await window.pos
              .reports
              .getMonthlyReport(
                month
              )

          if (!result.success) {
            setMessage({
              type: 'error',
              text:
                result.message
            })

            setMonthlyReport(
              null
            )

            return
          }

          setMonthlyReport(
            result.data
          )
        } catch (
          error: unknown
        ) {
          console.error(
            '[reports] Error loading monthly report:',
            error
          )

          setMessage({
            type: 'error',
            text:
              'No se pudo cargar el resumen del mes.'
          })

          setMonthlyReport(
            null
          )
        } finally {
          setLoadingMonthly(
            false
          )
        }
      },
      []
    )

  /*
   * Detectamos cambios en la fecha
   * configurada en Windows.
   */
  useEffect(() => {
    refreshCalendar()

    function handleWindowFocus():
    void {
      refreshCalendar()
    }

    window.addEventListener(
      'focus',
      handleWindowFocus
    )

    const intervalId =
      window.setInterval(
        () => {
          refreshCalendar()
        },
        60_000
      )

    return () => {
      window.removeEventListener(
        'focus',
        handleWindowFocus
      )

      window.clearInterval(
        intervalId
      )
    }
  }, [
    refreshCalendar
  ])

  /*
   * Cuando cambia el mes del sistema,
   * seleccionamos automáticamente
   * el nuevo mes actual.
   */
  useEffect(() => {
    if (
      currentMonthKey <
      STORE_OPENING_MONTH
    ) {
      setSelectedMonth(
        ''
      )

      setMonthlyReport(
        null
      )

      void loadSummary()

      return
    }

    setSelectedMonth(
      currentMonthKey
    )

    void loadSummary()
  }, [
    currentMonthKey,
    loadSummary
  ])

  useEffect(() => {
    if (
      selectedMonth !== ''
    ) {
      void loadMonthlyReport(
        selectedMonth
      )
    }
  }, [
    selectedMonth,
    loadMonthlyReport
  ])

  const maxMonthlyDailyTotal =
    useMemo(
      () => {
        if (!monthlyReport) {
          return 0
        }

        return Math.max(
          ...monthlyReport
            .dailyFlow
            .map(
              (item) =>
                item.total
            ),
          0
        )
      },
      [
        monthlyReport
      ]
    )

  const maxHistoryTotal =
    useMemo(
      () => {
        return Math.max(
          ...visibleMonthlyHistory.map(
            (item) =>
              item.total
          ),
          0
        )
      },
      [
        visibleMonthlyHistory
      ]
    )

  async function handleRefresh():
  Promise<void> {
    refreshCalendar()

    await loadSummary()

    if (
      selectedMonth !== ''
    ) {
      await loadMonthlyReport(
        selectedMonth
      )
    }
  }

  if (loading) {
    return (
      <main className="page">
        <header className="page-header">
          <div>
            <h1>
              Reportes
            </h1>

            <p>
              Cargando resumen del negocio...
            </p>
          </div>
        </header>

        <section className="card">
          <p className="empty-state">
            Cargando reportes...
          </p>
        </section>
      </main>
    )
  }

  return (
    <main className="page">
      <header className="page-header">
        <div>
          <h1>
            Reportes
          </h1>

          <p>
            Resumen de ventas y
            comportamiento del negocio.
          </p>
        </div>

        <button
          type="button"
          className="button button-secondary"
          disabled={
            loading ||
            loadingMonthly
          }
          onClick={() =>
            void handleRefresh()
          }
        >
          Actualizar
        </button>
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

      {!summary ? (
        <section className="card">
          <p className="empty-state">
            No hay información disponible.
          </p>
        </section>
      ) : (
        <>
          <section className="report-summary-grid">
            <article className="card report-stat-card">
              <span className="report-stat-label">
                Vendido hoy
              </span>

              <strong className="report-stat-value">
                {currencyFormatter.format(
                  summary.today.total
                )}
              </strong>

              <small>
                {
                  summary.today
                    .salesCount
                }{' '}
                {summary.today.salesCount ===
                1
                  ? 'venta'
                  : 'ventas'}
              </small>
            </article>

            <article className="card report-stat-card">
              <span className="report-stat-label">
                Vendido este mes
              </span>

              <strong className="report-stat-value">
                {currencyFormatter.format(
                  summary.currentMonth
                    .total
                )}
              </strong>

              <small>
                {
                  summary.currentMonth
                    .salesCount
                }{' '}
                {summary.currentMonth.salesCount ===
                1
                  ? 'venta'
                  : 'ventas'}
              </small>
            </article>

            <article className="card report-stat-card">
              <span className="report-stat-label">
                Más vendido este mes
              </span>

              <strong className="report-product-name">
                {summary.mostSold
                  ? summary.mostSold
                      .categoryName
                  : 'Sin ventas'}
              </strong>

              {summary.mostSold && (
                <small>
                  {
                    summary.mostSold
                      .quantity
                  }{' '}
                  unidades
                </small>
              )}
            </article>

            <article className="card report-stat-card">
              <span className="report-stat-label">
                Menos vendido este mes
              </span>

              <strong className="report-product-name">
                {summary.leastSold
                  ? summary.leastSold
                      .categoryName
                  : 'Sin ventas'}
              </strong>

              {summary.leastSold && (
                <small>
                  {
                    summary.leastSold
                      .quantity
                  }{' '}
                  unidades
                </small>
              )}
            </article>
          </section>

          <section className="card monthly-report-section">
            <div className="card-header monthly-report-header">
              <div>
                <h2>
                  Resumen por mes
                </h2>

                <p>
                  Consulta los meses desde
                  la apertura de la tienda.
                </p>
              </div>

              <label className="monthly-report-selector">
                Mes

                <select
                  value={
                    selectedMonth
                  }
                  disabled={
                    loadingMonthly ||
                    monthOptions.length === 0
                  }
                  onChange={
                    (event) =>
                      setSelectedMonth(
                        event.target
                          .value
                      )
                  }
                >
                  {monthOptions.length ===
                  0 ? (
                    <option value="">
                      Sin meses disponibles
                    </option>
                  ) : (
                    monthOptions.map(
                      (
                        option
                      ) => (
                        <option
                          key={
                            option.value
                          }
                          value={
                            option.value
                          }
                        >
                          {
                            option.label
                          }
                        </option>
                      )
                    )
                  )}
                </select>
              </label>
            </div>

            {monthOptions.length ===
            0 ? (
              <p className="empty-state">
                La fecha del equipo está
                configurada antes de la
                apertura de la tienda.
              </p>
            ) : loadingMonthly ? (
              <p className="empty-state">
                Cargando resumen del mes...
              </p>
            ) : !monthlyReport ? (
              <p className="empty-state">
                No se pudo cargar
                la información del mes.
              </p>
            ) : (
              <>
                <h3 className="monthly-report-title">
                  {formatMonth(
                    monthlyReport.month
                  )}
                </h3>

                <div className="monthly-report-grid">
                  <div className="report-mini-card">
                    <span>
                      Total vendido
                    </span>

                    <strong>
                      {currencyFormatter.format(
                        monthlyReport
                          .total
                      )}
                    </strong>
                  </div>

                  <div className="report-mini-card">
                    <span>
                      Ventas completadas
                    </span>

                    <strong>
                      {
                        monthlyReport
                          .completedSalesCount
                      }
                    </strong>
                  </div>

                  <div className="report-mini-card">
                    <span>
                      Ventas canceladas
                    </span>

                    <strong>
                      {
                        monthlyReport
                          .canceledSalesCount
                      }
                    </strong>
                  </div>

                  <div className="report-mini-card">
                    <span>
                      Más vendido
                    </span>

                    <strong>
                      {monthlyReport
                        .mostSold
                        ? monthlyReport
                            .mostSold
                            .categoryName
                        : 'Sin ventas'}
                    </strong>

                    {monthlyReport
                      .mostSold && (
                      <small>
                        {
                          monthlyReport
                            .mostSold
                            .quantity
                        }{' '}
                        unidades
                      </small>
                    )}
                  </div>

                  <div className="report-mini-card">
                    <span>
                      Menos vendido
                    </span>

                    <strong>
                      {monthlyReport
                        .leastSold
                        ? monthlyReport
                            .leastSold
                            .categoryName
                        : 'Sin ventas'}
                    </strong>

                    {monthlyReport
                      .leastSold && (
                      <small>
                        {
                          monthlyReport
                            .leastSold
                            .quantity
                        }{' '}
                        unidades
                      </small>
                    )}
                  </div>
                </div>

                <div className="reports-two-columns">
                  <article className="report-inner-card">
                    <h3>
                      Métodos de pago
                    </h3>

                    <div className="payment-report-list">
                      <div>
                        <span>
                          Efectivo
                        </span>

                        <strong>
                          {currencyFormatter.format(
                            monthlyReport
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
                            monthlyReport
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
                            monthlyReport
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
                            monthlyReport
                              .total
                          )}
                        </strong>
                      </div>
                    </div>
                  </article>

                  <article className="report-inner-card">
                    <h3>
                      Rendimiento
                    </h3>

                    <div className="product-performance">
                      <div>
                        <span>
                          Más vendido
                        </span>

                        <strong>
                          {monthlyReport
                            .mostSold
                            ? monthlyReport
                                .mostSold
                                .categoryName
                            : 'Sin datos'}
                        </strong>

                        {monthlyReport
                          .mostSold && (
                          <small>
                            {
                              monthlyReport
                                .mostSold
                                .quantity
                            }{' '}
                            unidades ·{' '}
                            {currencyFormatter.format(
                              monthlyReport
                                .mostSold
                                .total
                            )}
                          </small>
                        )}
                      </div>

                      <div>
                        <span>
                          Menos vendido
                        </span>

                        <strong>
                          {monthlyReport
                            .leastSold
                            ? monthlyReport
                                .leastSold
                                .categoryName
                            : 'Sin datos'}
                        </strong>

                        {monthlyReport
                          .leastSold && (
                          <small>
                            {
                              monthlyReport
                                .leastSold
                                .quantity
                            }{' '}
                            unidades ·{' '}
                            {currencyFormatter.format(
                              monthlyReport
                                .leastSold
                                .total
                            )}
                          </small>
                        )}
                      </div>
                    </div>
                  </article>
                </div>

                <div className="monthly-report-flow">
                  <h3>
                    Flujo diario
                  </h3>

                  {monthlyReport
                    .dailyFlow
                    .length === 0 ? (
                    <p className="empty-state">
                      No hay ventas registradas
                      durante este mes.
                    </p>
                  ) : (
                    <div className="monthly-flow">
                      {monthlyReport
                        .dailyFlow
                        .map(
                          (
                            item
                          ) => {
                            const percentage =
                              maxMonthlyDailyTotal >
                              0
                                ? Math.max(
                                    (
                                      item.total /
                                      maxMonthlyDailyTotal
                                    ) *
                                      100,

                                    item.total >
                                    0
                                      ? 2
                                      : 0
                                  )
                                : 0

                            return (
                              <div
                                key={
                                  item.date
                                }
                                className="monthly-flow-row"
                              >
                                <span className="monthly-flow-month">
                                  {formatDay(
                                    item.date
                                  )}
                                </span>

                                <div className="monthly-flow-bar-container">
                                  <div
                                    className="monthly-flow-bar"
                                    style={{
                                      width:
                                        `${percentage}%`
                                    }}
                                  />
                                </div>

                                <div className="monthly-flow-value">
                                  <strong>
                                    {currencyFormatter.format(
                                      item.total
                                    )}
                                  </strong>

                                  <small>
                                    {
                                      item.salesCount
                                    }{' '}
                                    {item.salesCount ===
                                    1
                                      ? 'venta'
                                      : 'ventas'}
                                  </small>
                                </div>
                              </div>
                            )
                          }
                        )}
                    </div>
                  )}
                </div>
              </>
            )}
          </section>

          <section className="card">
            <div className="card-header">
              <div>
                <h2>
                  Histórico mensual
                </h2>

                <p>
                  Historial desde agosto de 2026.
                </p>
              </div>
            </div>

            {visibleMonthlyHistory.length ===
            0 ? (
              <p className="empty-state">
                El histórico aparecerá
                después de registrar
                ventas desde la apertura
                de la tienda.
              </p>
            ) : (
              <div className="monthly-flow">
                {visibleMonthlyHistory.map(
                  (
                    item
                  ) => {
                    const percentage =
                      maxHistoryTotal >
                      0
                        ? Math.max(
                            (
                              item.total /
                              maxHistoryTotal
                            ) *
                              100,

                            item.total >
                            0
                              ? 2
                              : 0
                          )
                        : 0

                    return (
                      <div
                        key={
                          item.month
                        }
                        className="monthly-flow-row"
                      >
                        <span className="monthly-flow-month">
                          {formatMonth(
                            item.month
                          )}
                        </span>

                        <div className="monthly-flow-bar-container">
                          <div
                            className="monthly-flow-bar"
                            style={{
                              width:
                                `${percentage}%`
                            }}
                          />
                        </div>

                        <div className="monthly-flow-value">
                          <strong>
                            {currencyFormatter.format(
                              item.total
                            )}
                          </strong>

                          <small>
                            {
                              item.salesCount
                            }{' '}
                            {item.salesCount ===
                            1
                              ? 'venta'
                              : 'ventas'}
                          </small>
                        </div>
                      </div>
                    )
                  }
                )}
              </div>
            )}
          </section>
        </>
      )}
    </main>
  )
}

export default ReportsPage