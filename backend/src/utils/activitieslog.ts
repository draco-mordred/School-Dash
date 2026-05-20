import mongoose from "mongoose";
import ActivitiesLog from "../models/activitieslog";

export const logActivity = async ({
    userId,
    action,
    details,
}: {
    userId: string | mongoose.Types.ObjectId;
    action: string;
    details?: string;
}) => {
    // Updateuser isn't working at this point, but lets go on ...
    if (!mongoose.Types.ObjectId.isValid(userId)) {
        console.warn(`Invalid userId: ${userId}`);
        return;
        // act as a guard to check if 'userId' is valid
    }
    try {
        // await ActivitiesLog.create({
        //     user: typeof userId === "string" 
        //       ? new mongoose.Types.ObjectId(userId) 
        //       : userId,
        //     action,
        //     details,
        // });
    } catch (error) {
        console.error(`${error} disrupted activity log.`);
        // res.status(500).json({ message: `Internal server error from ${error}`});
    }
};