const toNumber = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const normalizeCartItem = (item = {}) => {
  const type = item.type || (item.roomId ? "stay" : "service");
  const quantity = Math.max(1, toNumber(item.quantity, 1));
  const unitPrice = Math.max(0, toNumber(item.unitPrice ?? item.price, 0));
  const duration = Math.max(0, toNumber(item.duration, 0));
  const durationUnit = type === "stay" ? "days" : "minutes";

  return {
    ...item,
    type,
    quantity,
    unitPrice,
    price: unitPrice,
    duration,
    durationUnit,
    subtotal: type === "stay" ? unitPrice * duration : unitPrice * quantity,
  };
};

const calculateCartSummary = (items = []) => {
  const normalizedItems = items.map(normalizeCartItem);

  const summary = {
    serviceSubtotal: 0,
    staySubtotal: 0,
    serviceDurationTotal: 0,
    stayDurationTotal: 0,
    grandTotal: 0,
    totalItems: 0,
  };

  normalizedItems.forEach((item) => {
    summary.totalItems += item.quantity;
    if (item.type === "stay") {
      summary.staySubtotal += item.subtotal;
      summary.stayDurationTotal += item.duration * item.quantity;
      return;
    }

    summary.serviceSubtotal += item.subtotal;
    summary.serviceDurationTotal += item.duration * item.quantity;
  });

  summary.grandTotal = summary.serviceSubtotal + summary.staySubtotal;

  return { normalizedItems, summary };
};

const isDateInPast = (date, now = new Date()) => {
  const dt = new Date(date);
  if (Number.isNaN(dt.getTime())) return true;
  return dt.getTime() < now.getTime();
};

const isServiceSlotSelectable = ({ serviceId, slotKey, occupancyByServiceSlot = {}, capacityByService = {} }) => {
  const serviceCapacity = Math.max(1, toNumber(capacityByService[serviceId], 1));
  const occupied = Math.max(0, toNumber(occupancyByServiceSlot[`${serviceId}:${slotKey}`], 0));
  return occupied < serviceCapacity;
};

const isAppointmentWithinStay = ({ appointmentDate, checkInDate, checkOutDate }) => {
  const appt = new Date(appointmentDate);
  const checkIn = new Date(checkInDate);
  const checkOut = new Date(checkOutDate);

  if ([appt, checkIn, checkOut].some((d) => Number.isNaN(d.getTime()))) {
    return false;
  }

  return appt >= checkIn && appt < checkOut;
};

module.exports = {
  normalizeCartItem,
  calculateCartSummary,
  isDateInPast,
  isServiceSlotSelectable,
  isAppointmentWithinStay,
};
