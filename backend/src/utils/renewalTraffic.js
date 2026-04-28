/** @param {string | Date} renewalDate */
export function renewalTrafficLight(renewalDate) {
  const d = new Date(renewalDate);
  if (Number.isNaN(d.getTime())) return "yellow";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  const diffMs = d.getTime() - today.getTime();
  const days = Math.ceil(diffMs / (86400 * 1000));
  if (days < 0) return "red";
  if (days <= 30) return "red";
  if (days <= 60) return "yellow";
  return "green";
}
