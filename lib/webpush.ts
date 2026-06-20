/**
 * Server-side Web Push utility.
 * Uses the Web Crypto API (available in Node 18+) — no external dependencies.
 */

import { createClient } from '@/lib/supabase/server';

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  icon?: string;
}

// ─── VAPID helpers ────────────────────────────────────────────────────────────

function base64urlToBuffer(base64url: string): Buffer {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
  return Buffer.from(padded, 'base64');
}

function bufferToBase64url(buffer: Buffer | Uint8Array): string {
  return Buffer.from(buffer)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

async function getVapidKeys() {
  const publicKeyRaw = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
  const privateKeyRaw = process.env.VAPID_PRIVATE_KEY!;

  const publicKeyBuffer = base64urlToBuffer(publicKeyRaw);
  const privateKeyBuffer = base64urlToBuffer(privateKeyRaw);

  const publicKey = await crypto.subtle.importKey(
    'raw',
    publicKeyBuffer,
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    []
  );

  const privateKey = await crypto.subtle.importKey(
    'pkcs8',
    // Wrap raw private key into PKCS8 DER for P-256
    buildPkcs8(privateKeyBuffer),
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits']
  );

  return { publicKey, privateKey, publicKeyRaw };
}

// Build PKCS8 DER wrapper for a raw P-256 private key
function buildPkcs8(rawPrivate: Buffer): ArrayBuffer {
  // OID for P-256: 1.2.840.10045.3.1.7
  const ecOid = Buffer.from('06082a8648ce3d030107', 'hex');
  // OID for EC: 1.2.840.10045.2.1
  const algOid = Buffer.from('06072a8648ce3d0201', 'hex');

  const ecPrivKey = Buffer.concat([
    Buffer.from('020101', 'hex'),       // version = 1
    Buffer.from('0420', 'hex'),         // OCTET STRING (32 bytes)
    rawPrivate,
  ]);

  const algorithmSeq = Buffer.concat([
    algOid,
    Buffer.concat([Buffer.from('30', 'hex'), Buffer.from([ecOid.length]), ecOid]),
  ]);

  const algorithmSeqWrapped = Buffer.concat([
    Buffer.from('30', 'hex'),
    Buffer.from([algorithmSeq.length]),
    algorithmSeq,
  ]);

  const ecPrivKeyOctet = Buffer.concat([
    Buffer.from('30', 'hex'),
    Buffer.from([ecPrivKey.length]),
    ecPrivKey,
  ]);

  const bitString = Buffer.concat([
    Buffer.from('04', 'hex'),
    ecPrivKeyOctet,
  ]);

  const inner = Buffer.concat([
    Buffer.from('020100', 'hex'), // version = 0
    algorithmSeqWrapped,
    Buffer.from('0482', 'hex'),
    Buffer.from([bitString.length >> 8, bitString.length & 0xff]),
    bitString,
  ]);

  const outer = Buffer.concat([
    Buffer.from('3082', 'hex'),
    Buffer.from([inner.length >> 8, inner.length & 0xff]),
    inner,
  ]);

  return outer.buffer.slice(outer.byteOffset, outer.byteOffset + outer.byteLength);
}

// ─── VAPID JWT ─────────────────────────────────────────────────────────────────

async function createVapidJwt(audience: string, publicKeyRaw: string): Promise<string> {
  const privateKeyRaw = process.env.VAPID_PRIVATE_KEY!;
  const subject = process.env.VAPID_SUBJECT!;

  const header = bufferToBase64url(Buffer.from(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const payload = bufferToBase64url(Buffer.from(JSON.stringify({
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60, // 12h
    sub: subject,
  })));

  const signingInput = `${header}.${payload}`;

  // Импортируем приватный ключ для ECDSA-подписи: x/y берём из RAW публичного
  // ключа (65 байт, uncompressed: 0x04 || X || Y), d — сам приватный ключ.
  // (Раньше здесь был ещё один importKey с «приблизительными» x/y из подстроки
  //  base64 — он бросал DataError и ломал ВСЕ push-уведомления.)
  const pubBuf = base64urlToBuffer(publicKeyRaw); // 65 bytes uncompressed
  const xBuf = pubBuf.slice(1, 33);
  const yBuf = pubBuf.slice(33, 65);

  const ecPrivateKey = await crypto.subtle.importKey(
    'jwk',
    {
      kty: 'EC',
      crv: 'P-256',
      d: privateKeyRaw,
      x: bufferToBase64url(xBuf),
      y: bufferToBase64url(yBuf),
      key_ops: ['sign'],
    },
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    ecPrivateKey,
    Buffer.from(signingInput)
  );

  return `${signingInput}.${bufferToBase64url(Buffer.from(signature))}`;
}

// ─── Encrypt payload (AES-128-GCM content encoding) ───────────────────────────

async function encryptPayload(
  payload: string,
  p256dh: string,
  auth: string
): Promise<{ ciphertext: Buffer; salt: Buffer; serverPublicKey: Buffer }> {
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // Import receiver public key
  const receiverPublicKey = await crypto.subtle.importKey(
    'raw',
    base64urlToBuffer(p256dh),
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  );

  // Generate ephemeral ECDH key pair
  const ephemeral = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits']
  );

  const ephemeralPublicKeyRaw = await crypto.subtle.exportKey('raw', ephemeral.publicKey);

  // ECDH shared secret
  const sharedSecret = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: receiverPublicKey },
    ephemeral.privateKey,
    256
  );

  const authBuffer = base64urlToBuffer(auth);

  // PRK_combine = HMAC-SHA256(auth, sharedSecret)
  const prkCombineKey = await crypto.subtle.importKey('raw', authBuffer, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const prkCombine = await crypto.subtle.sign('HMAC', prkCombineKey, sharedSecret);

  // info_combine = "WebPush: info\0" + receiverPublicKey + senderPublicKey
  const infoCombine = Buffer.concat([
    Buffer.from('WebPush: info\0'),
    base64urlToBuffer(p256dh),
    Buffer.from(ephemeralPublicKeyRaw),
  ]);

  const prkCombineKey2 = await crypto.subtle.importKey('raw', prkCombine, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);

  // IKM = HKDF-expand(prkCombine, infoCombine, 32)
  const ikmInfo = Buffer.concat([infoCombine, Buffer.from([1])]);
  const ikm = await crypto.subtle.sign('HMAC', prkCombineKey2, ikmInfo);

  // PRK = HMAC-SHA256(salt, ikm)
  const prkKey = await crypto.subtle.importKey('raw', Buffer.from(salt), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const prk = await crypto.subtle.sign('HMAC', prkKey, ikm);

  // CEK = HKDF-expand(prk, "Content-Encoding: aes128gcm\0\1", 16)
  const cekInfo = Buffer.concat([Buffer.from('Content-Encoding: aes128gcm\0\x01')]);
  const prkKey2 = await crypto.subtle.importKey('raw', prk, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const cekFull = await crypto.subtle.sign('HMAC', prkKey2, cekInfo);
  const cek = Buffer.from(cekFull).slice(0, 16);

  // Nonce = HKDF-expand(prk, "Content-Encoding: nonce\0\1", 12)
  const nonceInfo = Buffer.concat([Buffer.from('Content-Encoding: nonce\0\x01')]);
  const nonceFull = await crypto.subtle.sign('HMAC', prkKey2, nonceInfo);
  const nonce = Buffer.from(nonceFull).slice(0, 12);

  // Encrypt
  const aesKey = await crypto.subtle.importKey('raw', cek, { name: 'AES-GCM' }, false, ['encrypt']);
  const paddedPayload = Buffer.concat([Buffer.from(payload), Buffer.from([0x02])]);
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, aesKey, paddedPayload);

  // Build encrypted content coding header
  const recordSize = Buffer.alloc(4);
  recordSize.writeUInt32BE(4096, 0);
  const keyIdLen = Buffer.from([ephemeralPublicKeyRaw.byteLength]);
  const header = Buffer.concat([Buffer.from(salt), recordSize, keyIdLen, Buffer.from(ephemeralPublicKeyRaw)]);

  return {
    ciphertext: Buffer.concat([header, Buffer.from(encrypted)]),
    salt: Buffer.from(salt),
    serverPublicKey: Buffer.from(ephemeralPublicKeyRaw),
  };
}

// ─── Send to one subscription ─────────────────────────────────────────────────

async function sendToSubscription(
  endpoint: string,
  p256dh: string,
  auth: string,
  payload: PushPayload
): Promise<boolean> {
  try {
    const url = new URL(endpoint);
    const audience = `${url.protocol}//${url.host}`;
    const publicKeyRaw = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;

    const jwt = await createVapidJwt(audience, publicKeyRaw);

    const { ciphertext } = await encryptPayload(JSON.stringify(payload), p256dh, auth);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `vapid t=${jwt},k=${publicKeyRaw}`,
        'Content-Type': 'application/octet-stream',
        'Content-Encoding': 'aes128gcm',
        'TTL': '86400',
      },
      body: ciphertext,
    });

    if (response.status === 410 || response.status === 404) {
      // Subscription expired — caller should clean it up
      return false;
    }

    return response.ok;
  } catch (err) {
    console.error('[webpush] sendToSubscription error:', err);
    return false;
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Send a push notification to all subscriptions of a profile.
 * Uses service-role client so it can read subscriptions regardless of RLS.
 */
export async function sendPushToProfile(profileId: string, payload: PushPayload): Promise<void> {
  try {
    // Use createClient (server) — service role needed to read other profiles' subs
    const { createClient: createAdminClient } = await import('@supabase/supabase-js');
    const adminClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: subs, error } = await adminClient
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth')
      .eq('profile_id', profileId);

    if (error || !subs?.length) return;

    const stale: string[] = [];

    await Promise.allSettled(
      subs.map(async (sub) => {
        const ok = await sendToSubscription(sub.endpoint, sub.p256dh, sub.auth, payload);
        if (!ok) stale.push(sub.id);
      })
    );

    // Remove expired subscriptions
    if (stale.length > 0) {
      await adminClient.from('push_subscriptions').delete().in('id', stale);
    }
  } catch (err) {
    console.error('[webpush] sendPushToProfile error:', err);
  }
}
