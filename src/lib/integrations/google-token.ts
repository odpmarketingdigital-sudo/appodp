const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";

export type GoogleTokenCredentials = {
  accessToken: string;
  refreshToken?: string | null;
  expiresAt?: Date | null;
};

/** Renova o access token do Google quando expirado (ou próximo disso). */
export async function getValidGoogleAccessToken(
  credentials: GoogleTokenCredentials,
): Promise<string | null> {
  const bufferMs = 60_000;
  const stillValid =
    credentials.expiresAt &&
    credentials.expiresAt.getTime() > Date.now() + bufferMs;

  if (stillValid) {
    return credentials.accessToken;
  }

  if (!credentials.refreshToken) {
    return credentials.accessToken || null;
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return credentials.accessToken || null;
  }

  try {
    const response = await fetch(GOOGLE_TOKEN_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: credentials.refreshToken,
        grant_type: "refresh_token",
      }),
    });

    if (!response.ok) {
      return credentials.accessToken || null;
    }

    const data = (await response.json()) as { access_token?: string };
    return data.access_token ?? credentials.accessToken ?? null;
  } catch {
    return credentials.accessToken || null;
  }
}
