import {
  ipcMain
} from 'electron'

import {
  requireUser
} from '../auth/auth.service'

import {
  createSale,
  type CreateSaleInput,
  type Sale
} from '../sales/sale.service'

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
    '[sales]',
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

export function registerSalesIpc():
void {
  ipcMain.removeHandler(
    'sales:create'
  )

  ipcMain.handle(
    'sales:create',

    (
      _event,
      input: CreateSaleInput
    ): IpcResult<Sale> => {
      try {
        /*
         * Tanto ADMIN como EMPLOYEE
         * pueden realizar ventas.
         */
        const user =
          requireUser()

        const sale =
          createSale(
            input,
            user.id
          )

        return success(
          sale
        )
      } catch (error: unknown) {
        return failure(
          error
        )
      }
    }
  )
}