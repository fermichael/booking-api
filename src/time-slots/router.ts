import { Router } from "express";

import { requireTeacher } from "../middleware/require-teacher";
import { requireUser } from "../middleware/require-user";
import {
  alterTimeSlots,
  createTimeSlot,
  getTeacherTimeSlot,
  getTimeSlot,
  listTimeSlots,
  removeTimeSlot,
  showAvailableTimeSlots,
} from "./controller";

export const timeSlotsRouter = Router();

timeSlotsRouter.get("/time-slots", requireUser, requireTeacher, listTimeSlots);

timeSlotsRouter.get("/time-slots/available", showAvailableTimeSlots);

timeSlotsRouter.get("/time-slots/teacher/:id", requireUser, requireTeacher, getTeacherTimeSlot)

timeSlotsRouter.get("/time-slots/:id", getTimeSlot);

timeSlotsRouter.post("/time-slots", requireUser, requireTeacher, createTimeSlot);

timeSlotsRouter.patch("/time-slots/:id",requireUser, requireTeacher, alterTimeSlots)

timeSlotsRouter.delete("/time-slots/:id", requireUser, requireTeacher, removeTimeSlot);
