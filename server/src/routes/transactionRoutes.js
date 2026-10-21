const express = require("express");
const { query, pool } = require("../config/database");
const { requireAuth, requireRole } = require("../middleware/auth");


const router = express.Router();

function getPagination(queryParams) {
  const parseIntegerParam = (value) => {
    if (value === undefined || value === "") {
      return null;
    }

    if (
      typeof value !== "string" ||
      !/^\d+$/.test(value)
    ) {
      return NaN;
    }

    const parsed = Number(value);

    return Number.isSafeInteger(parsed) ? parsed : NaN;
  };

  const parsedLimit = parseIntegerParam(queryParams.limit);
  const parsedOffset = parseIntegerParam(queryParams.offset);

  if (
    Number.isNaN(parsedLimit) ||
    Number.isNaN(parsedOffset) ||
    (parsedLimit !== null && parsedLimit < 1) ||
    (parsedOffset !== null && parsedOffset < 0)
  ) {
    return { error: "Invalid pagination parameters." };
  }

  return {
    limit: parsedLimit === null ? 50 : Math.min(parsedLimit, 100),
    offset: parsedOffset === null ? 0 : parsedOffset,
  };
}
function isValidDateRange(startDate, endDate, maxDays = 366) {
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;

  if (
    typeof startDate !== "string" ||
    typeof endDate !== "string" ||
    !datePattern.test(startDate) ||
    !datePattern.test(endDate)
  ) {
    return false;
  }

  function toUtcDay(value) {
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));

    if (
      date.getUTCFullYear() !== year ||
      date.getUTCMonth() !== month - 1 ||
      date.getUTCDate() !== day
    ) {
      return null;
    }

    return Math.floor(date.getTime() / 86400000);
  }

  const start = toUtcDay(startDate);
  const end = toUtcDay(endDate);

  return (
    start !== null &&
    end !== null &&
    end >= start &&
    end - start < maxDays
  );
}



// GET /api/transactions

router.get(
  "/",
  requireAuth,
  requireRole("member", "treasurer", "chairperson"),
  async (req, res, next) => {
    try {
      const pagination = getPagination(req.query);

      if (pagination.error) {
        return res.status(400).json({
          success: false,
          message: pagination.error,
        });
      }

      const { limit, offset } = pagination;

      const role = String(req.session.user.role || "").toLowerCase();

      let result;

      if (role === "member") {
        result = await query(
          `SELECT id, member_user_id, entered_member_name,
                  amount, paid_at, mpesa_reference, status, notes,
                  created_at, updated_at
           FROM transactions
           WHERE member_user_id = $1
             AND status = 'active'
           ORDER BY paid_at DESC
           LIMIT $2 OFFSET $3`,
          [req.session.user.id, limit, offset]
        );
      } else {
        result = await query(
          `SELECT id, member_user_id, entered_member_name,
                  amount, paid_at, mpesa_reference, status, notes,
                  created_at, updated_at
           FROM transactions
           WHERE status IN ('active', 'reversed')
           ORDER BY paid_at DESC
           LIMIT $1 OFFSET $2`,
          [limit, offset]
        );
      }

      return res.status(200).json({
        success: true,
        transactions: result.rows,
        pagination: {
          limit,
          offset,
          count: result.rows.length,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/transactions
router.post(
  "/",
  requireAuth,
  requireRole("treasurer"),
  async (req, res, next) => {
    const {
      memberUserId,
      enteredMemberName,
      amount,
      paidAt,
      mpesaReference,
      notes,
    } = req.body;

    const name =
    typeof enteredMemberName === "string"
      ? enteredMemberName.trim()
      : "";
    const parsedAmount = Number(amount);


    if (!name || name.length > 150) {
      return res.status(400).json({
        success: false,
        message: "Member name is required and must not exceed 150 characters.",
      });
    }

    if (
      amount === undefined ||
  amount === null ||
  amount === "" ||
  !Number.isFinite(parsedAmount) ||
  parsedAmount <= 0 ||
  parsedAmount > 9999999999.99 ||
  Math.round(parsedAmount * 100) !== parsedAmount * 100
    ) {
      return res.status(400).json({
        success: false,
        message: "Amount must be a valid positive amount with at most two decimal places.",
      });
    }

    if (
      memberUserId !== undefined &&
    memberUserId !== null &&
    (typeof memberUserId !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(memberUserId))
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid member user ID.",
      });
    }

    if (
      mpesaReference !== undefined &&
  mpesaReference !== null &&
  typeof mpesaReference !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message: "M-Pesa reference must be text.",
      });
    }

    if (
      typeof mpesaReference === "string" &&
  mpesaReference.trim().length > 100
    ) {
      return res.status(400).json({
        success: false,
        message: "M-Pesa reference must not exceed 100 characters.",
      });
    }

    if (
      notes !== undefined &&
  notes !== null &&
  typeof notes !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message: "Notes must be text.",
      });
    }

    if (
      paidAt !== undefined &&
  (
    typeof paidAt !== "string" ||
    paidAt.trim() === "" ||
    !Number.isFinite(Date.parse(paidAt))
  )
    ) {
      return res.status(400).json({
        success: false,
        message: "Paid date must be a valid date string.",
      });
    }

    const reference = mpesaReference?.trim() || null;
    const normalizedReference = reference
      ? reference.toUpperCase()
      : null;

    let client;

    try {
      client = await pool.connect();
      await client.query("BEGIN");

      if (memberUserId) {
        const memberResult = await client.query(
          `SELECT id
   FROM users
   WHERE id = $1
     AND role = 'member'
     AND account_status = 'approved'
     AND deleted_at IS NULL`,
          [memberUserId]
        );

        if (memberResult.rows.length === 0) {
          await client.query("ROLLBACK");

          return res.status(400).json({
            success: false,
            message: "Approved member account not found.",
          });
        }
      }

      const result = await client.query(
        `INSERT INTO transactions (
         member_user_id,
         entered_member_name,
         amount,
         paid_at,
         mpesa_reference,
         normalized_mpesa_reference,
         status,
         notes,
         created_by,
         updated_by
       )
       VALUES (
         $1, $2, $3, COALESCE($4::timestamptz, NOW()),
         $5, $6, 'active', $7, $8, $8
       )
       RETURNING
         id,
         member_user_id,
         entered_member_name,
         amount,
         paid_at,
         mpesa_reference,
         status,
         notes,
         created_by,
         created_at`,
        [
          memberUserId || null,
          name,
          parsedAmount,
          paidAt || null,
          reference,
          normalizedReference,
          typeof notes === "string" && notes.trim()
            ? notes.trim()
            : null,
          req.session.user.id,
        ]
      );

      const transaction = result.rows[0];

      // Insert the audit log using the actual audit_logs schema.
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
          req.session.user.id,
          "transaction_created",
          "transaction",
          transaction.id,
          null,
          JSON.stringify(transaction),
        ]
      );

      // Notify the member only when the transaction is linked to a member account.
      if (transaction.member_user_id) {
        await client.query(
          `INSERT INTO notifications (
       recipient_user_id,
       transaction_id,
       event_type,
       title,
       message
     )
     VALUES ($1, $2, $3, $4, $5)`,
          [
            transaction.member_user_id,
            transaction.id,
            "transaction_created",
            "Contribution recorded",
            `A contribution of ${transaction.amount} has been recorded for your account.`,
          ]
        );
      }

      await client.query("COMMIT");

      return res.status(201).json({
        success: true,
        message: "Transaction recorded successfully.",
        transaction,
      });
    } catch (error) {
      if (client) {
        await client.query("ROLLBACK").catch(() => {});
      }

      if (error.code === "23505") {
        return res.status(409).json({
          success: false,
          message: "This M-Pesa reference has already been recorded.",
        });
      }

      if (error.code === "23503") {
        return res.status(400).json({
          success: false,
          message: "A referenced user does not exist.",
        });
      }

      return next(error);
    } finally {
      if (client) {
        client.release();
      }
    }
  });
