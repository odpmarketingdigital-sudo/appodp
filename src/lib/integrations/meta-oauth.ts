const META_TOKEN_ENDPOINT = "https://graph.facebook.com/v19.0/oauth/access_token";

export type MetaTokenResponse = {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
};

export type MetaLongLivedTokenResult =
  | { ok: true; accessToken: string; expiresAt: Date | null }
  | { ok: false; reason: string };

/** Troca o `code` OAuth por um access token de longa duração (~60 dias). */
export async function exchangeMetaCodeForLongLivedToken(
  code: string,
  redirectUri: string,
): Promise<MetaLongLivedTokenResult> {
  const metaClientId = process.env.META_CLIENT_ID;
  const metaClientSecret = process.env.META_CLIENT_SECRET;

  if (!metaClientId || !metaClientSecret) {
    return { ok: false, reason: "missing_credentials" };
  }

  const shortLivedUrl = new URL(META_TOKEN_ENDPOINT);
  shortLivedUrl.searchParams.set("client_id", metaClientId);
  shortLivedUrl.searchParams.set("client_secret", metaClientSecret);
  shortLivedUrl.searchParams.set("redirect_uri", redirectUri);
  shortLivedUrl.searchParams.set("code", code);

  let shortLivedResponse: Response;
  try {
    shortLivedResponse = await fetch(shortLivedUrl.toString());
  } catch {
    return { ok: false, reason: "token_exchange" };
  }

  if (!shortLivedResponse.ok) {
    return { ok: false, reason: "token_exchange" };
  }

  const shortLived = (await shortLivedResponse.json()) as MetaTokenResponse;
  if (!shortLived.access_token) {
    return { ok: false, reason: "no_access_token" };
  }

  const longLivedUrl = new URL(META_TOKEN_ENDPOINT);
  longLivedUrl.searchParams.set("grant_type", "fb_exchange_token");
  longLivedUrl.searchParams.set("client_id", metaClientId);
  longLivedUrl.searchParams.set("client_secret", metaClientSecret);
  longLivedUrl.searchParams.set("fb_exchange_token", shortLived.access_token);

  let longLivedResponse: Response;
  try {
    longLivedResponse = await fetch(longLivedUrl.toString());
  } catch {
    return { ok: false, reason: "token_exchange" };
  }

  if (!longLivedResponse.ok) {
    return { ok: false, reason: "token_exchange" };
  }

  const longLived = (await longLivedResponse.json()) as MetaTokenResponse;
  if (!longLived.access_token) {
    return { ok: false, reason: "no_access_token" };
  }

  const expiresAt =
    typeof longLived.expires_in === "number"
      ? new Date(Date.now() + longLived.expires_in * 1000)
      : null;

  return { ok: true, accessToken: longLived.access_token, expiresAt };
}
