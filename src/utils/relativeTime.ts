const minute = 60 * 1000;
const hour = 60 * minute;
const day = 24 * hour;

export function RelativeTime_ago(timestamp: number, now: number): string {
  const diff = Math.max(0, now - timestamp);
  if (diff < minute) {
    return "just now";
  }
  if (diff < hour) {
    return `${Math.floor(diff / minute)}m ago`;
  }
  if (diff < day) {
    return `${Math.floor(diff / hour)}h ago`;
  }
  const days = Math.floor(diff / day);
  if (days === 1) {
    return "yesterday";
  }
  if (days < 7) {
    return `${days}d ago`;
  }
  if (days < 30) {
    return `${Math.floor(days / 7)}w ago`;
  }
  return `${Math.floor(days / 30)}mo ago`;
}
