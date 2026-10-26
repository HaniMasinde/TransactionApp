
BEGIN;

CREATE TABLE IF NOT EXISTS email_verification_codes (
    normalized_email VARCHAR(254) PRIMARY KEY,
    code_hash CHAR(64) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0
        CHECK (attempts BETWEEN 0 AND 5),
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS email_verification_codes_expiry_idx
    ON email_verification_codes (expires_at);

COMMIT;