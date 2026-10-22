const path = require("node:path");

require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const session = require("express-session");
const pgSession = require("connect-pg-simple")(session);
const errorHandler = require("./middleware/errorHandler");

const { pool } = require("./config/database");
const sessionCookie = require("./config/sessionCookie");
const apiRoutes = require("./routes");

const app = express();
const isProduction = process.env.NODE_ENV === "production";
const clientOrigins = (process.env.CLIENT_ORIGIN || process.env.FRONTEND_URL || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

if (!process.env.SESSION_SECRET) {
  throw new Error("SESSION_SECRET must be configured");
}

if (isProduction && clientOrigins.length === 0) {
  throw new Error("CLIENT_ORIGIN must be configured in production");
}

// Trust the reverse proxy only in deployments that terminate HTTPS upstream.
if (isProduction) {
  app.set("trust proxy", 1);
}
app.use(helmet());
app.use(
  cors({
    origin: clientOrigins.length ? clientOrigins : "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false }));


app.use(
  session({
    store: new pgSession({
      pool,
      tableName: "sessions",
      createTableIfMissing: false,
      pruneSessionInterval: 15 * 60, // Clean expired sessions every 15 minutes
    }),
    name: "transaction.sid",
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      ...sessionCookie,
      maxAge: 30 * 60 * 1000 , // 30 minutes
    },
  })
);


app.use("/api", apiRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "API endpoint not found",
  });
});

app.use(errorHandler);

module.exports = app;
