import { Router } from "express";

import { cancelBooking, createBooking, listBookings } from "./controller";
import { requireUser } from "../middleware/require-user";

export const bookingRouter = Router();

bookingRouter.get("/bookings", requireUser, listBookings);

bookingRouter.post("/bookings", requireUser, createBooking);

bookingRouter.patch("/bookings/:bookingId", requireUser, cancelBooking);
