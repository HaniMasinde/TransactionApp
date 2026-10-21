const pool = require("../config/db");

// GET /api/reports/member/:id
// Generate a report for one member
const getMemberReport = async (req, res) => {
  try {
    const { id } = req.params;
    const { startDate, endDate } = req.query;

    if (!Number.isInteger(Number(id)) || Number(id) <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid member ID.",
      });
    }

    if (
      startDate &&
      endDate &&
      new Date(startDate) > new Date(endDate)
    ) {
      return res.status(400).json({
        success: false,
        message: "Start date cannot be after end date.",
      });
    }

    const conditions = [
      "t.member_id = $1",
      "LOWER(t.status) <> 'reversed'",
    ];

    const values = [Number(id)];
    let paramIndex = 2;

    if (startDate) {
      conditions.push(`t.transaction_date >= $${paramIndex++}`);
      values.push(startDate);
    }

    if (endDate) {
      conditions.push(`t.transaction_date < ($${paramIndex++}::date + INTERVAL '1 day')`);
      values.push(endDate);
    }

    const query = `
      SELECT
        t.id,
        t.amount,
        t.transaction_date,
        t.mpesa_reference,
        t.status
      FROM transactions t
      WHERE ${conditions.join(" AND ")}
      ORDER BY t.transaction_date DESC
    `;

    const result = await pool.query(query, values);

    const totalContributions = result.rows.reduce(
      (total, transaction) => total + Number(transaction.amount || 0),
      0
    );

    return res.status(200).json({
      success: true,
      memberId: Number(id),
      period: {
        startDate: startDate || null,
        endDate: endDate || null,
      },
      transactionCount: result.rows.length,
      totalContributions,
      transactions: result.rows,
    });
  } catch (error) {
    console.error("Error generating member report:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to generate member report.",
    });
  }
};

// GET /api/reports/group
// Generate a report for the whole group
const getGroupReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (
      startDate &&
      endDate &&
      new Date(startDate) > new Date(endDate)
    ) {
      return res.status(400).json({
        success: false,
        message: "Start date cannot be after end date.",
      });
    }

    const conditions = [
      "LOWER(t.status) <> 'reversed'",
    ];

    const values = [];
    let paramIndex = 1;

    if (startDate) {
      conditions.push(`t.transaction_date >= $${paramIndex++}`);
      values.push(startDate);
    }

    if (endDate) {
      conditions.push(`t.transaction_date < ($${paramIndex++}::date + INTERVAL '1 day')`);
      values.push(endDate);
    }

    const query = `
      SELECT
        COUNT(*)::int AS transaction_count,
        COALESCE(SUM(t.amount), 0) AS total_contributions,
        COUNT(DISTINCT t.member_id)::int AS contributing_members
      FROM transactions t
      WHERE ${conditions.join(" AND ")}
    `;

    const result = await pool.query(query, values);

    return res.status(200).json({
      success: true,
      period: {
        startDate: startDate || null,
        endDate: endDate || null,
      },
      report: result.rows[0],
    });
  } catch (error) {
    console.error("Error generating group report:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to generate group report.",
    });
  }
};

module.exports = {
  getMemberReport,
  getGroupReport,
};