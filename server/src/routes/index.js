

const express = require("express");
const healthRoutes = require("./healthRoutes");

const router = express.Router();

router.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Welcome to the GCMS API",
    version: "1.0.0",
  });
});

router.use("/health", healthRoutes);

module.exports = router;
