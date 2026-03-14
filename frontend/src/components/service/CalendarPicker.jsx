import { useState, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight, CalendarDays, X } from "lucide-react";

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function fmt(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d} ${MONTHS[Number(m) - 1]} ${y}`;
}

function fmtCompact(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d} ${MONTHS_SHORT[Number(m) - 1]} ${y}`;
}

const toDateAtStart = (iso) => {
  if (!iso) return null;
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  d.setHours(0, 0, 0, 0);
  return d;
};

export default function CalendarPicker({
  selectedDate,
  onChange,
  minDate,
  placeholder = "Select a date...",
  disabled = false,
  compact = false,
}) {
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(() => new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth());
  const wrapRef = useRef(null);

  const todayObj = new Date();
  todayObj.setHours(0, 0, 0, 0);

  const minObjFromProp = toDateAtStart(minDate);
  const minObj =
    minObjFromProp && minObjFromProp > todayObj ? minObjFromProp : todayObj;

  useEffect(() => {
    if (!open) return;
    if (selectedDate) return;
    setViewYear(minObj.getFullYear());
    setViewMonth(minObj.getMonth());
  }, [open, minObj, selectedDate]);

  /* close on outside click */
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target))
        setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const isPrevDisabled =
    viewYear === minObj.getFullYear() && viewMonth === minObj.getMonth();

  const prevMonth = () => {
    if (isPrevDisabled) return;
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else setViewMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else setViewMonth((m) => m + 1);
  };

  const firstDow = new Date(viewYear, viewMonth, 1).getDay();
  const offset = firstDow === 0 ? 6 : firstDow - 1;
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells = [
    ...Array(offset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const selectedObj = selectedDate
    ? new Date(selectedDate + "T00:00:00")
    : null;

  const select = (day) => {
    if (!day) return;
    const cellDate = new Date(viewYear, viewMonth, day);
    cellDate.setHours(0, 0, 0, 0);
    if (cellDate < minObj) return;
    const mm = String(viewMonth + 1).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    onChange(`${viewYear}-${mm}-${dd}`);
    setOpen(false);
  };

  const goMinDate = () => {
    const iso = minObj.toISOString().split("T")[0];
    onChange(iso);
    setViewYear(minObj.getFullYear());
    setViewMonth(minObj.getMonth());
    setOpen(false);
  };

  const clear = (e) => {
    e.stopPropagation();
    onChange("");
  };

  const displayDate = selectedDate
    ? compact
      ? fmtCompact(selectedDate)
      : fmt(selectedDate)
    : placeholder;

  return (
    <div ref={wrapRef} className="relative w-full">
      {/* ── Trigger ── */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (disabled) return;
          setOpen((v) => !v);
        }}
        className={`w-full flex items-center gap-2.5 rounded-xl border bg-gray-50 px-3.5 py-2.5 text-sm transition-all
          ${
            disabled
              ? "border-gray-200 text-gray-300 cursor-not-allowed"
              : open
                ? "border-[#E07A5F] ring-2 ring-[#E07A5F]/20"
                : "border-gray-200 hover:border-[#E07A5F]/50"
          }`}
      >
        <CalendarDays
          size={16}
          className={selectedDate ? "text-[#E07A5F]" : "text-gray-400"}
        />
        <span
          className={`flex-1 text-left ${
            selectedDate
              ? "text-[#1F2A37] font-semibold"
              : disabled
                ? "text-gray-300"
                : "text-gray-400"
          } ${compact ? "text-[13px] whitespace-nowrap overflow-hidden text-ellipsis" : ""}`}
        >
          {displayDate}
        </span>
        {selectedDate && !disabled ? (
          <X
            size={14}
            className="text-gray-400 hover:text-gray-600 transition flex-shrink-0"
            onClick={clear}
          />
        ) : (
          <ChevronRight
            size={14}
            className={`text-gray-400 transition-transform ${open ? "rotate-90" : ""}`}
          />
        )}
      </button>

      {/* ── Dropdown calendar ── */}
      {open && (
        <div className="absolute left-0 top-[calc(100%+8px)] z-50 w-full rounded-2xl bg-white border border-gray-200 shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Month header */}
          <div className="flex items-center justify-between px-3 py-2 bg-[#1F2A37]">
            <button
              onClick={prevMonth}
              disabled={isPrevDisabled}
              className={`rounded-full p-1.5 transition ${isPrevDisabled ? "text-white/20 cursor-not-allowed" : "text-white/60 hover:text-white hover:bg-white/10"}`}
            >
              <ChevronLeft size={14} />
            </button>
            <span className="text-xs font-bold text-white tracking-wide">
              {MONTHS[viewMonth]} {viewYear}
            </span>
            <button
              onClick={nextMonth}
              className="rounded-full p-1.5 text-white/60 hover:text-white hover:bg-white/10 transition"
            >
              <ChevronRight size={14} />
            </button>
          </div>

          {/* Weekday labels */}
          <div className="grid grid-cols-7 bg-[#F5F1EB] border-b border-gray-100">
            {WEEKDAYS.map((d) => (
              <div
                key={d}
                className="py-0.5 text-center text-[9px] font-extrabold text-gray-400 uppercase tracking-wider"
              >
                {d}
              </div>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7 p-1.5">
            {cells.map((day, i) => {
              if (!day) return <div key={`p${i}`} />;
              const cellDate = new Date(viewYear, viewMonth, day);
              cellDate.setHours(0, 0, 0, 0);
              const isPast = cellDate < minObj;
              const isToday = cellDate.getTime() === todayObj.getTime();
              const isSel =
                selectedObj && cellDate.getTime() === selectedObj.getTime();
              const isWeekend =
                cellDate.getDay() === 0 || cellDate.getDay() === 6;

              return (
                <button
                  key={day}
                  disabled={isPast}
                  onClick={() => select(day)}
                  className={[
                    "mx-auto flex h-6 w-6 items-center justify-center rounded-full text-[11px] select-none transition-all duration-100",
                    isPast ? "text-gray-300 cursor-not-allowed" : "",
                    isSel ? "bg-[#E07A5F] text-white font-bold shadow-md" : "",
                    isToday && !isSel
                      ? "ring-2 ring-[#E07A5F] text-[#E07A5F] font-bold"
                      : "",
                    !isPast && !isSel && isWeekend
                      ? "text-[#E07A5F]/70 font-medium"
                      : "",
                    !isPast && !isSel && !isWeekend
                      ? "text-gray-700 font-medium"
                      : "",
                    !isPast && !isSel
                      ? "hover:bg-[#E07A5F]/10 hover:text-[#E07A5F]"
                      : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-100 px-3 py-1.5 flex justify-end">
            <button
              onClick={goMinDate}
              className="text-xs font-semibold text-[#E07A5F] hover:underline transition"
            >
              {minObj.getTime() === todayObj.getTime() ? "Today" : "Earliest"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
