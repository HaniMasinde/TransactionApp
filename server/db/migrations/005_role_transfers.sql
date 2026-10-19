
BEGIN;

CREATE TABLE IF NOT EXISTS role_transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    office_role VARCHAR(20) NOT NULL
        CHECK (office_role IN ('treasurer', 'chairperson', 'secretary')),

    current_holder_user_id UUID NOT NULL
        REFERENCES users(id) ON DELETE RESTRICT,

    successor_user_id UUID NOT NULL
        REFERENCES users(id) ON DELETE RESTRICT,

    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN (
            'pending',
            'accepted',
            'completed',
            'cancelled'
        )),

    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    accepted_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,

    CONSTRAINT role_transfers_different_users
        CHECK (current_holder_user_id <> successor_user_id),

    CONSTRAINT role_transfers_status_timestamps
        CHECK (
            (status <> 'accepted' OR accepted_at IS NOT NULL)
            AND (status <> 'completed' OR completed_at IS NOT NULL)
            AND (status <> 'cancelled' OR cancelled_at IS NOT NULL)
        )
);

CREATE INDEX IF NOT EXISTS idx_role_transfers_holder_requested
    ON role_transfers (current_holder_user_id, requested_at DESC);

CREATE INDEX IF NOT EXISTS idx_role_transfers_successor_requested
    ON role_transfers (successor_user_id, requested_at DESC);

CREATE INDEX IF NOT EXISTS idx_role_transfers_pending
    ON role_transfers (requested_at DESC)
    WHERE status IN ('pending', 'accepted');

COMMIT;
