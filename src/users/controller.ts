import type { Request, Response } from "express";
import type { UserLocals } from "../middleware/require-user";
import { addUser, findUserByEmail } from "./service";
import * as argon2 from "argon2";

export const createUser = async (req: Request, res: Response) => {
  const name = req.body?.name;
  const email = req.body?.email;
  const password = req.body?.password;

  if (
    typeof name !== "string" ||
    typeof email !== "string" ||
    typeof password !== "string" ||
    name.trim() === "" ||
    email.trim() === "" ||
    password.trim() === ""
  ) {
    res.status(400).json({
      message: "Name, email and password must be non-empty strings",
    });
    return;
  }

  try {
    const newUser = await addUser(name.trim(), email.trim(), password);

    if (newUser === null) {
      res.status(409).json({
        message: "Email already registered",
      });
      return;
    }

    res.status(201).json(newUser);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Could not create user",
    });
  }
};

export const loginUser = async (req: Request, res: Response) => {
  const email = req.body?.email;
  const password = req.body?.password;

  if (typeof email !== "string" || typeof password !== "string" || email.trim() === "" || password.trim() === "") {
    res.status(400).json({
      message: "Email and password must be non-empty strings",
    });
    return;
  }

  try {
    const user = await findUserByEmail(email.trim());

    if (user === undefined) {
      res.status(401).json({
        message: "Invalid email or password",
      });
      return;
    }

    const passwordMatches = await argon2.verify(user.password_hash, password);
    if (passwordMatches === false) {
      res.status(401).json({
        message: "Invalid email or password",
      });
      return;
    }

    req.session.regenerate((error) => {
      if (error) {
        console.error(error);

        res.status(500).json({ message: "Could not complete login" });
        return;
      }

      req.session.userId = user.id;

      res.status(200).json({
        message: "Credentials verified",
      });
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Could not complete login",
    });
  }
};

export const getCurrentUser = (req: Request, res: Response<unknown, UserLocals>) => {
  const userId = res.locals.userId;

  res.json(userId);
};

export const logoutUser = (req: Request, res: Response) => {
  req.session.destroy((error) => {
    if (error) {
      console.error(error);
      res.status(500).json({
        message: "Could not complete logout",
      });
      return;
    }

    res.clearCookie("bookingapi");
    res.status(204).send();
  });
};
