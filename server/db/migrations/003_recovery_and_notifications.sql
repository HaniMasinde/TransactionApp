
-- GCMS Migration 003
-- Password recovery and in-app notifications

BEGIN;

CREATE TABLE password_recovery_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL
        REFERENCES users(id) ON DELETE CASCADE,

    token_hash TEXT NOT NULL UNIQUE,

    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_password_recovery_user
    ON password_recovery_tokens (user_id, created_at DESC);

CREATE INDEX idx_password_recovery_expiry
    ON password_recovery_tokens (expires_at)
    WHERE used_at IS NULL;


CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    recipient_user_id UUID NOT NULL
        REFERENCES users(id) ON DELETE CASCADE,

    transaction_id UUID
        REFERENCES transactions(id) ON DELETE SET NULL,

    event_type VARCHAR(30) NOT NULL
        CHECK (event_type IN ('transaction_created', 'transaction_updated')),

    title VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    read_at TIMESTAMPTZ,

    CONSTRAINT notifications_title_not_empty
        CHECK (LENGTH(TRIM(title)) > 0)
);

CREATE INDEX idx_notifications_recipient_created
    ON notifications (recipient_user_id, created_at DESC);

CREATE INDEX idx_notifications_unread
    ON notifications (recipient_user_id, created_at DESC)
    WHERE read_at IS NULL;

CREATE INDEX idx_notifications_transaction
    ON notifications (transaction_id);

COMMIT;
