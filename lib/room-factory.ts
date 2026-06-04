const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous O/0, I/1

/**
 * Generates a random 6-character room code.
 * 32^6 = ~1 billion combinations — not enumerable in practice.
 */
export function generateCode(): string {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return code;
}
