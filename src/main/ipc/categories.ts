import {
  ipcMain
} from 'electron'

import {
  requireAdmin,
  requireUser
} from '../auth/auth.service'

import {
  createCategory,
  listCategories,
  setCategoryActive,
  updateCategory,
  type Category,
  type CategoryInput
} from '../categories/category.service'

interface UpdateCategoryInput
  extends CategoryInput {
  id: number
}

interface SetCategoryActiveInput {
  id: number
  active: boolean
}

type IpcSuccess<T> = {
  success: true
  data: T
}

type IpcFailure = {
  success: false
  message: string
}

type IpcResult<T> =
  | IpcSuccess<T>
  | IpcFailure

function success<T>(
  data: T
): IpcSuccess<T> {
  return {
    success: true,
    data
  }
}

function failure(
  error: unknown
): IpcFailure {
  console.error(
    '[categories]',
    error
  )

  return {
    success: false,

    message:
      error instanceof Error
        ? error.message
        : 'Ocurrió un error inesperado.'
  }
}

export function registerCategoriesIpc():
void {
  ipcMain.removeHandler(
    'categories:list'
  )

  ipcMain.removeHandler(
    'categories:create'
  )

  ipcMain.removeHandler(
    'categories:update'
  )

  ipcMain.removeHandler(
    'categories:set-active'
  )

  /*
   * Tanto ADMIN como EMPLOYEE podrán
   * consultar categorías.
   *
   * Los empleados necesitarán esto
   * posteriormente para realizar ventas.
   */
  ipcMain.handle(
    'categories:list',

    (): IpcResult<Category[]> => {
      try {
        requireUser()

        return success(
          listCategories()
        )
      } catch (error: unknown) {
        return failure(error)
      }
    }
  )

  /*
   * Solo ADMIN puede crear.
   */
  ipcMain.handle(
    'categories:create',

    (
      _event,
      input: CategoryInput
    ): IpcResult<Category> => {
      try {
        const user =
          requireAdmin()

        return success(
          createCategory(
            input,
            user.id
          )
        )
      } catch (error: unknown) {
        return failure(error)
      }
    }
  )

  /*
   * Solo ADMIN puede editar.
   */
  ipcMain.handle(
    'categories:update',

    (
      _event,
      input: UpdateCategoryInput
    ): IpcResult<Category> => {
      try {
        const user =
          requireAdmin()

        return success(
          updateCategory(
            input.id,
            {
              name: input.name,
              price: input.price,
              stock: input.stock,
              discountPercent:
                input.discountPercent
            },
            user.id
          )
        )
      } catch (error: unknown) {
        return failure(error)
      }
    }
  )

  /*
   * Solo ADMIN puede activar
   * o desactivar.
   */
  ipcMain.handle(
    'categories:set-active',

    (
      _event,
      input: SetCategoryActiveInput
    ): IpcResult<Category> => {
      try {
        requireAdmin()

        return success(
          setCategoryActive(
            input.id,
            input.active
          )
        )
      } catch (error: unknown) {
        return failure(error)
      }
    }
  )
}