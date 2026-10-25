import { describe, expect, test } from "bun:test";
import {
  computeLectureWindow,
  planLectureSessionsForDay,
} from "../src/subs/latifah/lectureSessionScheduler";
import {
  evaluateProximity,
  haversineMeters,
} from "../src/subs/latifah/proximityVerification";

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;

// Local-time date constructors keep these TZ-independent (the scheduler
// itself interprets period times in the server-local timezone).
const monday = new Date(2026, 9, 26);

describe("computeLectureWindow (D1/D2)", () => {
  test("2-hour lecture: trigger at 75%, close at end + 5 min, reminder 1h before", () => {
    const w = computeLectureWindow("08:00", "10:00", monday);
    expect(w).not.toBeNull();
    const duration = w!.lectureEnd.getTime() - w!.lectureStart.getTime();
    expect(duration).toBe(2 * HOUR_MS);
    // 75% of 2h = 90min -> 09:30
    expect(w!.triggerAt.getHours()).toBe(9);
    expect(w!.triggerAt.getMinutes()).toBe(30);
    expect(
      w!.triggerAt.getTime() - w!.lectureStart.getTime(),
    ).toBe(Math.round(duration * 0.75));
    // close = lecture end + 5 min -> 10:05
    expect(w!.closesAt.getTime() - w!.lectureEnd.getTime()).toBe(5 * MINUTE_MS);
    expect(w!.closesAt.getHours()).toBe(10);
    expect(w!.closesAt.getMinutes()).toBe(5);
    // reminder = start - 1h -> 07:00
    expect(w!.reminderAt.getTime()).toBe(w!.lectureStart.getTime() - HOUR_MS);
    expect(w!.reminderAt.getHours()).toBe(7);
  });

  test("1-hour lecture: trigger at 45 minutes", () => {
    const w = computeLectureWindow("08:00", "09:00", monday);
    expect(w).not.toBeNull();
    const duration = w!.lectureEnd.getTime() - w!.lectureStart.getTime();
    expect(w!.triggerAt.getTime() - w!.lectureStart.getTime()).toBe(
      Math.round(duration * 0.75),
    );
    expect(w!.triggerAt.getHours()).toBe(8);
    expect(w!.triggerAt.getMinutes()).toBe(45);
    expect(w!.closesAt.getMinutes()).toBe(5); // 09:05
  });

  test("rounds the 75% trigger to the nearest minute boundary of ms math", () => {
    // 50-minute lecture: 75% = 37.5min -> 37.5min in ms exactly
    const w = computeLectureWindow("08:10", "09:00", monday);
    expect(w).not.toBeNull();
    expect(
      w!.triggerAt.getTime() - w!.lectureStart.getTime(),
    ).toBe(Math.round(50 * MINUTE_MS * 0.75));
  });

  test("rejects malformed times", () => {
    expect(computeLectureWindow("25:00", "26:00", monday)).toBeNull();
    expect(computeLectureWindow("8am", "10:00", monday)).toBeNull();
    expect(computeLectureWindow("", "10:00", monday)).toBeNull();
  });

  test("rejects zero/negative and overnight lectures", () => {
    expect(computeLectureWindow("10:00", "10:00", monday)).toBeNull();
    expect(computeLectureWindow("14:00", "12:00", monday)).toBeNull();
    expect(computeLectureWindow("22:00", "02:00", monday)).toBeNull();
  });

  test("accepts single-digit hour formats (legacy timetable data)", () => {
    const w = computeLectureWindow("8:00", "10:00", monday);
    expect(w).not.toBeNull();
    expect(w!.lectureStart.getHours()).toBe(8);
  });
});

describe("haversineMeters", () => {
  test("zero distance for identical points", () => {
    expect(haversineMeters(6.5244, 3.3792, 6.5244, 3.3792)).toBe(0);
  });

  test("one degree of latitude is about 111 km", () => {
    const d = haversineMeters(0, 0, 1, 0);
    expect(d).toBeGreaterThan(110000);
    expect(d).toBeLessThan(112500);
  });

  test("one degree of longitude at the equator is about 111 km", () => {
    const d = haversineMeters(0, 0, 0, 1);
    expect(d).toBeGreaterThan(110000);
    expect(d).toBeLessThan(112500);
  });

  test("roughly 111 m per 0.001 degree of latitude (Lagos)", () => {
    const d = haversineMeters(6.5244, 3.3792, 6.5254, 3.3792);
    expect(d).toBeGreaterThanOrEqual(100);
    expect(d).toBeLessThanOrEqual(125);
  });

  test("returns an integer (rounded metres)", () => {
    expect(Number.isInteger(haversineMeters(6.5, 3.3, 6.6, 3.4))).toBe(true);
  });
});

