import express from "express";
import userController from "../controllers/userController.js";
import { validateRequest } from "../middleware/validate.js";
import { authenticate } from "../middleware/authenticate.js";
import {
  signupValidators,
  loginValidators,
} from "../validations/userValidators.js";

const router = express.Router();

router.post(
  "/signup",
  signupValidators,
  validateRequest,
  userController.signup
);

router.post("/login", loginValidators, validateRequest, userController.login);

router.get("/users", authenticate, userController.listUsers);

export default router;
