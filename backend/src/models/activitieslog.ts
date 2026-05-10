import mongoose, {Schema, Document} from 'mongoose';

export interface IActivityLog extends Document{
    user: Schema.Types.ObjectId; //Who did it?
    action: string; //"Created user", "Registered Student"
    details?: string; //optional additional details
    createdAt: Date;
}

const ActivityLogSchema: Schema<IActivityLog> = new Schema(
    {
        user: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
        action: { type: String, required: true},
        details: { type: String},   
    },
    {
        timestamps: true
    }
);

export default mongoose.model<IActivityLog>(
    'ActivitiesLog', 
    ActivityLogSchema
);