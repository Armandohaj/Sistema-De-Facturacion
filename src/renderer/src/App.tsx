import {
  useEffect,
  useState
} from 'react'

import CategoriesPage
  from './pages/CategoriesPage'

import LoginPage
  from './pages/LoginPage'

import SalesHistoryPage
  from './pages/SalesHistoryPage'

import SalesPage
  from './pages/SalesPage'

import SetupPage
  from './pages/SetupPage'

import UsersPage
  from './pages/UsersPage'

import ReportsPage
  from './pages/ReportsPage'

import CashClosingPage
  from './pages/CashClosingPage'

interface AuthUser {
  id: number
  username: string

  role:
    | 'ADMIN'
    | 'EMPLOYEE'
}

interface AuthStatus {
  setupRequired: boolean
  user: AuthUser | null
}

type AppPage =
  | 'sales'
  | 'history'
  | 'categories'
  | 'users'
  | 'reports'
  | 'cash-closing'

function App(): React.JSX.Element {
  const [
    authStatus,
    setAuthStatus
  ] = useState<AuthStatus | null>(
    null
  )

  const [
    currentPage,
    setCurrentPage
  ] = useState<AppPage>(
    'sales'
  )

  const [
    error,
    setError
  ] = useState<string | null>(
    null
  )

  useEffect(() => {
    async function loadAuth():
    Promise<void> {
      try {
        const result =
          await window.pos.auth
            .getStatus()

        if (!result.success) {
          setError(
            result.message
          )

          return
        }

        setAuthStatus(
          result.data
        )
      } catch (
        unknownError
      ) {
        console.error(
          unknownError
        )

        setError(
          'No se pudo iniciar el sistema.'
        )
      }
    }

    void loadAuth()
  }, [])

  function handleAuthentication(
    user: AuthUser
  ): void {
    setCurrentPage(
      'sales'
    )

    setAuthStatus({
      setupRequired: false,
      user
    })
  }

  function handleCurrentUserUpdated(
    user: AuthUser
  ): void {
    setAuthStatus({
      setupRequired: false,
      user
    })
  }

  async function handleLogout():
  Promise<void> {
    const result =
      await window.pos.auth
        .logout()

    if (!result.success) {
      setError(
        result.message
      )

      return
    }

    setCurrentPage(
      'sales'
    )

    setAuthStatus({
      setupRequired: false,
      user: null
    })
  }

  if (error) {
    return (
      <main className="auth-page">
        <section className="auth-card">
          <h1>
            Error
          </h1>

          <div className="message message-error">
            {error}
          </div>
        </section>
      </main>
    )
  }

  if (!authStatus) {
    return (
      <main className="auth-page">
        <section className="auth-card">
          <p>
            Iniciando sistema...
          </p>
        </section>
      </main>
    )
  }

  if (
    authStatus.setupRequired
  ) {
    return (
      <SetupPage
        onComplete={
          handleAuthentication
        }
      />
    )
  }

  if (!authStatus.user) {
    return (
      <LoginPage
        onLogin={
          handleAuthentication
        }
      />
    )
  }

  const user =
    authStatus.user

  const isAdmin =
    user.role === 'ADMIN'

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <h1>
            Tienda De Ropa La Vega
          </h1>

          <nav className="admin-nav">
            <button
              type="button"
              className={
                `nav-button ${
                  currentPage ===
                  'sales'
                    ? 'nav-button-active'
                    : ''
                }`
              }
              onClick={() =>
                setCurrentPage(
                  'sales'
                )
              }
            >
              Venta
            </button>

            <button
              type="button"
              className={
                `nav-button ${
                  currentPage ===
                  'history'
                    ? 'nav-button-active'
                    : ''
                }`
              }
              onClick={() =>
                setCurrentPage(
                  'history'
                )
              }
            >
              Historial
            </button>

            <button
              type="button"
              className={
                `nav-button ${
                  currentPage ===
                  'categories'
                    ? 'nav-button-active'
                    : ''
                }`
              }
              onClick={() =>
                setCurrentPage(
                  'categories'
                )
              }
            >
              Inventario
            </button>

            {isAdmin && (
              <>
                <button
                  type="button"
                  className={
                    `nav-button ${
                      currentPage ===
                      'users'
                        ? 'nav-button-active'
                        : ''
                    }`
                  }
                  onClick={() =>
                    setCurrentPage(
                      'users'
                    )
                  }
                >
                  Usuarios
                </button>

                <button
                  type="button"
                  className={
                    `nav-button ${
                      currentPage ===
                      'reports'
                        ? 'nav-button-active'
                        : ''
                    }`
                  }
                  onClick={() =>
                    setCurrentPage(
                      'reports'
                    )
                  }
                >
                  Reportes
                </button>

                <button
                  type="button"
                  className={
                    `nav-button ${
                      currentPage ===
                      'cash-closing'
                        ? 'nav-button-active'
                        : ''
                    }`
                  }
                  onClick={() =>
                    setCurrentPage(
                      'cash-closing'
                    )
                  }
                >
                  Cierre de caja
                </button>
              </>
            )}
          </nav>
        </div>

        <div className="topbar-user">
          <span>
            {user.username}
          </span>

          <span className="role-badge">
            {isAdmin
              ? 'Administrador'
              : 'Empleado'}
          </span>

          <button
            type="button"
            className="button button-secondary"
            onClick={() =>
              void handleLogout()
            }
          >
            Cerrar sesión
          </button>
        </div>
      </header>

      {currentPage ===
        'sales' && (
        <SalesPage />
      )}

      {currentPage ===
        'history' && (
        <SalesHistoryPage
          isAdmin={isAdmin}
        />
      )}

      {currentPage ===
        'categories' && (
        <CategoriesPage
          isAdmin={isAdmin}
        />
      )}

      {currentPage ===
        'users' &&
        isAdmin && (
        <UsersPage
          currentUserId={
            user.id
          }
          onCurrentUserUpdated={
            handleCurrentUserUpdated
          }
        />
      )}

      {currentPage ===
        'reports' &&
        isAdmin && (
        <ReportsPage />
      )}

      {currentPage ===
        'cash-closing' &&
        isAdmin && (
        <CashClosingPage />
      )}
    </div>
  )
}

export default App
