import {
  ipcMain
} from 'electron'

import {
  createInitialAdmin,
  getAuthStatus,
  login,
  logout,
  type AuthStatus,
  type AuthUser,
  type LoginInput,
  type SetupAdminInput
} from '../auth/auth.service'

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
    '[auth]',
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

export function registerAuthIpc():
void {
  ipcMain.removeHandler(
    'auth:get-status'
  )

  ipcMain.removeHandler(
    'auth:setup'
  )

  ipcMain.removeHandler(
    'auth:login'
  )

  ipcMain.removeHandler(
    'auth:logout'
  )

  ipcMain.handle(
    'auth:get-status',
    (): IpcResult<AuthStatus> => {
      try {
        return success(
          getAuthStatus()
        )
      } catch (error: unknown) {
        return failure(error)
      }
    }
  )

  ipcMain.handle(
    'auth:setup',

    async (
      _event,
      input: SetupAdminInput
    ): Promise<
      IpcResult<AuthUser>
    > => {
      try {
        const user =
          await createInitialAdmin(
            input
          )

        return success(user)
      } catch (error: unknown) {
        return failure(error)
      }
    }
  )

  ipcMain.handle(
    'auth:login',

    async (
      _event,
      input: LoginInput
    ): Promise<
      IpcResult<AuthUser>
    > => {
      try {
        const user =
          await login(input)

        return success(user)
      } catch (error: unknown) {
        return failure(error)
      }
    }
  )

  ipcMain.handle(
    'auth:logout',
    (): IpcResult<null> => {
      try {
        logout()

        return success(null)
      } catch (error: unknown) {
        return failure(error)
      }
    }
  )
}