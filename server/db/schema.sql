CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'treasurer', 'chairperson')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'rejected', 'deactivated', 'deleted')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS one_active_treasurer_idx ON users(role) WHERE role = 'treasurer' AND status = 'active';
CREATE UNIQUE INDEX IF NOT EXISTS one_active_chairperson_idx ON users(role) WHERE role = 'chairperson' AND status = 'active';

CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS user_sessions_user_id_idx ON user_sessions(user_id);

CREATE TABLE IF NOT EXISTS transactions (
  id BIGSERIAL PRIMARY KEY,
  member_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  member_name TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount <> 0),
  occurred_at TIMESTAMPTZ NOT NULL,
  mpesa_code TEXT NOT NULL UNIQUE,
  notes TEXT,
  entry_type TEXT NOT NULL DEFAULT 'contribution' CHECK (entry_type IN ('contribution', 'correction')),
  correction_of BIGINT REFERENCES transactions(id) ON DELETE RESTRICT,
  created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS transactions_member_id_idx ON transactions(member_id);
CREATE INDEX IF NOT EXISTS transactions_occurred_at_idx ON transactions(occurred_at);

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGSERIAL PRIMARY KEY,
  actor_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx ON audit_logs(created_at DESC);

CREATE OR REPLACE FUNCTION protect_transaction_evidence() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND current_setting('app.anonymize_member', true) = 'on'
    AND NEW.amount = OLD.amount AND NEW.occurred_at = OLD.occurred_at
    AND NEW.mpesa_code = OLD.mpesa_code AND NEW.notes IS NOT DISTINCT FROM OLD.notes
    AND NEW.entry_type = OLD.entry_type AND NEW.correction_of IS NOT DISTINCT FROM OLD.correction_of
    AND (NEW.created_by IS NULL OR NEW.created_by IS NOT DISTINCT FROM OLD.created_by)
    AND NEW.member_id IS NULL AND NEW.member_name = 'Former member' THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND current_setting('app.link_transaction_member', true) = 'on'
    AND NEW.amount = OLD.amount AND NEW.occurred_at = OLD.occurred_at
    AND NEW.mpesa_code = OLD.mpesa_code AND NEW.notes IS NOT DISTINCT FROM OLD.notes
    AND NEW.entry_type = OLD.entry_type AND NEW.correction_of IS NOT DISTINCT FROM OLD.correction_of
    AND NEW.created_by IS NOT DISTINCT FROM OLD.created_by
    AND NEW.member_name = OLD.member_name AND OLD.member_id IS NULL AND NEW.member_id IS NOT NULL THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'Transaction evidence is append-only; create a correction instead.';
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS transaction_evidence_is_immutable ON transactions;
CREATE TRIGGER transaction_evidence_is_immutable BEFORE UPDATE OR DELETE ON transactions
FOR EACH ROW EXECUTE FUNCTION protect_transaction_evidence();