// patch

router.patch(
  "/:id",
  requireAuth,
  requireRole("treasurer"),
  async (req, res, next) => {
    const { id } = req.params;
    let {
      enteredMemberName,
      amount,
      paidAt,
      mpesaReference,
      notes,
    } = req.body;

    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid transaction ID.",
      });
    }

    if (enteredMemberName !== undefined) {
      if (
        typeof enteredMemberName !== "string" ||
        !enteredMemberName.trim() ||
        enteredMemberName.trim().length > 150
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Member name is required and must not exceed 150 characters.",
        });
      }

      enteredMemberName = enteredMemberName.trim();
    }

    if (amount !== undefined) {
      const parsedAmount = Number(amount);

      if (
        amount === null ||
        amount === "" ||
        !Number.isFinite(parsedAmount) ||
        parsedAmount <= 0 ||
        parsedAmount > 9999999999.99 ||
        Math.round(parsedAmount * 100) !== parsedAmount * 100
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Amount must be positive, must not exceed 9999999999.99, and may have at most two decimal places.",
        });
      }
    }

    if (paidAt !== undefined) {
      const parsedDate =
        typeof paidAt === "string" ? Date.parse(paidAt) : NaN;

      if (
        typeof paidAt !== "string" ||
        !paidAt.trim() ||
        !Number.isFinite(parsedDate)
      ) {
        return res.status(400).json({
          success: false,
          message: "Paid date must be a valid date string.",
        });
      }
    }

    if (
      mpesaReference !== undefined &&
      mpesaReference !== null &&
      (typeof mpesaReference !== "string" ||
        mpesaReference.trim().length > 100)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid M-Pesa reference.",
      });
    }

    if (
      notes !== undefined &&
      notes !== null &&
      typeof notes !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message: "Notes must be text.",
      });
    }

    if (typeof notes === "string" && notes.trim().length > 5000) {
      return res.status(400).json({
        success: false,
        message: "Notes must not exceed 5000 characters.",
      });
    }

    const reason =
      typeof req.body.reason === "string"
        ? req.body.reason.trim()
        : "";

    if (!reason || reason.length > 1000) {
      return res.status(400).json({
        success: false,
        message:
          "A reason is required and must not exceed 1000 characters.",
      });
    }

    let client;

    try {
      client = await pool.connect();
      await client.query("BEGIN");

      const existingResult = await client.query(
        `SELECT *
         FROM transactions
         WHERE id = $1 AND status = 'active'
         FOR UPDATE`,
        [id]
      );

      if (existingResult.rowCount === 0) {
        await client.query("ROLLBACK").catch(()=>{});
        return res.status(404).json({
          success: false,
          message: "Active transaction not found.",
        });
      }

      const oldTransaction = existingResult.rows[0];

      const name =
        enteredMemberName === undefined
          ? oldTransaction.entered_member_name
          : enteredMemberName.trim();

      const newAmount =
        amount === undefined ? oldTransaction.amount : Number(amount);

      const newPaidAt =
        paidAt === undefined ? oldTransaction.paid_at : paidAt;

      const reference =
        mpesaReference === undefined
          ? oldTransaction.mpesa_reference
          : typeof mpesaReference === "string" && mpesaReference.trim()
            ? mpesaReference.trim()
            : null;

      const normalizedReference = reference
        ? reference.toUpperCase()
        : null;

      const newNotes =
        notes === undefined
          ? oldTransaction.notes
          : typeof notes === "string" && notes.trim()
            ? notes.trim()
            : null;

      const updatedResult = await client.query(
        `UPDATE transactions
         SET entered_member_name = $1,
             amount = $2,
             paid_at = $3,
             mpesa_reference = $4,
             normalized_mpesa_reference = $5,
             notes = $6,
             updated_by = $7,
             updated_at = NOW()
         WHERE id = $8
         RETURNING *`,
        [
          name,
          newAmount,
          newPaidAt,
          reference,
          normalizedReference,
          newNotes,
          req.session.user.id,
          id,
        ]
      );

      const updatedTransaction = updatedResult.rows[0];

      await client.query(
        `INSERT INTO audit_logs (
           actor_user_id, action, target_type, target_id,
           old_values, new_values
         )
         VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb)`,
        [
          req.session.user.id,
          "transaction_updated",
          "transaction",
          id,
          JSON.stringify(oldTransaction),
          JSON.stringify({
            ...updatedTransaction,
            change_reason: reason,
          }),
        ]
      );

      if (updatedTransaction.member_user_id) {
        await client.query(
          `INSERT INTO notifications (
             recipient_user_id, transaction_id,
             event_type, title, message
           )
           VALUES ($1, $2, $3, $4, $5)`,
          [
            updatedTransaction.member_user_id,
            id,
            "transaction_updated",
            "Contribution updated",
            `Your contribution of ${updatedTransaction.amount} has been updated.`,
          ]
        );
      }

      await client.query("COMMIT");

      return res.status(200).json({
        success: true,
        message: "Transaction updated successfully.",
        transaction: updatedTransaction,
      });
    } catch (error) {

      if (client) {
        await client.query("ROLLBACK").catch((rollbackError) => {
          console.error("Transaction update rollback failed:", rollbackError);
        });
      }

      if (error.code === "23505") {
        return res.status(409).json({
          success: false,
          message: "This M-Pesa reference has already been recorded.",
        });
      }

      return next(error);
    } finally {
      if (client) {
        client.release();
      }
    }
  }
);
// PATCH /api/transactions/:id/reverse
router.patch(
  "/:id/reverse",
  requireAuth,
  requireRole("treasurer"),
  async (req, res, next) => {
    const { id } = req.params;

    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid transaction ID.",
      });
    }
    let client;
    try {
      const reason =
  typeof req.body.reason === "string"
    ? req.body.reason.trim()
    : "";

      if (!reason || reason.length > 1000) {
        return res.status(400).json({
          success: false,
          message: "A reason is required and must not exceed 1000 characters.",
        });
      }

      client = await pool.connect();
      await client.query("BEGIN");

      const existingResult = await client.query(
        `SELECT *
         FROM transactions
         WHERE id = $1 AND status = 'active'
         FOR UPDATE`,
        [id]
      );

      if (existingResult.rowCount === 0) {
        await client.query("ROLLBACK");

        return res.status(404).json({
          success: false,
          message: "Active transaction not found.",
        });
      }

      const oldTransaction = existingResult.rows[0];

      const reversedResult = await client.query(
        `UPDATE transactions
 SET status = 'reversed',
     updated_by = $1,
     updated_at = NOW()
 WHERE id = $2
   AND status = 'active'
 RETURNING *`,
        [req.session.user.id, id]
      );

      const reversedTransaction = reversedResult.rows[0];
      if (!reversedTransaction) {
        await client.query("ROLLBACK");

        return res.status(404).json({
          success: false,
          message: "Active transaction not found.",
        });
      }

      await client.query(
        `INSERT INTO audit_logs (
           actor_user_id, action, target_type, target_id,
           old_values, new_values
         )
         VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb)`,
        [
          req.session.user.id,
          "transaction_reversed",
          "transaction",
          id,
          JSON.stringify(oldTransaction),
          JSON.stringify({
            ...reversedTransaction,
            reversal_reason: reason,
          }),
        ]
      );

      if (reversedTransaction.member_user_id) {
        await client.query(
          `INSERT INTO notifications (
             recipient_user_id, transaction_id,
             event_type, title, message
           )
           VALUES ($1, $2, $3, $4, $5)`,
          [
            reversedTransaction.member_user_id,
            id,
            "transaction_updated",
            "Contribution reversed",
            `Your contribution of ${reversedTransaction.amount} has been reversed.`,
          ]
        );
      }

      await client.query("COMMIT");

      return res.status(200).json({
        success: true,
        message: "Transaction reversed successfully.",
        transaction: reversedTransaction,
      });
    } catch (error) {

      if (client) {
        await client.query("ROLLBACK").catch((rollbackError) => {
          console.error("Transaction reversal rollback failed:", rollbackError);
        });
      }

      return next(error);
    } finally {
      if (client) {
        client.release();
      }
    }
  }
);
/* GET /api/transactions/notifications */
router.get(
  "/notifications",
  requireAuth,
  async (req, res, next) => {
    try {
      const pagination = getPagination(req.query);

      if (pagination.error) {
        return res.status(400).json({
          success: false,
          message: pagination.error,
        });
      }

      const { limit, offset } = pagination;

      const result = await query(
        `SELECT
           id,
           transaction_id,
           event_type,
           title,
           message,
           created_at,
           read_at,
           (read_at IS NULL) AS unread
         FROM notifications
         WHERE recipient_user_id = $1
         ORDER BY created_at DESC
         LIMIT $2 OFFSET $3`,
        [req.session.user.id, limit, offset]
      );

      return res.status(200).json({
        success: true,
        notifications: result.rows,
        pagination: {
          limit,
          offset,
          count: result.rows.length,
        },
      });
    } catch (error) {
      return next(error);
    }
  }
);

