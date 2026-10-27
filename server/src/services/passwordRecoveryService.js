"use strict";

const crypto = require("node:crypto");
const bcrypt = require("bcryptjs");
const { getClient, query } = require("../config/database");
const { sendPasswordResetEmail } = require("./emailService");

const INVALID_TOKEN_MESSAGE =
  "This password reset link is invalid or has expired.";

function authError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function getTokenExpiryMinutes() {
  const configured = Number(process.env.PASSWORD_RESET_TTL_MINUTES || 30);

  // Use a safe default if configuration is missing or invalid.
  if (!Number.isInteger(configured) || configured < 5 || configured > 120) {
    return 30;
  }

  return configured;
}

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function getFrontendUrl() {
  const configuredUrl = process.env.FRONTEND_URL;

  if (!configuredUrl) {
    throw new Error("FRONTEND_URL is not configured.");
  }

  let frontendUrl;
  try {
    frontendUrl = new URL(configuredUrl);
  } catch {
    throw new Error("FRONTEND_URL must be an absolute web address.");
  }

  if (!["http:", "https:"].includes(frontendUrl.protocol)) {
    throw new Error("FRONTEND_URL must use HTTP or HTTPS.");
  }

  if (
    process.env.NODE_ENV === "production" &&
    (frontendUrl.protocol !== "https:" ||
      ["localhost", "127.0.0.1", "::1"].includes(frontendUrl.hostname))
  ) {
    throw new Error(
      "Production FRONTEND_URL must use HTTPS and a public hostname."
    );
  }

  return frontendUrl;
}

async function requestPasswordReset(email) {
  const frontendUrl = getFrontendUrl();
   console.info("[PasswordRecovery] Frontend URL validated");
  const normalizedEmail = String(email || "").trim().toLowerCase();
   console.info("[PasswordRecovery] Before database query");

  const result = await query(
    `SELECT id, recovery_email
       FROM users
      WHERE normalized_email = $1
        AND deleted_at IS NULL
      LIMIT 1`,
    [normalizedEmail]
  );
  console.info("[PasswordRecovery] User lookup completed");

  // Unknown addresses receive the same public response as known addresses.
  if (!result.rows.length) {
     console.log(
    "[PasswordRecovery] Stopping: no matching active user found"
  );
    return;
  }
  console.log("[PasswordRecovery] Matching user found; continuing");
const user = result.rows[0];
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(rawToken);
  const ttlMinutes = getTokenExpiryMinutes();

  let client;

  try {
    client = await getClient();
    await client.query("BEGIN");

    // Only the newest recovery link remains valid.
    await client.query(
      `UPDATE password_recovery_tokens
          SET used_at = NOW()
        WHERE user_id = $1
          AND used_at IS NULL`,
      [user.id]
    );

    await client.query(
      `INSERT INTO password_recovery_tokens
         (user_id, token_hash, expires_at)
       VALUES ($1, $2, NOW() + ($3 * INTERVAL '1 minute'))`,
      [user.id, tokenHash, ttlMinutes]
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
  console.info("[PasswordRecovery] User lookup completed", {
  found: result.rows.length > 0,
});

  try {
    const resetUrl = new URL("/reset-password", frontendUrl.origin);
    resetUrl.searchParams.set("token", rawToken);
    console.info("[PasswordRecovery] Attempting email delivery");

    await sendPasswordResetEmail(user.recovery_email, resetUrl.toString());
  } catch (error) {
    // Never log the raw token, reset URL, or recovery email.
    console.error("Password recovery email delivery failed.", {
      code: error.code || "EMAIL_CONFIGURATION_OR_DELIVERY_ERROR",
      command: error.command || null,
      responseCode: error.responseCode || null,
    });

    // Do not leave an active token behind when delivery fails.
    await query(
      `UPDATE password_recovery_tokens
          SET used_at = NOW()
        WHERE token_hash = $1
          AND used_at IS NULL`,
      [tokenHash]
    ).catch(() => {});

    // Keep the public response generic to prevent email enumeration.
  }
}

async function resetPassword(token, newPassword) {
  const tokenHash = hashToken(token);
  let client;

  try {
    client = await getClient();
    await client.query("BEGIN");

    const result = await client.query(
      `SELECT
          recovery.id AS recovery_id,
          recovery.user_id,
          recovery.expires_at,
          recovery.used_at,
          users.password_hash
       FROM password_recovery_tokens AS recovery
       JOIN users ON users.id = recovery.user_id
       WHERE recovery.token_hash = $1
         AND users.deleted_at IS NULL
       FOR UPDATE OF recovery, users`,
      [tokenHash]
    );

    const recovery = result.rows[0];

    if (
      !recovery ||
      recovery.used_at ||
      new Date(recovery.expires_at).getTime() <= Date.now()
    ) {
      throw authError(INVALID_TOKEN_MESSAGE, 400);
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

    // Consume this token and invalidate any other outstanding reset links.
    await client.query(
      `UPDATE password_recovery_tokens
          SET used_at = NOW()
        WHERE user_id = $1
          AND used_at IS NULL`,
      [recovery.user_id]
    );

    // Revoke all PostgreSQL-backed sessions belonging to this user.
    await client.query(
      `DELETE FROM sessions
        WHERE sess->'user'->>'id' = $1`,
      [recovery.user_id]
    );

    await client.query(
      `INSERT INTO audit_logs
         (actor_user_id, action, target_type, target_id)
       VALUES (NULL, 'account_password_reset', 'user', $1)`,
      [recovery.user_id]
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
}

module.exports = {
  requestPasswordReset,
  resetPassword,
};
