
const express = require("express");
const { query, getClient } = require("../config/database");
const { requireAuth, requireRole } = require("../middleware/auth");
const memberRepository = require("../repository/memberRepository");

const router = express.Router();

const PHONE_PATTERN = /^\+?[0-9]{9,15}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// GET /api/members
router.get(
  "/",
  requireAuth,
  requireRole("member", "treasurer", "chairperson", "secretary"),
  async (req, res, next) => {
    try {
      const result = await query(
        `SELECT id, full_name, account_status, created_at
         FROM users
         WHERE role = 'member'
           AND account_status = 'approved'
           AND deleted_at IS NULL
         ORDER BY full_name ASC`
      );

      return res.status(200).json({
        success: true,
        count: result.rowCount,
        members: result.rows.map((user) => ({
          id: user.id,
          fullName: user.full_name,
          accountStatus: user.account_status,
          registeredAt: user.created_at,
        })),
      });
    } catch (error) {
      return next(error);
    }
  }
);

// GET /api/members/me
router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT
         id,
         full_name,
         phone,
         recovery_email,
         role,
         account_status,
         created_at,
         updated_at
       FROM users
       WHERE id = $1
         AND deleted_at IS NULL`,
      [req.session.user.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "User account not found.",
      });
    }

    const user = result.rows[0];

    return res.status(200).json({
      success: true,
      member: {
        id: user.id,
        fullName: user.full_name,
        phone: user.phone,
        recoveryEmail: user.recovery_email,
        role: user.role,
        accountStatus: user.account_status,
        registeredAt: user.created_at,
        updatedAt: user.updated_at,
      },
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/members/me
router.patch("/me", requireAuth, async (req, res, next) => {
  const body = req.body || {};
  const fullName = typeof body.fullName === "string" ? body.fullName.trim() : "";
  const phone = typeof body.phone === "string"
    ? body.phone.trim().replace(/[^0-9+]/g, "")
    : "";
  const recoveryEmail = typeof body.recoveryEmail === "string"
    ? body.recoveryEmail.trim().toLowerCase()
    : "";

  if (fullName.length < 2 || fullName.length > 150) {
    return res.status(400).json({
      success: false,
      message: "Full name must be between 2 and 150 characters.",
    });
  }

  if (!PHONE_PATTERN.test(phone)) {
    return res.status(400).json({
      success: false,
      message: "Enter a valid phone number with 9 to 15 digits.",
    });
  }

  if (recoveryEmail.length > 254 || !EMAIL_PATTERN.test(recoveryEmail)) {
    return res.status(400).json({
      success: false,
      message: "Enter a valid recovery email address.",
    });
  }

  let client;

  try {
    client = await getClient();
    await client.query("BEGIN");

    const oldResult = await client.query(
      `SELECT full_name, phone, recovery_email
       FROM users
       WHERE id = $1
         AND deleted_at IS NULL
       FOR UPDATE`,
      [req.session.user.id]
    );

    if (oldResult.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        success: false,
        message: "User account not found.",
      });
    }

    const oldAccount = oldResult.rows[0];
    const updatedResult = await client.query(
      `UPDATE users
       SET full_name = $1,
           phone = $2,
           normalized_phone = $3,
           recovery_email = $4,
           normalized_email = $5,
           updated_at = NOW()
       WHERE id = $6
       RETURNING id, full_name, phone, recovery_email, role,
                 account_status, created_at, updated_at`,
      [fullName, phone, phone, recoveryEmail, recoveryEmail, req.session.user.id]
    );

    const account = updatedResult.rows[0];

    await client.query(
      `INSERT INTO audit_logs (
         actor_user_id, action, target_type, target_id, old_values, new_values
       )
       VALUES ($1, 'account_profile_updated', 'user', $2, $3::jsonb, $4::jsonb)`,
      [
        account.id,
        account.id,
        JSON.stringify(oldAccount),
        JSON.stringify({
          full_name: account.full_name,
          phone: account.phone,
          recovery_email: account.recovery_email,
        }),
      ]
    );

    await client.query("COMMIT");
    req.session.user.fullName = account.full_name;

    return res.status(200).json({
      success: true,
      message: "Account settings updated successfully.",
      member: {
        id: account.id,
        fullName: account.full_name,
        phone: account.phone,
        recoveryEmail: account.recovery_email,
        role: account.role,
        accountStatus: account.account_status,
        registeredAt: account.created_at,
        updatedAt: account.updated_at,
      },
    });
  } catch (error) {
    if (client) await client.query("ROLLBACK").catch(() => {});

    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "That phone number or email address is already in use.",
      });
    }

    return next(error);
  } finally {
    if (client) client.release();
  }
});

router.get(
  "/me/deletion-request",
  requireAuth,
  requireRole("member"),
  async (req, res, next) => {
    try {
      const result = await query(
        `SELECT id, request_reason AS reason, status,
                requested_at AS "requestedAt"
         FROM member_deletion_requests
         WHERE member_user_id = $1
           AND status = 'pending'
         LIMIT 1`,
        [req.user.id]
      );

      return res.status(200).json({
        success: true,
        deletionRequest: result.rows[0] || null,
      });
    } catch (error) {
      return next(error);
    }
  }
);

router.post(
  "/me/deletion-request",
  requireAuth,
  requireRole("member"),
  async (req, res, next) => {
    const reason =
      typeof req.body?.reason === "string" ? req.body.reason.trim() : "";

    if (reason.length < 5 || reason.length > 1000) {
      return res.status(400).json({
        success: false,
        message: "Provide a deletion reason between 5 and 1000 characters.",
      });
    }

    try {
      const deletionRequest = await memberRepository.requestAccountDeletion(
        req.user.id,
        reason
      );

      if (!deletionRequest) {
        return res.status(409).json({
          success: false,
          message: "Only an active member can request account deletion.",
        });
      }

      return res.status(202).json({
        success: true,
        message: "Your deletion request has been sent to the chairperson for approval.",
        deletionRequest,
      });
    } catch (error) {
      return next(error);
    }
  }
);

module.exports = router;
