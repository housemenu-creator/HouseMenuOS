import { ref, onChildAdded, onChildChanged, onChildRemoved, onValue, push, set, update, remove, get } from 'firebase/database';
import { realtimeDB as db } from '@house/db';
import { normalizeFirebaseData } from './normalizeFirebaseData';
import {
  marketingCampaignsPath,
  marketingBannersPath,
  marketingPromosPath,
  marketingTestimonialsPath,
  marketingStatsPath,
} from './paths';

function subscribeDelta(path, { onAdd, onChange, onRemove }) {
  const dbRef = ref(db, path);
  const handlers = [];

  if (onAdd) {
    const unsub = onChildAdded(dbRef, (snap) => {
      const data = snap.val();
      if (data !== null) {
        onAdd({ id: snap.key, ...normalizeFirebaseData(data) });
      }
    });
    handlers.push(unsub);
  }

  if (onChange) {
    const unsub = onChildChanged(dbRef, (snap) => {
      const data = snap.val();
      if (data !== null) {
        onChange({ id: snap.key, ...normalizeFirebaseData(data) });
      }
    });
    handlers.push(unsub);
  }

  if (onRemove) {
    const unsub = onChildRemoved(dbRef, (snap) => {
      onRemove(snap.key);
    });
    handlers.push(unsub);
  }

  return () => {
    handlers.forEach((unsub) => unsub());
  };
}

function serverIncrement(value) {
  return { '.sv': { 'increment': value } };
}

function withTimestamp(data) {
  return { ...data, updatedAt: Date.now() };
}

async function createEntity(path, data) {
  const dbRef = ref(db, path);
  const newRef = push(dbRef);
  const entity = {
    ...data,
    id: newRef.key,
    isActive: data.isActive !== undefined ? data.isActive : true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  await set(newRef, entity);
  return newRef.key;
}

async function updateEntity(path, id, data) {
  const dbRef = ref(db, `${path}/${id}`);
  await update(dbRef, withTimestamp(data));
}

async function deleteEntity(path, id) {
  const dbRef = ref(db, `${path}/${id}`);
  await remove(dbRef);
}

async function getEntity(path, id) {
  const dbRef = ref(db, `${path}/${id}`);
  const snap = await get(dbRef);
  if (snap.exists()) {
    return { id: snap.key, ...normalizeFirebaseData(snap.val()) };
  }
  return null;
}

export const marketingService = {
  // --- Campaigns ---
  subscribeCampaigns(branchId, { onAdd, onChange, onRemove }) {
    return subscribeDelta(marketingCampaignsPath(branchId), { onAdd, onChange, onRemove });
  },

  async createCampaign(branchId, data) {
    const id = await createEntity(marketingCampaignsPath(branchId), data);
    return id;
  },

  async updateCampaign(branchId, id, data) {
    await updateEntity(marketingCampaignsPath(branchId), id, data);
  },

  async deleteCampaign(branchId, id) {
    await deleteEntity(marketingCampaignsPath(branchId), id);
  },

  async getCampaign(branchId, id) {
    return getEntity(marketingCampaignsPath(branchId), id);
  },

  async incrementCampaignViews(branchId, id) {
    await update(ref(db), {
      [marketingCampaignsPath(branchId, id) + '/analytics/views']: serverIncrement(1),
    });
  },

  async incrementCampaignConversions(branchId, id) {
    await update(ref(db), {
      [marketingCampaignsPath(branchId, id) + '/analytics/conversions']: serverIncrement(1),
    });
  },

  // --- Banners ---
  subscribeBanners(branchId, { onAdd, onChange, onRemove }) {
    return subscribeDelta(marketingBannersPath(branchId), { onAdd, onChange, onRemove });
  },

  async createBanner(branchId, data) {
    return createEntity(marketingBannersPath(branchId), data);
  },

  async updateBanner(branchId, id, data) {
    await updateEntity(marketingBannersPath(branchId), id, data);
  },

  async deleteBanner(branchId, id) {
    await deleteEntity(marketingBannersPath(branchId), id);
  },

  async getBanner(branchId, id) {
    return getEntity(marketingBannersPath(branchId), id);
  },

  async incrementBannerViews(branchId, id) {
    await update(ref(db), {
      [marketingBannersPath(branchId, id) + '/analytics/views']: serverIncrement(1),
    });
  },

  async incrementBannerClicks(branchId, id) {
    await update(ref(db), {
      [marketingBannersPath(branchId, id) + '/analytics/clicks']: serverIncrement(1),
    });
  },

  // --- Promos ---
  subscribePromos(branchId, { onAdd, onChange, onRemove }) {
    return subscribeDelta(marketingPromosPath(branchId), { onAdd, onChange, onRemove });
  },

  async createPromo(branchId, data) {
    return createEntity(marketingPromosPath(branchId), data);
  },

  async updatePromo(branchId, id, data) {
    await updateEntity(marketingPromosPath(branchId), id, data);
  },

  async deletePromo(branchId, id) {
    await deleteEntity(marketingPromosPath(branchId), id);
  },

  async getPromo(branchId, id) {
    return getEntity(marketingPromosPath(branchId), id);
  },

  async incrementPromoUse(branchId, id) {
    await update(ref(db), {
      [marketingPromosPath(branchId, id) + '/currentUses']: serverIncrement(1),
    });
  },

  // --- Testimonials ---
  subscribeTestimonials(branchId, { onAdd, onChange, onRemove }) {
    return subscribeDelta(marketingTestimonialsPath(branchId), { onAdd, onChange, onRemove });
  },

  async createTestimonial(branchId, data) {
    return createEntity(marketingTestimonialsPath(branchId), data);
  },

  async updateTestimonial(branchId, id, data) {
    await updateEntity(marketingTestimonialsPath(branchId), id, data);
  },

  async deleteTestimonial(branchId, id) {
    await deleteEntity(marketingTestimonialsPath(branchId), id);
  },

  async getTestimonial(branchId, id) {
    return getEntity(marketingTestimonialsPath(branchId), id);
  },

  // --- Stats ---
  subscribeStats(branchId, callback) {
    const dbRef = ref(db, marketingStatsPath(branchId));
    return onValue(dbRef, (snap) => {
      const data = snap.val();
      callback(data ? normalizeFirebaseData(data) : null);
    });
  },

  async updateStats(branchId, data) {
    const dbRef = ref(db, marketingStatsPath(branchId));
    await update(dbRef, withTimestamp(data));
  },

  async getStats(branchId) {
    const dbRef = ref(db, marketingStatsPath(branchId));
    const snap = await get(dbRef);
    return snap.exists() ? normalizeFirebaseData(snap.val()) : null;
  },
};
