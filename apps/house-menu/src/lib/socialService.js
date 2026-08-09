/**
 * Social Media Service — Frontend API Client
 *
 * Abstract layer for all social media operations.
 * - REAL mode: calls Cloud Functions when accounts are connected
 * - DEMO mode: simulates responses for development/preview
 *
 * Connections (OAuth) are left as UI-only — user handles Meta setup manually.
 * Everything else works in demo mode until connections are live.
 */

import { ref, onChildAdded, onChildChanged, onChildRemoved, onValue, push, set, update, remove, get } from 'firebase/database';
import { realtimeDB as db } from '@house/db';
import { normalizeFirebaseData } from './normalizeFirebaseData';
import {
  socialConnectionsPath,
  socialPostsPath,
  socialScheduledPostsPath,
  socialInsightsPath,
  socialWhatsAppMessagesPath,
  socialQrCodesPath,
} from './paths';

// ── Demo / Mock Helpers ─────────────────────────────────────

let demoMode = true;

export function isDemoMode() {
  return demoMode;
}

export function setDemoMode(mode) {
  demoMode = mode;
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomId() {
  return Math.random().toString(36).substring(2, 10);
}

function now() {
  return Date.now();
}

function daysAgo(n) {
  return now() - n * 86400000;
}

function hoursAgo(n) {
  return now() - n * 3600000;
}

// ── Connection Status ───────────────────────────────────────

const DEMO_CONNECTIONS = {
  instagram: { connected: false, platform: 'instagram', username: '', pageId: '', tokenExpiresAt: null, updatedAt: now() },
  facebook: { connected: false, platform: 'facebook', pageId: '', pageName: '', tokenExpiresAt: null, updatedAt: now() },
  whatsapp: { connected: false, platform: 'whatsapp', phoneNumber: '', businessAccountId: '', updatedAt: now() },
};

const DEMO_INSIGHTS = {
  instagram: {
    followers: 1240,
    followersGrowth: 12.5,
    reachWeekly: 8450,
    engagement: 4.8,
    profileViews: 3200,
    topPosts: [
      { id: 'p1', caption: '🔥 Nuevo Menú del Día', likes: 234, comments: 18, reach: 1200, date: daysAgo(1) },
      { id: 'p2', caption: '🎉 Promo 2x1 en Seco de Cabrito', likes: 189, comments: 24, reach: 980, date: daysAgo(3) },
      { id: 'p3', caption: '💛 Gracias por su preferencia', likes: 145, comments: 8, reach: 760, date: daysAgo(5) },
    ],
    followersByDay: Array.from({ length: 7 }, (_, i) => ({
      date: daysAgo(6 - i),
      value: randomInt(1180, 1240),
    })),
  },
  facebook: {
    pageLikes: 890,
    pageLikesGrowth: 5.2,
    reachWeekly: 5600,
    engagement: 3.1,
    topPosts: [
      { id: 'fp1', caption: '📢 Horario extendido este finde', likes: 67, comments: 5, shares: 12, reach: 890, date: daysAgo(2) },
    ],
  },
};

const DEMO_FEED = [
  {
    id: 'sf1', product: 'Arma tu Menú', tone: '🔥 Oferta',
    ig: '🔥 Arma tu Menú por S/ 13.50!\n\nDeliciosa combinación que puedes armar a tu gusto.\n\n📍 Monteverde\n🛵 Delivery sin recargo',
    likes: 234, comments: 18, shares: 12, reach: 1200,
    publishedAt: hoursAgo(4), platforms: ['instagram', 'facebook'],
  },
  {
    id: 'sf2', product: 'Seco de Cabrito', tone: '💸 Descuento',
    ig: '💸 Seco de Cabrito — 15% OFF hoy!\n\nCon frejoles, tamal verde y sarsa criolla.\n\n📍 Monteverde\n🕐 Válido hasta las 6pm',
    likes: 189, comments: 24, shares: 8, reach: 980,
    publishedAt: daysAgo(1), platforms: ['instagram'],
  },
];

// ── Subscribe helper ─────────────────────────────────────────

function subscribeDelta(path, { onAdd, onChange, onRemove }) {
  const dbRef = ref(db, path);
  const handlers = [];
  if (onAdd) {
    const unsub = onChildAdded(dbRef, (snap) => {
      const data = snap.val();
      if (data !== null) onAdd({ id: snap.key, ...normalizeFirebaseData(data) });
    });
    handlers.push(unsub);
  }
  if (onChange) {
    const unsub = onChildChanged(dbRef, (snap) => {
      const data = snap.val();
      if (data !== null) onChange({ id: snap.key, ...normalizeFirebaseData(data) });
    });
    handlers.push(unsub);
  }
  if (onRemove) {
    const unsub = onChildRemoved(dbRef, (snap) => onRemove(snap.key));
    handlers.push(unsub);
  }
  return () => handlers.forEach((u) => u());
}

// ── Cloud Functions Base URL ─────────────────────────────────

const FUNCTIONS_BASE = 'https://us-central1-house-menuapp.cloudfunctions.net';

async function callFunction(name, payload) {
  const res = await fetch(`${FUNCTIONS_BASE}/${name}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Function ${name} error: ${res.status} — ${err}`);
  }
  return res.json();
}

