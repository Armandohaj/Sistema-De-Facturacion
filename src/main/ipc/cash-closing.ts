import {
  ipcMain
} from 'electron'

import {
  requireAdmin
} from '../auth/auth.service'

import {
  createCashClosing,
  getCashClosingDay,
  type CreateCashClosingInput
} from '../cash-closing/cash-closing.service'

function getErrorMessage(
  error: unknown
): string {
  if (
    error instanceof Error
  ) {
    return error.message
  }

  return (
    'Ocurrió un error inesperado.'
  )
}

export function registerCashClosingIpc():
void {
  ipcMain.handle(
    'cash-closing:get-day',

    (
      _event,
      date: string
    ) => {
      try {
        requireAdmin()

        return {
          success: true as const,

          data:
            getCashClosingDay(
              date
            )
        }
      } catch (
        error: unknown
      ) {
        console.error(
          '[cash-closing:get-day]',
          error
        )

        return {
          success: false as const,

          message:
            getErrorMessage(
              error
            )
        }
      }
    }
  )

  ipcMain.handle(
    'cash-closing:create',

    (
      _event,
      input:
        CreateCashClosingInput
    ) => {
      try {
        const user =
          requireAdmin()

        const closing =
          createCashClosing(
            input,
            user.id
          )

        return {
          success: true as const,
          data: closing
        }
      } catch (
        error: unknown
      ) {
        console.error(
          '[cash-closing:create]',
          error
        )

        return {
          success: false as const,

          message:
            getErrorMessage(
              error
            )
        }
      }
    }
  )
}