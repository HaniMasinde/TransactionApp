ALTER TABLE users
    ADD COLUMN profile_picture BYTEA,
    ADD COLUMN profile_picture_updated_at TIMESTAMPTZ;
