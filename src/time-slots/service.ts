import { pool } from "../database";

type TimeSlot = {
  id: number;
  start: Date;
  end: Date;
};

export async function getTimeSlots(teacherId: number) {
  
  const result = await pool.query<TimeSlot>(
    `SELECT id, starts_at AS "start", ends_at AS "end", teacher_id AS "teacherId" FROM time_slots WHERE teacher_id = $1 ORDER BY id`, [teacherId],
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

export async function findTeacherTimeSlot(id: number, teacherId: number) {
 const result = await pool.query(`SELECT id, starts_at AS "start", ends_at AS "end", teacher_id AS "teacherId" FROM time_slots WHERE id = $1 AND teacher_id = $2`, [id, teacherId])
 return result.rows[0];
}

export async function addTimeSlot(start: string, end: string, teacherId: number) {
  const conflict = await pool.query(`SELECT id FROM time_slots WHERE $1 < ends_at AND $2 > starts_at AND teacher_id = $3`, [start, end, teacherId]);
  if (conflict.rows.length > 0) {
    return "time-slot-conflicted";
  }

  const createdTimeSlot = await pool.query<TimeSlot>(
    `INSERT INTO time_slots(starts_at, ends_at, teacher_id) VALUES ($1, $2, $3) ON CONFLICT ON CONSTRAINT time_slots_no_overlap_per_teacher DO NOTHING RETURNING id, starts_at AS "start", ends_at AS "end"`,
    [start, end, teacherId],
  );
  if (createdTimeSlot.rows.length === 0) {
    return "time-slot-conflicted";
  }
  return createdTimeSlot.rows[0];
}

export async function changeTimeSlot (start: string, end: string, id: number, teacherId: number) {
  const teacherOwner = await pool.query(`
    SELECT id
    FROM time_slots
    WHERE id = $1
    AND teacher_id = $2`,[id, teacherId])

    if(teacherOwner.rows.length === 0) {
      return undefined
    }
  
  const conflictedTimeSlot = await pool.query(`
    SELECT 1
    FROM bookings
    WHERE time_slot_id = $1
    AND status = 'confirmed'`, [id]);

    if(conflictedTimeSlot.rows.length > 0) {
      return 'has-confirmed-booking'
    }
  
  try{
  const updatedTimeSlot = await pool.query(`
    UPDATE time_slots
    SET starts_at = $1, ends_at = $2
    WHERE id = $3 AND teacher_id = $4
    RETURNING id, starts_at AS "start", ends_at AS "end";`, [start, end, id, teacherId])
    return updatedTimeSlot.rows[0]
    
  } catch (error) {
    console.error(error);

    const code = typeof error === "object" && error !== null && "code" in error && typeof error.code === "string" ? error.code : undefined;
    if(code === "23P01") {
      return "time-slot-conflicted"
    }
    throw error;
  }
}