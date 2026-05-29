const CURRENCY = 'S/ ';
const LOCALE = 'es-PE';

export function formatCurrency(amount) {
  const num = Number(amount || 0);
  return `${CURRENCY}${num.toFixed(2)}`;
}

export function formatOrderId(id) {
  if (!id) return '#----';
  return `#${String(id).slice(-4).toUpperCase()}`;
}

export function formatDate(date, options = {}) {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '';
  const defaults = { day: 'numeric', month: 'short' };
  return d.toLocaleDateString(LOCALE, { ...defaults, ...options });
}

export function formatTime(date, options = {}) {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '';
  const defaults = { hour: '2-digit', minute: '2-digit' };
  return d.toLocaleTimeString(LOCALE, { ...defaults, ...options });
}

export function formatDateTime(date, options = {}) {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '';
  const defaults = { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' };
  return d.toLocaleString(LOCALE, { ...defaults, ...options });
}

export function formatDateShort(date) {
  return formatDate(date, { day: 'numeric', month: 'numeric' });
}

export function formatDateLong(date) {
  return formatDate(date, { weekday: 'long', day: 'numeric', month: 'long' });
}

export function formatTimeShort(date) {
  return formatTime(date, { hour: '2-digit', minute: '2-digit' });
}

export function todayISO() {
  return new Date().toISOString().split('T')[0];
}

export function nowISO() {
  return new Date().toISOString();
}

export function formatPhone(phone) {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 9) return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  if (digits.length === 7) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
  return phone;
}
