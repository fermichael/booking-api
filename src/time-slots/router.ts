import { Router } from "express";

import { createTimeSlot, getTimeSlot, listTimeSlots, showAvailableTimeSlots } from "./controller";

export const timeSlotsRouter = Router();

timeSlotsRouter.get("/time-slots", listTimeSlots);

timeSlotsRouter.get("/time-slots/available", showAvailableTimeSlots);

timeSlotsRouter.get("/time-slots/:id", getTimeSlot);

timeSlotsRouter.post("/time-slots", createTimeSlot);
