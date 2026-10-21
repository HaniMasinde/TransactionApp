"use strict";

const bcrypt = require("bcryptjs");
const { getClient, query } = require("../config/database");

function authError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function normalizePhone(value) {
  return String(value || "").trim().replace(/[^\d+]/g, "");
}

async function register({ fullName, phone, recoveryEmail, password }) {
  const name = String(fullName || "").trim();
  const normalizedPhone = normalizePhone(phone);
  const email = String(recoveryEmail || "").trim().toLowerCase();
  const passwordHash = await bcrypt.hash(password, 12);

  let client;

  try {
    client = await getClient();
    await client.query("BEGIN");

    const result = await client.query(
      `INSERT INTO users (
         full_name, phone, normalized_phone,
         recovery_email, normalized_email,
         password_hash, role, account_status
       )
       VALUES ($1, $2, $3, $4, $5, $6, 'member', 'pending')
       RETURNING id, full_name, phone, recovery_email, role, account_status`,
      [name, normalizedPhone, normalizedPhone, email, email, passwordHash]
    );

    const user = result.rows[0];

    await client.query(
      `INSERT INTO notifications (
         recipient_user_id, event_type, title, message
       )
       SELECT id, 'pending_approval', 'Member approval needed', $1
       FROM users
       WHERE role = 'chairperson'
         AND account_status = 'approved'
         AND deleted_at IS NULL`,
      [`${user.full_name} has registered and is awaiting approval.`]
    );

    await client.query("COMMIT");
    return user;
  } catch (error) {
    if (client) await client.query("ROLLBACK").catch(() => {});

    if (error.code === "23505") {
      throw authError(
        "An account with that phone number or recovery email already exists.",
        409
      );
    }
    throw error;
  } finally {
    if (client) client.release();
  }
}

async function login({ phone, password }) {
  const normalizedPhone = normalizePhone(phone);

  const result = await query(
    `SELECT id, full_name, role, account_status, password_hash
       FROM users
      WHERE normalized_phone = $1
        AND deleted_at IS NULL
      LIMIT 1`,
    [normalizedPhone]
  );

  const user = result.rows[0];

  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    throw authError("Invalid phone number or password.", 401);
  }

  if (user.account_status !== "approved") {
    if (user.account_status === "pending") {
      throw authError("Your account is awaiting chairperson approval.", 403);
    }
    throw authError("This account is not permitted to log in.", 403);
  }

  return {
    id: user.id,
    fullName: user.full_name,
    role: user.role,
  };
}

module.exports = { register, login };
