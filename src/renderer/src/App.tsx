import {
  useEffect,
  useState
} from 'react'

import CategoriesPage
  from './pages/CategoriesPage'

import LoginPage
  from './pages/LoginPage'

import SetupPage
  from './pages/SetupPage'

import UsersPage
  from './pages/UsersPage'

interface AuthUser {
  id: number
  username: string

  role:
    | 'ADMIN'
    | 'EMPLOYEE'
}

interface AuthStatus {
  setupRequired: boolean

  user:
    AuthUser | null
}

type AdminPage =
  | 'categories'
  | 'users'

function App():
React.JSX.Element {
  const [
    authStatus,
    setAuthStatus
  ] =
    useState<AuthStatus | null>(
      null
    )

  const [
    adminPage,
    setAdminPage
  ] =
    useState<AdminPage>(
      'categories'
    )

  const [error, setError] =
    useState<string | null>(
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

    setAdminPage(
      'categories'
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
          <h1>Error</h1>

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

  return (
    <div className="app-shell">
      <header className="topbar">
        <strong>
          Sistema POS
        </strong>

        {user.role === 'ADMIN' && (
          <nav className="admin-nav">
            <button
              type="button"
              className={
                `nav-button ${
                  adminPage ===
                  'categories'
                    ? 'nav-button-active'
                    : ''
                }`
              }
              onClick={() =>
                setAdminPage(
                  'categories'
                )
              }
            >
              Inventario
            </button>

            <button
              type="button"
              className={
                `nav-button ${
                  adminPage ===
                  'users'
                    ? 'nav-button-active'
                    : ''
                }`
              }
              onClick={() =>
                setAdminPage(
                  'users'
                )
              }
            >
              Usuarios
            </button>
          </nav>
        )}

        <div className="topbar-user">
          <span>
            {user.username}
          </span>

          <span className="role-badge">
            {user.role === 'ADMIN'
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

      {user.role === 'ADMIN' ? (
        adminPage ===
        'categories' ? (
          <CategoriesPage />
        ) : (
          <UsersPage
            currentUserId={
              user.id
            }

            onCurrentUserUpdated={
              handleCurrentUserUpdated
            }
          />
        )
      ) : (
        <main className="page">
          <section className="card">
            <h1>
              Bienvenido
            </h1>

            <p>
              El módulo de ventas
              será agregado después.
            </p>
          </section>
        </main>
      )}
    </div>
  )
}

export default App