import mongoose, { Schema } from 'mongoose';

const GroupSchema = new Schema({
  groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class' },
  group: { type: Schema.Types.Mixed },
  assigned: { type: [ { startDate: Date, endDate: Date } ], default: [] },
}, { _id: false });

const PostingSchema = new Schema({
  postingName: { type: String, required: true },
  startDate: { type: Date },
  endDate: { type: Date },
  meta: { type: Schema.Types.Mixed, default: {} },
  groups: { type: [GroupSchema], default: [] },
  createdAt: { type: Date, default: () => new Date() },
}, { collection: 'postingsandrotations' });

export default mongoose.model('PostingAndRotation', PostingSchema);
