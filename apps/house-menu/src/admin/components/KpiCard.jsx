export default function KpiCard({ label, value, sub, icon, iconClass }) {
  return (
    <div className="bg-cm-surface rounded-xl shadow-cm-sm p-[--cm-space-md]">
      <div className="flex justify-between items-start mb-3">
        <span className="text-[0.65rem] font-semibold text-cm-text-secondary uppercase tracking-wider">{label}</span>
        {icon && <div className={`p-2 rounded-full ${iconClass || 'bg-cm-accent/10 text-cm-accent'}`}>{icon}</div>}
      </div>
      <p className="text-2xl font-extrabold tracking-tight text-cm-text">{value}</p>
      {sub && <p className="text-xs font-semibold text-cm-text-secondary mt-2">{sub}</p>}
    </div>
  );
}
