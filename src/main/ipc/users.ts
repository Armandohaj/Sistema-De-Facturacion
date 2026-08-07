import {
  ipcMain
} from 'electron'

import {
  requireAdmin,
  updateCurrentSessionUser
} from '../auth/auth.service'

import {
  createUser,
  listUsers,
  updateUser,
  type CreateUserInput,
  type UpdateUserInput,
  type User
} from '../users/user.service'

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
    '[users]',
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

export function registerUsersIpc():
void {
  ipcMain.removeHandler(
    'users:list'
  )

  ipcMain.removeHandler(
    'users:create'
  )

  ipcMain.removeHandler(
    'users:update'
  )

  ipcMain.handle(
    'users:list',

    (): IpcResult<User[]> => {
      try {
        requireAdmin()

        return success(
          listUsers()
        )
      } catch (error: unknown) {
        return failure(error)
      }
    }
  )

  ipcMain.handle(
    'users:create',

    async (
      _event,
      input: CreateUserInput
    ): Promise<
      IpcResult<User>
    > => {
      try {
        requireAdmin()

        const user =
          await createUser(
            input
          )

        return success(user)
      } catch (error: unknown) {
        return failure(error)
      }
    }
  )

  ipcMain.handle(
    'users:update',

    async (
      _event,
      input: UpdateUserInput
    ): Promise<
      IpcResult<User>
    > => {
      try {
        const admin =
          requireAdmin()

        const user =
          await updateUser(
            input,
            admin.id
          )

        /*
         * Si modificamos nuestra propia
         * cuenta, actualizamos también
         * la sesión actual.
         */
        updateCurrentSessionUser({
          id: user.id,
          username:
            user.username,
          role: user.role
        })

        return success(user)
      } catch (error: unknown) {
        return failure(error)
      }
    }
  )
}