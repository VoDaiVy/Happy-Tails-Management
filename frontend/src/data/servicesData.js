export const generateTimeSlots = (intervalMinutes) => {
  const slots = [];
  const START = 8 * 60; // 08:00
  const END = 23 * 60; // 23:00 (exclusive)
  for (let t = START; t < END; t += intervalMinutes) {
    const h = Math.floor(t / 60);
    const m = t % 60;
    slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
  }
  return slots;
};

// Keep URL slugs stable without relying on local mock service data.
export const slugifyServiceName = (name = "") =>
  name
    .toLowerCase()
    .trim()
    .replace(/&/g, " ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
