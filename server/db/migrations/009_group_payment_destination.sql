CREATE TABLE IF NOT EXISTS group_payment_destination (
    id BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id),
    payment_number VARCHAR(20) NOT NULL
        CHECK (payment_number ~ '^[0-9]{5,20}$'),
    updated_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
