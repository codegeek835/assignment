const { body, check } = require("express-validator");

const usernameRule = body("username")
  .trim()
  .isLength({ min: 1, max: 128 })
  .withMessage("username required");

const passwordRule = body("password")
  .isLength({ min: 8, max: 256 })
  .withMessage("password must be 8-256 characters");

const emailRule = body("email")
  .trim()
  .notEmpty()
  .withMessage("email is required")
  .isLength({ max: 254 })
  .withMessage("email must be at most 254 characters")
  .normalizeEmail()
  .isEmail()
  .withMessage("must be a valid email address");

/** Login: send exactly one of `username` or `email` (plus `password`). */
const loginUsernameOptional = body("username")
  .optional({ values: "falsy" })
  .trim()
  .isLength({ min: 1, max: 128 })
  .withMessage("username must be 1-128 characters");

const loginEmailOptional = body("email")
  .optional({ values: "falsy" })
  .trim()
  .isLength({ max: 254 })
  .withMessage("email must be at most 254 characters")
  .normalizeEmail()
  .isEmail()
  .withMessage("must be a valid email address");

const loginIdentityXor = check().custom((_value, ctx) => {
  const u = ctx.req.body.username;
  const e = ctx.req.body.email;
  const hasU = typeof u === "string" && u.trim().length > 0;
  const hasE = typeof e === "string" && e.trim().length > 0;
  if (!hasU && !hasE) {
    throw new Error("Provide username or email");
  }
  if (hasU && hasE) {
    throw new Error("Provide only one of username or email");
  }
  return true;
});

const createUserValidators = [usernameRule, emailRule, passwordRule];

const loginValidators = [
  loginUsernameOptional,
  loginEmailOptional,
  passwordRule,
  loginIdentityXor,
];

module.exports = {
  createUserValidators,
  loginValidators,
};
