
const path = require("node:path");

require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const app = require("./app");
const { pool } = require("./config/database");

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await pool.query("SELECT 1");

    app.listen(PORT, () => {
      console.log(`GCMS API running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start GCMS API:", error);
    await pool.end();
    process.exit(1);
  }
}

startServer();