/* PATCH /api/transactions/notifications/:id/read */
router.patch(
  "/notifications/:id/read",
  requireAuth,
  async (req, res, next) => {
    const { id } = req.params;

    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid notification ID.",
      });
    }

    try {
      const result = await query(
        `UPDATE notifications
         SET read_at = COALESCE(read_at, NOW())
         WHERE id = $1
           AND recipient_user_id = $2
         RETURNING id, title, read_at`,
        [id, req.session.user.id]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({
          success: false,
          message: "Notification not found.",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Notification marked as read.",
        notification: result.rows[0],
      });
    } catch (error) {
      return next(error);
    }
  }
);
// GET /api/transactions/reversed
router.get(
  "/reversed",
  requireAuth,
  requireRole("chairperson"),
  async (req, res, next) => {
    try {
      const pagination = getPagination(req.query);

      if (pagination.error) {
        return res.status(400).json({
          success: false,
          message: pagination.error,
        });
      }

      const { limit, offset } = pagination;

      const result = await query(
        `SELECT
           id,
           member_user_id,
           entered_member_name,
           amount,
           paid_at,
           mpesa_reference,
           notes,
           status,
           created_by,
           updated_by,
           created_at,
           updated_at
         FROM transactions
         WHERE status = 'reversed'
         ORDER BY updated_at DESC
         LIMIT $1 OFFSET $2`,
        [limit, offset]
      );

      return res.status(200).json({
        success: true,
        transactions: result.rows,
        pagination: {
          limit,
          offset,
          count: result.rows.length,
        },
      });
    } catch (error) {
      return next(error);
    }
  }
);

