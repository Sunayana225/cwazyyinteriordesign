/**
 * Stable unique identifier.
 *
 * `crypto.randomUUID()` is only defined in a secure context (HTTPS or
 * localhost). When the production build is opened over a plain-HTTP LAN
 * address — e.g. http://192.168.x.x:3000 while sharing the planner on a
 * local network — it is `undefined`, and calling it throws, breaking saves,
 * compartment splits, revisions and every other id-generating action.
 *
 * This falls back to a v4 UUID derived from `getRandomValues`, and then to a
 * non-cryptographic string as a last resort. Every call site only requires
 * uniqueness, not cryptographic strength.
 */
export function uid(): string {
  const c = typeof crypto !== 'undefined' ? crypto : undefined;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  if (c && typeof c.getRandomValues === 'function') {
    const b = c.getRandomValues(new Uint8Array(16));
    b[6] = (b[6] & 0x0f) | 0x40; // version 4
    b[8] = (b[8] & 0x3f) | 0x80; // variant 10xx
    const h = Array.from(b, x => x.toString(16).padStart(2, '0'));
    return `${h[0]}${h[1]}${h[2]}${h[3]}-${h[4]}${h[5]}-${h[6]}${h[7]}-${h[8]}${h[9]}-${h[10]}${h[11]}${h[12]}${h[13]}${h[14]}${h[15]}`;
  }
  return `id-${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 10)}`;
}
