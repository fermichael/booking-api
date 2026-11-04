import type { Request, Response } from "express";
import type { UserLocals } from "../middleware/require-user";
import { addBooking, findBookings, cancelUserBooking } from "./service";

export const createBooking = async (req: Request, res: Response<unknown, UserLocals>) => {
  const userId = res.locals.userId;
  const timeSlotId = req.body?.timeSlotId;

  if (!Number.isInteger(timeSlotId) || timeSlotId <= 0 || timeSlotId > 2147483647) {
    res.status(400).json({
      message: "Time slot ID must be a positive 32-bit integer",
    });
    return;
  }

  try {
    const result = await addBooking(userId, timeSlotId);

    if (result === null) {
      res.status(404).json({
        message: "Time slot not found",
      });
      return;
    }

    if (result === "already-booked") {
      res.status(409).json({
        message: "This time slot is already booked",
      });
      return;
    }

    if (result === "time-slot already started") {
      res.status(409).json({
        message: "This time slot has already started",
      });
      return;
    }

    res.status(201).json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Could not create booking",
    });
  }
};

export const listBookings = async (req: Request, res: Response<unknown, UserLocals>) => {
  try {
    const userId = res.locals.userId;

    const result = await findBookings(userId);
    res.status(200).json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Could not list bookings",
    });
  }
};

export const cancelBooking = async (req: Request, res: Response<unknown, UserLocals>) => {
  const userId = res.locals.userId;
  const bookingId = Number(req.params.bookingId);
  const status = req.body?.status;

  if (!Number.isInteger(bookingId) || bookingId <= 0 || bookingId > 2147483647) {
    res.status(400).json({
      message: "Booking ID must be a positive 32-bit integer",
    });
    return;
  }

  if (status !== "cancelled") {
    res.status(400).json({
      message: "Status must be cancelled",
    });
    return;
  }

  try {
    const result = await cancelUserBooking(bookingId, userId);
    if (result === null) {
      res.status(404).json({
        message: "Booking not found",
      });
      return;
    }

    if (result === "already cancelled") {
      res.status(200).json({
        message: "Booking is already cancelled",
      });
      return;
    }

    if (result === "timeslot not found") {
      res.status(500).json({
        message: "Could not cancel booking",
      });
      return;
    }

    if (result === "class already started") {
      res.status(409).json({
        message: "Cannot cancel a booking after the class has started",
      });
      return;
    }

    res.status(200).json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Could not cancel booking",
    });
  }
};
