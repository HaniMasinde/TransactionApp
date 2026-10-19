
BEGIN;

CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_user_id UUID REFERENCES users(id) ON DELETE RESTRICT,
    entered_member_name VARCHAR(150) NOT NULL,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    paid_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    mpesa_reference VARCHAR(100),
    normalized_mpesa_reference VARCHAR(100),
    status VARCHAR(20) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'reversed')),
    notes TEXT,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    updated_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT transactions_member_name_not_empty
        CHECK (length(trim(entered_member_name)) > 0),
    CONSTRAINT transactions_mpesa_reference_unique
        UNIQUE (normalized_mpesa_reference)
);

CREATE INDEX IF NOT EXISTS idx_transactions_member_paid_at
    ON transactions (member_user_id, paid_at DESC);

CREATE INDEX IF NOT EXISTS idx_transactions_paid_at
    ON transactions (paid_at DESC);

CREATE INDEX IF NOT EXISTS idx_transactions_status_paid_at
    ON transactions (status, paid_at DESC);

CREATE INDEX IF NOT EXISTS idx_transactions_created_by_created_at
    ON transactions (created_by, created_at DESC);

CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    target_type VARCHAR(100) NOT NULL,
    target_id UUID,
    old_values JSONB,
    new_values JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT audit_logs_action_not_empty
        CHECK (length(trim(action)) > 0),
    CONSTRAINT audit_logs_target_type_not_empty
        CHECK (length(trim(target_type)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at
    ON audit_logs (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_created_at
    ON audit_logs (actor_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_target
    ON audit_logs (target_type, target_id);

COMMIT;
