const express = require("express");
const userController = require("../controllers/userController");
const { validateRequest } = require("../middleware/validate");
const {
  createUserValidators,
  loginValidators,
} = require("../validations/userValidators");

const router = express.Router();

router.post(
  "/createUser",
  createUserValidators,
  validateRequest,
  userController.createUser
);

router.post(
  "/login",
  loginValidators,
  validateRequest,
  userController.login
);

router.get("/users", userController.listUsers);

module.exports = router;
