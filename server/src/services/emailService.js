"use strict";

const nodemailer = require("nodemailer");

function getEmailFrom() {
  if (String(process.env.SMTP_HOST || "").toLowerCase() === "smtp.gmail.com") {
    return process.env.SMTP_USER;
  }

  return process.env.EMAIL_FROM;
}

function createTransporter() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass || !getEmailFrom()) {
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

async function sendEmailVerificationCode(email, code) {
  const transporter = createTransporter();

  const info = await transporter.sendMail({
    from: getEmailFrom(),
    to: email,
    subject: "Verify your email for GCMS",
    text: [
      "Your GCMS email verification code is:",
      "",
      code,
      "",
      "This code expires in 10 minutes.",
    ].join("\n"),
  });

  console.log("GCMS verification email delivery result:", {
    recipient: email,
    accepted: info.accepted,
    rejected: info.rejected,
    response: info.response,
    messageId: info.messageId,
  });

  const accepted = (info.accepted || []).some((recipient) => {
    const address =
      typeof recipient === "string"
        ? recipient
        : recipient.address;

    return address?.toLowerCase() === email.toLowerCase();
  });

  if (!accepted) {
    throw new Error(
      `SMTP server did not accept the verification email for ${email}.`
    );
  }
}


async function sendPasswordResetEmail(email, resetUrl) {
  const transporter = createTransporter();

  await transporter.sendMail({
    from: getEmailFrom(),
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

module.exports = {
  sendPasswordResetEmail,
  sendEmailVerificationCode
};
