import { randomBytes, randomUUID } from "node:crypto";

export const newId = () => randomUUID();

// Unambiguous alphabet (no 0/O, 1/I/L) — 6 chars ≈ 1.1 billion combinations.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export function randomCode(len = 6) {
  const bytes = randomBytes(len);
  let s = "";
  for (let i = 0; i < len; i++) s += ALPHABET[bytes[i] % ALPHABET.length];
  return s;
}

/** NAB-DANIEL-7X4KQ2 — the readable middle part is cosmetic; entropy is in the suffix. */
export function invitationCode(prefix: string, name: string) {
  const mid = name.replace(/[^a-z]/gi, "").toUpperCase().slice(0, 8) || "USER";
  return `${prefix}-${mid}-${randomCode(6)}`;
}
