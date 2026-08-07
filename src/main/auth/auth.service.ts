import bcrypt from 'bcryptjs'

import {
  getDatabase
} from '../database/connection'

export type UserRole =
  | 'ADMIN'
  | 'EMPLOYEE'

export interface AuthUser {
  id: number
  username: string
  role: UserRole
}

export interface AuthStatus {
  setupRequired: boolean
  user: AuthUser | null
}

export interface LoginInput {
  username: string
  password: string
}

export interface SetupAdminInput {
  username: string
  password: string
}

interface UserRow {
  id: number
  username: string
  password_hash: string
  role: UserRole
  active: number
}

let currentUser:
  AuthUser | null = null

function normalizeUsername(
  username: unknown
): string {
  if (
    typeof username !== 'string'
  ) {
    return ''
  }

  return username
    .trim()
    .toLowerCase()
}

function validateUsername(
  username: string
): void {
  if (
    username.length < 3
  ) {
    throw new Error(
      'El usuario debe tener al menos 3 caracteres.'
    )
  }

  if (
    username.length > 30
  ) {
    throw new Error(
      'El usuario no puede superar los 30 caracteres.'
    )
  }

  const validUsername =
    /^[a-z0-9._-]+$/

  if (
    !validUsername.test(
      username
    )
  ) {
    throw new Error(
      'El usuario solo puede contener letras, números, punto, guion y guion bajo.'
    )
  }
}

function validateNewPassword(
  password: unknown
): string {
  if (
    typeof password !== 'string'
  ) {
    throw new Error(
      'La contraseña no es válida.'
    )
  }

  if (
    password.length < 8
  ) {
    throw new Error(
      'La contraseña debe tener al menos 8 caracteres.'
    )
  }

  if (
    Buffer.byteLength(
      password,
      'utf8'
    ) > 72
  ) {
    throw new Error(
      'La contraseña es demasiado larga.'
    )
  }

  return password
}

function mapUser(
  row: UserRow
): AuthUser {
  return {
    id: row.id,
    username: row.username,
    role: row.role
  }
}

function countUsers():
number {
  const database =
    getDatabase()

  const row = database
    .prepare(`
      SELECT COUNT(*) AS total
      FROM users
    `)
    .get() as {
      total: number
    }

  return row.total
}

export function getAuthStatus():
AuthStatus {
  return {
    setupRequired:
      countUsers() === 0,

    user: currentUser
  }
}

export async function createInitialAdmin(
  input: SetupAdminInput
): Promise<AuthUser> {
  const username =
    normalizeUsername(
      input?.username
    )

  validateUsername(
    username
  )

  const password =
    validateNewPassword(
      input?.password
    )

  const passwordHash =
    await bcrypt.hash(
      password,
      12
    )

  const database =
    getDatabase()

  const createAdmin =
    database.transaction(() => {
      if (
        countUsers() > 0
      ) {
        throw new Error(
          'La configuración inicial ya fue realizada.'
        )
      }

      const result =
        database
          .prepare(`
            INSERT INTO users (
              username,
              password_hash,
              role,
              active
            )
            VALUES (
              ?,
              ?,
              'ADMIN',
              1
            )
          `)
          .run(
            username,
            passwordHash
          )

      return Number(
        result.lastInsertRowid
      )
    })

  try {
    const userId =
      createAdmin()

    currentUser = {
      id: userId,
      username,
      role: 'ADMIN'
    }

    return currentUser
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      error.message.includes(
        'UNIQUE constraint failed'
      )
    ) {
      throw new Error(
        'Ese nombre de usuario ya existe.'
      )
    }

    throw error
  }
}

export async function login(
  input: LoginInput
): Promise<AuthUser> {
  const username =
    normalizeUsername(
      input?.username
    )

  const password =
    input?.password

  if (
    !username ||
    typeof password !== 'string' ||
    password.length === 0
  ) {
    throw new Error(
      'Usuario o contraseña incorrectos.'
    )
  }

  const database =
    getDatabase()

  const row = database
    .prepare(`
      SELECT
        id,
        username,
        password_hash,
        role,
        active
      FROM users
      WHERE username = ?
      LIMIT 1
    `)
    .get(
      username
    ) as
      | UserRow
      | undefined

  if (
    !row ||
    row.active !== 1
  ) {
    throw new Error(
      'Usuario o contraseña incorrectos.'
    )
  }

  const passwordMatches =
    await bcrypt.compare(
      password,
      row.password_hash
    )

  if (!passwordMatches) {
    throw new Error(
      'Usuario o contraseña incorrectos.'
    )
  }

  currentUser =
    mapUser(row)

  return currentUser
}

export function logout():
void {
  currentUser = null
}

export function requireUser():
AuthUser {
  if (!currentUser) {
    throw new Error(
      'Debes iniciar sesión para realizar esta operación.'
    )
  }

  return currentUser
}

export function requireAdmin():
AuthUser {
  const user =
    requireUser()

  if (
    user.role !== 'ADMIN'
  ) {
    throw new Error(
      'No tienes permisos para realizar esta operación.'
    )
  }

  return user
}

export function updateCurrentSessionUser(
  user: AuthUser
): void {
  if (
    currentUser?.id !==
    user.id
  ) {
    return
  }

  currentUser = {
    id: user.id,
    username: user.username,
    role: user.role
  }
}