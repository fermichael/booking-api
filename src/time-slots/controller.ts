import type { Request, Response } from "express";
import { getTimeSlots, findTimeSlot, addTimeSlot, getAvailableTimeSlots } from "./service";
import { isValidDateTime } from "./validation";

export const listTimeSlots = async (req: Request, res: Response) => {
  try {
    const timeSlots = await getTimeSlots();

    res.status(200).json(timeSlots);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Could not list time slots",
    });
  }
};

export const getTimeSlot = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0 || id > 2147483647) {
    res.status(400).json({
      message: "The ID must be a positive 32-bit integer",
    });
    return;
  }

  try {
    const timeSlot = await findTimeSlot(id);

    if (timeSlot === undefined) {
      res.status(404).json({
        message: "Time slot not found",
      });
      return;
    }
    res.json(timeSlot);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Could not find this time slot",
    });
  }
};

export const createTimeSlot = async (req: Request, res: Response) => {
  const start = req.body?.start;
  const end = req.body?.end;

  if (typeof start !== "string" || typeof end !== "string" || start.trim() === "" || end.trim() === "") {
    res.status(400).json({ message: "Start and end must be non-empty strings" });
    return;
  }

  if (!isValidDateTime(start) || !isValidDateTime(end)) {
    res.status(400).json({ message: "Start and end must be valid ISO 8601 date-times with an explicit time zone" });
    return;
  }

  if (Date.parse(end) <= Date.parse(start)) {
    res.status(400).json({
      message: "End must be after start",
    });
    return;
  }

  try {
    const newTime = await addTimeSlot(start, end);
    if (newTime === "time-slot-conflicted") {
      res.status(409).json({
        message: "This time slot overlaps an existing time slot",
      });
      return;
    }

    res.status(201).json(newTime);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Could not create time slot",
    });
  }
};

export const showAvailableTimeSlots = async (req: Request, res: Response) => {
  try {
    const availableTimeSlots = await getAvailableTimeSlots();
    res.status(200).json(availableTimeSlots);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Could not list available time slots",
    });
  }
};
