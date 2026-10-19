
const express = require("express");
const { pool } = require("../config/database");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    await pool.query("SELECT 1");

    res.status(200).json({
      success: true,
      message: "GCMS API and database are available",
    });
  } catch (error) {
    console.error("Health check failed:", error.message);

    res.status(503).json({
      success: false,
      message: "Database is unavailable",
    });
  }
});

module.exports = router;
