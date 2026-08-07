import {
  useCallback,
  useEffect,
  useState,
  type FormEvent
} from 'react'

type UserRole =
  | 'ADMIN'
  | 'EMPLOYEE'

interface User {
  id: number
  username: string
  role: UserRole
  active: boolean
}

interface AuthUser {
  id: number
  username: string
  role: UserRole
}

interface Props {
  currentUserId: number

  onCurrentUserUpdated:
    (user: AuthUser) => void
}

interface UserForm {
  username: string
  password: string
  role: UserRole
  active: boolean
}

interface Message {
  type:
    | 'success'
    | 'error'

  text: string
}

const emptyForm:
UserForm = {
  username: '',
  password: '',
  role: 'EMPLOYEE',
  active: true
}

function UsersPage({
  currentUserId,
  onCurrentUserUpdated
}: Props): React.JSX.Element {
  const [users, setUsers] =
    useState<User[]>([])

  const [form, setForm] =
    useState<UserForm>(
      emptyForm
    )

  const [
    editingId,
    setEditingId
  ] =
    useState<number | null>(
      null
    )

  const [loading, setLoading] =
    useState(true)

  const [saving, setSaving] =
    useState(false)

  const [message, setMessage] =
    useState<Message | null>(
      null
    )

  const loadUsers =
    useCallback(
      async (): Promise<void> => {
        setLoading(true)

        try {
          const result =
            await window.pos.users
              .list()

          if (!result.success) {
            setMessage({
              type: 'error',
              text: result.message
            })

            return
          }

          setUsers(
            result.data
          )
        } catch (
          unknownError
        ) {
          console.error(
            unknownError
          )

          setMessage({
            type: 'error',
            text:
              'No se pudieron cargar los usuarios.'
          })
        } finally {
          setLoading(false)
        }
      },
      []
    )

  useEffect(() => {
    void loadUsers()
  }, [loadUsers])

  function resetForm():
  void {
    setEditingId(null)

    setForm(
      emptyForm
    )
  }

  function startEditing(
    user: User
  ): void {
    setEditingId(
      user.id
    )

    setForm({
      username:
        user.username,

      /*
       * No mostramos ni recuperamos
       * hashes de contraseña.
       */
      password: '',

      role:
        user.role,

      active:
        user.active
    })

    setMessage(null)
  }

  async function handleSubmit(
    event:
      FormEvent<HTMLFormElement>
  ): Promise<void> {
    event.preventDefault()

    setSaving(true)
    setMessage(null)

    try {
      if (
        editingId === null
      ) {
        const result =
          await window.pos.users
            .create({
              username:
                form.username,

              password:
                form.password,

              role:
                form.role
            })

        if (!result.success) {
          setMessage({
            type: 'error',
            text: result.message
          })

          return
        }

        setMessage({
          type: 'success',
          text:
            'Usuario creado correctamente.'
        })
      } else {
        const result =
          await window.pos.users
            .update({
              id: editingId,

              username:
                form.username,

              role:
                form.role,

              active:
                form.active,

              password:
                form.password
            })

        if (!result.success) {
          setMessage({
            type: 'error',
            text: result.message
          })

          return
        }

        setMessage({
          type: 'success',
          text:
            'Usuario actualizado correctamente.'
        })

        if (
          result.data.id ===
          currentUserId
        ) {
          onCurrentUserUpdated({
            id:
              result.data.id,

            username:
              result.data.username,

            role:
              result.data.role
          })
        }
      }

      resetForm()

      await loadUsers()
    } catch (
      unknownError
    ) {
      console.error(
        unknownError
      )

      setMessage({
        type: 'error',
        text:
          'No se pudo guardar el usuario.'
      })
    } finally {
      setSaving(false)
    }
  }

  const editingOwnAccount =
    editingId ===
    currentUserId

  return (
    <main className="page">
      <header className="page-header">
        <div>
          <h1>
            Usuarios
          </h1>

          <p>
            Administra las cuentas
            que pueden ingresar al POS.
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

      <section className="layout">
        <article className="card form-card">
          <h2>
            {editingId === null
              ? 'Nuevo usuario'
              : 'Editar usuario'}
          </h2>

          <form
            onSubmit={
              handleSubmit
            }
          >
            <label>
              Usuario

              <input
                type="text"
                value={
                  form.username
                }
                maxLength={30}
                placeholder="ejemplo: maria"
                onChange={(event) =>
                  setForm(
                    (current) => ({
                      ...current,

                      username:
                        event.target
                          .value
                    })
                  )
                }
              />
            </label>

            <label>
              {editingId === null
                ? 'Contraseña'
                : 'Nueva contraseña'}

              <input
                type="password"
                value={
                  form.password
                }
                placeholder={
                  editingId === null
                    ? ''
                    : 'Dejar vacío para no cambiar'
                }
                autoComplete="new-password"
                onChange={(event) =>
                  setForm(
                    (current) => ({
                      ...current,

                      password:
                        event.target
                          .value
                    })
                  )
                }
              />
            </label>

            <label>
              Rol

              <select
                value={
                  form.role
                }
                disabled={
                  editingOwnAccount
                }
                onChange={(event) =>
                  setForm(
                    (current) => ({
                      ...current,

                      role:
                        event.target
                          .value as UserRole
                    })
                  )
                }
              >
                <option value="EMPLOYEE">
                  Empleado
                </option>

                <option value="ADMIN">
                  Administrador
                </option>
              </select>
            </label>

            {editingId !== null && (
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={
                    form.active
                  }
                  disabled={
                    editingOwnAccount
                  }
                  onChange={(event) =>
                    setForm(
                      (current) => ({
                        ...current,

                        active:
                          event.target
                            .checked
                      })
                    )
                  }
                />

                Cuenta activa
              </label>
            )}

            {editingOwnAccount && (
              <p className="form-note">
                Tu propia cuenta no puede
                ser desactivada ni perder
                el rol de administrador
                mientras estás conectado.
              </p>
            )}

            <div className="form-actions">
              <button
                type="submit"
                className="button button-primary"
                disabled={saving}
              >
                {saving
                  ? 'Guardando...'
                  : editingId === null
                    ? 'Crear usuario'
                    : 'Guardar cambios'}
              </button>

              {editingId !== null && (
                <button
                  type="button"
                  className="button button-secondary"
                  disabled={saving}
                  onClick={
                    resetForm
                  }
                >
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </article>

        <article className="card list-card">
          <div className="card-header">
            <div>
              <h2>
                Usuarios registrados
              </h2>

              <p>
                {users.length}{' '}
                {users.length === 1
                  ? 'usuario'
                  : 'usuarios'}
              </p>
            </div>

            <button
              type="button"
              className="button button-secondary"
              disabled={loading}
              onClick={() =>
                void loadUsers()
              }
            >
              Actualizar
            </button>
          </div>

          {loading ? (
            <p className="empty-state">
              Cargando usuarios...
            </p>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>
                      Usuario
                    </th>

                    <th>
                      Rol
                    </th>

                    <th>
                      Estado
                    </th>

                    <th>
                      Acciones
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {users.map(
                    (user) => (
                      <tr
                        key={
                          user.id
                        }
                        className={
                          user.active
                            ? ''
                            : 'inactive-row'
                        }
                      >
                        <td>
                          <strong>
                            {
                              user.username
                            }
                          </strong>

                          {user.id ===
                            currentUserId && (
                            <span className="current-user-tag">
                              Tú
                            </span>
                          )}
                        </td>

                        <td>
                          {user.role ===
                          'ADMIN'
                            ? 'Administrador'
                            : 'Empleado'}
                        </td>

                        <td>
                          <span
                            className={
                              `status ${
                                user.active
                                  ? 'status-active'
                                  : 'status-inactive'
                              }`
                            }
                          >
                            {user.active
                              ? 'Activo'
                              : 'Inactivo'}
                          </span>
                        </td>

                        <td>
                          <button
                            type="button"
                            className="text-button"
                            onClick={() =>
                              startEditing(
                                user
                              )
                            }
                          >
                            Editar
                          </button>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          )}
        </article>
      </section>
    </main>
  )
}

export default UsersPage