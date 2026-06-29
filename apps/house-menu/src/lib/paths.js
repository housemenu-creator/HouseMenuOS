const BRANCH_PREFIX = (branchId) => `branches/${branchId || 'monteverde'}`;
const BRANCH_CONFIG_PREFIX = (branchId) => `branches_config/${branchId || 'monteverde'}`;
const TENANT_PREFIX = (tenantId) => `tenants/${tenantId || 'default'}`;

export const TENANT_ID = 'default';

export function tenantPath(sub) {
  return `tenants/${TENANT_ID}${sub ? `/${sub}` : ''}`;
}

export function branchPath(branchId, sub) {
  return `branches/${branchId || 'monteverde'}${sub ? `/${sub}` : ''}`;
}

export function branchConfigPath(branchId, sub) {
  return `branches_config/${branchId || 'monteverde'}${sub ? `/${sub}` : ''}`;
}

export function ordersPath(branchId, orderId) {
  const base = `${BRANCH_PREFIX(branchId)}/orders`;
  return orderId ? `${base}/${orderId}` : base;
}

export function ordersStatusPath(branchId, orderId) {
  return `${BRANCH_PREFIX(branchId)}/orders/${orderId}/status`;
}

export function ordersUpdatedAtPath(branchId, orderId) {
  return `${BRANCH_PREFIX(branchId)}/orders/${orderId}/updatedAt`;
}

export function catalogPath(branchId, productId) {
  const base = `${BRANCH_PREFIX(branchId)}/catalog`;
  if (!productId) return base;
  return `${base}/products/${productId}`;
}

export function catalogProductsPath(branchId, productId) {
  const base = `${BRANCH_PREFIX(branchId)}/catalog/products`;
  return productId ? `${base}/${productId}` : base;
}

export function catalogFieldPath(branchId, productId, field) {
  return `${BRANCH_PREFIX(branchId)}/catalog/products/${productId}/${field}`;
}

export function catalogCategoryPath(branchId, slug) {
  const base = `${BRANCH_PREFIX(branchId)}/catalog/categories`;
  return slug ? `${base}/${slug}` : base;
}

export function dailyMenusPath(branchId, dateStr) {
  const base = `${BRANCH_PREFIX(branchId)}/daily_menus`;
  return dateStr ? `${base}/${dateStr}` : base;
}

export function dailyMenuProductIdsPath(branchId, dateStr) {
  return `${BRANCH_PREFIX(branchId)}/daily_menus/${dateStr}/productIds`;
}

export function deliveryPath(branchId, sub) {
  const base = `${BRANCH_PREFIX(branchId)}/delivery`;
  return sub ? `${base}/${sub}` : base;
}

export function deliveryDriversPath(branchId, driverId) {
  const base = `${BRANCH_PREFIX(branchId)}/delivery/drivers`;
  return driverId ? `${base}/${driverId}` : base;
}

export function deliveryZonesPath(branchId, zoneId) {
  const base = `${BRANCH_PREFIX(branchId)}/delivery/zones`;
  return zoneId ? `${base}/${zoneId}` : base;
}

export function deliveryLogsPath(branchId, logKey) {
  const base = `${BRANCH_PREFIX(branchId)}/delivery/logs`;
  return logKey ? `${base}/${logKey}` : base;
}

export function deliveryTariffPath(branchId) {
  return `${BRANCH_PREFIX(branchId)}/delivery/tariffConfig`;
}

export function cashSessionsPath(branchId, sessionId) {
  const base = `${BRANCH_PREFIX(branchId)}/cash_sessions`;
  return sessionId ? `${base}/${sessionId}` : base;
}

export function gastosPath(branchId, gastoId) {
  const base = `${BRANCH_PREFIX(branchId)}/finanzas/gastos`;
  return gastoId ? `${base}/${gastoId}` : base;
}

// ── Legacy Chat (text-only, being replaced by Comm) ──────────────
/** @deprecated Use COMM_CHANNELS + commPath() instead */
export const CHAT_CHANNELS = Object.freeze({
  GENERAL: 'general',
  KITCHEN_DISPATCH: 'kitchen_dispatch',
});

/** @deprecated */
export const CHAT_STAFF_ROLES = Object.freeze(['kitchen', 'dispatch', 'mozo', 'delivery', 'vendedor', 'cajero', 'admin', 'superadmin']);

/** @deprecated */
export const CHAT_KD_ROLES = Object.freeze(['kitchen', 'dispatch']);

/** @deprecated Use commPath() instead */
export function chatPath(branchId, channel = CHAT_CHANNELS.GENERAL, messageId) {
  const base = `${BRANCH_PREFIX(branchId)}/chat/${channel}`;
  return messageId ? `${base}/${messageId}` : base;
}

/** @deprecated Use commReadByPath() instead */
export function chatReadByPath(branchId, channel, messageId, userId) {
  return `${BRANCH_PREFIX(branchId)}/chat/${channel}/${messageId}/readBy/${userId}`;
}

// ── Comm System (voice, priorities, reactions, ACKs) ──────────────

/** Comm channel IDs */
export const COMM_CHANNELS = Object.freeze({
  GENERAL: 'general',
  KITCHEN: 'kitchen',
  CASH: 'cash',
  ADMIN: 'admin',
});

/**
 * Channel config: label, which roles can see it, and their sort order.
 * Admin/superadmin see ALL channels.
 */
