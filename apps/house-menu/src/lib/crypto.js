let _PEPPER = null;
function getPepper() {
  if (_PEPPER) return _PEPPER;
  try { const v = typeof import.meta !== 'undefined' ? import.meta.env?.VITE_ENCRYPTION_PEPPER : undefined; if (v) { _PEPPER = v; return v; } } catch {}
  const p = typeof process !== 'undefined' ? process.env?.VITE_ENCRYPTION_PEPPER : undefined;
  if (p) { _PEPPER = p; return p; }
  const g = typeof globalThis !== 'undefined' ? globalThis.__VITE_ENCRYPTION_PEPPER : undefined;
  if (g) { _PEPPER = g; return g; }
  throw new Error('VITE_ENCRYPTION_PEPPER env var is required');
}

async function deriveKey(salt) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(getPepper() + salt),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: enc.encode(salt), iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

function hex(buffer) {
  return Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function hashPin(pin) {
  const enc = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(pin), { name: 'PBKDF2' }, false, ['deriveBits']);
  const hash = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 10000, hash: 'SHA-256' }, keyMaterial, 256);
  return hex(salt) + ':' + hex(hash);
}

export async function verifyPinHash(pin, stored) {
  const [saltHex, hashHex] = stored.split(':');
  const salt = new Uint8Array(saltHex.match(/.{2}/g).map(b => parseInt(b, 16)));
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(pin), { name: 'PBKDF2' }, false, ['deriveBits']);
  const hash = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 10000, hash: 'SHA-256' }, keyMaterial, 256);
  return hex(hash) === hashHex;
}

export async function encrypt(plaintext, salt = 'fixed') {
  if (!plaintext) return '';
  const enc = new TextEncoder();
  const key = await deriveKey(salt);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode(plaintext)
  );
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encrypted), iv.length);
  return btoa(String.fromCharCode(...combined));
}

export async function decrypt(ciphertext, salt = 'fixed') {
  if (!ciphertext) return '';
  try {
    const combined = new Uint8Array(atob(ciphertext).split('').map(c => c.charCodeAt(0)));
    const iv = combined.slice(0, 12);
    const data = combined.slice(12);
    const key = await deriveKey(salt);
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
    return new TextDecoder().decode(decrypted);
  } catch {
    return '';
  }
}
