export type MetaOAuthStatePayload = {
  nonce: string;
  clientId: string;
};

/** Codifica o `state` OAuth com nonce (CSRF) e clientId. */
export function encodeMetaOAuthState(payload: MetaOAuthStatePayload): string {
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

/** Decodifica o `state` retornado pelo Meta na callback. */
export function decodeMetaOAuthState(
  raw: string | null,
): MetaOAuthStatePayload | null {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(
      Buffer.from(raw, "base64url").toString("utf8"),
    ) as Partial<MetaOAuthStatePayload>;

    if (
      typeof parsed.nonce === "string" &&
      typeof parsed.clientId === "string"
    ) {
      return { nonce: parsed.nonce, clientId: parsed.clientId };
    }
  } catch {
    // State inválido ou corrompido.
  }

  return null;
}
