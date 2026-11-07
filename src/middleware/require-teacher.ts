import type {Request, Response, NextFunction } from "express";
import type { UserLocals } from "./require-user";
import { findUserById } from "../users/service";



export async function requireTeacher(req: Request, res: Response<unknown, UserLocals>, next: NextFunction) {
    const userId =  res.locals.userId;
    
    const user = await findUserById(userId)
    if(user === undefined) {
        res.status(401).json({
            message: 'User account not found'
        })
        return;
    }

    if(user.role !== "teacher") {
        res.status(403).json({
            message: 'Only teachers can manage time slots'
        })
        return;
    }

    next()
    
   

}
