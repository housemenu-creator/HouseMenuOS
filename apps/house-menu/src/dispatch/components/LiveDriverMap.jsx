import { useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Navigation, MapPin } from 'lucide-react';

/* ── Default center: Lima, Perú ─────────────────────────────── */
const DEFAULT_CENTER = { lat: -12.0464, lng: -77.0428 };
const DEFAULT_ZOOM = 13;

/* ── Custom driver marker (divIcon, no external images) ──────── */
function driverIcon(available, isSelected) {
  const color = available ? '#22c55e' : '#f59e0b';
  const size = isSelected ? 28 : 22;
  return L.divIcon({
    className: '',
    html: `<div style="
      width:${size}px; height:${size}px;
      background:${color};
      border:3px solid ${isSelected ? '#fff' : color};
      border-radius:50%;
      box-shadow:0 2px 8px rgba(0,0,0,.3);
      transition:all .2s;
    "></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

/* ── Auto-center & bounds ─────────────────────────────────── */
function MapBounds({ drivers }) {
  const map = useMap();
  const prevCount = useRef(0);

  const positions = useMemo(
    () => drivers.filter((d) => d.lastPosition?.lat && d.lastPosition?.lng),
    [drivers],
  );

  useEffect(() => {
    if (positions.length === 0) return;
    if (positions.length === prevCount.current) return;
    prevCount.current = positions.length;

    if (positions.length === 1) {
      map.setView([positions[0].lastPosition.lat, positions[0].lastPosition.lng], 15);
    } else {
      const bounds = L.latLngBounds(
        positions.map((d) => [d.lastPosition.lat, d.lastPosition.lng]),
      );
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 16 });
    }
  }, [positions, map]);

  return null;
}

/* ── Build lookup: driverId → assigned order ────────────────── */
function useDriverOrders(activeDrivers, enCaminoOrders) {
  return useMemo(() => {
    const map = {};
    for (const d of activeDrivers) {
      const order = enCaminoOrders.find((o) => o.driverId === d.id);
      if (order) map[d.id] = order;
    }
    return map;
  }, [activeDrivers, enCaminoOrders]);
}

/* ── Map Panel ──────────────────────────────────────────────── */
export default function LiveDriverMap({ drivers = [], enCaminoOrders = [], focusedDriverId = null, onFocusDriver = () => {}, branchCenter = null, className = '' }) {
  const activeDrivers = useMemo(
    () => drivers.filter((d) => d.active !== false && d.lastPosition?.lat && d.lastPosition?.lng),
    [drivers],
  );
  const driverOrders = useDriverOrders(activeDrivers, enCaminoOrders);

  const mapCenter = useMemo(() => {
    if (branchCenter?.lat && branchCenter?.lng) return [branchCenter.lat, branchCenter.lng];
    return [DEFAULT_CENTER.lat, DEFAULT_CENTER.lng];
  }, [branchCenter]);

  return (
    <div className={`relative rounded-xl overflow-hidden border border-cm-border shadow-cm-sm ${className}`}>
      <MapContainer
        center={mapCenter}
        zoom={DEFAULT_ZOOM}
        className="w-full h-full"
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapBounds drivers={activeDrivers} />

        {activeDrivers.map((driver) => {
          const assigned = driverOrders[driver.id];
          return (
            <Marker
              key={driver.id}
              position={[driver.lastPosition.lat, driver.lastPosition.lng]}
              icon={driverIcon(driver.available !== false, driver.id === focusedDriverId)}
              eventHandlers={{ click: () => onFocusDriver(driver.id === focusedDriverId ? null : driver.id) }}
            >
              <Popup>
                <div className="text-sm space-y-1.5 min-w-[160px]">
                  <p className="font-black text-cm-text">{driver.name}</p>
                  <div className="flex items-center gap-1.5 text-xs text-cm-text-secondary">
                    <Navigation className="w-3 h-3" />
                    {driver.available !== false ? 'Disponible' : 'En ruta'}
                  </div>
                  {driver.phone && (
                    <p className="text-xs text-cm-text-tertiary">{driver.phone}</p>
                  )}
                  {driver.totalDeliveries > 0 && (
                    <p className="text-xs text-cm-text-tertiary">
                      {driver.totalDeliveries} {driver.totalDeliveries === 1 ? 'entrega' : 'entregas'}
                    </p>
                  )}

                  {assigned && (
                    <div className="mt-2 pt-2 border-t border-cm-border space-y-1">
                      <p className="text-[10px] font-bold text-cm-text-tertiary uppercase">Pedido actual</p>
                      <p className="text-xs font-bold text-cm-text">
                        {assigned.customerName || 'Cliente'}
                      </p>
                      {assigned.location && (
                        <p className="text-[11px] text-cm-text-secondary flex items-start gap-1">
                          <MapPin className="w-3 h-3 mt-0.5 shrink-0" />
                          <span>{assigned.location}</span>
                        </p>
                      )}
                      <p className="text-[10px] text-cm-text-tertiary font-mono">
                        #{assigned.id?.slice(-4).toUpperCase()}
                      </p>
                    </div>
                  )}

                  <p className="text-[10px] text-cm-muted pt-1">
                    {new Date(driver.lastPosition.updatedAt).toLocaleTimeString('es-PE', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      <div className="absolute top-2 left-2 z-[1000] flex items-start gap-1.5 max-w-[70%]">
        <div className="bg-cm-surface/90 backdrop-blur-sm rounded-lg px-2.5 py-1.5 border border-cm-border shadow-cm-sm flex items-center gap-2">
          <MapPin className="w-3.5 h-3.5 text-cm-accent" />
          <span className="text-xs font-bold text-cm-text">
            {activeDrivers.length} rep{activeDrivers.length !== 1 ? 's' : ''} activo{activeDrivers.length !== 1 ? 's' : ''}
            {Object.keys(driverOrders).length > 0 && (
              <> · {Object.keys(driverOrders).length} ruta</>
            )}
          </span>
        </div>
      </div>
    </div>
  );
}
