"use strict";

const nodemailer = require("nodemailer");

function createTransporter() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass || !process.env.EMAIL_FROM) {
    throw new Error("SMTP email configuration is incomplete.");
  }

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("SMTP_PORT is invalid.");
  }

  return nodemailer.createTransport({
    host,
    port,
    secure:
      String(process.env.SMTP_SECURE || "").toLowerCase() === "true" ||
      port === 465,
    auth: { user, pass },
  });
}

async function sendPasswordResetEmail(email, resetUrl) {
  const transporter = createTransporter();

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: email,
    subject: "Reset your GCMS password",
    text: [
      "We received a request to reset your GCMS password.",
      "",
      `Use this link to choose a new password: ${resetUrl}`,
      "",
      "This link expires soon and can only be used once.",
      "If you did not request this, you can ignore this email.",
    ].join("\n"),
    html: `
      <p>We received a request to reset your GCMS password.</p>
      <p><a href="${resetUrl}">Reset your password</a></p>
      <p>This link expires soon and can only be used once.</p>
      <p>If you did not request this, you can ignore this email.</p>
    `,
  });
}

module.exports = { sendPasswordResetEmail };
