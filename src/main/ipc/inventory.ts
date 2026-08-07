import {
  ipcMain
} from 'electron'

import {
  requireAdmin
} from '../auth/auth.service'

import {
  listRecentInventoryMovements,
  type InventoryMovement
} from '../inventory/inventory.service'

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
    '[inventory]',
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

export function registerInventoryIpc():
void {
  ipcMain.removeHandler(
    'inventory:list-recent'
  )

  ipcMain.handle(
    'inventory:list-recent',

    (
      _event,
      limit?: number
    ): IpcResult<
      InventoryMovement[]
    > => {
      try {
        requireAdmin()

        return success(
          listRecentInventoryMovements(
            limit
          )
        )
      } catch (error: unknown) {
        return failure(error)
      }
    }
  )
}