
require("dotenv").config();

const { pool } = require("../config/database");

async function baseline() {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        migration_name VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const existingTables = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
    `);

    const tables = new Set(
      existingTables.rows.map((row) => row.table_name)
    );

    const requiredBaselineTables = [
      "users",
      "sessions",
      "group_rules",
      "meetings",
      "meeting_minutes",
    ];

    for (const table of requiredBaselineTables) {
      if (!tables.has(table)) {
        throw new Error(`Cannot baseline: ${table} does not exist`);
      }
    }

    await client.query(`
      INSERT INTO schema_migrations (migration_name)
      VALUES
        ('001_accounts_and_sessions.sql'),
        ('004_rules_meetings_and_minutes.sql')
      ON CONFLICT (migration_name) DO NOTHING
    `);

    await client.query("COMMIT");

    console.log("Baseline recorded for existing tables.");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Baseline failed:", error.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

baseline();
