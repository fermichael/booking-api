import type { Request, Response } from "express";
import type { UserLocals } from "../middleware/require-user";
import { sendEmail } from "../email";
import {
  addUser,
  createPasswordResetToken,
  findUserByEmail,
  findUserById,
  normalizeEmail,
} from "./service";
import * as argon2 from "argon2";

const appUrl = process.env.APP_URL;

if (!appUrl) {
  throw new Error("Configure APP_URL no .env");
}

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
      message: "Name, email and password are required",
    });
    return;
  }

  const normalizedEmail = normalizeEmail(email);
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailPattern.test(normalizedEmail)) {
    res.status(400).json({
      message: "Email must have a valid format",
    });
    return;
  }

  try {
    const newUser = await addUser(name.trim(), normalizedEmail, password);

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

  if (
    typeof email !== "string" ||
    typeof password !== "string" ||
    email.trim() === "" ||
    password.trim() === ""
  ) {
    res.status(400).json({
      message: "Email and password are required",
    });
    return;
  }

  const normalizedEmail = normalizeEmail(email);
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailPattern.test(normalizedEmail)) {
    res.status(400).json({
      message: "Email must have a valid format",
    });
    return;
  }

  try {
    const user = await findUserByEmail(normalizedEmail);

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

export const getCurrentUser = async (req: Request, res: Response<unknown, UserLocals>) => {
  const userId = res.locals.userId;

  try {
    const user = await findUserById(userId);

    if (user === undefined) {
      res.status(404).json({
        message: "User account not found",
      });
      return;
    }

    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Could not load current user",
    });
  }
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

export const requestPasswordReset = async (req: Request, res: Response) => {
  const email = req.body?.email;
  const genericMessage =
    "If this email is registered, we will send a recovery link.";

  if (typeof email !== "string" || email.trim() === "") {
    res.status(400).json({ message: "Email is required" });
    return;
  }

  const normalizedEmail = normalizeEmail(email);
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailPattern.test(normalizedEmail)) {
    res.status(400).json({ message: "Email must have a valid format" });
    return;
  }

  if (normalizedEmail.length > 254) {
    res.status(400).json({ message: "Email is too long" });
    return;
  }

  try {
    const user = await findUserByEmail(normalizedEmail);

    if (user !== undefined) {
      const { token } = await createPasswordResetToken(user.id);
      const resetUrl = `${appUrl}/reset-password?token=${encodeURIComponent(token)}`;

      try {
        await sendEmail(
          user.email,
          "Reset your password",
          `<p>Use this link within 30 minutes: <a href="${resetUrl}">${resetUrl}</a></p>`,
        );
      } catch (error) {
        console.error("Could not send password reset email", error);
      }
    }

    res.status(202).json({ message: genericMessage });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Could not request password reset" });
  }
};