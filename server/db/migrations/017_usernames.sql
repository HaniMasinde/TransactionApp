BEGIN;

ALTER TABLE users
    ADD COLUMN username VARCHAR(30);

ALTER TABLE users
    ADD CONSTRAINT users_username_format
    CHECK (username IS NULL OR username ~ '^[a-z0-9_]{3,30}$');

CREATE UNIQUE INDEX users_username_lower_unique
    ON users (LOWER(username))
    WHERE username IS NOT NULL;

COMMIT;
