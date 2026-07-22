import crypto from "crypto";

const SECRET_ENV = process.env.QR_SIGNING_SECRET || process.env.JWT_SECRET || "school-dash-dev-secret";

export interface SignedQrPayload {
  data: Record<string, unknown>;
  signature: string;
}

function normalizePayload(payload: Record<string, unknown>) {
  return JSON.stringify(payload);
}

export function createSignedQrPayload(payload: Record<string, unknown>) {
  const body = normalizePayload(payload);
  const signature = crypto.createHmac("sha256", SECRET_ENV).update(body).digest("hex");
  return JSON.stringify({ data: payload, signature });
}

export function verifySignedQrPayload(token: string) {
  try {
    const parsed = JSON.parse(token) as SignedQrPayload;
    if (!parsed || typeof parsed !== "object" || !parsed.data || typeof parsed.signature !== "string") {
      return null;
    }

    const expectedSignature = crypto.createHmac("sha256", SECRET_ENV).update(normalizePayload(parsed.data)).digest("hex");
    if (expectedSignature !== parsed.signature) {
      return null;
    }

    return parsed.data;
  } catch {
    return null;
  }
}
