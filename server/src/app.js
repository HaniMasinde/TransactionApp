

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

const apiRoutes = require("./routes");

const app = express();

app.use(helmet());

app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  })
);

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false }));

app.use("/api", apiRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "API endpoint not found",
  });
});

app.use((error, req, res, next) => {
  console.error("Unhandled request error:", error);

  res.status(500).json({
    success: false,
    message: "Internal server error",
  });
});

module.exports = app;
