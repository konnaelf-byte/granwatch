import { drizzle } from "drizzle-orm/mysql2";
import { migrate } from "drizzle-orm/mysql2/migrator";
import mysql from "mysql2/promise";
import path from "path";
import { ENV } from "./env";

/**
 * Run pending Drizzle SQL migrations at startup.
 * Idempotent — already-applied migrations are skipped via the drizzle
 * migrations tracking table (`__drizzle_migrations`).
 */
export async function runMigrations(): Promise<void> {
  const connection = await mysql.createConnection(ENV.databaseUrl);
  try {
    const db = drizzle(connection);
    const migrationsFolder = path.resolve(
      // In the Docker image the CWD is /app; drizzle/ is copied there.
      process.cwd(),
      "drizzle"
    );
    console.log("[DB] Running migrations from", migrationsFolder);
    await migrate(db, { migrationsFolder });
    console.log("[DB] Migrations complete.");
  } finally {
    await connection.end();
  }
}
