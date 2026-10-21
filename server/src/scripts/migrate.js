
require("dotenv").config();

const fs = require("fs");
const path = require("path");
const { pool } = require("../config/database");

const MIGRATIONS_DIR = path.join(__dirname, "../../db/migrations");

async function runMigrations() {
  const client = await pool.connect();

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        migration_name VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const files = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter(
  (file) =>
    /^\d+.*\.sql$/.test(file) &&
    file !== "000_baseline_existing_schema.sql"
)
      .sort();

    for (const file of files) {
      const { rowCount } = await client.query(
        `SELECT 1
         FROM schema_migrations
         WHERE migration_name = $1`,
        [file]
      );

      if (rowCount > 0) {
        console.log(`Skipped: ${file}`);
        continue;
      }

      const filePath = path.join(MIGRATIONS_DIR, file);

      const sql = fs
        .readFileSync(filePath, "utf8")
        .replace(/^\s*BEGIN\s*;\s*/i, "")
        .replace(/\s*COMMIT\s*;\s*$/i, "");

      console.log(`Running: ${file}`);

      await client.query("BEGIN");

      try {
        await client.query(sql);

        await client.query(
          `INSERT INTO schema_migrations (migration_name)
           VALUES ($1)`,
          [file]
        );

        await client.query("COMMIT");
        console.log(`Applied: ${file}`);
      } catch (error) {
        await client.query("ROLLBACK");
        throw new Error(`${file} failed: ${error.message}`);
      }
    }

    console.log("All pending migrations completed.");
  } catch (error) {
    console.error("Migration failed:", error.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigrations();
