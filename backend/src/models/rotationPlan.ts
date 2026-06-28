import mongoose, { Schema } from 'mongoose'

const GroupRefSchema = new Schema({
  groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class' },
  group: { type: Schema.Types.Mixed },
  assigned: { type: [ { startDate: Date, endDate: Date } ], default: [] },
  supervisorName: { type: String },
  supervisor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { _id: false });

const PostingSchema = new Schema({
  name: { type: String, required: true },
  category: { type: String },
  startDate: { type: Date },
  endDate: { type: Date },
  groups: { type: [ GroupRefSchema ], default: [] },
  meta: { type: Schema.Types.Mixed, default: {} },
}, { _id: false });

const RotationPlanSchema = new Schema({
  name: { type: String },
  class: { type: mongoose.Schema.Types.ObjectId, ref: 'Class' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  postings: { type: [ PostingSchema ], default: [] },
  groups: { type: [ Schema.Types.Mixed ], default: [] },
  meta: { type: Schema.Types.Mixed, default: {} },
  createdAt: { type: Date, default: () => new Date() },
  updatedAt: { type: Date, default: () => new Date() },
}, { collection: 'rotationplans' });

// Use a synchronous pre-save hook (no args) so Mongoose doesn't pass SaveOptions
RotationPlanSchema.pre('save', function (this: any) {
  this.updatedAt = new Date();
});


const RotationPlan =  mongoose.model('RotationPlan', RotationPlanSchema);

export default RotationPlan;