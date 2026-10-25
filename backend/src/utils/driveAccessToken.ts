import UserModel from "../models/user";

// Google Drive access tokens expire after ~1 hour. This helper resolves a
// usable token: it prefers the signed-in user's own connected account, then
// falls back to the most recently connected admin account (so students can
// browse class materials without connecting Google). Expired tokens are
// refreshed server-side via the stored refresh token and persisted back to
// the owning user document. Tokens never leave the server.

const googleDriveOAuthConfig = () => ({
  clientId: process.env.GOOGLE_DRIVE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || "",
  clientSecret: process.env.GOOGLE_DRIVE_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET || "",
});

const refreshAccessToken = async (refreshToken: string) => {
  const { clientId, clientSecret } = googleDriveOAuthConfig();
  if (!refreshToken || !clientId || !clientSecret) return null;

  try {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });

    if (!response.ok) return null;

    const payload = (await response.json()) as {
      access_token?: string;
      expires_in?: number;
    };
    if (typeof payload.access_token !== "string" || !payload.access_token) return null;

    return {
      accessToken: payload.access_token,
      expiresIn: Number(payload.expires_in ?? 3600),
    };
  } catch {
    return null;
  }
};

// A token is usable when it exists and its recorded expiry is comfortably in
// the future (60s skew). Accounts with no recorded expiry are trusted once;
// if the Drive call fails the service-level fallback chain handles it.
const isTokenUsable = (account: any, skewMs = 60_000) =>
  Boolean(account?.accessToken) &&
  (!account.tokenExpiry || new Date(account.tokenExpiry).getTime() - skewMs > Date.now());

// Return a usable access token for a stored googleDriveAccount, refreshing
// (and persisting) it when possible. Marks stale accounts as expired.
const usableTokenForAccount = async (userDoc: any): Promise<string | null> => {
  const account = userDoc?.googleDriveAccount ?? null;
  if (!account?.accessToken) return null;
  if (isTokenUsable(account)) return account.accessToken;

  if (account.refreshToken) {
    const refreshed = await refreshAccessToken(String(account.refreshToken));
    if (refreshed) {
      await UserModel.updateOne(
        { _id: userDoc._id },
        {
          $set: {
            "googleDriveAccount.accessToken": refreshed.accessToken,
            "googleDriveAccount.tokenExpiry": new Date(Date.now() + refreshed.expiresIn * 1000),
            "googleDriveAccount.status": "connected",
          },
        },
      );
      return refreshed.accessToken;
    }
  }

  await UserModel.updateOne(
    { _id: userDoc._id },
    { $set: { "googleDriveAccount.status": "expired" } },
  );
  return null;
};

export const resolveSharedDriveAccessToken = async (
  currentUserId: string | null,
): Promise<string | null> => {
  // 1. The signed-in user's own connected Google account
  if (currentUserId) {
    const self = await UserModel.findById(currentUserId).select("googleDriveAccount").lean();
    if (self) {
      const ownToken = await usableTokenForAccount(self);
      if (ownToken) return ownToken;
    }
  }

  // 2. Most recently connected admin accounts (shared class materials access)
  const admins = await UserModel.find({
    role: "admin",
    "googleDriveAccount.accessToken": { $ne: null },
  })
    .sort({ "googleDriveAccount.connectedAt": -1 })
    .limit(5)
    .select("googleDriveAccount")
    .lean();

  for (const admin of admins) {
    const adminToken = await usableTokenForAccount(admin);
    if (adminToken) return adminToken;
  }

  // 3. Legacy server-level env token
  return process.env.GOOGLE_DRIVE_ACCESS_TOKEN || null;
};