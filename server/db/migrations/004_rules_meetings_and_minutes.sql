
-- GCMS Migration 004
-- Group rules, meetings, and meeting minutes

BEGIN;

CREATE TABLE group_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    version INTEGER NOT NULL UNIQUE
        CHECK (version > 0),

    content TEXT NOT NULL,

    created_by UUID NOT NULL
        REFERENCES users(id) ON DELETE RESTRICT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT group_rules_content_not_empty
        CHECK (LENGTH(TRIM(content)) > 0)
);

CREATE INDEX idx_group_rules_created_at
    ON group_rules (created_at DESC);


CREATE TABLE meetings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    title VARCHAR(200) NOT NULL,
    description TEXT,

    starts_at TIMESTAMPTZ NOT NULL,
    location VARCHAR(255),

    created_by UUID NOT NULL
        REFERENCES users(id) ON DELETE RESTRICT,

    updated_by UUID
        REFERENCES users(id) ON DELETE RESTRICT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT meetings_title_not_empty
        CHECK (LENGTH(TRIM(title)) > 0)
);

CREATE INDEX idx_meetings_starts_at
    ON meetings (starts_at);


CREATE TABLE meeting_minutes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    meeting_id UUID NOT NULL UNIQUE
        REFERENCES meetings(id) ON DELETE RESTRICT,

    content TEXT NOT NULL,

    recorded_by UUID NOT NULL
        REFERENCES users(id) ON DELETE RESTRICT,

    updated_by UUID
        REFERENCES users(id) ON DELETE RESTRICT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT meeting_minutes_content_not_empty
        CHECK (LENGTH(TRIM(content)) > 0)
);

CREATE INDEX idx_meeting_minutes_recorded_by
    ON meeting_minutes (recorded_by);

COMMIT;
