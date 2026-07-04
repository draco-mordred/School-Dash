import mongoose, { Schema } from 'mongoose';
//types don't need to be defined in the Schema more so herer where we define use as a String instead of objectID
// const ActivityLogSchema: Schema<IActivityLog> = new Schema(
const ActivityLogSchema = new Schema({
    user: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
    action: { type: String, required: true },
    details: { type: String },
}, {
    timestamps: true
});
export default mongoose.model('ActivitiesLog', ActivityLogSchema);
// export const ActivitiesLog = mongoose.model<IActivityLog>('ActivitiesLog', ActivityLogSchema);
