import { Router } from "express";

import { requireUser } from "../middleware/require-user";
import {
  createUser,
  getCurrentUser,
  loginUser,
  logoutUser,
  requestPasswordReset,
  resetPassword,
} from "./controller";

export const usersRouter = Router();

usersRouter.post("/users", createUser);

usersRouter.post("/users/login", loginUser);

usersRouter.post("/users/logout", logoutUser);

usersRouter.post("/users/forgot-password", requestPasswordReset);

usersRouter.post("/users/reset-password", resetPassword);

usersRouter.get("/users/me", requireUser, getCurrentUser);
