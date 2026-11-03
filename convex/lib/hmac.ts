/** Web Crypto HMAC helpers — safe in Convex queries/mutations/httpActions. */

function toHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function hmacSha256Hex(
  secret: string,
  message: string,
): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return toHex(sig);
}

export async function verifyHmacSha256(
  secret: string,
  message: string,
  signatureHex: string,
): Promise<boolean> {
  const expected = await hmacSha256Hex(secret, message);
  if (expected.length !== signatureHex.length) return false;
  // Constant-time-ish compare
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) {
    mismatch |= expected.charCodeAt(i) ^ signatureHex.charCodeAt(i);
  }
  return mismatch === 0;
}

/** Strip optional `sha256=` prefix from signature header. */
export function normalizeSignatureHeader(header: string | null): string | null {
  if (!header) return null;
  const trimmed = header.trim();
  if (trimmed.toLowerCase().startsWith("sha256=")) {
    return trimmed.slice(7).trim();
  }
  return trimmed;
}

const MAX_SKEW_MS = 5 * 60 * 1000;

export function assertTimestampFresh(timestampHeader: string | null) {
  if (!timestampHeader) {
    throw new Error("Missing X-LendLoop-Timestamp");
  }
  const ts = Number(timestampHeader);
  if (!Number.isFinite(ts)) {
    throw new Error("Invalid X-LendLoop-Timestamp");
  }
  const skew = Math.abs(Date.now() - ts);
  if (skew > MAX_SKEW_MS) {
    throw new Error("Request timestamp outside allowed skew");
  }
  return ts;
}
