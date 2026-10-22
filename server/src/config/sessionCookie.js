const sameSite = (process.env.SESSION_COOKIE_SAME_SITE || "lax").toLowerCase();
const allowedSameSiteValues = new Set(["lax", "strict", "none"]);

if (!allowedSameSiteValues.has(sameSite)) {
  throw new Error("SESSION_COOKIE_SAME_SITE must be lax, strict, or none");
}

const secure = process.env.NODE_ENV === "production";

if (sameSite === "none" && !secure) {
  throw new Error("SESSION_COOKIE_SAME_SITE=none requires NODE_ENV=production");
}

module.exports = {
  httpOnly: true,
  secure,
  sameSite,
  path: "/",
};