// GET /api/transactions/summary
router.get(
  "/summary",
  requireAuth,
  requireRole("member", "treasurer", "chairperson"),
  async (req, res, next) => {
    try {
      const isMember = req.session.user.role === "member";

      const result = await query(
        `SELECT
           COUNT(*) FILTER (
             WHERE status = 'active'
           ) AS active_transaction_count,

           COALESCE(
             SUM(amount) FILTER (
               WHERE status = 'active'
             ),
             0
           ) AS active_contribution_total,

           COUNT(*) FILTER (
             WHERE status = 'reversed'
           ) AS reversed_transaction_count,

           COALESCE(
             SUM(amount) FILTER (
               WHERE status = 'reversed'
             ),
             0
           ) AS reversed_contribution_total

         FROM transactions
         WHERE ($1::boolean = FALSE OR member_user_id = $2::uuid)`,
        [isMember, req.session.user.id]
      );

      const summary = result.rows[0];

      return res.status(200).json({
        success: true,
        summary: {
          activeTransactionCount: Number(
            summary.active_transaction_count
          ),
          activeContributionTotal: summary.active_contribution_total,
          reversedTransactionCount: Number(
            summary.reversed_transaction_count
          ),
          reversedContributionTotal: summary.reversed_contribution_total,
        },
      });
    } catch (error) {
      return next(error);
    }
  }
);

