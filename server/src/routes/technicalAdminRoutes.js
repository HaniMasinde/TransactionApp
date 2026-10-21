

"use strict";

const express = require("express");
const { pool, query } = require("../config/database");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const ASSIGNABLE_ROLES = [
  "member",
  "treasurer",
  "chairperson",
  "secretary",
];
const MINIMUM_OFFICE_HOLDERS = {
  chairperson: 2,
  secretary: 2,
  treasurer: 1,
};

router.use(requireAuth, requireRole("technical_admin"));

// GET /api/technical-admin/users
router.get("/users", async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, full_name, phone, recovery_email,
              role, account_status, created_at
       FROM users
       WHERE account_status = 'approved'
         AND deleted_at IS NULL
       ORDER BY full_name ASC`
    );

    return res.status(200).json({
      success: true,
      count: result.rowCount,
      users: result.rows.map((user) => ({
        id: user.id,
        fullName: user.full_name,
        phone: user.phone,
        recoveryEmail: user.recovery_email,
        role: user.role,
        accountStatus: user.account_status,
        createdAt: user.created_at,
      })),
    });
  } catch (error) {
    return next(error);
  }
});

// PATCH /api/technical-admin/users/:id/role
router.patch("/users/:id/role", async (req, res, next) => {
  const { id } = req.params;
  const body = req.body;

  if (!UUID_REGEX.test(id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid user ID.",
    });
  }

  if (
    !body ||
    typeof body !== "object" ||
    Array.isArray(body) ||
    Object.keys(body).length !== 1 ||
    !Object.hasOwn(body, "role")
  ) {
    return res.status(400).json({
      success: false,
      message: "Provide only the role field.",
    });
  }

  if (
    typeof body.role !== "string" ||
    !ASSIGNABLE_ROLES.includes(body.role)
  ) {
    return res.status(400).json({
      success: false,
      message:
        "Role must be member, treasurer, chairperson, or secretary.",
    });
  }

  const actorId = req.user.id;

  if (id === actorId) {
    return res.status(403).json({
      success: false,
      message: "You cannot change your own role.",
    });
  }

  let client;

  try {
    client = await pool.connect();
    await client.query("BEGIN");

    // Serialize role changes so simultaneous updates cannot bypass staffing minimums.
    await client.query(
      "SELECT pg_advisory_xact_lock(hashtext($1))",
      ["gcms_technical_admin_role_assignment"]
    );

    const targetResult = await client.query(
      `SELECT id, full_name, role, account_status
       FROM users
       WHERE id = $1
         AND deleted_at IS NULL
       FOR UPDATE`,
      [id]
    );

    if (targetResult.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        success: false,
        message: "User account not found.",
      });
    }

    const target = targetResult.rows[0];

    if (target.account_status !== "approved") {
      await client.query("ROLLBACK");
      return res.status(409).json({
        success: false,
        message: "Only approved accounts can be assigned roles.",
      });
    }

    if (target.role === "technical_admin") {
      await client.query("ROLLBACK");
      return res.status(409).json({
        success: false,
        message:
          "Technical Administrator accounts cannot be changed through routine role assignment.",
      });
    }

    if (target.role === body.role) {
      await client.query("ROLLBACK");
      return res.status(200).json({
        success: true,
        message: "The user already has this role.",
        user: {
          id: target.id,
          fullName: target.full_name,
          role: target.role,
        },
      });
    }

    const minimumForCurrentRole = MINIMUM_OFFICE_HOLDERS[target.role];
    if (minimumForCurrentRole && body.role !== target.role) {
      const roleCountResult = await client.query(
        `SELECT COUNT(*)::int AS count
         FROM users
         WHERE role = $1
           AND account_status = 'approved'
           AND deleted_at IS NULL`,
        [target.role]
      );

      const currentCount = roleCountResult.rows[0].count;
      if (currentCount <= minimumForCurrentRole) {
        await client.query("ROLLBACK");
        return res.status(409).json({
          success: false,
          message: `At least ${minimumForCurrentRole} approved ${target.role} account${minimumForCurrentRole === 1 ? "" : "s"} must remain. Assign another ${target.role} before changing this role.`,
        });
      }
    }

    const updatedResult = await client.query(
      `UPDATE users
       SET role = $1,
           updated_at = NOW()
       WHERE id = $2
       RETURNING id, full_name, role, account_status`,
      [body.role, id]
    );

    const updated = updatedResult.rows[0];

    await client.query(
      `INSERT INTO audit_logs (
         actor_user_id,
         action,
         target_type,
         target_id,
         old_values,
         new_values
       )
       VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb)`,
      [
        actorId,
        "user_role_changed",
        "user",
        updated.id,
        JSON.stringify({ role: target.role }),
        JSON.stringify({ role: updated.role }),
      ]
    );

    await client.query("COMMIT");

    return res.status(200).json({
      success: true,
      message: "User role updated successfully.",
      user: {
        id: updated.id,
        fullName: updated.full_name,
        role: updated.role,
        accountStatus: updated.account_status,
      },
    });
  } catch (error) {
    if (client) {
      await client.query("ROLLBACK").catch(() => {});
    }

    return next(error);
  } finally {
    if (client) client.release();
  }
});

module.exports = router;
