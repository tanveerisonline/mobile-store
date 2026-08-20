/* ------------------------------------------------------------------ */
/*  Security toolkit: PBKDF2 hashing, tokens, sanitizing, validation,  */
/*  and a persisted sliding-window rate limiter.                       */
/* ------------------------------------------------------------------ */

const enc = new TextEncoder();

const hexToBytes = (hex: string) => {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
};

const bytesToHex = (bytes: Uint8Array) => Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");

export const PBKDF2_ITERATIONS = 120_000;

/** PBKDF2-SHA256 password hash (WebCrypto, never plaintext at rest). */
export async function hashPassword(password: string, saltHex: string): Promise<string> {
  const keyMaterial = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: hexToBytes(saltHex) as BufferSource, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    keyMaterial,
    256
  );
  return bytesToHex(new Uint8Array(bits));
}

export function genSalt(): string {
  return bytesToHex(crypto.getRandomValues(new Uint8Array(16)));
}

/** Cryptographically random session / CSRF-style token. */
export function genToken(): string {
  return bytesToHex(crypto.getRandomValues(new Uint8Array(32)));
}

/* --------------------------- sanitizing --------------------------- */

/** Strips markup from user input — defence against stored XSS. */
export const stripTags = (input: string) => input.replace(/<[^>]*>/g, "").trim();

export const truncate = (s: string, n: number) => (s.length > n ? `${s.slice(0, n)}…` : s);

/* --------------------------- validation --------------------------- */

export const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());

export function passwordIssue(pw: string): string | null {
  if (pw.length < 8) return "At least 8 characters required";
  if (!/[A-Z]/.test(pw)) return "Add an uppercase letter";
  if (!/[0-9]/.test(pw)) return "Add a number";
  return null;
}

export function passwordStrength(pw: string): 0 | 1 | 2 | 3 {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw) && /[0-9]/.test(pw)) score++;
  if (pw.length >= 12 && /[^A-Za-z0-9]/.test(pw)) score++;
  return score as 0 | 1 | 2 | 3;
}

export const isZip = (v: string) => /^[0-9]{4,10}$/.test(v.trim());
export const isPhone = (v: string) => /^[+\d][\d\s\-()]{6,18}$/.test(v.trim());

/** Luhn check for card numbers (client-side UX guard). */
export function luhnValid(cardNumber: string): boolean {
  const digits = cardNumber.replace(/\D/g, "");
  if (digits.length < 13 || digits.length > 19) return false;
  let sum = 0;
  let dbl = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = parseInt(digits[i], 10);
    if (dbl) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    dbl = !dbl;
  }
  return sum % 10 === 0;
}

export const expiryValid = (v: string) => {
  const m = v.match(/^(0[1-9]|1[0-2])\/(\d{2})$/);
  if (!m) return false;
  const exp = new Date(2000 + parseInt(m[2], 10), parseInt(m[1], 10), 1);
  return exp > new Date();
};

/* --------------------------- rate limiter -------------------------- */

interface Bucket {
  count: number;
  reset: number;
}

export interface RateCheck {
  ok: boolean;
  remaining: number;
  retryIn: number; // seconds
}

/**
 * Sliding-window rate limiter, persisted across reloads.
 * Used on login (5/10min), register (3/10min), reviews (3/10min),
 * coupon validation (10/min) and newsletter (3/hour).
 */
export class RateLimiter {
  private map: Record<string, Bucket> = {};

  constructor(private storeKey = "volt_rl_v1") {
    try {
      const raw = localStorage.getItem(storeKey);
      if (raw) this.map = JSON.parse(raw) as Record<string, Bucket>;
    } catch {
      this.map = {};
    }
    this.prune();
  }

  private persist() {
    try {
      localStorage.setItem(this.storeKey, JSON.stringify(this.map));
    } catch {
      /* noop */
    }
  }

  private prune() {
    const now = Date.now();
    let changed = false;
    for (const key of Object.keys(this.map)) {
      if (now > this.map[key].reset) {
        delete this.map[key];
        changed = true;
      }
    }
    if (changed) this.persist();
  }

  hit(key: string, limit: number, windowMs: number): RateCheck {
    this.prune();
    const now = Date.now();
    const bucket = this.map[key];
    if (!bucket || now > bucket.reset) {
      this.map[key] = { count: 1, reset: now + windowMs };
      this.persist();
      return { ok: true, remaining: limit - 1, retryIn: 0 };
    }
    if (bucket.count >= limit) {
      return { ok: false, remaining: 0, retryIn: Math.ceil((bucket.reset - now) / 1000) };
    }
    bucket.count += 1;
    this.persist();
    return { ok: true, remaining: limit - bucket.count, retryIn: 0 };
  }

  snapshot(): { key: string; count: number; reset: number }[] {
    this.prune();
    return Object.entries(this.map).map(([key, b]) => ({ key, count: b.count, reset: b.reset }));
  }

  resetAll() {
    this.map = {};
    this.persist();
  }
}

export const rateLimiter = new RateLimiter();
