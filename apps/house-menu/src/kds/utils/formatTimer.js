export function formatTimer(ms) {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60) % 60;
  const sec = totalSec % 60;
  const h = Math.floor(totalSec / 3600);
  if (h > 0) return `${h}h ${min}m`;
  return `${min}:${sec.toString().padStart(2, '0')}`;
}
