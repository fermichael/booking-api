import { Router } from "express";

import { requireUser } from "../middleware/require-user";
import { createUser, getCurrentUser, loginUser, logoutUser, requestPasswordReset } from "./controller";

export const usersRouter = Router();

usersRouter.post("/users", createUser);

usersRouter.post("/users/login", loginUser);

usersRouter.post("/users/logout", logoutUser);

usersRouter.post("/users/forgot-password", requestPasswordReset);

usersRouter.get("/users/me", requireUser, getCurrentUser);
