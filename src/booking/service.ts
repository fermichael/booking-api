import { pool } from "../database";
import { findTimeSlot } from "../time-slots/service";

type Booking = {
  bookingId: number;
  studentId: number;
  timeSlotId: number;
  status: "confirmed" | "cancelled";
};

export async function addBooking(userId: number, timeSlotId: number) {
  const foundTimeSlot = await findTimeSlot(timeSlotId);
  if (foundTimeSlot === undefined) {
    return null;
  }
  if (foundTimeSlot.start.getTime() <= Date.now()) {
    return "time-slot already started";
  }
  const occupiedTimeSlot = await pool.query(
    `SELECT time_slot_id FROM bookings WHERE time_slot_id = $1 AND status = 'confirmed'`,
    [timeSlotId],
  );
  if (occupiedTimeSlot.rows.length >= 1) {
    return "already-booked";
  }
  const createdBooking = await pool.query<Booking>(
    `INSERT INTO bookings(student_id, time_slot_id)
     SELECT $1, id FROM time_slots WHERE id = $2 AND starts_at > clock_timestamp()
     ON CONFLICT (time_slot_id) WHERE status = 'confirmed' DO NOTHING
     RETURNING id AS "bookingId", student_id AS "studentId", time_slot_id AS "timeSlotId", status`,
    [userId, timeSlotId],
  );
  if (createdBooking.rows.length === 0) {
    if (foundTimeSlot.start.getTime() <= Date.now()) {
      return "time-slot already started";
    }
    return "already-booked";
  }
  return createdBooking.rows[0];
}

export async function findBookings(userId: number) {
  const foundBookings = await pool.query<Booking>(
    `SELECT id AS "bookingId", student_id AS "studentId", time_slot_id AS "timeSlotId", status FROM bookings WHERE student_id = $1 ORDER BY id`,
    [userId],
  );
  return foundBookings.rows;
}

export async function cancelUserBooking(bookingId: number, userId: number) {
  const result = await pool.query<Pick<Booking, "status" | "timeSlotId"> & { id: number }>(
    `SELECT id, status, time_slot_id AS "timeSlotId" FROM bookings WHERE id = $1 AND student_id = $2`,
    [bookingId, userId],
  );
  if (result.rows.length === 0) {
    return null;
  }

  const booking = result.rows[0];

  if (booking.status === "cancelled") {
    return "already cancelled";
  }

  const timeSlot = await findTimeSlot(booking.timeSlotId);

  if (timeSlot === undefined) {
    return "timeslot not found";
  }

  if (timeSlot.start.getTime() <= Date.now()) {
    return "class already started";
  }

  const cancelledBooking = await pool.query<Booking>(
    `UPDATE bookings SET status = 'cancelled'
     WHERE id = $1 AND student_id = $2 AND status = 'confirmed'
       AND EXISTS (
         SELECT 1 FROM time_slots
         WHERE time_slots.id = bookings.time_slot_id AND starts_at > clock_timestamp()
       )
     RETURNING id AS "bookingId", student_id AS "studentId", time_slot_id AS "timeSlotId", status`,
    [bookingId, userId],
  );
  if (cancelledBooking.rows.length === 0) {
    return timeSlot.start.getTime() <= Date.now() ? "class already started" : "already cancelled";
  }
  return cancelledBooking.rows[0];
}
