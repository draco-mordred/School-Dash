// One-time database migrations that are safe to run on every boot:
// each step inspects live state and does nothing when already applied.

import mongoose from "mongoose";

/**
 * PR C follow-up — the checkinTime TTL index was changed to a pending-only
 * partial index (expireAfterSeconds 7d, partialFilterExpression
 * { syncStatus: "pending" }). MongoDB never replaces an index that keeps
 * the same auto-generated name ("checkinTime_1"), so deployments that
 * previously created the UNFILTERED version still carry an index that
 * deletes ALL proximity checkins after 7 days — the audit trail
 * (verified/rejected/failed rows) included.
 *
 * This migration replaces the manual Atlas step
 *   db.proximitycheckins.dropIndex("checkinTime_1")
 * : if that index exists WITHOUT the partial filter, it is dropped and
 * mongoose recreates it from the schema on the next syncIndexes pass.
 * Idempotent: when the current (partial) index is in place, this is a no-op.
 */
export const ensureProximityTtlIndexCurrent = async (): Promise<void> => {
  try {
    const connection = mongoose.connection;
    if (connection.readyState !== 1) {
      console.warn("[migrate] no active DB connection — skipping TTL index check");
      return;
    }

    const collection = connection.collection("proximitycheckins");
    const indexes = await collection.indexes();
    const stale = indexes.find(
      (idx) =>
        idx.name === "checkinTime_1" &&
        !idx.partialFilterExpression
    );

    if (!stale) {
      return; // already migrated (or never had the unfiltered index)
    }

    console.warn(
      "[migrate] dropping stale unfiltered TTL index checkinTime_1 " +
        "(deleted ALL checkins after 7 days); mongoose will recreate it " +
        "with the pending-only partial filter"
    );
    await collection.dropIndex("checkinTime_1");
    console.log("[migrate] stale TTL index dropped");
  } catch (err) {
    // Non-fatal: a failure here must never block server startup.
    console.warn("[migrate] proximity TTL index migration failed:", err);
  }
};
