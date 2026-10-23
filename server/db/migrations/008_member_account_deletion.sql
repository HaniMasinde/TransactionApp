BEGIN;

CREATE TABLE IF NOT EXISTS member_deletion_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    request_reason TEXT NOT NULL
        CHECK (length(trim(request_reason)) BETWEEN 5 AND 1000),
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'approved', 'rejected')),
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    review_reason TEXT,
    reviewed_at TIMESTAMPTZ,
    CONSTRAINT member_deletion_review_consistency CHECK (
        (status = 'pending' AND reviewed_by IS NULL AND reviewed_at IS NULL AND review_reason IS NULL)
        OR
        (status IN ('approved', 'rejected') AND reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL AND review_reason IS NOT NULL)
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_member_deletion_requests_pending_user
    ON member_deletion_requests (member_user_id)
    WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_member_deletion_requests_pending_created
    ON member_deletion_requests (requested_at)
    WHERE status = 'pending';

DO $migration$
DECLARE
    event_type_constraint TEXT;
BEGIN
    FOR event_type_constraint IN
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'notifications'::regclass
          AND contype = 'c'
          AND pg_get_constraintdef(oid) ILIKE '%event_type%'
    LOOP
        EXECUTE format(
            'ALTER TABLE notifications DROP CONSTRAINT %I',
            event_type_constraint
        );
    END LOOP;
END;
$migration$;

ALTER TABLE notifications
    ADD CONSTRAINT notifications_event_type_check
    CHECK (event_type IN (
        'transaction_created',
        'transaction_updated',
        'pending_approval',
        'member_deletion_requested',
        'member_deletion_approved',
        'member_deletion_rejected'
    ));

COMMIT;
