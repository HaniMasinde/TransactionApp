
const pool = require("../config/db");

const getMemberReport = async (memberId, startDate, endDate) => {
  const conditions = [
    "t.member_id = $1",
    "LOWER(t.status) <> 'reversed'",
  ];

  const values = [memberId];
  let index = 2;

  if (startDate) {
    conditions.push(`t.transaction_date >= $${index++}`);
    values.push(startDate);
  }

  if (endDate) {
    conditions.push(
      `t.transaction_date < ($${index++}::date + INTERVAL '1 day')`
    );
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

  const { rows } = await pool.query(query, values);

  return {
    memberId,
    transactionCount: rows.length,
    totalContributions: rows.reduce(
      (sum, transaction) => sum + Number(transaction.amount || 0),
      0
    ),
    transactions: rows,
  };
};

const getGroupReport = async (startDate, endDate) => {
  const conditions = ["LOWER(t.status) <> 'reversed'"];
  const values = [];
  let index = 1;

  if (startDate) {
    conditions.push(`t.transaction_date >= $${index++}`);
    values.push(startDate);
  }

  if (endDate) {
    conditions.push(
      `t.transaction_date < ($${index++}::date + INTERVAL '1 day')`
    );
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

  const { rows } = await pool.query(query, values);

  return rows[0];
};

module.exports = {
  getMemberReport,
  getGroupReport,
};