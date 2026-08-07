import bcrypt from 'bcryptjs'

import {
  getDatabase
} from '../database/connection'

import type {
  UserRole
} from '../auth/auth.service'

export interface User {
  id: number
  username: string
  role: UserRole
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateUserInput {
  username: string
  password: string
  role: UserRole
}

export interface UpdateUserInput {
  id: number
  username: string
  role: UserRole
  active: boolean

  /*
   * Si viene vacío, no cambiamos
   * la contraseña.
   */
  password?: string
}

interface UserRow {
  id: number
  username: string
  password_hash: string
  role: UserRole
  active: number
  created_at: string
  updated_at: string
}

function mapUser(
  row: UserRow
): User {
  return {
    id: row.id,
    username: row.username,
    role: row.role,
    active: row.active === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

function normalizeUsername(
  username: unknown
): string {
  if (typeof username !== 'string') {
    return ''
  }

  return username
    .trim()
    .toLowerCase()
}

function validateUsername(
  username: string
): void {
  if (username.length < 3) {
    throw new Error(
      'El usuario debe tener al menos 3 caracteres.'
    )
  }

  if (username.length > 30) {
    throw new Error(
      'El usuario no puede superar los 30 caracteres.'
    )
  }

  const validUsername =
    /^[a-z0-9._-]+$/

  if (!validUsername.test(username)) {
    throw new Error(
      'El usuario solo puede contener letras, números, punto, guion y guion bajo.'
    )
  }
}

function validatePassword(
  password: unknown
): string {
  if (typeof password !== 'string') {
    throw new Error(
      'La contraseña no es válida.'
    )
  }

  if (password.length < 8) {
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

function validateRole(
  role: unknown
): asserts role is UserRole {
  if (
    role !== 'ADMIN' &&
    role !== 'EMPLOYEE'
  ) {
    throw new Error(
      'El rol seleccionado no es válido.'
    )
  }
}

function validateId(
  id: number
): void {
  if (
    !Number.isInteger(id) ||
    id <= 0
  ) {
    throw new Error(
      'El usuario indicado no es válido.'
    )
  }
}

function countActiveAdmins(): number {
  const database =
    getDatabase()

  const row = database
    .prepare(`
      SELECT COUNT(*) AS total
      FROM users
      WHERE role = 'ADMIN'
        AND active = 1
    `)
    .get() as {
      total: number
    }

  return row.total
}

function getUserById(
  id: number
): User {
  validateId(id)

  const database =
    getDatabase()

  const row = database
    .prepare(`
      SELECT
        id,
        username,
        password_hash,
        role,
        active,
        created_at,
        updated_at
      FROM users
      WHERE id = ?
    `)
    .get(id) as
      | UserRow
      | undefined

  if (!row) {
    throw new Error(
      'El usuario indicado no existe.'
    )
  }

  return mapUser(row)
}

function translateDatabaseError(
  error: unknown
): never {
  if (
    error instanceof Error &&
    error.message.includes(
      'UNIQUE constraint failed: users.username'
    )
  ) {
    throw new Error(
      'Ese nombre de usuario ya existe.'
    )
  }

  throw error
}

export function listUsers():
User[] {
  const database =
    getDatabase()

  const rows = database
    .prepare(`
      SELECT
        id,
        username,
        password_hash,
        role,
        active,
        created_at,
        updated_at
      FROM users
      ORDER BY
        active DESC,
        role ASC,
        username COLLATE NOCASE ASC
    `)
    .all() as UserRow[]

  return rows.map(
    mapUser
  )
}

export async function createUser(
  input: CreateUserInput
): Promise<User> {
  const username =
    normalizeUsername(
      input?.username
    )

  validateUsername(username)
  validateRole(input?.role)

  const password =
    validatePassword(
      input?.password
    )

  if (
    input.role === 'ADMIN' &&
    countActiveAdmins() >= 3
  ) {
    throw new Error(
      'El sistema permite un máximo de 3 administradores activos.'
    )
  }

  const passwordHash =
    await bcrypt.hash(
      password,
      12
    )

  const database =
    getDatabase()

  try {
    const result = database
      .prepare(`
        INSERT INTO users (
          username,
          password_hash,
          role,
          active
        )
        VALUES (?, ?, ?, 1)
      `)
      .run(
        username,
        passwordHash,
        input.role
      )

    return getUserById(
      Number(
        result.lastInsertRowid
      )
    )
  } catch (error: unknown) {
    return translateDatabaseError(
      error
    )
  }
}

export async function updateUser(
  input: UpdateUserInput,
  actingAdminId: number
): Promise<User> {
  validateId(input?.id)
  validateId(actingAdminId)

  const username =
    normalizeUsername(
      input?.username
    )

  validateUsername(username)
  validateRole(input?.role)

  if (
    typeof input?.active !== 'boolean'
  ) {
    throw new Error(
      'El estado del usuario no es válido.'
    )
  }

  const currentUser =
    getUserById(
      input.id
    )

  /*
   * El administrador conectado no puede
   * quitarse sus propios permisos.
   */
  if (
    input.id === actingAdminId
  ) {
    if (
      input.role !== 'ADMIN'
    ) {
      throw new Error(
        'No puedes quitarte tu propio rol de administrador.'
      )
    }

    if (!input.active) {
      throw new Error(
        'No puedes desactivar tu propia cuenta.'
      )
    }
  }

  /*
   * Si este usuario va a convertirse
   * en un administrador activo,
   * comprobamos el límite.
   */
  const becomingActiveAdmin =
    input.role === 'ADMIN' &&
    input.active &&
    !(
      currentUser.role === 'ADMIN' &&
      currentUser.active
    )

  if (
    becomingActiveAdmin &&
    countActiveAdmins() >= 3
  ) {
    throw new Error(
      'El sistema permite un máximo de 3 administradores activos.'
    )
  }

  let passwordHash:
    string | null = null

  if (
    typeof input.password === 'string' &&
    input.password.length > 0
  ) {
    const password =
      validatePassword(
        input.password
      )

    passwordHash =
      await bcrypt.hash(
        password,
        12
      )
  }

  const database =
    getDatabase()

  try {
    if (passwordHash) {
      database
        .prepare(`
          UPDATE users
          SET
            username = ?,
            password_hash = ?,
            role = ?,
            active = ?,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `)
        .run(
          username,
          passwordHash,
          input.role,
          input.active ? 1 : 0,
          input.id
        )
    } else {
      database
        .prepare(`
          UPDATE users
          SET
            username = ?,
            role = ?,
            active = ?,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `)
        .run(
          username,
          input.role,
          input.active ? 1 : 0,
          input.id
        )
    }

    return getUserById(
      input.id
    )
  } catch (error: unknown) {
    return translateDatabaseError(
      error
    )
  }
}