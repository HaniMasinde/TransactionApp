BEGIN;

CREATE TABLE application_activity_events (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    event_type VARCHAR(40) NOT NULL CHECK (event_type IN (
        'registrations',
        'logins',
        'password_resets',
        'picture_uploads',
        'transaction_recordings',
        'reversal_requests',
        'report_generations',
        'logouts',
        'account_deletions'
    )),
    outcome VARCHAR(10) NOT NULL CHECK (outcome IN ('success', 'error')),
    actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX application_activity_events_created_type
    ON application_activity_events (created_at DESC, event_type, outcome);

COMMIT;
