import SupervisorPool from '../../models/supervisorPool';
import mongoose from 'mongoose';

export async function selectSupervisorRoundRobin(key: string, candidateIds: string[]) {
  if (!key) return null;
  if (!Array.isArray(candidateIds) || candidateIds.length === 0) return null;

  const normalizedCandidates: any[] = candidateIds.map((id) => {
    if (!id) return null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      return new mongoose.Types.ObjectId(id);
    }
    return String(id);
  }).filter((value): value is string => typeof value === 'string');

  if (normalizedCandidates.length === 0) return null;

  let pool = await SupervisorPool.findOne({ key });
  if (!pool) {
    pool = await SupervisorPool.create({ key, candidates: normalizedCandidates, pointer: 0 });
  } else {
    const poolIds = (pool.candidates || []).map((c: any) => String(c));
    const incomingIds = candidateIds.map(String);
    if (poolIds.length !== incomingIds.length || poolIds.some((p: string, i: number) => p !== incomingIds[i])) {
      pool.candidates = normalizedCandidates;
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
