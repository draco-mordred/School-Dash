import crypto from "crypto";

const SECRET_ENV = process.env.QR_SIGNING_SECRET || process.env.JWT_SECRET || (process.env.NODE_ENV === "production" ? "" : "medlog-lms-local-development-secret");

export interface SignedQrPayload {
  data: Record<string, unknown>;
  signature: string;
}

function normalizePayload(payload: Record<string, unknown>) {
  return JSON.stringify(payload);
}

export function createSignedQrPayload(payload: Record<string, unknown>) {
  if (!SECRET_ENV) throw new Error("QR_SIGNING_SECRET or JWT_SECRET must be configured in production");
  const body = normalizePayload(payload);
  const signature = crypto.createHmac("sha256", SECRET_ENV).update(body).digest("hex");
  return JSON.stringify({ data: payload, signature });
}

export function verifySignedQrPayload(token: string) {
  try {
    if (!SECRET_ENV) return null;
    const parsed = JSON.parse(token) as SignedQrPayload;
    if (!parsed || typeof parsed !== "object" || !parsed.data || typeof parsed.signature !== "string") {
      return null;
    }

    if (!/^[a-f\d]{64}$/i.test(parsed.signature)) return null;
    const expectedSignature = crypto.createHmac("sha256", SECRET_ENV).update(normalizePayload(parsed.data)).digest();
    const providedSignature = Buffer.from(parsed.signature, "hex");
    if (providedSignature.length !== expectedSignature.length || !crypto.timingSafeEqual(expectedSignature, providedSignature)) {
      return null;
    }

    return parsed.data;
  } catch {
    return null;
  }
}
