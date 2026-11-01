import { describe, expect, test } from "bun:test";
import {
  buildCheckinDedupeQuery,
  evaluateCheckinProximity,
  haversineMeters,
  pickTarget,
} from "../src/utils/checkinProximity";

// JUTH Lamingo campus seed (PR B)
const JUTH = { lat: 9.87589, lng: 8.8834 };
const juthTarget = {
  name: "Institution campus",
  lat: JUTH.lat,
  lng: JUTH.lng,
  radiusMeters: 1000,
  source: "institution_campus" as const,
};

describe("haversineMeters", () => {
  test("zero distance for identical points", () => {
    expect(haversineMeters(JUTH.lat, JUTH.lng, JUTH.lat, JUTH.lng)).toBe(0);
  });

  test("approximates ~111 m per 0.001 degree of latitude", () => {
    const distance = haversineMeters(JUTH.lat, JUTH.lng, JUTH.lat + 0.001, JUTH.lng);
    expect(distance).toBeGreaterThan(100);
    expect(distance).toBeLessThan(122);
  });

  test("long distances are plausible (JUTH -> Lagos)", () => {
    const distance = haversineMeters(JUTH.lat, JUTH.lng, 6.5244, 3.3792);
    expect(distance).toBeGreaterThan(250000);
    expect(distance).toBeLessThan(350000);
  });
});

describe("pickTarget", () => {
  test("skips invalid candidates and picks the first valid one in priority order", () => {
    const picked = pickTarget([
      null,
      { name: "bad", lat: Number.NaN, lng: 0, radiusMeters: 100, source: "class_default" },
      { name: "Class default", lat: 9.875, lng: 8.883, radiusMeters: 150, source: "class_default" },
      juthTarget,
    ]);
    expect(picked?.name).toBe("Class default");
  });

  test("returns null when nothing is configured", () => {
    expect(pickTarget([null, undefined])).toBeNull();
  });
});

describe("evaluateCheckinProximity", () => {
  test("gps-method checkin without student GPS is unverified", () => {
    const verdict = evaluateCheckinProximity({
      studentGps: null,
      target: juthTarget,
      checkinMethod: "gps",
    });
    expect(verdict.status).toBe("unverified");
    expect(verdict.isWithinRange).toBe(false);
    expect(verdict.distanceFromTarget).toBeNull();
  });

  test("qr checkin without GPS still verifies (QR is its own proof) with null distance", () => {
    const verdict = evaluateCheckinProximity({
      studentGps: null,
      target: juthTarget,
      checkinMethod: "qr_code",
    });
    expect(verdict.status).toBe("verified");
    expect(verdict.distanceFromTarget).toBeNull();
  });

  test("no resolvable target -> pending + admin flag", () => {
    const verdict = evaluateCheckinProximity({
      studentGps: { latitude: JUTH.lat, longitude: JUTH.lng },
      target: null,
      checkinMethod: "gps",
    });
    expect(verdict.status).toBe("pending");
    expect(verdict.needsAdminFlag).toBe(true);
  });

  test("student at the campus seed is verified within radius", () => {
    const verdict = evaluateCheckinProximity({
      studentGps: { latitude: JUTH.lat + 0.001, longitude: JUTH.lng }, // ~111 m away
      target: juthTarget,
      checkinMethod: "gps",
    });
    expect(verdict.status).toBe("verified");
    expect(verdict.isWithinRange).toBe(true);
    expect(verdict.distanceFromTarget).toBeGreaterThan(100);
  });

  test("student far outside the radius is rejected with the real distance", () => {
    const verdict = evaluateCheckinProximity({
      studentGps: { latitude: 6.5244, longitude: 3.3792 }, // Lagos
      target: juthTarget,
      checkinMethod: "gps",
    });
    expect(verdict.status).toBe("rejected");
    expect(verdict.isWithinRange).toBe(false);
    expect(verdict.distanceFromTarget).toBeGreaterThan(250000);
  });

  test("venue radius is respected (50 m venue rejects a ~111 m position)", () => {
    const venue = {
      name: "Classroom",
      lat: JUTH.lat,
      lng: JUTH.lng,
      radiusMeters: 50,
      source: "class_default" as const,
    };
    const verdict = evaluateCheckinProximity({
      studentGps: { latitude: JUTH.lat + 0.001, longitude: JUTH.lng },
      target: venue,
      checkinMethod: "gps",
    });
    expect(verdict.status).toBe("rejected");
  });
});

describe("buildCheckinDedupeQuery (PR C idempotency)", () => {
  test("lecture session takes precedence over other refs", () => {
    const q = buildCheckinDedupeQuery({
      student: "s1",
      lectureSessionId: "L1",
      clinicalSessionId: "C1",
      timetablePeriodId: "P1",
    });
    expect(q.lectureSessionId).toBe("L1");
    expect(q.clinicalSessionId).toBeUndefined();
    expect(q.timetablePeriodId).toBeUndefined();
    expect(q.checkinTime).toBeUndefined();
  });

  test("clinical session used when no lecture session", () => {
    const q = buildCheckinDedupeQuery({
      student: "s1",
      clinicalSessionId: "C1",
      timetablePeriodId: "P1",
    });
    expect(q.clinicalSessionId).toBe("C1");
    expect(q.timetablePeriodId).toBeUndefined();
  });

  test("timetable period used when no sessions", () => {
    const q = buildCheckinDedupeQuery({
      student: "s1",
      timetablePeriodId: "P1",
    });
    expect(q.timetablePeriodId).toBe("P1");
    expect(q.checkinTime).toBeUndefined();
  });

  test("60-second time-window fallback when no refs at all", () => {
    const q: any = buildCheckinDedupeQuery({ student: "s1", nowMs: 1000000 });
    expect(q.checkinTime.$gte.getTime()).toBe(1000000 - 60 * 1000);
  });
});
