import express from "express";
import userController from "../controllers/userController.js";
import { validateRequest } from "../middleware/validate.js";
import {
  createUserValidators,
  loginValidators,
} from "../validations/userValidators.js";

const router = express.Router();

router.post(
  "/createUser",
  createUserValidators,
  validateRequest,
  userController.createUser
);

router.post("/login", loginValidators, validateRequest, userController.login);

router.get("/users", userController.listUsers);

export default router;
