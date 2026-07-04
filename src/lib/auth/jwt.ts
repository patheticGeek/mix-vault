import { getCloudflareContext } from "@opennextjs/cloudflare";
import { SignJWT, jwtVerify } from "jose";

const JWT_ALG = "HS256";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

export interface SessionPayload {
  username: string;
}

async function getJwtSecretKey() {
  const { env } = await getCloudflareContext({ async: true });
  if (!env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured. Run `pnpm generate:auth-secrets`.");
  }
  return new TextEncoder().encode(env.JWT_SECRET);
}

export async function signSessionToken(payload: SessionPayload): Promise<string> {
  const secret = await getJwtSecretKey();
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: JWT_ALG })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(secret);
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const secret = await getJwtSecretKey();
    const { payload } = await jwtVerify(token, secret, { algorithms: [JWT_ALG] });
    if (typeof payload.username !== "string") return null;
    return { username: payload.username };
  } catch {
    return null;
  }
}
