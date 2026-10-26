BEGIN;

CREATE TABLE official_role_removal_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requester_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    office_role VARCHAR(20) NOT NULL
        CHECK (office_role IN ('chairperson', 'secretary', 'treasurer')),
    reason TEXT NOT NULL
        CHECK (length(trim(reason)) BETWEEN 5 AND 1000),
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'approved', 'rejected')),
    reviewed_by UUID REFERENCES users(id) ON DELETE RESTRICT,
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    CONSTRAINT official_role_removal_review_consistency
        CHECK (
            (status = 'pending' AND reviewed_by IS NULL AND reviewed_at IS NULL)
            OR
            (status IN ('approved', 'rejected') AND reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL)
        )
);

CREATE UNIQUE INDEX official_role_removal_one_pending_per_official
    ON official_role_removal_requests (requester_user_id)
    WHERE status = 'pending';

CREATE INDEX official_role_removal_pending_requested_at
    ON official_role_removal_requests (requested_at)
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
        'transaction_reversal_requested',
        'app_update_announcement',
        'official_role_removal_request'
    ));

COMMIT;
