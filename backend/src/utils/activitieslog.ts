import mongoose from "mongoose";
import ActivitiesLog from "../models/activitieslog";

export const logActivity = async ({
    userId,
    action,
    details,
}: {
    userId: string;
    action: string;
    details?: string;
}) => {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
        console.warn(`Invalid userId: ${userId}`);
        return;
        // act as a guard to check if 'userId' is valid
    }
    try {
        await ActivitiesLog.create({
            user: userId, //used in place of new mongoose.Types.ObjectsId() 
            // Wrapping it in new mongoose.Types.ObjectId() creates a schema type object instead of an actual ObjectId value
            // removing the wrapper lets Mongoose handle the conversation.
            action,
            details,
        });
    } catch (error) {
        console.error(`${error} disrupted activity log.`);
        // res.status(500).json({ message: `Internal server error from ${error}`});
    }
};