import { ipcMain } from 'electron'
import {
  getDatabase,
  getDatabasePath
} from '../database/connection'

interface TableRow {
  name: string
}

interface MigrationRow {
  version: number
}

export interface DatabaseStatus {
  connected: boolean
  migrationVersion: number
  tables: string[]
  path: string
}

export function registerDatabaseIpc(): void {
  /*
   * Evita registrar el mismo handler dos veces
   * durante ciertos reinicios en desarrollo.
   */
  ipcMain.removeHandler('database:get-status')

  ipcMain.handle(
    'database:get-status',
    (): DatabaseStatus => {
      const database = getDatabase()

      const tableRows = database
        .prepare(`
          SELECT name
          FROM sqlite_master
          WHERE type = 'table'
            AND name NOT LIKE 'sqlite_%'
          ORDER BY name
        `)
        .all() as TableRow[]

      const latestMigration = database
        .prepare(`
          SELECT version
          FROM schema_migrations
          ORDER BY version DESC
          LIMIT 1
        `)
        .get() as MigrationRow | undefined

      return {
        connected: true,
        migrationVersion:
          latestMigration?.version ?? 0,

        tables: tableRows.map(
          (row) => row.name
        ),

        path: getDatabasePath()
      }
    }
  )
}