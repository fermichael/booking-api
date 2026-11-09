import type { Request, Response } from "express";
import {
  getTimeSlots,
  findTimeSlot,
  addTimeSlot,
  getAvailableTimeSlots,
  findTeacherTimeSlot,
  changeTimeSlot,
  deleteTimeSlot,
} from "./service";
import { isValidDateTime } from "./validation";

export const listTimeSlots = async (req: Request, res: Response) => {
  const teacherId = res.locals.userId
  try {
    const timeSlots = await getTimeSlots(teacherId);

    res.status(200).json(timeSlots);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: 'Could not list time slots',
    });
  }
};

export const getTimeSlot = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0 || id > 2147483647) {
    res.status(400).json({
      message: 'The ID must be a positive integer',
    });
    return;
  }

  try {
    const timeSlot = await findTimeSlot(id);

    if (timeSlot === undefined) {
      res.status(404).json({
        message: 'Time slot not found',
      });
      return;
    }
    res.json(timeSlot);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: 'Could not find this time slot',
    });
  }
};

export const getTeacherTimeSlot = async (req: Request, res: Response) => {
  const id = Number(req.params.id) 
  const teacherId = res.locals.userId

    if (!Number.isInteger(id) || id <= 0 || id > 2147483647) {
    res.status(400).json({
      message: 'The ID must be a positive integer',
    });
    return;
  }

  try{
  const teacherTimeSlot = await findTeacherTimeSlot(id, teacherId)

  if(teacherTimeSlot === undefined) {
    res.status(404).json({
      message: 'Time slot not found'
    })
    return;
  }
  res.status(200).json(teacherTimeSlot)
  } catch (error) {
    console.error(error)
    res.status(500).json({
      message: 'Could not find this time slot'
      })
  }
}
export const createTimeSlot = async (req: Request, res: Response) => {
  const start = req.body?.start;
  const end = req.body?.end;
  const teacherId = res.locals.userId

  if (typeof start !== "string" || typeof end !== "string" || start.trim() === "" || end.trim() === "") {
    res.status(400).json({ message: 'Start and end are required' });
    return;
  }

  if (!isValidDateTime(start) || !isValidDateTime(end)) {
    res.status(400).json({ message: 'Enter valid start and end dates with their times' });
    return;
  }

  if (Date.parse(end) <= Date.parse(start)) {
    res.status(400).json({
      message: 'End must be after start',
    });
    return;
  }

  try {
    const newTime = await addTimeSlot(start, end, teacherId);

    if (newTime === "time-slot-conflicted") {
      res.status(409).json({
        message: 'This time slot overlaps an existing time slot',
      });
      return;
    }

    res.status(201).json(newTime);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: 'Could not create time slot',
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
      message: 'Could not list available time slots',
    });
  }
};

export const alterTimeSlots = async (req: Request, res: Response) => {
  const start = req.body?.start;
  const end = req.body?.end;
  const id = Number(req.params.id);
  const teacherId = res.locals.userId;

  if (!Number.isInteger(id) || id <= 0 || id > 2147483647) {
    res.status(400).json({
      message: 'The ID must be a positive integer',
    });
    return;
  }

  if (typeof start !== "string" || typeof end !== "string" || start.trim() === "" || end.trim() === "") {
    res.status(400).json({
      message: 'Start and end are required',
    });
    return;
  }

  if (!isValidDateTime(start) || !isValidDateTime(end)) {
    res.status(400).json({
      message: 'Enter valid start and end dates with their times',
    });
    return;
  }

  if (Date.parse(end) <= Date.parse(start)) {
    res.status(400).json({
      message: 'End must be after start'
    })
    return;
  }

  try {
    const alteredTimeSlot = await changeTimeSlot(start, end, id, teacherId);

        if(alteredTimeSlot === 'has-confirmed-booking') {
      res.status(409).json({
        message: 'This time slot has a confirmed booking'
      })
      return;
    }

    if(alteredTimeSlot === "time-slot-conflicted") {
      res.status(409).json({
        message: 'This time slot overlaps an existing time slot'
      })
      return;
    }
    if (alteredTimeSlot === undefined) {
      res.status(404).json({
        message: 'Time slot not found',
      });
      return;
    }
    

    res.status(200).json(alteredTimeSlot);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: 'Could not update time slot',
    });
  }

};

export const removeTimeSlot = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const teacherId = res.locals.userId;

  if (!Number.isInteger(id) || id <= 0 || id > 2147483647) {
    res.status(400).json({
      message: 'The ID must be a positive integer',
    });
    return;
  }

  try {
    const deletedTimeSlot = await deleteTimeSlot(id, teacherId);

    if (deletedTimeSlot === 'has-bookings') {
      res.status(409).json({
        message: 'Cannot delete a time slot with bookings',
      });
      return;
    }

    if (deletedTimeSlot === undefined) {
      res.status(404).json({
        message: 'Time slot not found',
      });
      return;
    }

    res.status(204).send();
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: 'Could not delete time slot',
    });
  }
};
