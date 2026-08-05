import SupervisorPool from '../../models/supervisorPool';
import mongoose from 'mongoose';

export async function selectSupervisorRoundRobin(key: string, candidateIds: string[]) {
  if (!key) return null;
  if (!Array.isArray(candidateIds) || candidateIds.length === 0) return null;

  // Ensure candidateIds are ObjectIds
  const objIds = candidateIds.map((id) => new mongoose.Types.ObjectId(id));

  let pool = await SupervisorPool.findOne({ key });
  if (!pool) {
    pool = await SupervisorPool.create({ key, candidates: objIds, pointer: 0 });
  } else {
    // Ensure pool candidates match current candidates (replace if different)
    const poolIds = (pool.candidates || []).map((c: any) => String(c));
    const incomingIds = candidateIds.map(String);
    if (poolIds.length !== incomingIds.length || poolIds.some((p: string, i: number) => p !== incomingIds[i])) {
      pool.candidates = objIds;
      pool.pointer = 0;
    }
  }

  const idx = pool.pointer % pool.candidates.length;
  const selected = String(pool.candidates[idx]);
  pool.pointer = (pool.pointer + 1) % pool.candidates.length;
  pool.updatedAt = new Date();
  await pool.save();
  return selected;
}
