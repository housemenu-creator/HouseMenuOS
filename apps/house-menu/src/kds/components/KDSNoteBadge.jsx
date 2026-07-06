/**
 * Small badge showing note count on KDS ticket
 */
export default function KDSNoteBadge({ count, onClick }) {
  if (!count || count === 0) return null;

  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-cm-warning/15 border border-cm-warning/25 text-cm-warning text-[9px] font-bold hover:bg-cm-warning/25 transition-all"
      title={`${count} nota${count > 1 ? 's' : ''}`}
    >
      📝 {count}
    </button>
  );
}