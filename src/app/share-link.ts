import { normalizeName, normalizeParticipants } from './draw-engine';

/**
 * The shared-link wire format. Links already in circulation depend on this exact encoding,
 * so it is frozen: see `share-link.spec.ts` for the vectors that lock it.
 */
export function encodeParticipants(participants: readonly string[]): string {
  const bytes = new TextEncoder().encode(JSON.stringify(participants));
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join('');
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decodeParticipants(encoded: string): string[] {
  const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(encoded.length / 4) * 4, '=');
  const binary = atob(base64);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  const parsed: unknown = JSON.parse(new TextDecoder().decode(bytes));
  if (!Array.isArray(parsed) || !parsed.every((item) => typeof item === 'string')) return [];
  return normalizeParticipants(
    parsed.slice(0, 60).map(normalizeName).filter((name) => name.length > 0 && name.length <= 60),
  );
}
