import * as crypto from "crypto";

export function UidFactory_generateUid(length: number): string {
  const domain = "abcdefghijklmnopqrstuvwxyz";
  let uid = "";
  for (let i = 0; i < length; i += 1) {
    uid += domain[Math.floor(Math.random() * domain.length)];
  }
  return uid;
}

// For bearer credentials only (API keys, OAuth codes/tokens, subscription keys) where a
// guessable value grants access. UidFactory_generateUid uses Math.random, whose state is
// recoverable from a handful of outputs - fine for collision-only ids, unsafe for secrets.
export function UidFactory_generateSecureToken(byteLength: number): string {
  return crypto.randomBytes(byteLength).toString("base64url");
}
