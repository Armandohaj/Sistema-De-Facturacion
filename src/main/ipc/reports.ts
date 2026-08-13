import {
  ipcMain
} from 'electron'

import {
  requireAdmin
} from '../auth/auth.service'

import {
  getMonthlyReport,
  getReportSummary
} from '../reports/report.service'

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

export function registerReportsIpc():
void {
  ipcMain.handle(
    'reports:get-summary',

    () => {
      try {
        requireAdmin()

        const summary =
          getReportSummary()

        return {
          success: true as const,
          data: summary
        }
      } catch (
        error: unknown
      ) {
        console.error(
          '[reports:get-summary]',
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
    'reports:get-monthly-report',

    (
      _event,
      month: string
    ) => {
      try {
        requireAdmin()

        const report =
          getMonthlyReport(
            month
          )

        return {
          success: true as const,
          data: report
        }
      } catch (
        error: unknown
      ) {
        console.error(
          '[reports:get-monthly-report]',
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