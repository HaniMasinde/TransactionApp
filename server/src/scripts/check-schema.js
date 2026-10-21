require("dotenv").config();

const { pool } = require("../config/database");

const expectedTables = [
  "users",
  "sessions",
  "transactions",
  "audit_logs",
  "password_recovery_tokens",
  "notifications",
  "group_rules",
  "meetings",
  "meeting_minutes",
  "role_transfers",
];

async function checkSchema() {
  try {
    const result = await pool.query(
      `SELECT
         table_name,
         column_name,
         data_type,
         is_nullable,
         column_default
       FROM information_schema.columns
       WHERE table_schema = 'public'
       ORDER BY table_name, ordinal_position`
    );

    const existingTables = new Set(
      result.rows.map((row) => row.table_name)
    );

    console.log("\n=== TABLE STATUS ===");

    for (const table of expectedTables) {
      console.log(
        `${existingTables.has(table) ? "EXISTS" : "MISSING"}  ${table}`
      );
    }

    console.log("\n=== EXISTING COLUMNS ===");

    for (const row of result.rows) {
      console.log(
        `${row.table_name}.${row.column_name}` +
          ` | ${row.data_type}` +
          ` | nullable: ${row.is_nullable}` +
          ` | default: ${row.column_default ?? "none"}`
      );
    }

    const migrations = await pool.query(
      `SELECT to_regclass('public.schema_migrations') AS tracking_table`
    );

    console.log(
      "\nMigration tracking:",
      migrations.rows[0].tracking_table ?? "NOT CREATED"
    );
  } catch (error) {
    console.error("Schema check failed:", error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

checkSchema();