import { app } from 'electron'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import Database from 'better-sqlite3'
import { runMigrations } from './migrations'

let database: Database.Database | null = null
let databasePath: string | null = null

/**
 * Abre SQLite y ejecuta las migraciones pendientes.
 *
 * La función devuelve siempre la misma conexión mientras
 * la aplicación se encuentre abierta.
 */
export function initializeDatabase(): Database.Database {
  if (database) {
    return database
  }

  /*
   * La base de datos no se guarda dentro del proyecto.
   *
   * Electron selecciona automáticamente una ubicación
   * apropiada para Linux o Windows.
   */
  const dataDirectory = join(
    app.getPath('userData'),
    'pos-data'
  )

  mkdirSync(dataDirectory, {
    recursive: true
  })

  databasePath = join(
    dataDirectory,
    'pos.sqlite3'
  )

  database = new Database(databasePath)

  /*
   * Activa las restricciones FOREIGN KEY.
   */
  database.pragma('foreign_keys = ON')

  /*
   * Utiliza Write-Ahead Logging.
   */
  database.pragma('journal_mode = WAL')

  /*
   * Priorizamos durabilidad porque se trata de un POS.
   */
  database.pragma('synchronous = FULL')

  /*
   * Espera hasta cinco segundos cuando la base está
   * temporalmente ocupada.
   */
  database.pragma('busy_timeout = 5000')

  runMigrations(database)

  console.info(`[database] Ready: ${databasePath}`)

  return database
}

/**
 * Obtiene la conexión existente.
 *
 * No abre una conexión nueva.
 */
export function getDatabase(): Database.Database {
  if (!database) {
    throw new Error(
      'The database has not been initialized.'
    )
  }

  return database
}

/**
 * Devuelve la ubicación exacta del archivo SQLite.
 */
export function getDatabasePath(): string {
  if (!databasePath) {
    throw new Error(
      'The database path is not available.'
    )
  }

  return databasePath
}

/**
 * Cierra la conexión cuando termina la aplicación.
 */
export function closeDatabase(): void {
  if (!database) {
    return
  }

  database.close()

  database = null
  databasePath = null

  console.info('[database] Closed')
}