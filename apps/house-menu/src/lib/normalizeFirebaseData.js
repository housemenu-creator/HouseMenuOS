export function normalizeFirebaseData(obj) {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(normalizeFirebaseData);
  if (typeof obj !== 'object') return obj;

  const keys = Object.keys(obj);
  if (keys.length === 0) return obj;

  const isNumericArray = keys.every((k, i) => String(i) === k) && keys.length > 0;
  if (isNumericArray) {
    return keys.map((k) => normalizeFirebaseData(obj[k]));
  }

  const result = {};
  for (const key of keys) {
    result[key] = normalizeFirebaseData(obj[key]);
  }
  return result;
}
