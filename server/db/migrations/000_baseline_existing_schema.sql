
BEGIN;

CREATE TABLE IF NOT EXISTS schema_migrations (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    migration_name VARCHAR(255) NOT NULL UNIQUE,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO schema_migrations (migration_name)
VALUES
    ('001_accounts_and_sessions.sql'),
    ('004_rules_meetings_and_minutes.sql')
ON CONFLICT (migration_name) DO NOTHING;

COMMIT;

