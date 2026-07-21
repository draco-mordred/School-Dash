import RotationPlan from '../models/rotationPlan';

type RunOpts = {
  snapshotTime?: string; // ISO timestamp
  windowIndex?: number;
};

export async function runRotationSnapshot(planId: string, opts: RunOpts = {}) {
  const plan = await RotationPlan.findById(planId);
  if (!plan) throw new Error('RotationPlan not found');

  const timeline = (plan.meta && plan.meta.timeline) || [];
  const snapshotTime = opts.snapshotTime ? new Date(opts.snapshotTime) : new Date();

  let windowsToSnapshot: any[] = [];

  if (typeof opts.windowIndex === 'number') {
    const w = timeline[opts.windowIndex];
    if (!w) throw new Error('Invalid windowIndex');
    windowsToSnapshot = [{ index: opts.windowIndex, window: w }];
  } else {
    // collect windows active at snapshotTime
    for (let i = 0; i < timeline.length; i++) {
      const t = timeline[i];
      const start = new Date(t.startDate);
      const end = new Date(t.endDate);
      if (start <= snapshotTime && snapshotTime < end) {
        windowsToSnapshot.push({ index: i, window: t });
      }
    }
  }

  const snapshot = {
    createdAt: snapshotTime,
    windows: windowsToSnapshot,
  };

  // append snapshot to plan.meta.snapshots
  const meta = plan.meta || {};
  meta.snapshots = Array.isArray(meta.snapshots) ? meta.snapshots : [];
  meta.snapshots.push(snapshot);
  plan.meta = meta;
  await plan.save();

  return snapshot;
}

export default runRotationSnapshot;
