BEGIN;

CREATE TABLE transaction_reversal_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    requested_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    reason TEXT NOT NULL CHECK (length(trim(reason)) BETWEEN 5 AND 1000),
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'approved', 'rejected')),
    reviewed_by UUID REFERENCES users(id) ON DELETE RESTRICT,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT transaction_reversal_review_consistency
        CHECK (
            (status = 'pending' AND reviewed_by IS NULL AND reviewed_at IS NULL)
            OR
            (status IN ('approved', 'rejected') AND reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL)
        )
);

CREATE UNIQUE INDEX transaction_reversal_requests_one_pending
    ON transaction_reversal_requests (transaction_id)
    WHERE status = 'pending';

CREATE INDEX transaction_reversal_requests_pending_created
    ON transaction_reversal_requests (created_at)
    WHERE status = 'pending';

ALTER TABLE notifications
    DROP CONSTRAINT notifications_event_type_check;

ALTER TABLE notifications
    ADD CONSTRAINT notifications_event_type_check
    CHECK (event_type IN (
        'transaction_created',
        'transaction_updated',
        'pending_approval',
        'member_deletion_requested',
        'member_deletion_approved',
        'member_deletion_rejected',
        'transaction_reversal_requested'
    ));

COMMIT;
