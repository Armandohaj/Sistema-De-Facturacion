import { ipcMain } from 'electron'

import {
  requireAdmin,
  requireUser
} from '../auth/auth.service'

import {
  cancelSale
} from '../sales/sale-cancellation.service'

import {
  getSaleDetail,
  listSales,
  type SaleHistoryFilters
} from '../sales/sale-history.service'

import {
  createSale,
  type CreateSaleInput
} from '../sales/sale.service'

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

export function registerSalesIpc():
void {
  ipcMain.handle(
    'sales:create',

    (
      _event,
      input: CreateSaleInput
    ) => {
      try {
        const user =
          requireUser()

        const sale =
          createSale(
            input,
            user.id
          )

        return {
          success: true as const,
          data: sale
        }
      } catch (
        error: unknown
      ) {
        console.error(
          '[sales:create]',
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
    'sales:list-history',

    (
      _event,
      filters:
        SaleHistoryFilters = {}
    ) => {
      try {
        requireUser()

        const sales =
          listSales(
            filters
          )

        return {
          success: true as const,
          data: sales
        }
      } catch (
        error: unknown
      ) {
        console.error(
          '[sales:list-history]',
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
    'sales:get-detail',

    (
      _event,
      saleId: number
    ) => {
      try {
        requireUser()

        const sale =
          getSaleDetail(
            saleId
          )

        return {
          success: true as const,
          data: sale
        }
      } catch (
        error: unknown
      ) {
        console.error(
          '[sales:get-detail]',
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
    'sales:cancel',

    (
      _event,
      saleId: number
    ) => {
      try {
        const admin =
          requireAdmin()

        const sale =
          cancelSale(
            saleId,
            admin.id
          )

        return {
          success: true as const,
          data: sale
        }
      } catch (
        error: unknown
      ) {
        console.error(
          '[sales:cancel]',
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