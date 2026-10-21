
const express = require("express");
const router = express.Router();

const authRoutes = require("./authRoutes");
const adminRoutes = require("./adminRoutes");
const memberRoutes = require("./memberRoutes");
const transactionRoutes = require("./transactionRoutes");
const healthRoutes = require("./healthRoutes");
const dashboardRoutes = require("./dashboardRoutes");
const reportRoutes = require("./reportRoutes");
const notificationRoutes = require("./notificationRoutes");
const groupRulesRoutes = require("./groupRulesRoutes");
const meetingRoutes = require("./meetingRoutes");
const meetingMinutesRoutes = require("./meetingMinutesRoutes");
const auditRoutes = require("./auditRoutes");
const groupMembershipRoutes = require("./groupMembershipRoutes");
const settingsRoutes = require("./settingsRoutes");
const technicalAdminRoutes = require("./technicalAdminRoutes");

router.use("/auth", authRoutes);
router.use("/admin", adminRoutes);
router.use("/members", memberRoutes);
router.use("/transactions", transactionRoutes);
router.use("/health", healthRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/reports", reportRoutes);
router.use("/notifications", notificationRoutes);
router.use("/group-rules", groupRulesRoutes);
router.use("/meetings", meetingRoutes);
router.use("/meeting-minutes", meetingMinutesRoutes);
router.use("/audit", auditRoutes);
router.use("/group-memberships", groupMembershipRoutes);
router.use("/settings", settingsRoutes);
router.use("/technical-admin", technicalAdminRoutes);

module.exports = router;
