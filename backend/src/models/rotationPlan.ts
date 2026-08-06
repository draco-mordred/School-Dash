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
  spinBase: { type: String },
  spin: { type: String },
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

const isPlainObject = (value: unknown): value is Record<string, any> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const syncRotationPlanMetadata = (doc: any) => {
  const meta = isPlainObject(doc.meta) ? doc.meta : {};
  const postingTimeline = Array.isArray(meta.timeline)
    ? meta.timeline
    : Array.isArray((doc.postings || []).find((posting: any) => isPlainObject(posting?.meta) && Array.isArray(posting.meta.timeline))?.meta?.timeline)
      ? (doc.postings || []).find((posting: any) => isPlainObject(posting?.meta) && Array.isArray(posting.meta.timeline)).meta.timeline
      : [];
  const timeline = Array.isArray(postingTimeline) ? postingTimeline : [];

  doc.meta = {
    ...meta,
    timeline,
    phases: Array.isArray(meta.phases) ? meta.phases : [],
    unvisitedUnits: Array.isArray(meta.unvisitedUnits) ? meta.unvisitedUnits : [],
    unvisitedUnitGroups: Array.isArray(meta.unvisitedUnitGroups) ? meta.unvisitedUnitGroups : [],
  };

  if (Array.isArray(doc.postings)) {
    for (const posting of doc.postings) {
      if (!isPlainObject(posting)) continue;

      const postingMeta = isPlainObject(posting.meta) ? posting.meta : {};
      posting.meta = {
        ...postingMeta,
        timeline,
      };

      if (Array.isArray(posting.groups)) {
        for (let groupIndex = 0; groupIndex < posting.groups.length; groupIndex++) {
          const group = posting.groups[groupIndex];
          if (!isPlainObject(group)) continue;

          const matchingWindows = Array.isArray(timeline)
            ? timeline.filter((window: any) => String(window?.departmentGroupIndex ?? '') === String(groupIndex) && (window?.supervisorId || window?.departmentSupervisorId))
            : [];
          const assignedWindow = matchingWindows[0];
          if (assignedWindow) {
            group.supervisor = assignedWindow.departmentSupervisorId || assignedWindow.supervisorId || group.supervisor;
            group.supervisorName = assignedWindow.departmentSupervisorName || assignedWindow.supervisorName || group.supervisorName;
            group.departmentSupervisor = assignedWindow.departmentSupervisorId || group.departmentSupervisor;
            group.departmentSupervisorName = assignedWindow.departmentSupervisorName || group.departmentSupervisorName;
          }
        }
      }
    }
  }
};

// Use a pre-save hook so Mongoose persists normalized metadata for creates and updates.
// Mongoose can invoke this middleware with either a callback or save-options, so we
// support both forms to avoid runtime crashes during route saves.
RotationPlanSchema.pre('save', function (this: any, next: any, options?: any) {
  this.updatedAt = new Date();
  const done = typeof next === 'function' ? next : (err?: Error) => {
    if (err) throw err;
  };

  try {
    syncRotationPlanMetadata(this);
    done();
  } catch (err) {
    done(err as Error);
  }
});


const RotationPlan =  mongoose.model('RotationPlan', RotationPlanSchema);

export default RotationPlan;