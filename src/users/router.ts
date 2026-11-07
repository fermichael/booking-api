import { Router } from "express";

import { createUser, getCurrentUser, loginUser, logoutUser } from "./controller";
import { requireUser } from "../middleware/require-user";

export const usersRouter = Router();

usersRouter.post("/users", createUser);

usersRouter.post("/users/login", loginUser);

usersRouter.post("/users/logout", logoutUser);

usersRouter.get("/users/me", requireUser, getCurrentUser);
