"use strict";

const { isTechnicalAdminPassword } = require("../utils/passwordPolicy");

const PHONE_RE = /^\+?[0-9]{9,15}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function rejectUnknownFields(body, allowed) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return "Request body must be an object";
  }

  const unknown = Object.keys(body).filter((key) => !allowed.includes(key));
  return unknown.length
    ? `Unknown field(s): ${unknown.join(", ")}`
    : null;
}

function firstValue(body, names) {
  for (const name of names) {
    if (body[name] !== undefined) return body[name];
  }
  return undefined;
}

function validateRegistration(body) {
  const unknown = rejectUnknownFields(body, [
    "fullName", "full_name", "name",
    "phone", "recoveryEmail", "recovery_email", "email",
    "password"
  ]);
  if (unknown) return unknown;

  const name = firstValue(body, ["fullName", "full_name", "name"]);
  const phone = body.phone;
  const email = firstValue(body, [
    "recoveryEmail", "recovery_email", "email"
  ]);
  const password = body.password;

  if (typeof name !== "string" || name.trim().length < 2 || name.trim().length > 120) {
    return "Full name must be between 2 and 120 characters";
  }

  if (typeof phone !== "string" || !PHONE_RE.test(phone.trim())) {
    return "Enter a valid phone number";
  }

  if (typeof email !== "string" || email.length > 254 || !EMAIL_RE.test(email.trim())) {
    return "Enter a valid recovery email address";
  }

  if (typeof password !== "string" || password.length < 8 || password.length > 40) {
    return "Password must be between 8 and 40 characters";
  }

  if (!/[A-Za-z]/.test(password)) {
    return "Password must include at least one letter";
  }

  if (!/\d/.test(password)) {
    return "Password must include at least one digit";
  }

  if (!/[^A-Za-z0-9\s]/.test(password)) {
    return "Password must include at least one special character";
  }

  return null;
}

function validateLogin(body) {
  const unknown = rejectUnknownFields(body, [
    "phone", "phoneNumber", "phone_number", "password"
  ]);
  if (unknown) return unknown;

  const phone = firstValue(body, ["phone", "phoneNumber", "phone_number"]);
  const password = body.password;

  if (typeof phone !== "string" || !PHONE_RE.test(phone.trim())) {
    return "Enter a valid phone number";
  }

  if (typeof password !== "string" || password.length < 1 || password.length > 40) {
    return "Password is required and must not exceed 40 characters";
  }

  return null;
}

function validateChangePassword(body, req) {
  const unknown = rejectUnknownFields(body, ["currentPassword", "newPassword"]);
  if (unknown) return unknown;

  if (typeof body.currentPassword !== "string" || body.currentPassword.length < 1 || body.currentPassword.length > 128) {
    return "Enter your current password.";
  }

  const password = body.newPassword;
  if (typeof password !== "string" || password.length < 8 || password.length > 40) {
    return "New password must be between 8 and 40 characters.";
  }
  if (req?.user?.role === "technical_admin" && !isTechnicalAdminPassword(password)) {
    return "Technical Administrator passwords must include uppercase and lowercase letters, a digit, and a special character.";
  }
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password) || !/[^A-Za-z0-9\s]/.test(password)) {
    return "New password must include a letter, a number, and a special character.";
  }

  return null;
}

module.exports = {
  validateRegistration,
  validateLogin,
  validateChangePassword,
  rejectUnknownFields
};
