import crypto from 'crypto';
import type { Request, Response, NextFunction } from 'express';
import { db } from './db';

const EPHEMERAL_SECRET = crypto.randomBytes(32).toString('hex');
const FIREBASE_PROJECT_ID = 'agro-trad';
const ADMIN_EMAILS = ['mdebrahimhossain289@gmail.com', 'mdshohagmiya4@gmail.com'];

let cachedCerts: Record<string, string> = {};
let certsExpiresAt = 0;

function getSessionSecret(): string {
  return process.env.SESSION_SECRET?.trim() || EPHEMERAL_SECRET;
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPasswordHash(password: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, keyHex] = parts;
  const keyBuf = Buffer.from(keyHex, 'hex');
  const derivedBuf = crypto.scryptSync(password, salt, 64);
  if (keyBuf.length !== derivedBuf.length) return false;
  return crypto.timingSafeEqual(keyBuf, derivedBuf);
}

export function verifyPlaintextConstantTime(input: string, expected: string): boolean {
  const a = crypto.createHash('sha256').update(input).digest();
  const b = crypto.createHash('sha256').update(expected).digest();
  return crypto.timingSafeEqual(a, b);
}

interface TokenPayload {
  role: 'admin';
  iat: number;
  exp: number;
}

export function signAdminToken(): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: TokenPayload = {
    role: 'admin',
    iat: now,
    exp: now + 60 * 60 * 12,
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', getSessionSecret()).update(encoded).digest('base64url');
  return `${encoded}.${sig}`;
}

export function verifyAdminToken(token: string): boolean {
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [encoded, sig] = parts;
  const expectedSig = crypto.createHmac('sha256', getSessionSecret()).update(encoded).digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length) return false;
  if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) return false;

  try {
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf-8')) as TokenPayload;
    if (payload.role !== 'admin') return false;
    const now = Math.floor(Date.now() / 1000);
    return payload.exp > now;
  } catch {
    return false;
  }
}

async function getFirebasePublicCerts(): Promise<Record<string, string>> {
  const now = Date.now();
  if (now < certsExpiresAt && Object.keys(cachedCerts).length > 0) {
    return cachedCerts;
  }
  const res = await fetch(
    'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com'
  );
  if (!res.ok) {
    throw new Error('Could not fetch Google Firebase public keys.');
  }
  const cacheControl = res.headers.get('cache-control') || '';
  const maxAgeMatch = cacheControl.match(/max-age=(\d+)/i);
  const maxAgeSec = maxAgeMatch ? parseInt(maxAgeMatch[1], 10) : 3600;
  cachedCerts = (await res.json()) as Record<string, string>;
  certsExpiresAt = now + maxAgeSec * 1000;
  return cachedCerts;
}

export async function verifyFirebaseAdminIdToken(idToken: string): Promise<boolean> {
  try {
    const parts = idToken.split('.');
    if (parts.length !== 3) return false;
    const [headerB64, payloadB64, sigB64] = parts;
    const header = JSON.parse(Buffer.from(headerB64, 'base64url').toString('utf-8')) as {
      alg?: string;
      kid?: string;
    };
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf-8')) as {
      aud?: string;
      iss?: string;
      exp?: number;
      email?: string;
      email_verified?: boolean;
      sub?: string;
    };

    if (header.alg !== 'RS256' || !header.kid) return false;
    const now = Math.floor(Date.now() / 1000);
    if (!payload.exp || payload.exp <= now) return false;
    if (payload.aud !== FIREBASE_PROJECT_ID) return false;
    if (payload.iss !== `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`) return false;
    const normalizedEmail = typeof payload.email === 'string' ? payload.email.toLowerCase() : '';
    if (!payload.sub || !payload.email_verified || !ADMIN_EMAILS.includes(normalizedEmail)) return false;

    const certs = await getFirebasePublicCerts();
    const cert = certs[header.kid];
    if (!cert) return false;

    const verifier = crypto.createVerify('RSA-SHA256');
    verifier.update(`${headerB64}.${payloadB64}`);
    const sigBuf = Buffer.from(sigB64, 'base64url');
    return verifier.verify(cert, sigBuf);
  } catch {
    return false;
  }
}

export async function getAuthStatus(): Promise<{ setupRequired: boolean; usingEnvPassword: boolean }> {
  const envPass = process.env.ADMIN_PASSWORD?.trim();
  if (envPass) {
    return { setupRequired: false, usingEnvPassword: true };
  }
  const settings = await db.getSettings();
  return {
    setupRequired: !settings.adminCredentialHash,
    usingEnvPassword: false,
  };
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Admin authentication required.' });
    return;
  }
  const token = authHeader.slice('Bearer '.length).trim();
  if (verifyAdminToken(token)) {
    next();
    return;
  }
  const isFirebaseAdmin = await verifyFirebaseAdminIdToken(token);
  if (isFirebaseAdmin) {
    next();
    return;
  }
  res.status(401).json({ error: 'Session expired or unauthorized. Please sign in with the admin Google account.' });
}
