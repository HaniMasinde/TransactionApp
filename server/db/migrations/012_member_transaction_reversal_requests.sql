BEGIN;

DROP INDEX transaction_reversal_requests_one_pending;
DROP INDEX transaction_reversal_requests_pending_created;

ALTER TABLE transaction_reversal_requests
    DROP CONSTRAINT transaction_reversal_requests_status_check,
    DROP CONSTRAINT transaction_reversal_review_consistency;

ALTER TABLE transaction_reversal_requests
    ADD COLUMN treasurer_reviewed_by UUID REFERENCES users(id) ON DELETE RESTRICT,
    ADD COLUMN treasurer_reviewed_at TIMESTAMPTZ;

UPDATE transaction_reversal_requests
SET status = 'pending_chairperson'
WHERE status = 'pending';

ALTER TABLE transaction_reversal_requests
    ADD CONSTRAINT transaction_reversal_requests_status_check
        CHECK (status IN (
            'pending_treasurer',
            'pending_chairperson',
            'approved',
            'rejected'
        )),
    ADD CONSTRAINT transaction_reversal_review_consistency
        CHECK (
            (
                status = 'pending_treasurer'
                AND treasurer_reviewed_by IS NULL
                AND treasurer_reviewed_at IS NULL
                AND reviewed_by IS NULL
                AND reviewed_at IS NULL
            )
            OR
            (
                status = 'pending_chairperson'
                AND reviewed_by IS NULL
                AND reviewed_at IS NULL
                AND (
                    (treasurer_reviewed_by IS NULL AND treasurer_reviewed_at IS NULL)
                    OR
                    (treasurer_reviewed_by IS NOT NULL AND treasurer_reviewed_at IS NOT NULL)
                )
            )
            OR
            (
                status IN ('approved', 'rejected')
                AND reviewed_by IS NOT NULL
                AND reviewed_at IS NOT NULL
            )
        );

CREATE UNIQUE INDEX transaction_reversal_requests_one_pending
    ON transaction_reversal_requests (transaction_id)
    WHERE status IN ('pending_treasurer', 'pending_chairperson');

CREATE INDEX transaction_reversal_requests_pending_created
    ON transaction_reversal_requests (created_at)
    WHERE status IN ('pending_treasurer', 'pending_chairperson');

COMMIT;
