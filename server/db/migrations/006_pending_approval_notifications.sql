BEGIN;

-- Drop any existing event_type check, including one created under a
-- different generated constraint name in an existing database.
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
        'pending_approval'
    ));

COMMIT;
