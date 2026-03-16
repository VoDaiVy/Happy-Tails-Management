const {
  calculateCartSummary,
  isDateInPast,
  isServiceSlotSelectable,
  isAppointmentWithinStay,
} = require("../utils/cartBookingRules");

describe("cart/booking business rules", () => {
  test("calculates totals for multiple services", () => {
    const { summary } = calculateCartSummary([
      {
        type: "service",
        name: "Bath",
        unitPrice: 100000,
        duration: 30,
        quantity: 2,
      },
      {
        type: "service",
        name: "Nail",
        unitPrice: 50000,
        duration: 15,
        quantity: 1,
      },
    ]);

    expect(summary.serviceSubtotal).toBe(250000);
    expect(summary.serviceDurationTotal).toBe(75);
    expect(summary.staySubtotal).toBe(0);
    expect(summary.grandTotal).toBe(250000);
  });

  test("calculates totals for service + stay combo", () => {
    const { summary } = calculateCartSummary([
      {
        type: "service",
        unitPrice: 120000,
        duration: 45,
        quantity: 1,
      },
      {
        type: "stay",
        unitPrice: 300000,
        duration: 2,
        quantity: 1,
      },
    ]);

    expect(summary.serviceSubtotal).toBe(120000);
    expect(summary.staySubtotal).toBe(600000);
    expect(summary.serviceDurationTotal).toBe(45);
    expect(summary.stayDurationTotal).toBe(2);
    expect(summary.grandTotal).toBe(720000);
  });

  test("rejects past date", () => {
    const now = new Date("2026-03-15T10:00:00.000Z");
    expect(isDateInPast("2026-03-14T10:00:00.000Z", now)).toBe(true);
    expect(isDateInPast("2026-03-15T10:15:00.000Z", now)).toBe(false);
  });

  test("service A full at 09:00 but service B still selectable at 09:00", () => {
    const occupancyByServiceSlot = {
      "serviceA:09:00": 1,
      "serviceB:09:00": 0,
    };

    const capacityByService = {
      serviceA: 1,
      serviceB: 1,
    };

    expect(
      isServiceSlotSelectable({
        serviceId: "serviceA",
        slotKey: "09:00",
        occupancyByServiceSlot,
        capacityByService,
      }),
    ).toBe(false);

    expect(
      isServiceSlotSelectable({
        serviceId: "serviceB",
        slotKey: "09:00",
        occupancyByServiceSlot,
        capacityByService,
      }),
    ).toBe(true);
  });

  test("appointment must be inside stay range for combo", () => {
    expect(
      isAppointmentWithinStay({
        appointmentDate: "2026-03-20T09:00:00.000Z",
        checkInDate: "2026-03-19T12:00:00.000Z",
        checkOutDate: "2026-03-22T10:00:00.000Z",
      }),
    ).toBe(true);

    expect(
      isAppointmentWithinStay({
        appointmentDate: "2026-03-23T09:00:00.000Z",
        checkInDate: "2026-03-19T12:00:00.000Z",
        checkOutDate: "2026-03-22T10:00:00.000Z",
      }),
    ).toBe(false);
  });
});
