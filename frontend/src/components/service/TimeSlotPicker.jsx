import { useEffect, useMemo, useState } from "react";

const SLOT_PREVIEW_LIMIT = 12;

const PERIODS = [
  { key: "morning", label: "Morning", start: 0, end: 12 * 60 },
  { key: "afternoon", label: "Afternoon", start: 12 * 60, end: 18 * 60 },
  { key: "evening", label: "Evening", start: 18 * 60, end: 24 * 60 },
];

export default function TimeSlotPicker({
  slots = [],
  bookedSlots = [],
  hiddenSlots = [],
  selectedSlot,
  onSelect,
  selectedDate,
  intervalMinutes = 15,
}) {
  const [activePeriod, setActivePeriod] = useState("morning");
  const [showAll, setShowAll] = useState(false);

  const todayStr = new Date().toISOString().split("T")[0];

  const dateType = !selectedDate
    ? "none"
    : selectedDate < todayStr
      ? "past"
      : selectedDate === todayStr
        ? "today"
        : "future";

  const toMinutes = (t) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };

  const hiddenSet = useMemo(() => new Set(hiddenSlots), [hiddenSlots]);

  // Slots from generateTimeSlots() are already in ascending order.
  let visibleSlots = [];
  if (dateType === "today") {
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    visibleSlots = slots.filter((s) => toMinutes(s) > nowMin);
  } else if (dateType === "future") {
    visibleSlots = [...slots];
  }

  visibleSlots = visibleSlots.filter((slot) => !hiddenSet.has(slot));

  const bookedSet = useMemo(() => new Set(bookedSlots), [bookedSlots]);

  const groupedSlots = useMemo(
    () =>
      PERIODS.reduce((acc, period) => {
        acc[period.key] = visibleSlots.filter((slot) => {
          const minutes = toMinutes(slot);
          return minutes >= period.start && minutes < period.end;
        });
        return acc;
      }, {}),
    [visibleSlots],
  );

  const availablePeriods = useMemo(
    () => PERIODS.filter((period) => (groupedSlots[period.key] || []).length > 0),
    [groupedSlots],
  );

  useEffect(() => {
    if (!availablePeriods.length) return;

    if (!availablePeriods.some((period) => period.key === activePeriod)) {
      setActivePeriod(availablePeriods[0].key);
    }
  }, [availablePeriods, activePeriod]);

  useEffect(() => {
    setShowAll(false);
  }, [activePeriod, selectedDate]);

  const activeSlots = groupedSlots[activePeriod] || [];
  const visibleCount = visibleSlots.length;
  const bookedCount = visibleSlots.filter((slot) => bookedSet.has(slot)).length;
  const hasMoreSlots = activeSlots.length > SLOT_PREVIEW_LIMIT;
  const renderedSlots = showAll
    ? activeSlots
    : activeSlots.slice(0, SLOT_PREVIEW_LIMIT);

  // ── No date selected: skeleton ──
  if (dateType === "none") {
    return (
      <div className="grid grid-cols-4 gap-1.5">
        {Array(8)
          .fill(null)
          .map((_, i) => (
            <div key={i} className="h-9 rounded-xl bg-gray-100 animate-pulse" />
          ))}
      </div>
    );
  }

  // ── Past date: error message ──
  if (dateType === "past") {
    return (
      <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-center">
        <p className="text-red-500 text-[13px] font-semibold">
          ⚠️ This date has already passed.
        </p>
        <p className="text-red-400 text-[12px] mt-0.5">
          Please select today or a future date.
        </p>
      </div>
    );
  }

  // ── Today but no more slots ──
  if (visibleSlots.length === 0) {
    const isPetConflictFiltered = hiddenSlots.length > 0;
    return (
      <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-center">
        <p className="text-amber-600 text-[13px] font-semibold">
          {isPetConflictFiltered
            ? "No available slots for this pet on the selected date."
            : "No more slots available for today."}
        </p>
        <p className="text-amber-500 text-[12px] mt-0.5">
          {isPetConflictFiltered
            ? "Try another date or choose a different pet."
            : "Please select a future date to continue."}
        </p>
      </div>
    );
  }

  // ── Compact grouped slot grid ──
  return (
    <div>
      <p className="text-[11px] text-gray-400 font-medium mb-2">
        <span className="font-bold text-[#1F2A37]/60">{visibleCount}</span>{" "}
        slot{visibleCount !== 1 ? "s" : ""} available
        {bookedCount > 0 && (
          <span className="text-gray-300"> · {bookedCount} booked</span>
        )}
        {dateType === "today" && (
          <span className="text-gray-300 ml-1">· from now</span>
        )}
      </p>

      {availablePeriods.length > 1 && (
        <div className="mb-2 flex items-center gap-1.5 flex-wrap">
          {availablePeriods.map((period) => {
            const totalInPeriod = (groupedSlots[period.key] || []).length;
            const availableInPeriod = (groupedSlots[period.key] || []).filter(
              (slot) => !bookedSet.has(slot),
            ).length;
            const isActive = activePeriod === period.key;

            return (
              <button
                key={period.key}
                type="button"
                onClick={() => setActivePeriod(period.key)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all border ${
                  isActive
                    ? "bg-[#E07A5F] text-white border-[#E07A5F] shadow-sm"
                    : "bg-white text-[#1F2A37]/60 border-gray-200 hover:border-[#E07A5F]/50 hover:text-[#E07A5F]"
                }`}
              >
                {period.label} ({availableInPeriod}/{totalInPeriod})
              </button>
            );
          })}
        </div>
      )}

      <div
        className={`grid grid-cols-3 sm:grid-cols-4 gap-1.5 ${
          showAll ? "max-h-[210px] overflow-y-auto pr-0.5" : "overflow-hidden"
        }`}
      >
        {renderedSlots.map((slot) => {
          const booked = bookedSet.has(slot);
          const selected = selectedSlot === slot;
          return (
            <button
              key={slot}
              type="button"
              disabled={booked}
              onClick={() => !booked && onSelect(slot)}
              title={booked ? `${slot} — Fully booked` : `Book at ${slot}`}
              className={[
                "py-2 text-[11px] font-bold rounded-xl border-2 transition-all duration-150 leading-none text-center w-full",
                selected
                  ? "bg-[#E07A5F] text-white border-[#E07A5F] shadow-md shadow-[#E07A5F]/25 scale-[1.04]"
                  : booked
                    ? "bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed line-through decoration-gray-300"
                    : "bg-white border border-gray-200 text-[#1F2A37] hover:border-[#E07A5F] hover:text-[#E07A5F] cursor-pointer active:scale-95",
              ].join(" ")}
            >
              {slot}
            </button>
          );
        })}
      </div>

      {hasMoreSlots && (
        <button
          type="button"
          onClick={() => setShowAll((prev) => !prev)}
          className="mt-2 w-full rounded-lg border border-[#E07A5F]/25 bg-[#E07A5F]/5 py-1.5 text-[11px] font-semibold text-[#E07A5F] hover:bg-[#E07A5F]/10 transition-colors"
        >
          {showAll
            ? "Show fewer slots"
            : `Show ${activeSlots.length - SLOT_PREVIEW_LIMIT} more slots`}
        </button>
      )}
    </div>
  );
}
