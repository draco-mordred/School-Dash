// PR B — pure helpers for proximity checkin GPS validation.
// Kept free of model imports so it is unit-testable (bun test) and
// reusable by both the KRYSTA-LATIFAH sync service and future callers.

export interface GpsPoint {
  latitude: number;
  longitude: number;
}

export type CheckinTargetSource =
  | "class_default"
  | "period_venue"
  | "clinical_session"
  | "institution_campus";

export interface CheckinTarget {
  name: string;
  lat: number;
  lng: number;
  radiusMeters: number;
  source: CheckinTargetSource;
}

// Haversine distance in metres (same formula as the LATIFAH
// proximityVerification helper).
export const haversineMeters = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
) => {
  const R = 6371000;
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLng = (lng2 - lng1) * rad;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return Math.round(2 * R * Math.asin(Math.sqrt(a)));
};

export const isValidGps = (gps?: Partial<GpsPoint> | null) =>
  gps != null &&
  Number.isFinite(Number(gps.latitude)) &&
  Number.isFinite(Number(gps.longitude));

// Picks the first usable target from a priority-ordered candidate list.
export const pickTarget = (
  candidates: Array<CheckinTarget | null | undefined>,
): CheckinTarget | null =>
  candidates.find(
    (c): c is CheckinTarget =>
      c != null &&
      Number.isFinite(Number(c.lat)) &&
      Number.isFinite(Number(c.lng)) &&
      Number(c.radiusMeters) > 0,
  ) ?? null;

export interface CheckinDedupeInput {
  student: unknown;
  lectureSessionId?: unknown;
  clinicalSessionId?: unknown;
  timetablePeriodId?: unknown;
  nowMs?: number;
}

// PR C — natural key that makes checkin processing idempotent: one checkin
// per student per session/period. When no session ref exists at all, taps
// within 60 seconds collapse into a single record.
export const buildCheckinDedupeQuery = (
  input: CheckinDedupeInput,
): Record<string, unknown> => {
  const { student, lectureSessionId, clinicalSessionId, timetablePeriodId } = input;
  const query: Record<string, unknown> = { student };
  if (lectureSessionId) {
    query.lectureSessionId = lectureSessionId;
  } else if (clinicalSessionId) {
    query.clinicalSessionId = clinicalSessionId;
  } else if (timetablePeriodId) {
    query.timetablePeriodId = timetablePeriodId;
  } else {
    const nowMs = input.nowMs ?? Date.now();
    query.checkinTime = { $gte: new Date(nowMs - 60 * 1000) };
  }
  return query;
};

export interface CheckinVerdict {
  status: "verified" | "rejected" | "unverified" | "pending";
  isWithinRange: boolean;
  distanceFromTarget: number | null;
  needsAdminFlag: boolean;
}

// Pure verdict for a proximity checkin:
// 1. gps-method checkins MUST carry student coordinates — missing GPS
//    means the checkin cannot be corroborated (status "unverified");
// 2. other methods (qr_code, manual…) prove presence by other means and
//    pass without GPS, storing a null distance;
// 3. no resolvable target at all -> status "pending" + admin flag;
// 4. otherwise compare against the target radius -> verified/rejected.
export const evaluateCheckinProximity = (opts: {
  studentGps?: Partial<GpsPoint> | null;
  target: CheckinTarget | null;
  checkinMethod: string;
}): CheckinVerdict => {
  const { studentGps, target, checkinMethod } = opts;

  if (!isValidGps(studentGps)) {
    if (checkinMethod === "gps") {
      return {
        status: "unverified",
        isWithinRange: false,
        distanceFromTarget: null,
        needsAdminFlag: false,
      };
    }
    if (!target) {
      return {
        status: "pending",
        isWithinRange: false,
        distanceFromTarget: null,
        needsAdminFlag: true,
      };
    }
    return {
      status: "verified",
      isWithinRange: true,
      distanceFromTarget: null,
      needsAdminFlag: false,
    };
  }

  if (!target) {
    return {
      status: "pending",
      isWithinRange: false,
      distanceFromTarget: null,
      needsAdminFlag: true,
    };
  }

  const distance = haversineMeters(
    Number(studentGps!.latitude),
    Number(studentGps!.longitude),
    target.lat,
    target.lng,
  );
  const within = distance <= target.radiusMeters;
  return {
    status: within ? "verified" : "rejected",
    isWithinRange: within,
    distanceFromTarget: distance,
    needsAdminFlag: false,
  };
};
