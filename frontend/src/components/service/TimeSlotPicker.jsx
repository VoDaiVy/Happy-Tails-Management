export default function TimeSlotPicker({
  slots = [],
  bookedSlots = [],
  selectedSlot,
  onSelect,
  selectedDate,
  intervalMinutes = 15,
}) {
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

  // slots from generateTimeSlots() are already in ascending order — never re-sort
  let visibleSlots = [];
  if (dateType === "today") {
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    visibleSlots = slots.filter((s) => toMinutes(s) > nowMin);
  } else if (dateType === "future") {
    visibleSlots = [...slots];
  }

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
    return (
      <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-center">
        <p className="text-amber-600 text-[13px] font-semibold">
          ⏰ No more slots available for today.
        </p>
        <p className="text-amber-500 text-[12px] mt-0.5">
          Please select a future date to continue.
        </p>
      </div>
    );
  }

  // ── Flat 4-column grid — full HH:MM per card ──
  return (
    <div>
      <p className="text-[11px] text-gray-400 font-medium mb-2">
        <span className="font-bold text-[#1F2A37]/60">
          {visibleSlots.length}
        </span>{" "}
        slot{visibleSlots.length !== 1 ? "s" : ""} available
        {dateType === "today" && (
          <span className="text-gray-300 ml-1">· from now</span>
        )}
      </p>
      <div className="grid grid-cols-4 gap-1.5 max-h-[210px] overflow-y-auto pr-0.5">
        {visibleSlots.map((slot) => {
          const booked = bookedSlots.includes(slot);
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
    </div>
  );
}