// ── 1. Connection Management ─────────────────────────────────

export const socialService = {
  // ── Status ──
  async getConnectionStatus(branchId) {
    if (demoMode) return { ...DEMO_CONNECTIONS };
    try {
      const snap = await get(ref(db, socialConnectionsPath(branchId)));
      return snap.exists() ? normalizeFirebaseData(snap.val()) : DEMO_CONNECTIONS;
    } catch {
      return { ...DEMO_CONNECTIONS };
    }
  },

  subscribeConnections(branchId, callback) {
    const dbRef = ref(db, socialConnectionsPath(branchId));
    return onValue(dbRef, (snap) => {
      const data = snap.val();
      callback(data ? normalizeFirebaseData(data) : DEMO_CONNECTIONS);
    });
  },

  // OAuth URL generator (user opens this in popup)
  getOAuthUrl(platform, redirectUri) {
    const appId = import.meta.env.VITE_META_APP_ID || '';
    if (!appId) return null;
    const base = 'https://www.facebook.com/v22.0/dialog/oauth';
    const params = new URLSearchParams({
      client_id: appId,
      redirect_uri: redirectUri || `${window.location.origin}/admin/marketing`,
      scope: platform === 'whatsapp'
        ? 'whatsapp_business_messaging'
        : 'pages_show_list,instagram_basic,instagram_content_publish,pages_read_engagement,pages_manage_posts',
      response_type: 'code',
    });
    return `${base}?${params}`;
  },

  async disconnectPlatform(branchId, platform) {
    if (demoMode) {
      DEMO_CONNECTIONS[platform] = { ...DEMO_CONNECTIONS[platform], connected: false };
      return true;
    }
    try {
      await callFunction('social-disconnect', { branchId, platform });
      return true;
    } catch {
      return false;
    }
  },

  // ── 2. Publishing ──

  async publishToInstagram(branchId, { imageUrl, caption }) {
    if (demoMode) {
      const post = {
        id: randomId(),
        platform: 'instagram',
        caption: caption.substring(0, 50),
        likes: randomInt(50, 300),
        comments: randomInt(5, 40),
        reach: randomInt(500, 2000),
        publishedAt: now(),
        status: 'published',
      };
      return post;
    }
    return callFunction('social-publish-instagram', { branchId, imageUrl, caption });
  },

  async publishToFacebook(branchId, { message, imageUrl, link }) {
    if (demoMode) {
      return {
        id: randomId(),
        platform: 'facebook',
        message: message?.substring(0, 50),
        likes: randomInt(20, 150),
        comments: randomInt(3, 20),
        reach: randomInt(300, 1200),
        publishedAt: now(),
        status: 'published',
      };
    }
    return callFunction('social-publish-facebook', { branchId, message, imageUrl, link });
  },

  async publishToBoth(branchId, content) {
    const [ig, fb] = await Promise.all([
      this.publishToInstagram(branchId, content),
      this.publishToFacebook(branchId, content),
    ]);
    return { instagram: ig, facebook: fb };
  },

  // ── 3. Scheduling ──

  async schedulePost(branchId, data) {
    const { platform, caption, mediaUrl, scheduledAt } = data;
    const post = {
      platform,
      caption,
      mediaUrl: mediaUrl || '',
      scheduledAt: new Date(scheduledAt).getTime(),
      status: 'pending',
      createdAt: now(),
      updatedAt: now(),
    };
    if (demoMode) {
      post.id = randomId();
      DEMO_SCHEDULED.push(post);
      return post;
    }
    const dbRef = ref(db, socialScheduledPostsPath(branchId));
    const newRef = push(dbRef);
    const entity = { ...post, id: newRef.key };
    await set(newRef, entity);
    return entity;
  },

  async updateScheduledPost(branchId, postId, data) {
    if (demoMode) {
      const idx = DEMO_SCHEDULED.findIndex((p) => p.id === postId);
      if (idx !== -1) DEMO_SCHEDULED[idx] = { ...DEMO_SCHEDULED[idx], ...data, updatedAt: now() };
      return true;
    }
    await update(ref(db, `${socialScheduledPostsPath(branchId)}/${postId}`), { ...data, updatedAt: now() });
    return true;
  },

  async deleteScheduledPost(branchId, postId) {
    if (demoMode) {
      DEMO_SCHEDULED = DEMO_SCHEDULED.filter((p) => p.id !== postId);
      return true;
    }
    await remove(ref(db, `${socialScheduledPostsPath(branchId)}/${postId}`));
    return true;
  },

  subscribeScheduledPosts(branchId, callback) {
    if (demoMode) {
      callback([...DEMO_SCHEDULED]);
      return () => {};
    }
    const dbRef = ref(db, socialScheduledPostsPath(branchId));
    return onValue(dbRef, (snap) => {
      const data = snap.val();
      const posts = data ? Object.entries(data).map(([id, v]) => ({ id, ...normalizeFirebaseData(v) })) : [];
      callback(posts);
    });
  },

  // ── 4. Post History / Feed ──

  subscribePosts(branchId, callback) {
    if (demoMode) {
      callback([...DEMO_FEED]);
      return () => {};
    }
    return subscribeDelta(socialPostsPath(branchId), {
      onAdd: (item) => callback((prev) => [item, ...prev]),
      onChange: (item) => callback((prev) => prev.map((p) => p.id === item.id ? { ...p, ...item } : p)),
      onRemove: (id) => callback((prev) => prev.filter((p) => p.id !== id)),
    });
  },

  async getPostHistory(branchId) {
    if (demoMode) return [...DEMO_FEED];
    const snap = await get(ref(db, socialPostsPath(branchId)));
    if (!snap.exists()) return [];
    return Object.entries(snap.val()).map(([id, v]) => ({ id, ...normalizeFirebaseData(v) }));
  },

  // ── 5. Insights ──

  async getInsights(branchId, platform) {
    if (demoMode) return DEMO_INSIGHTS[platform] || null;
    try {
      const snap = await get(ref(db, socialInsightsPath(branchId, platform)));
      return snap.exists() ? normalizeFirebaseData(snap.val()) : null;
    } catch {
      return null;
    }
  },

  subscribeInsights(branchId, platform, callback) {
    if (demoMode) {
      callback(DEMO_INSIGHTS[platform] || null);
      return () => {};
    }
    const dbRef = ref(db, socialInsightsPath(branchId, platform));
    return onValue(dbRef, (snap) => {
      const data = snap.val();
      callback(data ? normalizeFirebaseData(data) : null);
    });
  },

  // ── 6. WhatsApp ──

  async sendWhatsApp(branchId, { to, templateName, parameters }) {
    if (demoMode) {
      return {
        id: randomId(),
        to,
        templateName,
        status: 'sent',
        sentAt: now(),
        segments: randomInt(1, 3),
      };
    }
    return callFunction('social-whatsapp-send', { branchId, to, templateName, parameters });
  },

  subscribeWhatsAppHistory(branchId, callback) {
    if (demoMode) {
      callback([]);
      return () => {};
    }
    return subscribeDelta(socialWhatsAppMessagesPath(branchId), {
      onAdd: (item) => callback((prev) => [item, ...prev]),
      onChange: (item) => callback((prev) => prev.map((m) => m.id === item.id ? { ...m, ...item } : m)),
      onRemove: (id) => callback((prev) => prev.filter((m) => m.id !== id)),
    });
  },

  // ── 7. QR Codes ──

  async generateQrCode(branchId, campaignId, campaignName) {
    const id = randomId();
    const qrData = {
      id,
      campaignId,
      campaignName,
      url: `${window.location.origin}/menu?promo=${campaignId}`,
      color: '#171717',
      createdAt: now(),
      scanCount: 0,
    };
    if (!demoMode) {
      const dbRef = ref(db, socialQrCodesPath(branchId, campaignId));
      await set(dbRef, qrData);
    }
    return qrData;
  },

  async getQrCode(branchId, campaignId) {
    if (demoMode) {
      return {
        id: randomId(),
        campaignId,
        url: `${window.location.origin}/menu?promo=${campaignId}`,
        color: '#171717',
        createdAt: now(),
        scanCount: 0,
      };
    }
    const snap = await get(ref(db, socialQrCodesPath(branchId, campaignId)));
    return snap.exists() ? { id: snap.key, ...normalizeFirebaseData(snap.val()) } : null;
  },
};

// ── Demo Store ────────────────────────────────────────────────

let DEMO_SCHEDULED = [
  {
    id: 'ds1',
    platform: 'instagram',
    caption: '🔥 Promo del día: Seco de Cabrito con 15% OFF',
    status: 'scheduled',
    scheduledAt: now() + 86400000 * 2,
    createdAt: hoursAgo(2),
  },
  {
    id: 'ds2',
    platform: 'both',
    caption: '💛 Gracias Monteverde por su apoyo esta semana',
    status: 'draft',
    scheduledAt: now() + 86400000 * 5,
    createdAt: hoursAgo(12),
  },
];
