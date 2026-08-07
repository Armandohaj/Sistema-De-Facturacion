import {
  useState,
  type FormEvent
} from 'react'

interface AuthUser {
  id: number
  username: string
  role: 'ADMIN' | 'EMPLOYEE'
}

interface Props {
  onComplete:
    (user: AuthUser) => void
}

function SetupPage({
  onComplete
}: Props): React.JSX.Element {
  const [username, setUsername] =
    useState('')

  const [password, setPassword] =
    useState('')

  const [
    confirmPassword,
    setConfirmPassword
  ] = useState('')

  const [error, setError] =
    useState<string | null>(null)

  const [saving, setSaving] =
    useState(false)

  async function handleSubmit(
    event:
      FormEvent<HTMLFormElement>
  ): Promise<void> {
    event.preventDefault()

    setError(null)

    if (
      password !==
      confirmPassword
    ) {
      setError(
        'Las contraseñas no coinciden.'
      )

      return
    }

    setSaving(true)

    try {
      const result =
        await window.pos.auth.setup({
          username,
          password
        })

      if (!result.success) {
        setError(
          result.message
        )

        return
      }

      onComplete(
        result.data
      )
    } catch (unknownError) {
      console.error(
        unknownError
      )

      setError(
        'No se pudo crear el administrador.'
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-heading">
          <h1>
            Configuración inicial
          </h1>

          <p>
            Crea el primer administrador
            del sistema.
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
              placeholder="admin"
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
              autoComplete="new-password"
              onChange={(event) =>
                setPassword(
                  event.target.value
                )
              }
            />
          </label>

          <label>
            Confirmar contraseña

            <input
              type="password"
              value={
                confirmPassword
              }
              autoComplete="new-password"
              onChange={(event) =>
                setConfirmPassword(
                  event.target.value
                )
              }
            />
          </label>

          <button
            type="submit"
            className="button button-primary"
            disabled={saving}
          >
            {saving
              ? 'Creando...'
              : 'Crear administrador'}
          </button>
        </form>

        <p className="auth-help">
          La contraseña debe tener
          al menos 8 caracteres.
        </p>
      </section>
    </main>
  )
}

export default SetupPage