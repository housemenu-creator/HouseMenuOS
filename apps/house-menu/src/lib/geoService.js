const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export const geoService = {
  async geocodeAddress(address) {
    if (!address || address.trim().length < 5) return null;
    try {
      const url = `${NOMINATIM_URL}?format=json&limit=1&q=${encodeURIComponent(address)}`;
      const res = await fetch(url, { headers: { 'User-Agent': 'HouseMenuApp/1.0' } });
      if (!res.ok) return null;
      const data = await res.json();
      if (!data || data.length === 0) return null;
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), displayName: data[0].display_name };
    } catch {
      return null;
    }
  },

  calcKm(fromLat, fromLng, toLat, toLng) {
    const km = haversineKm(fromLat, fromLng, toLat, toLng);
    return Math.round(km * 10) / 10;
  },

  formatDistance(km) {
    if (km < 1) return `${Math.round(km * 1000)} m`;
    return `${km.toFixed(1)} km`;
  },

  calcDeliveryFee(km, config = {}) {
    const { tarifaBase = 3.5, precioPorKm = 1, kmGratis = 1 } = config;
    const kmCobrables = Math.max(0, km - kmGratis);
    return tarifaBase + kmCobrables * precioPorKm;
  },
};
