import type Database from 'better-sqlite3'

interface Migration {
  version: number
  name: string
  sql: string
}

/*
 * Cada cambio futuro de la base de datos debe agregarse
 * como una migración nueva.
 *
 * No debes modificar una migración que ya haya sido
 * utilizada por una instalación real.
 */
const migrations: Migration[] = [
  {
    version: 1,
    name: 'initial_schema',
    sql: `
      CREATE TABLE users (
        id INTEGER PRIMARY KEY,

        username TEXT NOT NULL
          COLLATE NOCASE
          UNIQUE,

        password_hash TEXT NOT NULL,

        role TEXT NOT NULL
          CHECK (role IN ('ADMIN', 'EMPLOYEE')),

        active INTEGER NOT NULL DEFAULT 1
          CHECK (active IN (0, 1)),

        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE categories (
        id INTEGER PRIMARY KEY,

        name TEXT NOT NULL
          COLLATE NOCASE
          UNIQUE,

        price INTEGER NOT NULL
          CHECK (price >= 0),

        stock INTEGER NOT NULL DEFAULT 0
          CHECK (stock >= 0),

        discount_percent INTEGER NOT NULL DEFAULT 0
          CHECK (discount_percent BETWEEN 0 AND 100),

        active INTEGER NOT NULL DEFAULT 1
          CHECK (active IN (0, 1)),

        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE settings (
        id INTEGER PRIMARY KEY
          CHECK (id = 1),

        store_name TEXT NOT NULL DEFAULT '',
        phone TEXT NOT NULL DEFAULT '',
        address TEXT NOT NULL DEFAULT '',

        receipt_message TEXT NOT NULL
          DEFAULT 'Gracias por su compra.',

        logo_path TEXT,
        printer_name TEXT,

        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      INSERT INTO settings (id)
      VALUES (1);
    `
  }
]

export function runMigrations(
  database: Database.Database
): void {
  /*
   * Esta tabla lleva el control de las migraciones
   * que ya fueron ejecutadas.
   */
  database.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `)

  const appliedRows = database
    .prepare(`
      SELECT version
      FROM schema_migrations
      ORDER BY version
    `)
    .all() as Array<{ version: number }>

  const appliedVersions = new Set(
    appliedRows.map((row) => row.version)
  )

  const saveMigrationStatement = database.prepare(`
    INSERT INTO schema_migrations (
      version,
      name
    )
    VALUES (?, ?)
  `)

  /*
   * El SQL de la migración y su registro se guardan
   * dentro de la misma transacción.
   */
  const applyMigration = database.transaction(
    (migration: Migration): void => {
      database.exec(migration.sql)

      saveMigrationStatement.run(
        migration.version,
        migration.name
      )
    }
  )

  const orderedMigrations = [...migrations].sort(
    (first, second) => first.version - second.version
  )

  for (const migration of orderedMigrations) {
    if (appliedVersions.has(migration.version)) {
      continue
    }

    applyMigration(migration)

    console.info(
      `[database] Migration ${migration.version} applied: ${migration.name}`
    )
  }
}