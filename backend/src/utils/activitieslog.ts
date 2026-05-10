import ActivitiesLog  from "../models/activitieslog";
import { Schema } from "mongoose";

export const logActivity = async ({
    userId,
    action,
    details,

}: {
    userId: string;
    action: string;
    details?: string;
}) => {
    try {
        await ActivitiesLog.create({
            user: new Schema.Types.ObjectId(userId),
            action,
            details,
        })
    } catch (error) {
        console.error(`${error} disrupted activity log.`);
    }
} 