import {
  ipcMain
} from 'electron'

import {
  requireUser
} from '../auth/auth.service'

import {
  createCashClosing,
  getCashClosingDay,
  reopenCashClosing,
  type CreateCashClosingInput,
  type ReopenCashClosingInput
} from '../cash-closing/cash-closing.service'

function getErrorMessage(
  error: unknown
): string {
  if (
    error instanceof Error
  ) {
    return error.message
  }

  return 'Ocurrió un error inesperado.'
}

export function registerCashClosingIpc():
void {
  /*
   * ADMIN y EMPLOYEE pueden consultar
   * la información del cierre de caja.
   */
  ipcMain.handle(
    'cash-closing:get-day',

    (
      _event,
      date: string
    ) => {
      try {
        requireUser()

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

  /*
   * ADMIN y EMPLOYEE pueden cerrar
   * una jornada.
   *
   * También permite volver a cerrar
   * una caja que fue reabierta.
   */
  ipcMain.handle(
    'cash-closing:create',

    (
      _event,
      input:
        CreateCashClosingInput
    ) => {
      try {
        const user =
          requireUser()

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

  /*
   * ADMIN y EMPLOYEE pueden reabrir
   * una caja cerrada.
   *
   * El usuario y el motivo quedan
   * registrados en el historial.
   */
  ipcMain.handle(
    'cash-closing:reopen',

    (
      _event,
      input:
        ReopenCashClosingInput
    ) => {
      try {
        const user =
          requireUser()

        const closing =
          reopenCashClosing(
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
          '[cash-closing:reopen]',
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