describe("evaluateProximity (D2 verdict order)", () => {
  const session = (over: any = {}) => ({
    venueSnapshot: { radiusMeters: 150 },
    lecturerCheckIn: { at: new Date("2026-10-26T09:00:00Z"), verified: true },
    ...over,
  });
  const present = (prox: any) => ({ status: "present", proximity: prox });

  test("self-declared absent is verified without GPS corroboration", () => {
    const v = evaluateProximity(
      { status: "absent", proximity: {} },
      session(),
    );
    expect(v.verificationStatus).toBe("verified");
    expect(v.markRecordUnverified).toBe(false);
    expect(v.provisional).toBe(false);
  });

  test("no student coords -> unverified, record flagged", () => {
    const v = evaluateProximity(present({}), session());
    expect(v.verificationStatus).toBe("unverified");
    expect(v.markRecordUnverified).toBe(true);
    expect(v.provisional).toBe(false);
  });

  test("missing distance -> unverified even with coords", () => {
    const v = evaluateProximity(
      present({ studentLat: 6.52, studentLng: 3.37 }),
      session(),
    );
    expect(v.verificationStatus).toBe("unverified");
    expect(v.markRecordUnverified).toBe(true);
  });

  test("out of venue radius -> out-of-range, Present flipped to unverified", () => {
    const v = evaluateProximity(
      present({ studentLat: 6.52, studentLng: 3.37, distanceMeters: 400 }),
      session(),
    );
    expect(v.verificationStatus).toBe("out-of-range");
    expect(v.markRecordUnverified).toBe(true);
    expect(v.provisional).toBe(false);
  });

  test("distance exactly at the radius passes (boundary is inclusive)", () => {
    const v = evaluateProximity(
      present({ studentLat: 6.52, studentLng: 3.37, distanceMeters: 150 }),
      session(),
    );
    expect(v.verificationStatus).toBe("verified");
  });

  test("in range but lecturer not checked in -> provisional lecturer-absent", () => {
    const v = evaluateProximity(
      present({ studentLat: 6.52, studentLng: 3.37, distanceMeters: 40 }),
      session({ lecturerCheckIn: { at: null, verified: false } }),
    );
    expect(v.verificationStatus).toBe("lecturer-absent");
    expect(v.provisional).toBe(true);
    expect(v.markRecordUnverified).toBe(false);
  });

  test("lecturer checked in but not verified still counts as absent", () => {
    const v = evaluateProximity(
      present({ studentLat: 6.52, studentLng: 3.37, distanceMeters: 40 }),
      session({ lecturerCheckIn: { at: new Date(), verified: false } }),
    );
    expect(v.verificationStatus).toBe("lecturer-absent");
  });

  test("in range + lecturer verified -> verified", () => {
    const v = evaluateProximity(
      present({ studentLat: 6.52, studentLng: 3.37, distanceMeters: 40 }),
      session(),
    );
    expect(v.verificationStatus).toBe("verified");
    expect(v.provisional).toBe(false);
    expect(v.markRecordUnverified).toBe(false);
  });

  test("falls back to the 150 m default radius when the snapshot lacks one", () => {
    const v = evaluateProximity(
      present({ studentLat: 6.52, studentLng: 3.37, distanceMeters: 200 }),
      session({ venueSnapshot: {} }),
    );
    expect(v.verificationStatus).toBe("out-of-range");
  });

  test("respects a custom per-venue radius", () => {
    const v = evaluateProximity(
      present({ studentLat: 6.52, studentLng: 3.37, distanceMeters: 200 }),
      session({ venueSnapshot: { radiusMeters: 300 } }),
    );
    expect(v.verificationStatus).toBe("verified");
  });
});

describe("planLectureSessionsForDay weekend guard", () => {
  test("Saturday short-circuits before any DB access", async () => {
    const result = await planLectureSessionsForDay(new Date(2026, 9, 31));
    expect(result.weekend).toBe(true);
    expect(result.created).toBe(0);
  });

  test("Sunday short-circuits before any DB access", async () => {
    const result = await planLectureSessionsForDay(new Date(2026, 10, 1));
    expect(result.weekend).toBe(true);
    expect(result.created).toBe(0);
  });
});
