import express from "express";
import type { ErrorRequestHandler } from "express";
import session from "express-session";
import "dotenv/config";

import { bookingRouter } from "./booking/router";
import { timeSlotsRouter } from "./time-slots/router";
import { usersRouter } from "./users/router";

const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret) {
  throw new Error("Configure SESSION_SECRET in .env");
}

export const app = express();

app.use(express.json());
app.use(
  session({
    name: "bookingapi",
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: "lax" },
  }),
);

app.use(timeSlotsRouter);
app.use(usersRouter);
app.use(bookingRouter);

app.get("/health", (req, res) => {
  res.json({ message: 'Running' });
});

app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

const handleError: ErrorRequestHandler = (error, req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }

  if (error.type === "entity.parse.failed") {
    res.status(400).json({ message: 'Request body must contain valid JSON' });
    return;
  }

  if (error.type === "entity.too.large") {
    res.status(413).json({ message: 'Request body is too large' });
    return;
  }

  console.error(error);
  res.status(500).json({ message: 'An unexpected error occurred' });
};

app.use(handleError);
