/**
 * @house/validation — Validación compartida para todo House Portal OS
 *
 * Funciones de validación simple + Zod schemas para modelos de dominio.
 *
 * Funciones retornan { valid, error } donde:
 *   valid  → boolean
 *   error  → string | null (mensaje en español listo para mostrar al usuario)
 *
 * Schemas retornan { success, data, error } con parse(schema, data).
 */

// ── Zod schemas (domain models) ──────────────────────────

export {
  BranchSchema,
  EmployeeSchema,
  CustomerSchema,
  MenuProductSchema,
  OrderSchema,
  AttendanceSchema,
  AgentTaskSchema,
  parse,
} from './src/schemas.js';

// ── Helpers ──────────────────────────────────────────────

const RE = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^[+]?\d{7,15}$/,
  time: /^([01]\d|2[0-3]):([0-5]\d)$/,
  latitude: /^-?(?:[0-8]?\d(?:\.\d+)?|90(?:\.0+)?)$/,
  longitude: /^-?(?:1[0-7]\d|\d{1,2})(?:\.\d+)?|180(?:\.0+)?$/,
  timeHHMM: /^([01]\d|2[0-3]):[0-5]\d$/,
};

// ── Validadores ─────────────────────────────────────────

/**
 * Valida formato de email.
 * Vacío se considera válido (usar isRequired() aparte si es obligatorio).
 */
export function isEmail(value) {
  if (!value || !value.trim()) return { valid: true, error: null };
  return RE.email.test(value.trim())
    ? { valid: true, error: null }
    : { valid: false, error: 'Ingresa un correo válido (ej. usuario@correo.com)' };
}

/**
 * Valida formato de teléfono (7-15 dígitos, opcional + al inicio).
 * Vacío se considera válido.
 */
export function isPhone(value) {
  if (!value || !value.trim()) return { valid: true, error: null };
  return RE.phone.test(value.trim())
    ? { valid: true, error: null }
    : { valid: false, error: 'Ingresa un teléfono válido (ej. 999888777)' };
}

/**
 * Valida hora en formato HH:MM (24h).
 */
export function isTime(value) {
  if (!value || !value.trim()) return { valid: false, error: 'Ingresa una hora válida' };
  return RE.timeHHMM.test(value.trim())
    ? { valid: true, error: null }
    : { valid: false, error: 'Formato de hora inválido (usa HH:MM, ej. 14:30)' };
}

/**
 * Valida que un rango horario tenga sentido (end > start).
 */
export function isValidTimeRange(start, end) {
  const s = isTime(start);
  if (!s.valid) return s;
  const e = isTime(end);
  if (!e.valid) return e;
  return start.trim() < end.trim()
    ? { valid: true, error: null }
    : { valid: false, error: 'La hora de fin debe ser mayor a la hora de inicio' };
}

/**
 * Valida latitud (-90 a 90).
 */
export function isLatitude(value) {
  if (!value || !value.trim()) return { valid: false, error: 'Ingresa una latitud' };
  const n = parseFloat(value);
  if (isNaN(n)) return { valid: false, error: 'La latitud debe ser un número' };
  return n >= -90 && n <= 90
    ? { valid: true, error: null }
    : { valid: false, error: 'La latitud debe estar entre -90 y 90' };
}

/**
 * Valida longitud (-180 a 180).
 */
export function isLongitude(value) {
  if (!value || !value.trim()) return { valid: false, error: 'Ingresa una longitud' };
  const n = parseFloat(value);
  if (isNaN(n)) return { valid: false, error: 'La longitud debe ser un número' };
  return n >= -180 && n <= 180
    ? { valid: true, error: null }
    : { valid: false, error: 'La longitud debe estar entre -180 y 180' };
}

/**
 * Valida que un valor sea un número positivo (> 0).
 */
export function isPositiveNumber(value, label = 'Valor') {
  const n = parseFloat(value);
  if (isNaN(n)) return { valid: false, error: `${label} debe ser un número` };
  return n > 0
    ? { valid: true, error: null }
    : { valid: false, error: `${label} debe ser mayor a cero` };
}

/**
 * Valida que un número no sea negativo (>= 0).
 */
export function isNonNegativeNumber(value, label = 'Valor') {
  const n = parseFloat(value);
  if (isNaN(n)) return { valid: false, error: `${label} debe ser un número` };
  return n >= 0
    ? { valid: true, error: null }
    : { valid: false, error: `${label} no puede ser negativo` };
}

/**
 * Valida que un entero sea positivo.
 */
export function isPositiveInt(value, label = 'Valor') {
  const n = parseInt(value, 10);
  if (isNaN(n) || String(n) !== String(value).trim()) return { valid: false, error: `${label} debe ser un número entero` };
  return n > 0
    ? { valid: true, error: null }
    : { valid: false, error: `${label} debe ser mayor a cero` };
}

/**
 * Valida que un campo no esté vacío.
 */
export function isRequired(value, label = 'Este campo') {
  return value && value.trim().length > 0
    ? { valid: true, error: null }
    : { valid: false, error: `${label} es obligatorio` };
}

/**
 * Valida DNI / cédula (8 dígitos para Perú).
 */
export function isDNI(value) {
  if (!value || !value.trim()) return { valid: false, error: 'Ingresa un DNI' };
  return /^\d{8}$/.test(value.trim())
    ? { valid: true, error: null }
    : { valid: false, error: 'El DNI debe tener 8 dígitos' };
}

/**
 * Valida que una fecha sea futura (opcional: comparar contra hoy).
 */
export function isFutureDate(dateStr, label = 'Fecha') {
  if (!dateStr) return { valid: false, error: `${label} es obligatoria` };
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return { valid: false, error: `${label} inválida` };
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return d >= now
    ? { valid: true, error: null }
    : { valid: false, error: `${label} debe ser hoy o una fecha futura` };
}
