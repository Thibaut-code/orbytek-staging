export function filterProperties(items, filters) {
  return items.filter(
    (p) =>
      (!filters.location ||
        p.city.toLowerCase().includes(filters.location.toLowerCase())) &&
      (!filters.type || p.type === filters.type) &&
      (!filters.price || p.price <= Number(filters.price)) &&
      (!filters.area || p.area >= Number(filters.area)) &&
      (!filters.beds || p.beds >= Number(filters.beds)),
  );
}
export function landscapeEstimate(service, area, options = []) {
  const rates = {
    entretien: [1.5, 3],
    creation: [45, 95],
    terrasse: [95, 180],
    haies: [5, 12],
    arrosage: [12, 25],
    cloture: [65, 140],
    elagage: [150, 450],
    piscine: [250, 450],
  };
  const rate = rates[service];
  if (!rate || !Number.isFinite(Number(area)) || Number(area) <= 0) return null;
  const add = options.includes("evacuation") ? 180 : 0;
  return {
    min: Math.round(Number(area) * rate[0] + add),
    max: Math.round(Number(area) * rate[1] + add),
    unit:
      service === "elagage"
        ? "arbres"
        : ["haies", "cloture"].includes(service)
          ? "m linéaires"
          : "m²",
  };
}
export function cartTotal(cart, menu) {
  return Object.entries(cart).reduce(
    (sum, [id, quantity]) =>
      sum + (menu.find((p) => p.id === id)?.price || 0) * Number(quantity),
    0,
  );
}
export function calendarEvent({
  title,
  date,
  time,
  description = "",
  duration = 60,
}) {
  const start = new Date(`${date}T${time}:00`);
  if (Number.isNaN(start.getTime())) throw new Error("Date invalide");
  const stamp = (d) =>
    d
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}Z$/, "Z");
  const escape = (s) =>
    String(s)
      .replace(/\\/g, "\\\\")
      .replace(/\n/g, "\\n")
      .replace(/[,;]/g, (c) => `\\${c}`);
  return `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Orbytek//Demo//FR\r\nBEGIN:VEVENT\r\nUID:${stamp(start)}-${encodeURIComponent(title)}@orbytek\r\nDTSTAMP:${stamp(new Date())}\r\nDTSTART:${stamp(start)}\r\nDTEND:${stamp(new Date(start.getTime() + duration * 60000))}\r\nSUMMARY:${escape(title)}\r\nDESCRIPTION:${escape(description)}\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n`;
}
