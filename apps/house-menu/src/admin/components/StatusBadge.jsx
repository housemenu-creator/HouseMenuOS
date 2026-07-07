const STATUS_MAP = {
  pendiente_pago: { label: 'Pend. Pago', cls: 'bdg-neutral' },
  recibido:   { label: 'Recibido',    cls: 'bdg-error' },
  preparando: { label: 'En Cocina',   cls: 'bdg-warning' },
  listo:      { label: 'Listo',       cls: 'bdg-accent' },
  en_camino:  { label: 'En Camino',   cls: 'bdg-info' },
  entregado:  { label: 'Entregado',   cls: 'bdg-success' },
  cancelado:  { label: 'Cancelado',   cls: 'bdg-neutral' },
  programado: { label: 'Programado',  cls: 'bdg-info' },
};

export default function StatusBadge({ status }) {
  const s = STATUS_MAP[status] ?? { label: status, cls: 'bdg-neutral' };
  return <span className={`bdg ${s.cls}`}>{s.label}</span>;
}
