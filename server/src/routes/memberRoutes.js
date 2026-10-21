
const express = require("express");
const { query } = require("../config/database");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();


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

module.exports = router;