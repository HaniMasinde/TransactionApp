
"use strict";

const crypto = require("node:crypto");
const bcrypt = require("bcryptjs");
const { getClient, query } = require("../config/database");
const { sendPasswordResetEmail } = require("./emailService");

const INVALID_CODE_MESSAGE =
  "This password reset code is invalid or has expired.";

const MAX_CODE_ATTEMPTS = 5;

function authError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

async function requestPasswordReset(email) {
  const normalizedEmail = String(email || "").trim().toLowerCase();

  const result = await query(
    `SELECT id, recovery_email
       FROM users
      WHERE normalized_email = $1
        AND deleted_at IS NULL
      LIMIT 1`,
    [normalizedEmail]
  );

  // Do not reveal whether an account exists.
  if (!result.rows.length) return;

  const user = result.rows[0];
  const code = crypto.randomInt(100000, 1000000).toString();
  const codeHash = hashToken(code);

  let client;

  try {
    client = await getClient();
    await client.query("BEGIN");

    // Invalidate previous unused codes.
    await client.query(
      `UPDATE password_recovery_tokens
          SET used_at = NOW()
        WHERE user_id = $1
          AND used_at IS NULL`,
      [user.id]
    );

    // Five-minute expiry, enforced by the database.
    await client.query(
      `INSERT INTO password_recovery_tokens
         (user_id, token_hash, expires_at, attempts)
       VALUES ($1, $2, NOW() + INTERVAL '5 minutes', 0)`,
      [user.id, codeHash]
    );

    await client.query("COMMIT");
  } catch (error) {
    if (client) {
      await client.query("ROLLBACK").catch(() => {});
    }
    throw error;
  } finally {
    if (client) client.release();
  }

  try {
    await sendPasswordResetEmail(user.recovery_email, code);
    console.info("[PasswordRecovery] Verification email accepted");
  } catch (error) {
    console.error("Password recovery email delivery failed.", {
      message: error.message,
    });

    // Invalidate the code if delivery failed.
    await query(
      `UPDATE password_recovery_tokens
          SET used_at = NOW()
        WHERE token_hash = $1
          AND used_at IS NULL`,
      [codeHash]
    ).catch(() => {});

    // Keep the public response generic.
  }
}

async function verifyPasswordResetCode(email, code) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const submittedCode = String(code || "").trim();

  if (!/^\d{6}$/.test(submittedCode)) {
    throw authError(INVALID_CODE_MESSAGE, 400);
  }

  let client;
  let transactionOpen = false;

  try {
    client = await getClient();
    await client.query("BEGIN");
    transactionOpen = true;

    const result = await client.query(
      `SELECT
          recovery.id AS recovery_id,
          recovery.token_hash,
          recovery.expires_at,
          recovery.attempts
       FROM password_recovery_tokens AS recovery
       JOIN users ON users.id = recovery.user_id
       WHERE users.normalized_email = $1
         AND users.deleted_at IS NULL
         AND recovery.used_at IS NULL
       ORDER BY recovery.expires_at DESC
       LIMIT 1
       FOR UPDATE OF recovery`,
      [normalizedEmail]
    );

    const recovery = result.rows[0];

    if (
      !recovery ||
      new Date(recovery.expires_at).getTime() <= Date.now() ||
      recovery.attempts >= MAX_CODE_ATTEMPTS
    ) {
      throw authError(INVALID_CODE_MESSAGE, 400);
    }

    const submittedHash = hashToken(submittedCode);

    if (submittedHash !== recovery.token_hash) {
      await client.query(
        `UPDATE password_recovery_tokens
         SET attempts = attempts + 1
         WHERE id = $1`,
        [recovery.recovery_id]
      );

      await client.query("COMMIT");
      transactionOpen = false;

      throw authError(INVALID_CODE_MESSAGE, 400);
    }

    await client.query("COMMIT");
    transactionOpen = false;

    return { verified: true };
  } catch (error) {
    if (client && transactionOpen) {
      await client.query("ROLLBACK").catch(() => {});
    }
    throw error;
  } finally {
    if (client) client.release();
  }
}

async function resetPassword(email, code, newPassword) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const submittedCode = String(code || "").trim();

  if (!/^\d{6}$/.test(submittedCode)) {
    throw authError(INVALID_CODE_MESSAGE, 400);
  }

  let client;
  let transactionOpen = false;

  try {
    client = await getClient();
    await client.query("BEGIN");
    transactionOpen = true;

    const result = await client.query(
      `SELECT
          recovery.id AS recovery_id,
          recovery.user_id,
          recovery.token_hash,
          recovery.expires_at,
          recovery.used_at,
          recovery.attempts,
          users.password_hash
       FROM password_recovery_tokens AS recovery
       JOIN users ON users.id = recovery.user_id
       WHERE users.normalized_email = $1
         AND users.deleted_at IS NULL
         AND recovery.used_at IS NULL
       ORDER BY recovery.expires_at DESC
       LIMIT 1
       FOR UPDATE OF recovery, users`,
      [normalizedEmail]
    );

    const recovery = result.rows[0];

    if (
      !recovery ||
      recovery.used_at ||
      new Date(recovery.expires_at).getTime() <= Date.now() ||
      recovery.attempts >= MAX_CODE_ATTEMPTS
    ) {
      throw authError(INVALID_CODE_MESSAGE, 400);
    }

    const submittedHash = hashToken(submittedCode);

    if (submittedHash !== recovery.token_hash) {
      await client.query(
        `UPDATE password_recovery_tokens
            SET attempts = attempts + 1
          WHERE id = $1`,
        [recovery.recovery_id]
      );

      // Commit the failed-attempt counter before returning the error.
      await client.query("COMMIT");
      transactionOpen = false;

      throw authError(INVALID_CODE_MESSAGE, 400);
    }

    if (await bcrypt.compare(newPassword, recovery.password_hash)) {
      throw authError(
        "Choose a password different from your current password.",
        400
      );
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await client.query(
      `UPDATE users
          SET password_hash = $1,
              updated_at = NOW()
        WHERE id = $2`,
      [passwordHash, recovery.user_id]
    );

    // Consume all outstanding codes for this user.
    await client.query(
      `UPDATE password_recovery_tokens
          SET used_at = NOW()
        WHERE user_id = $1
          AND used_at IS NULL`,
      [recovery.user_id]
    );

    // Revoke PostgreSQL-backed sessions.
    await client.query(
      `DELETE FROM sessions
        WHERE sess->'user'->>'id' = $1`,
      [String(recovery.user_id)]
    );

    await client.query(
      `INSERT INTO audit_logs
         (actor_user_id, action, target_type, target_id)
       VALUES (NULL, 'account_password_reset', 'user', $1)`,
      [recovery.user_id]
    );

    await client.query("COMMIT");
    transactionOpen = false;
  } catch (error) {
    if (client && transactionOpen) {
      await client.query("ROLLBACK").catch(() => {});
    }
    throw error;
  } finally {
    if (client) client.release();
  }
}

module.exports = {
  requestPasswordReset,
  verifyPasswordResetCode,
  resetPassword,
};