// GET /api/transactions/weekly-report?weekStart=YYYY-MM-DD
router.get(
  "/weekly-report",
  requireAuth,
  requireRole("treasurer", "chairperson"),
  async (req, res, next) => {
    try {
      const { weekStart } = req.query;
      let selectedMonday = null;

      if (weekStart !== undefined) {
        if (
          typeof weekStart !== "string" ||
          !/^\d{4}-\d{2}-\d{2}$/.test(weekStart)
        ) {
          return res.status(400).json({
            success: false,
            message: "weekStart must be a valid Monday date in YYYY-MM-DD format.",
          });
        }

        const parsedDate = new Date(`${weekStart}T00:00:00Z`);

        if (
          Number.isNaN(parsedDate.getTime()) ||
          parsedDate.toISOString().slice(0, 10) !== weekStart ||
          parsedDate.getUTCDay() !== 1
        ) {
          return res.status(400).json({
            success: false,
            message: "weekStart must be a valid Monday date in YYYY-MM-DD format.",
          });
        }

        selectedMonday = weekStart;
      }

      const result = await query(
        `WITH local_date AS (
           SELECT
             (NOW() AT TIME ZONE 'Africa/Nairobi')::date AS today
         ),
         reporting_week AS (
           SELECT COALESCE(
             $1::date,
             today - (EXTRACT(ISODOW FROM today)::integer - 1)
           ) AS monday
           FROM local_date
         )
         SELECT
           rw.monday AS week_start,
           rw.monday + 5 AS week_end,
           COUNT(t.id) AS transaction_count,
           COALESCE(SUM(t.amount), 0) AS contribution_total
         FROM reporting_week rw
         LEFT JOIN transactions t
           ON t.status = 'active'
          AND t.paid_at >= (
            rw.monday::timestamp AT TIME ZONE 'Africa/Nairobi'
          )
          AND t.paid_at < (
            (rw.monday + 6)::timestamp AT TIME ZONE 'Africa/Nairobi'
          )
         GROUP BY rw.monday`,
        [selectedMonday]
      );

      const report = result.rows[0];

      return res.status(200).json({
        success: true,
        weeklyReport: {
          weekStart: report.week_start,
          weekEnd: report.week_end,
          transactionCount: Number(report.transaction_count),
          contributionTotal: report.contribution_total,
          timezone: "Africa/Nairobi",
        },
      });
    } catch (error) {
      return next(error);
    }
  }
);
// GET /api/transactions/weekly-report/members?weekStart=YYYY-MM-DD
router.get(
  "/weekly-report/members",
  requireAuth,
  requireRole("treasurer", "chairperson"),
  async (req, res, next) => {
    try {
      const { weekStart } = req.query;
      let selectedMonday = null;

      if (weekStart !== undefined) {
        if (
          typeof weekStart !== "string" ||
          !/^\d{4}-\d{2}-\d{2}$/.test(weekStart)
        ) {
          return res.status(400).json({
            success: false,
            message: "weekStart must be a valid Monday date in YYYY-MM-DD format.",
          });
        }

        const parsedDate = new Date(`${weekStart}T00:00:00Z`);

        if (
          Number.isNaN(parsedDate.getTime()) ||
          parsedDate.toISOString().slice(0, 10) !== weekStart ||
          parsedDate.getUTCDay() !== 1
        ) {
          return res.status(400).json({
            success: false,
            message: "weekStart must be a valid Monday date in YYYY-MM-DD format.",
          });
        }

        selectedMonday = weekStart;
      }

      const result = await query(
        `WITH local_date AS (
           SELECT
             (NOW() AT TIME ZONE 'Africa/Nairobi')::date AS today
         ),
         reporting_week AS (
           SELECT COALESCE(
             $1::date,
             today - (EXTRACT(ISODOW FROM today)::integer - 1)
           ) AS monday
           FROM local_date
         ),
         weekly_transactions AS (
           SELECT
             t.member_user_id,
             CASE
               WHEN t.member_user_id IS NOT NULL
                 THEN COALESCE(u.full_name, t.entered_member_name)
               ELSE t.entered_member_name
             END AS member_name,
             t.amount
           FROM transactions t
           CROSS JOIN reporting_week rw
           LEFT JOIN users u
             ON u.id = t.member_user_id
           WHERE t.status = 'active'
             AND t.paid_at >= (
               rw.monday::timestamp AT TIME ZONE 'Africa/Nairobi'
             )
             AND t.paid_at < (
               (rw.monday + 6)::timestamp AT TIME ZONE 'Africa/Nairobi'
             )
         )
         SELECT
           member_user_id AS "memberUserId",
           member_name AS "memberName",
           COUNT(*) AS "transactionCount",
           COALESCE(SUM(amount), 0) AS "contributionTotal"
         FROM weekly_transactions
         GROUP BY member_user_id, member_name
         ORDER BY SUM(amount) DESC, member_name ASC`,
        [selectedMonday]
      );

      const weekResult = await query(
        `SELECT
           COALESCE(
             $1::date,
             (
               (NOW() AT TIME ZONE 'Africa/Nairobi')::date
               - (
                 EXTRACT(
                   ISODOW FROM
                   (NOW() AT TIME ZONE 'Africa/Nairobi')::date
                 )::integer - 1
               )
             )
           ) AS week_start`,
        [selectedMonday]
      );

      const monday = weekResult.rows[0].week_start;
      const saturday = new Date(`${monday}T00:00:00Z`);
      saturday.setUTCDate(saturday.getUTCDate() + 5);

      return res.status(200).json({
        success: true,
        weeklyReport: {
          weekStart: monday,
          weekEnd: saturday.toISOString().slice(0, 10),
          timezone: "Africa/Nairobi",
          members: result.rows.map((row) => ({
            memberUserId: row.memberUserId,
            memberName: row.memberName,
            transactionCount: Number(row.transactionCount),
            contributionTotal: row.contributionTotal,
          })),
        },
      });
    } catch (error) {
      return next(error);
    }
  }
);
// GET /api/transactions/monthly-report?month=YYYY-MM
router.get(
  "/monthly-report",
  requireAuth,
  requireRole("treasurer", "chairperson"),
  async (req, res, next) => {
    try {
      const { month } = req.query;
      let selectedMonth = null;

      if (month !== undefined) {
        if (
          typeof month !== "string" ||
          !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)
        ) {
          return res.status(400).json({
            success: false,
            message: "month must be in YYYY-MM format, such as 2026-10.",
          });
        }

        selectedMonth = `${month}-01`;
      }

      const result = await query(
        `WITH current_month AS (
           SELECT
             date_trunc(
               'month',
               NOW() AT TIME ZONE 'Africa/Nairobi'
             )::date AS month_start
         ),
         reporting_month AS (
           SELECT COALESCE(
             $1::date,
             month_start
           ) AS month_start
           FROM current_month
         )
         SELECT
           rm.month_start AS "monthStart",
           (rm.month_start + INTERVAL '1 month - 1 day')::date
             AS "monthEnd",

           COUNT(t.id) FILTER (
             WHERE t.status = 'active'
           ) AS "activeTransactionCount",

           COALESCE(
             SUM(t.amount) FILTER (
               WHERE t.status = 'active'
             ),
             0
           ) AS "activeContributionTotal",

           COUNT(t.id) FILTER (
             WHERE t.status = 'reversed'
           ) AS "reversedTransactionCount",

           COALESCE(
             SUM(t.amount) FILTER (
               WHERE t.status = 'reversed'
             ),
             0
           ) AS "reversedContributionTotal"

         FROM reporting_month rm
         LEFT JOIN transactions t
           ON t.paid_at >= (
             rm.month_start::timestamp
             AT TIME ZONE 'Africa/Nairobi'
           )
          AND t.paid_at < (
             (rm.month_start + INTERVAL '1 month')::timestamp
             AT TIME ZONE 'Africa/Nairobi'
           )
         GROUP BY rm.month_start`,
        [selectedMonth]
      );

      const report = result.rows[0];

      return res.status(200).json({
        success: true,
        monthlyReport: {
          monthStart: report.monthStart,
          monthEnd: report.monthEnd,
          timezone: "Africa/Nairobi",
          activeTransactionCount: Number(
            report.activeTransactionCount
          ),
          activeContributionTotal: report.activeContributionTotal,
          reversedTransactionCount: Number(
            report.reversedTransactionCount
          ),
          reversedContributionTotal: report.reversedContributionTotal,
        },
      });
    } catch (error) {
      return next(error);
    }
  }
);
// GET /api/transactions/monthly-report/members?month=YYYY-MM
router.get(
  "/monthly-report/members",
  requireAuth,
  requireRole("treasurer", "chairperson"),
  async (req, res, next) => {
    try {
      const { month } = req.query;
      let selectedMonth = null;

      if (month !== undefined) {
        if (
          typeof month !== "string" ||
          !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)
        ) {
          return res.status(400).json({
            success: false,
            message: "month must be in YYYY-MM format, such as 2026-10.",
          });
        }

        selectedMonth = `${month}-01`;
      }

      const result = await query(
        `WITH current_month AS (
           SELECT date_trunc(
             'month',
             NOW() AT TIME ZONE 'Africa/Nairobi'
           )::date AS month_start
         ),
         reporting_month AS (
           SELECT COALESCE(
             $1::date,
             month_start
           ) AS month_start
           FROM current_month
         )
         SELECT
           t.member_user_id AS "memberUserId",

           CASE
             WHEN t.member_user_id IS NOT NULL
               THEN COALESCE(u.full_name, t.entered_member_name)
             ELSE t.entered_member_name
           END AS "memberName",

           COUNT(t.id) FILTER (
             WHERE t.status = 'active'
           ) AS "activeTransactionCount",

           COALESCE(
             SUM(t.amount) FILTER (
               WHERE t.status = 'active'
             ),
             0
           ) AS "activeContributionTotal",

           COUNT(t.id) FILTER (
             WHERE t.status = 'reversed'
           ) AS "reversedTransactionCount",

           COALESCE(
             SUM(t.amount) FILTER (
               WHERE t.status = 'reversed'
             ),
             0
           ) AS "reversedContributionTotal"

         FROM reporting_month rm
         JOIN transactions t
           ON t.paid_at >= (
             rm.month_start::timestamp
             AT TIME ZONE 'Africa/Nairobi'
           )
          AND t.paid_at < (
             (rm.month_start + INTERVAL '1 month')::timestamp
             AT TIME ZONE 'Africa/Nairobi'
           )
         LEFT JOIN users u
           ON u.id = t.member_user_id

         WHERE t.status IN ('active', 'reversed')

         GROUP BY
           t.member_user_id,
           CASE
             WHEN t.member_user_id IS NOT NULL
               THEN COALESCE(u.full_name, t.entered_member_name)
             ELSE t.entered_member_name
           END

         ORDER BY
           COALESCE(
             SUM(t.amount) FILTER (
               WHERE t.status = 'active'
             ),
             0
           ) DESC,
           "memberName" ASC`,
        [selectedMonth]
      );

      const monthResult = await query(
        `SELECT COALESCE(
           $1::date,
           date_trunc(
             'month',
             NOW() AT TIME ZONE 'Africa/Nairobi'
           )::date
         ) AS month_start`,
        [selectedMonth]
      );

      const monthStart = monthResult.rows[0].month_start;

      const monthEndDate = new Date(`${monthStart}T00:00:00Z`);
      monthEndDate.setUTCMonth(monthEndDate.getUTCMonth() + 1);
      monthEndDate.setUTCDate(0);

      return res.status(200).json({
        success: true,
        monthlyMemberReport: {
          monthStart,
          monthEnd: monthEndDate.toISOString().slice(0, 10),
          timezone: "Africa/Nairobi",
          members: result.rows.map((row) => ({
            memberUserId: row.memberUserId,
            memberName: row.memberName,
            activeTransactionCount: Number(row.activeTransactionCount),
            activeContributionTotal: row.activeContributionTotal,
            reversedTransactionCount: Number(row.reversedTransactionCount),
            reversedContributionTotal: row.reversedContributionTotal,
          })),
        },
      });
    } catch (error) {
      return next(error);
    }
  }
);
// GET /api/transactions/report-summary?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
router.get(
  "/report-summary",
  requireAuth,
  requireRole("treasurer", "chairperson"),
  async (req, res, next) => {
    try {
      const { startDate, endDate } = req.query;


      if (!isValidDateRange(startDate, endDate)) {
        return res.status(400).json({
          success: false,
          message:
      "Invalid date range. Use valid dates in YYYY-MM-DD format, with the end date on or after the start date and a maximum range of 366 calendar days.",
        });
      }

      const result = await query(
        `SELECT
           COUNT(*) FILTER (
             WHERE status = 'active'
           ) AS "activeTransactionCount",

           COALESCE(
             SUM(amount) FILTER (
               WHERE status = 'active'
             ),
             0
           ) AS "activeContributionTotal",

           COUNT(*) FILTER (
             WHERE status = 'reversed'
           ) AS "reversedTransactionCount",

           COALESCE(
             SUM(amount) FILTER (
               WHERE status = 'reversed'
             ),
             0
           ) AS "reversedContributionTotal"

         FROM transactions
         WHERE paid_at >= (
           $1::date::timestamp AT TIME ZONE 'Africa/Nairobi'
         )
           AND paid_at < (
             ($2::date + 1)::timestamp AT TIME ZONE 'Africa/Nairobi'
           )
           AND status IN ('active', 'reversed')`,
        [startDate, endDate]
      );

      const summary = result.rows[0];

      return res.status(200).json({
        success: true,
        reportSummary: {
          startDate,
          endDate,
          timezone: "Africa/Nairobi",
          activeTransactionCount: Number(
            summary.activeTransactionCount
          ),
          activeContributionTotal: summary.activeContributionTotal,
          reversedTransactionCount: Number(
            summary.reversedTransactionCount
          ),
          reversedContributionTotal: summary.reversedContributionTotal,
        },
      });
    } catch (error) {
      return next(error);
    }
  }
);
// GET /api/transactions/export.csv?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
router.get(
  "/export.csv",
  requireAuth,
  requireRole("treasurer", "chairperson"),
  async (req, res, next) => {
    try {
      const { startDate, endDate } = req.query;


      if (!isValidDateRange(startDate, endDate)) {
        return res.status(400).json({
          success: false,
          message:
      "Invalid date range. Use valid dates in YYYY-MM-DD format, with the end date on or after the start date and a maximum range of 366 calendar days.",
        });
      }

      const result = await query(
        `SELECT
           t.id AS "transactionId",
           COALESCE(u.full_name, t.entered_member_name) AS "memberName",
           t.member_user_id AS "memberUserId",
           t.amount,
           to_char(
             t.paid_at AT TIME ZONE 'Africa/Nairobi',
             'YYYY-MM-DD HH24:MI:SS'
           ) AS "paidAt",
           t.mpesa_reference AS "mpesaReference",
           t.status,
           t.notes,
           t.created_at AS "createdAt"
         FROM transactions t
         LEFT JOIN users u
           ON u.id = t.member_user_id
         WHERE t.paid_at >= (
           $1::date::timestamp AT TIME ZONE 'Africa/Nairobi'
         )
           AND t.paid_at < (
             ($2::date + 1)::timestamp AT TIME ZONE 'Africa/Nairobi'
           )
           AND t.status IN ('active', 'reversed')
         ORDER BY t.paid_at ASC, t.id ASC`,
        [startDate, endDate]
      );

      function escapeCsv(value) {
        let text = value == null ? "" : String(value);

        // Prevent spreadsheet formula injection in text fields.
        if (/^[\s]*[=+\-@]/.test(text)) {
          text = `'${text}`;
        }

        return `"${text.replace(/"/g, '""')}"`;
      }

      const headers = [
        "Transaction ID",
        "Member Name",
        "Member User ID",
        "Amount",
        "Paid At (Africa/Nairobi)",
        "M-Pesa Reference",
        "Status",
        "Notes",
        "Created At",
      ];

        const rows = result.rows.map((row) => [
        row.transactionId,
        row.memberName,
        row.memberUserId,
        row.amount,
        row.paidAt,
        row.mpesaReference,
        row.status,
        row.notes,
        row.createdAt
          ? new Date(row.createdAt).toISOString()
          : "",
      ]);

      const csv = [
        headers.map(escapeCsv).join(","),
        ...rows.map((row) => row.map(escapeCsv).join(",")),
      ].join("\r\n");

      const filename = `contributions_${startDate}_to_${endDate}.csv`;

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`
      );
      res.setHeader("Cache-Control", "no-store");

      return res.status(200).send("\uFEFF" + csv);
    } catch (error) {
      return next(error);
    }
  }
);
// GET /api/transactions/monthly-report/members.csv?month=YYYY-MM
router.get(
  "/monthly-report/members.csv",
  requireAuth,
  requireRole("treasurer", "chairperson"),
  async (req, res, next) => {
    try {
      const { month } = req.query;

      if (
        typeof month !== "string" ||
        !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)
      ) {
        return res.status(400).json({
          success: false,
          message: "month is required in YYYY-MM format, such as 2026-10.",
        });
      }

      const monthStart = `${month}-01`;

      const result = await query(
        `WITH reporting_month AS (
           SELECT $1::date AS month_start
         )
         SELECT
           t.member_user_id AS "memberUserId",
           CASE
             WHEN t.member_user_id IS NOT NULL
               THEN COALESCE(u.full_name, t.entered_member_name)
             ELSE t.entered_member_name
           END AS "memberName",

           COUNT(t.id) FILTER (
             WHERE t.status = 'active'
           ) AS "activeTransactionCount",

           COALESCE(
             SUM(t.amount) FILTER (
               WHERE t.status = 'active'
             ),
             0
           ) AS "activeContributionTotal",

           COUNT(t.id) FILTER (
             WHERE t.status = 'reversed'
           ) AS "reversedTransactionCount",

           COALESCE(
             SUM(t.amount) FILTER (
               WHERE t.status = 'reversed'
             ),
             0
           ) AS "reversedContributionTotal"

         FROM reporting_month rm
         JOIN transactions t
           ON t.paid_at >= (
             rm.month_start::timestamp
             AT TIME ZONE 'Africa/Nairobi'
           )
          AND t.paid_at < (
             (rm.month_start + INTERVAL '1 month')::timestamp
             AT TIME ZONE 'Africa/Nairobi'
           )
         LEFT JOIN users u
           ON u.id = t.member_user_id
         WHERE t.status IN ('active', 'reversed')
         GROUP BY
           t.member_user_id,
           CASE
             WHEN t.member_user_id IS NOT NULL
               THEN COALESCE(u.full_name, t.entered_member_name)
             ELSE t.entered_member_name
           END
         ORDER BY
           COALESCE(
             SUM(t.amount) FILTER (
               WHERE t.status = 'active'
             ),
             0
           ) DESC,
           "memberName" ASC`,
        [monthStart]
      );

      function escapeCsv(value) {
        let text = value == null ? "" : String(value);

        // Protect spreadsheet users from formula injection.
        if (/^[\s]*[=+\-@]/.test(text)) {
          text = `'${text}`;
        }

        return `"${text.replace(/"/g, '""')}"`;
      }

      const headers = [
        "Member User ID",
        "Member Name",
        "Active Transaction Count",
        "Active Contribution Total",
        "Reversed Transaction Count",
        "Reversed Contribution Total",
      ];

      const rows = result.rows.map((row) => [
        row.memberUserId,
        row.memberName,
        Number(row.activeTransactionCount),
        row.activeContributionTotal,
        Number(row.reversedTransactionCount),
        row.reversedContributionTotal,
      ]);

      const csv = [
        headers.map(escapeCsv).join(","),
        ...rows.map((row) => row.map(escapeCsv).join(",")),
      ].join("\r\n");

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="monthly_member_summary_${month}.csv"`
      );
      res.setHeader("Cache-Control", "no-store");

      return res.status(200).send("\uFEFF" + csv);
    } catch (error) {
      return next(error);
    }
  }
);

router.patch("/notifications/read-all", requireAuth, async (req, res, next) => {
  try {
    const result = await query(
      `UPDATE notifications
       SET read_at = NOW()
       WHERE recipient_user_id = $1
         AND read_at IS NULL
       RETURNING id`,
      [req.session.user.id]
    );

    return res.status(200).json({
      success: true,
      message: "All unread notifications marked as read.",
      updatedCount: result.rowCount,
    });
  } catch (error) {
    return next(error);
  }
});

router.get("/notifications/unread-count", requireAuth, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT COUNT(*)::int AS unread_count
       FROM notifications
       WHERE recipient_user_id = $1
         AND read_at IS NULL`,
      [req.session.user.id]
    );

    return res.status(200).json({
      success: true,
      unreadCount: result.rows[0].unread_count,
    });
  } catch (error) {
    return next(error);
  }
});


