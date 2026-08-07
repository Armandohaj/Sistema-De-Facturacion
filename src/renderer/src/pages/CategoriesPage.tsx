import {
  useCallback,
  useEffect,
  useState,
  type FormEvent
} from 'react'

interface Category {
  id: number
  name: string
  price: number
  stock: number
  discountPercent: number
  active: boolean
}

interface CategoryForm {
  name: string
  price: string
  stock: string
  discountPercent: string
}

interface Message {
  type: 'success' | 'error'
  text: string
}

const emptyForm: CategoryForm = {
  name: '',
  price: '',
  stock: '0',
  discountPercent: '0'
}

const currencyFormatter =
  new Intl.NumberFormat('es-CR', {
    style: 'currency',
    currency: 'CRC',
    maximumFractionDigits: 0
  })

function CategoriesPage(): React.JSX.Element {
  const [categories, setCategories] =
    useState<Category[]>([])

  const [form, setForm] =
    useState<CategoryForm>(emptyForm)

  const [editingId, setEditingId] =
    useState<number | null>(null)

  const [loading, setLoading] =
    useState(true)

  const [saving, setSaving] =
    useState(false)

  const [message, setMessage] =
    useState<Message | null>(null)

  const loadCategories =
    useCallback(async (): Promise<void> => {
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

        setCategories(result.data)
      } catch (error: unknown) {
        console.error(error)

        setMessage({
          type: 'error',
          text: 'No se pudieron cargar las categorías.'
        })
      } finally {
        setLoading(false)
      }
    }, [])

  useEffect(() => {
    void loadCategories()
  }, [loadCategories])

  function updateForm(
    field: keyof CategoryForm,
    value: string
  ): void {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value
    }))
  }

  function resetForm(): void {
    setForm(emptyForm)
    setEditingId(null)
  }

  function startEditing(
    category: Category
  ): void {
    setEditingId(category.id)

    setForm({
      name: category.name,
      price: String(category.price),
      stock: String(category.stock),
      discountPercent: String(
        category.discountPercent
      )
    })

    setMessage(null)
  }

  function parseInteger(
    value: string,
    fieldName: string
  ): number {
    if (value.trim() === '') {
      throw new Error(
        `Debe indicar ${fieldName}.`
      )
    }

    const parsedValue = Number(value)

    if (!Number.isInteger(parsedValue)) {
      throw new Error(
        `${fieldName} debe ser un número entero.`
      )
    }

    return parsedValue
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ): Promise<void> {
    event.preventDefault()

    setMessage(null)
    setSaving(true)

    try {
      const input = {
        name: form.name,
        price: parseInteger(
          form.price,
          'el precio'
        ),
        stock: parseInteger(
          form.stock,
          'la cantidad disponible'
        ),
        discountPercent: parseInteger(
          form.discountPercent,
          'el descuento'
        )
      }

      const result =
        editingId === null
          ? await window.pos.categories.create(
              input
            )
          : await window.pos.categories.update({
              id: editingId,
              ...input
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
          editingId === null
            ? 'Categoría creada correctamente.'
            : 'Categoría actualizada correctamente.'
      })

      resetForm()
      await loadCategories()
    } catch (error: unknown) {
      setMessage({
        type: 'error',
        text:
          error instanceof Error
            ? error.message
            : 'No se pudo guardar la categoría.'
      })
    } finally {
      setSaving(false)
    }
  }

  async function handleActiveChange(
    category: Category
  ): Promise<void> {
    const newStatus = !category.active

    if (
      !newStatus &&
      !window.confirm(
        `¿Deseas desactivar "${category.name}"?`
      )
    ) {
      return
    }

    setMessage(null)

    try {
      const result =
        await window.pos.categories.setActive(
          category.id,
          newStatus
        )

      if (!result.success) {
        setMessage({
          type: 'error',
          text: result.message
        })

        return
      }

      setMessage({
        type: 'success',
        text: newStatus
          ? 'Categoría activada correctamente.'
          : 'Categoría desactivada correctamente.'
      })

      await loadCategories()
    } catch (error: unknown) {
      console.error(error)

      setMessage({
        type: 'error',
        text: 'No se pudo cambiar el estado de la categoría.'
      })
    }
  }

  return (
    <main className="page">
      <header className="page-header">
        <div>
          <h1>Categorías e inventario</h1>

          <p>
            Administra los productos que pueden
            venderse en el sistema.
          </p>
        </div>
      </header>

      {message && (
        <div
          className={`message message-${message.type}`}
          role="alert"
        >
          {message.text}
        </div>
      )}

      <section className="layout">
        <article className="card form-card">
          <h2>
            {editingId === null
              ? 'Nueva categoría'
              : 'Editar categoría'}
          </h2>

          <form onSubmit={handleSubmit}>
            <label>
              Nombre

              <input
                type="text"
                value={form.name}
                maxLength={80}
                placeholder="Ejemplo: Pantalón hombre"
                onChange={(event) =>
                  updateForm(
                    'name',
                    event.target.value
                  )
                }
              />
            </label>

            <label>
              Precio en colones

              <input
                type="number"
                min="0"
                step="1"
                value={form.price}
                placeholder="6000"
                onChange={(event) =>
                  updateForm(
                    'price',
                    event.target.value
                  )
                }
              />
            </label>

            <label>
              Cantidad disponible

              <input
                type="number"
                min="0"
                step="1"
                value={form.stock}
                onChange={(event) =>
                  updateForm(
                    'stock',
                    event.target.value
                  )
                }
              />
            </label>

            <label>
              Descuento

              <div className="input-suffix">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={
                    form.discountPercent
                  }
                  onChange={(event) =>
                    updateForm(
                      'discountPercent',
                      event.target.value
                    )
                  }
                />

                <span>%</span>
              </div>
            </label>

            <div className="form-actions">
              <button
                type="submit"
                className="button button-primary"
                disabled={saving}
              >
                {saving
                  ? 'Guardando...'
                  : editingId === null
                    ? 'Crear categoría'
                    : 'Guardar cambios'}
              </button>

              {editingId !== null && (
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={resetForm}
                  disabled={saving}
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
              <h2>Categorías registradas</h2>

              <p>
                {categories.length}{' '}
                {categories.length === 1
                  ? 'categoría'
                  : 'categorías'}
              </p>
            </div>

            <button
              type="button"
              className="button button-secondary"
              onClick={() =>
                void loadCategories()
              }
              disabled={loading}
            >
              Actualizar
            </button>
          </div>

          {loading ? (
            <p className="empty-state">
              Cargando categorías...
            </p>
          ) : categories.length === 0 ? (
            <p className="empty-state">
              Todavía no hay categorías registradas.
            </p>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Precio</th>
                    <th>Existencias</th>
                    <th>Descuento</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>

                <tbody>
                  {categories.map(
                    (category) => (
                      <tr
                        key={category.id}
                        className={
                          category.active
                            ? ''
                            : 'inactive-row'
                        }
                      >
                        <td>
                          <strong>
                            {category.name}
                          </strong>
                        </td>

                        <td>
                          {currencyFormatter.format(
                            category.price
                          )}
                        </td>

                        <td>
                          {category.stock}
                        </td>

                        <td>
                          {
                            category.discountPercent
                          }
                          %
                        </td>

                        <td>
                          <span
                            className={`status ${
                              category.active
                                ? 'status-active'
                                : 'status-inactive'
                            }`}
                          >
                            {category.active
                              ? 'Activa'
                              : 'Inactiva'}
                          </span>
                        </td>

                        <td>
                          <div className="row-actions">
                            <button
                              type="button"
                              className="text-button"
                              onClick={() =>
                                startEditing(
                                  category
                                )
                              }
                            >
                              Editar
                            </button>

                            <button
                              type="button"
                              className="text-button"
                              onClick={() =>
                                void handleActiveChange(
                                  category
                                )
                              }
                            >
                              {category.active
                                ? 'Desactivar'
                                : 'Activar'}
                            </button>
                          </div>
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

export default CategoriesPage