export const COMM_CHANNEL_CONFIG = Object.freeze([
  { id: COMM_CHANNELS.GENERAL, label: '#general', roles: ['admin', 'superadmin', 'kitchen', 'mozo', 'delivery', 'cajero', 'vendedor', 'dispatch'] },
  { id: COMM_CHANNELS.KITCHEN, label: '#cocina',  roles: ['admin', 'superadmin', 'kitchen'] },
  { id: COMM_CHANNELS.CASH,    label: '#caja-delivery', roles: ['admin', 'superadmin', 'cajero', 'delivery'] },
  { id: COMM_CHANNELS.ADMIN,   label: '#admin',    roles: ['admin', 'superadmin'] },
]);

/** Root RTDB path for comm messages under a branch: /branches/{branchId}/comm/{channel} */
export function commPath(branchId, channel, messageId) {
  const base = `${BRANCH_PREFIX(branchId)}/comm/${channel}`;
  return messageId ? `${base}/messages/${messageId}` : base;
}

/** Path for the readBy marker under a specific message */
export function commReadByPath(branchId, channel, messageId, userId) {
  return `${commPath(branchId, channel, messageId)}/readBy/${userId}`;
}

/** Channel IDs a given role can access (preserves COMM_CHANNEL_CONFIG order) */
export function getCommChannelsForRole(role) {
  return COMM_CHANNEL_CONFIG
    .filter((ch) => ch.roles.includes(role))
    .map((ch) => ch.id);
}

export function configKioskPath(branchId) {
  return `${BRANCH_PREFIX(branchId)}/config/kioskEnabled`;
}

export function configStationsPath(branchId) {
  return `${BRANCH_PREFIX(branchId)}/config/stations`;
}

export function tablesPath(branchId) {
  return `${BRANCH_PREFIX(branchId)}/tables`;
}

export function fcmTokensPath(branchId, userId) {
  const base = `${BRANCH_PREFIX(branchId)}/fcm_tokens`;
  return userId ? `${base}/${userId}` : base;
}

export function invoicesPath(branchId, invoiceKey) {
  const base = `${BRANCH_PREFIX(branchId)}/invoices`;
  return invoiceKey ? `${base}/${invoiceKey}` : base;
}

export function branchMetaPath(branchId) {
  return branchConfigPath(branchId);
}

export function fiscalPath(branchId, sub) {
  const base = branchConfigPath(branchId, 'fiscal');
  return sub ? `${base}/${sub}` : base;
}

export function fiscalCredentialsPath(branchId) {
  return branchConfigPath(branchId, 'fiscal/credentials');
}

export function invoiceCountersPath(branchId) {
  return branchConfigPath(branchId, 'invoiceCounters');
}

export function usersPath(userId) {
  const base = tenantPath('users');
  return userId ? `${base}/${userId}` : base;
}

export function membershipsPath(membershipId) {
  const base = tenantPath('memberships');
  return membershipId ? `${base}/${membershipId}` : base;
}

export function rolesPath() {
  return tenantPath('roles');
}

export function sessionsPath(token) {
  const base = tenantPath('sessions');
  return token ? `${base}/${token}` : base;
}

export function branchesConfigPath() {
  return 'branches_config';
}

export function branchesConfigByIdPath(branchId) {
  return `branches_config/${branchId}`;
}

export function storageProductImagesPath(branchId) {
  return `branches/${branchId || 'monteverde'}/product-images`;
}

export function storageCategoryImagesPath(branchId) {
  return `branches/${branchId || 'monteverde'}/category-images`;
}

export function storageVouchersPath(branchId) {
  return `branches/${branchId || 'monteverde'}/vouchers`;
}

export function storageYapeQrPath(branchId) {
  return `branches/${branchId || 'monteverde'}/yape-qr`;
}

export function storageOptionImagesPath(branchId) {
  return `branches/${branchId || 'monteverde'}/option-images`;
}

export function flashOfferPath(branchId) {
  return `${BRANCH_PREFIX(branchId)}/flash_offers`;
}

export function flashOfferItemsPath(branchId, offerId) {
  return `${BRANCH_PREFIX(branchId)}/flash_offers/${offerId}/items`;
}

export function flashOfferActivePath(branchId) {
  return `${BRANCH_PREFIX(branchId)}/flash_offers_active`;
}

// --- Marketing Module ---

export function marketingCampaignsPath(branchId, campaignId) {
  const base = `${BRANCH_PREFIX(branchId)}/marketing/campaigns`;
  return campaignId ? `${base}/${campaignId}` : base;
}

export function marketingCampaignCreativesPath(branchId, campaignId) {
  return `${BRANCH_PREFIX(branchId)}/marketing/campaigns/${campaignId}/creatives`;
}

export function marketingCampaignRulesPath(branchId, campaignId) {
  return `${BRANCH_PREFIX(branchId)}/marketing/campaigns/${campaignId}/rules`;
}

export function marketingCampaignAnalyticsPath(branchId, campaignId) {
  return `${BRANCH_PREFIX(branchId)}/marketing/campaigns/${campaignId}/analytics`;
}

export function marketingBannersPath(branchId, bannerId) {
  const base = `${BRANCH_PREFIX(branchId)}/marketing/banners`;
  return bannerId ? `${base}/${bannerId}` : base;
}

export function marketingPromosPath(branchId, promoId) {
  const base = `${BRANCH_PREFIX(branchId)}/marketing/promos`;
  return promoId ? `${base}/${promoId}` : base;
}

export function marketingTestimonialsPath(branchId, testimonialId) {
  const base = `${BRANCH_PREFIX(branchId)}/marketing/testimonials`;
  return testimonialId ? `${base}/${testimonialId}` : base;
}

export function marketingStatsPath(branchId) {
  return `${BRANCH_PREFIX(branchId)}/marketing/stats`;
}

// --- Vendedor Module ---

export function cuentasPath(branchId, cuentaId) {
  const base = `${BRANCH_PREFIX(branchId)}/cuentas`;
  return cuentaId ? `${base}/${cuentaId}` : base;
}