router.get("/:id", requireAuth, requireRole("member", "treasurer", "chairperson"), async (req, res, next) => {
  const { id } = req.params;

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid transaction ID.",
    });
  }

  try {
    const result = await query(
      `SELECT
         id,
         member_user_id,
         entered_member_name,
         amount,
         paid_at,
         mpesa_reference,
         notes,
         status,
         created_by,
         updated_by,
         created_at,
         updated_at
       FROM transactions
       WHERE id = $1
         AND (
           $2 IN ('treasurer', 'chairperson')
           OR member_user_id = $3
         )`,
      [id, req.session.user.role, req.session.user.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found.",
      });
    }

    return res.status(200).json({
      success: true,
      transaction: result.rows[0],
    });
  } catch (error) {
    return next(error);
  }
});


router.get(
  "/summary/overview",
  requireAuth,
  requireRole("member", "treasurer", "chairperson"),
  async (req, res, next) => {
    try {
      const result = await query(
        `SELECT
           COUNT(*) FILTER (WHERE status = 'active')::int AS active_count,
           COALESCE(
             SUM(amount) FILTER (WHERE status = 'active'),
             0
           )::numeric(12, 2) AS active_total,
           COUNT(*) FILTER (WHERE status = 'reversed')::int AS reversed_count,
           COALESCE(
             SUM(amount) FILTER (WHERE status = 'reversed'),
             0
           )::numeric(12, 2) AS reversed_total
         FROM transactions
         WHERE (
           $1 IN ('treasurer', 'chairperson')
           OR member_user_id = $2
         )`,
        [req.session.user.role, req.session.user.id]
      );

      return res.status(200).json({
        success: true,
        summary: {
          activeCount: result.rows[0].active_count,
          activeTotal: result.rows[0].active_total,
          reversedCount: result.rows[0].reversed_count,
          reversedTotal: result.rows[0].reversed_total,
        },
      });
    } catch (error) {
      return next(error);
    }
  }
);

module.exports = router;
