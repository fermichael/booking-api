import type { Request, Response, NextFunction } from "express";

export type UserLocals = {
  userId: number;
};



export function requireUser(req: Request, res: Response<unknown, UserLocals>, next: NextFunction) {
  if (req.session.userId === undefined) {
    res.status(401).json({
      message: 'Log in to continue',
    });
    return;
  }

  res.locals.userId = req.session.userId;

  next();
}
