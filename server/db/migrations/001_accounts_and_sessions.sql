

-- GCMS Migration 001
-- Accounts and server-side sessions

BEGIN;

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    full_name VARCHAR(150) NOT NULL,

    phone VARCHAR(30),
    normalized_phone VARCHAR(30),

    recovery_email VARCHAR(254),
    normalized_email VARCHAR(254),

    password_hash TEXT NOT NULL,

    role VARCHAR(20) NOT NULL DEFAULT 'member'
        CHECK (
            role IN (
                'member',
                'treasurer',
                'chairperson',
                'secretary'
            )
        ),

    account_status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (
            account_status IN (
                'pending',
                'approved',
                'rejected',
                'disabled',
                'anonymized'
            )
        ),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,

    CONSTRAINT users_phone_unique
        UNIQUE (normalized_phone),

    CONSTRAINT users_email_unique
        UNIQUE (normalized_email),

    CONSTRAINT users_full_name_not_empty
        CHECK (LENGTH(TRIM(full_name)) > 0)
);

CREATE INDEX idx_users_account_status
    ON users (account_status);

CREATE INDEX idx_users_role
    ON users (role);

CREATE TABLE sessions (
    sid VARCHAR NOT NULL PRIMARY KEY,
    sess JSON NOT NULL,
    expire TIMESTAMP(6) NOT NULL
);

CREATE INDEX idx_sessions_expire
    ON sessions (expire);

COMMIT;