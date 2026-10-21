
// server/src/controllers/transactionController.js

const pool = require("../config/db");

// GET /api/transactions
const getAllTransactions = async (req, res) => {
  try {
    const query = `
      SELECT
        id,
        member_id,
        amount,
        transaction_date,
        mpesa_reference,
        status
      FROM transactions
      ORDER BY transaction_date DESC
    `;

    const { rows } = await pool.query(query);

    return res.status(200).json({
      success: true,
      count: rows.length,
      transactions: rows,
    });
  } catch (error) {
    console.error("Get transactions error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve transactions.",
    });
  }
};

// GET /api/transactions/:id
const getTransactionById = async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid transaction ID.",
      });
    }

    const { rows } = await pool.query(
      `SELECT * FROM transactions WHERE id = $1`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found.",
      });
    }

    return res.status(200).json({
      success: true,
      transaction: rows[0],
    });
  } catch (error) {
    console.error("Get transaction error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve transaction.",
    });
  }
};

// POST /api/transactions
const createTransaction = async (req, res) => {
  try {
    const {
      member_id,
      amount,
      transaction_date,
      mpesa_reference,
    } = req.body;

    if (
      amount === undefined ||
      amount === null ||
      !Number.isFinite(Number(amount)) ||
      Number(amount) <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Amount must be a positive number.",
      });
    }

    if (!transaction_date || !mpesa_reference?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Transaction date and M-Pesa reference are required.",
      });
    }

    const normalizedReference = mpesa_reference.trim().toUpperCase();

    const query = `
      INSERT INTO transactions (
        member_id,
        amount,
        transaction_date,
        mpesa_reference,
        status
      )
      VALUES ($1, $2, $3, $4, 'active')
      RETURNING *
    `;

    const values = [
      member_id || null,
      Number(amount),
      transaction_date,
      normalizedReference,
    ];

    const { rows } = await pool.query(query, values);

    return res.status(201).json({
      success: true,
      message: "Transaction created successfully.",
      transaction: rows[0],
    });
  } catch (error) {
    console.error("Create transaction error:", error);

    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "This M-Pesa reference already exists.",
      });
    }

    if (error.code === "23503") {
      return res.status(400).json({
        success: false,
        message: "The supplied member does not exist.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create transaction.",
    });
  }
};

// PATCH /api/transactions/:id/reverse
const reverseTransaction = async (req, res) => {
  const client = await pool.connect();

  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid transaction ID.",
      });
    }

    await client.query("BEGIN");

    const result = await client.query(
      `SELECT id, status FROM transactions WHERE id = $1 FOR UPDATE`,
      [id]
    );

    if (result.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        success: false,
        message: "Transaction not found.",
      });
    }

    if (String(result.rows[0].status).toLowerCase() === "reversed") {
      await client.query("ROLLBACK");

      return res.status(409).json({
        success: false,
        message: "Transaction has already been reversed.",
      });
    }

    const updated = await client.query(
      `UPDATE transactions
       SET status = 'reversed'
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    await client.query("COMMIT");

    return res.status(200).json({
      success: true,
      message: "Transaction reversed successfully.",
      transaction: updated.rows[0],
    });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});

    console.error("Reverse transaction error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to reverse transaction.",
    });
  } finally {
    client.release();
  }
};

module.exports = {
  getAllTransactions,
  getTransactionById,
  createTransaction,
  reverseTransaction,
};
