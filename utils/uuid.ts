/**
 * RFC4122 v4 UUID generator (dependency-free).
 * Used for all entity identifiers so records are globally unique and stable,
 * which keeps the local SQLite store ready for future cloud sync.
 */
export function uuid(): string {
  // Prefer the platform crypto when available (Hermes/modern RN exposes it)
  const g: any = globalThis as any;
  if (g.crypto && typeof g.crypto.randomUUID === 'function') {
    return g.crypto.randomUUID();
  }
  // Fallback implementation
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
