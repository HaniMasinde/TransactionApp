BEGIN;

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
        'official_role_removal_request',
        'user_role_changed',
        'audit_logs_cleared'
    ));

COMMIT;
