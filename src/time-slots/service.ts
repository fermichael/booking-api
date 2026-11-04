import { pool } from "../database";

type TimeSlot = {
  id: number;
  start: Date;
  end: Date;
};

export async function getTimeSlots() {
  const result = await pool.query<TimeSlot>(
    `SELECT id, starts_at AS "start", ends_at AS "end" FROM time_slots ORDER BY id`,
  );
  return result.rows;
}

export async function getAvailableTimeSlots() {
  const result = await pool.query<TimeSlot>(
    `SELECT id, starts_at AS "start", ends_at AS "end"
    FROM time_slots
    WHERE starts_at > CURRENT_TIMESTAMP 
    AND NOT EXISTS(SELECT 1
    FROM bookings
    WHERE bookings.time_slot_id = time_slots.id
    AND bookings.status = 'confirmed')
    ORDER BY id`,
  );

  return result.rows;
}

export async function findTimeSlot(id: number): Promise<TimeSlot | undefined> {
  const result = await pool.query<TimeSlot>(
    `SELECT id, starts_at AS "start", ends_at AS "end"
     FROM time_slots
      WHERE id = $1`,
    [id],
  );
  return result.rows[0];
}

export async function addTimeSlot(start: string, end: string) {
  const conflict = await pool.query(`SELECT id FROM time_slots WHERE $1 < ends_at AND $2 > starts_at`, [start, end]);
  if (conflict.rows.length > 0) {
    return "time-slot-conflicted";
  }

  const createdTimeSlot = await pool.query<TimeSlot>(
    `INSERT INTO time_slots(starts_at, ends_at) VALUES ($1, $2) ON CONFLICT ON CONSTRAINT time_slots_no_overlap DO NOTHING RETURNING id, starts_at AS "start", ends_at AS "end"`,
    [start, end],
  );
  if (createdTimeSlot.rows.length === 0) {
    return "time-slot-conflicted";
  }
  return createdTimeSlot.rows[0];
}
