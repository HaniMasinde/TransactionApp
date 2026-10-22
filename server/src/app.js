const path = require("node:path");

require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const session = require("express-session");
const pgSession = require("connect-pg-simple")(session);
const errorHandler = require("./middleware/errorHandler");

const { pool } = require("./config/database");
const apiRoutes = require("./routes");

const app = express();

if (!process.env.SESSION_SECRET) {
  throw new Error("SESSION_SECRET must be configured");
}

// Trust the reverse proxy only in deployments that terminate HTTPS upstream.
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}
app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || process.env.FRONTEND_URL,
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
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 60 * 1000 , // 30 minutes
    },
  })
);


app.use("/", apiRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "API endpoint not found",
  });
});

app.use(errorHandler);

module.exports = app;
