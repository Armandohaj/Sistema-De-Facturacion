import { ipcMain } from 'electron'

import {
  createCategory,
  listCategories,
  setCategoryActive,
  updateCategory,
  type Category,
  type CategoryInput
} from '../categories/category.service'

interface UpdateCategoryInput extends CategoryInput {
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

function success<T>(data: T): IpcSuccess<T> {
  return {
    success: true,
    data
  }
}

function failure(error: unknown): IpcFailure {
  console.error('[categories]', error)

  return {
    success: false,
    message:
      error instanceof Error
        ? error.message
        : 'Ocurrió un error inesperado.'
  }
}

export function registerCategoriesIpc(): void {
  ipcMain.removeHandler('categories:list')
  ipcMain.removeHandler('categories:create')
  ipcMain.removeHandler('categories:update')
  ipcMain.removeHandler('categories:set-active')

  ipcMain.handle(
    'categories:list',
    (): IpcResult<Category[]> => {
      try {
        return success(listCategories())
      } catch (error: unknown) {
        return failure(error)
      }
    }
  )

  ipcMain.handle(
    'categories:create',
    (
      _event,
      input: CategoryInput
    ): IpcResult<Category> => {
      try {
        return success(
          createCategory(input)
        )
      } catch (error: unknown) {
        return failure(error)
      }
    }
  )

  ipcMain.handle(
    'categories:update',
    (
      _event,
      input: UpdateCategoryInput
    ): IpcResult<Category> => {
      try {
        return success(
          updateCategory(
            input.id,
            {
              name: input.name,
              price: input.price,
              stock: input.stock,
              discountPercent:
                input.discountPercent
            }
          )
        )
      } catch (error: unknown) {
        return failure(error)
      }
    }
  )

  ipcMain.handle(
    'categories:set-active',
    (
      _event,
      input: SetCategoryActiveInput
    ): IpcResult<Category> => {
      try {
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