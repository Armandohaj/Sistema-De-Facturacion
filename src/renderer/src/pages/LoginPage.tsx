import {
  useState,
  type FormEvent
} from 'react'

import storeLogo
  from '../assets/logo.png'

interface AuthUser {
  id: number
  username: string
  role: 'ADMIN' | 'EMPLOYEE'
}

interface Props {
  onLogin:
    (user: AuthUser) => void
}

function LoginPage({
  onLogin
}: Props): React.JSX.Element {
  const [username, setUsername] =
    useState('')

  const [password, setPassword] =
    useState('')

  const [error, setError] =
    useState<string | null>(null)

  const [loading, setLoading] =
    useState(false)

  async function handleSubmit(
    event:
      FormEvent<HTMLFormElement>
  ): Promise<void> {
    event.preventDefault()

    setError(null)
    setLoading(true)

    try {
      const result =
        await window.pos.auth.login({
          username,
          password
        })

      if (!result.success) {
        setError(
          result.message
        )

        return
      }

      onLogin(
        result.data
      )
    } catch (unknownError) {
      console.error(
        unknownError
      )

      setError(
        'No se pudo iniciar sesión.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-heading">
          <img
            className="login-logo"
            src={storeLogo}
            alt="Logo de Tienda De Ropa La Vega"
          />

          <p>
            Ingresa con tu usuario
            y contraseña.
          </p>
        </div>

        {error && (
          <div
            className="message message-error"
            role="alert"
          >
            {error}
          </div>
        )}

        <form
          onSubmit={
            handleSubmit
          }
        >
          <label>
            Usuario

            <input
              type="text"
              value={username}
              autoFocus
              autoComplete="username"
              onChange={(event) =>
                setUsername(
                  event.target.value
                )
              }
            />
          </label>

          <label>
            Contraseña

            <input
              type="password"
              value={password}
              autoComplete="current-password"
              onChange={(event) =>
                setPassword(
                  event.target.value
                )
              }
            />
          </label>

          <button
            type="submit"
            className="button button-primary"
            disabled={loading}
          >
            {loading
              ? 'Ingresando...'
              : 'Iniciar sesión'}
          </button>
        </form>
      </section>
    </main>
  )
}

export default LoginPage