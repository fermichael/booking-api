import { Router } from "express";

import { cancelBooking, createBooking, listBookings, listTeacherBookings } from "./controller";
import { requireUser } from "../middleware/require-user";
import { requireTeacher } from "../middleware/require-teacher";

export const bookingRouter = Router();

bookingRouter.get("/bookings", requireUser, listBookings);

bookingRouter.get("/teacher/bookings", requireUser, requireTeacher, listTeacherBookings);

bookingRouter.post("/bookings", requireUser, createBooking);

bookingRouter.patch("/bookings/:bookingId", requireUser, cancelBooking);
