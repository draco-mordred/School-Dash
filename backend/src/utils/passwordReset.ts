import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export const generatePasswordResetToken = (byteLength = 24): string => {
  return randomBytes(byteLength).toString("hex");
};

export const hashPasswordResetToken = async (token: string): Promise<string> => {
  const salt = randomBytes(16).toString("hex");
  const hash = createHash("sha256").update(`${salt}:${token}`).digest("hex");
  return `${salt}:${hash}`;
};

export const verifyPasswordResetToken = async (token: string, storedToken?: string | null): Promise<boolean> => {
  if (!token || !storedToken) {
    return false;
  }

  const [salt, hash] = storedToken.split(":");
  if (!salt || !hash) {
    return false;
  }

  const expectedHash = createHash("sha256").update(`${salt}:${token}`).digest("hex");
  const actualBuffer = Buffer.from(hash, "hex");
  const expectedBuffer = Buffer.from(expectedHash, "hex");

  if (actualBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(actualBuffer, expectedBuffer);
};
