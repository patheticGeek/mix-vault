import bcrypt from "bcryptjs";

export async function verifyCredentials(
  username: string,
  password: string,
): Promise<boolean> {
  const expectedUsername = process.env.AUTH_USERNAME;
  const expectedHash = process.env.AUTH_PASSWORD_HASH;

  if (!expectedUsername || !expectedHash) {
    throw new Error(
      "AUTH_USERNAME / AUTH_PASSWORD_HASH are not configured. Run `pnpm generate:auth-secrets`.",
    );
  }

  if (username !== expectedUsername) {
    // Still run a bcrypt compare so a wrong username takes the same time as a
    // wrong password, rather than leaking which one was wrong via timing.
    await bcrypt.compare(password, expectedHash);
    return false;
  }

  return bcrypt.compare(password, expectedHash);
}
