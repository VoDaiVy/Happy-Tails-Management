import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { Clock } from "lucide-react";

/**
 * Generate time slots based on service type.
 * - Boarding services → 30-minute intervals
 * - All other services (spa, grooming, etc.) → 15-minute intervals
 */
function generateTimeSlots(serviceType, startHour, endHour) {
  const interval = serviceType === "boarding" ? 30 : 15;
  const slots = [];

  for (let h = startHour; h < endHour; h++) {
    for (let m = 0; m < 60; m += interval) {
      const hh = String(h).padStart(2, "0");
      const mm = String(m).padStart(2, "0");
      slots.push(`${hh}:${mm}`);
    }
  }
  // Add the closing hour exact slot (e.g. 17:00)
  const lastHH = String(endHour).padStart(2, "0");
  slots.push(`${lastHH}:00`);

  return slots;
}

const TimeSlotPicker = ({
  serviceType = "default",
  selectedTime,
  onChange,
  startHour = 8,
  endHour = 17,
  disabledSlots = [],
}) => {
  const slots = useMemo(
    () => generateTimeSlots(serviceType, startHour, endHour),
    [serviceType, startHour, endHour],
  );

  const interval = serviceType === "boarding" ? 30 : 15;

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
        <Clock size={16} className="text-[#5B8C51]" />
        Chọn giờ
        <span className="ml-auto text-xs font-normal text-gray-400">
          mỗi {interval} phút
        </span>
      </label>

      <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-1.5 max-h-48 overflow-y-auto pr-1">
        {slots.map((slot) => {
          const isSelected = selectedTime === slot;
          const isDisabled = disabledSlots.includes(slot);

          return (
            <motion.button
              key={slot}
              type="button"
              disabled={isDisabled}
              whileTap={!isDisabled ? { scale: 0.95 } : undefined}
              onClick={() => !isDisabled && onChange(slot)}
              className={`
                px-2 py-1.5 rounded-lg text-sm font-medium transition-colors
                ${
                  isSelected
                    ? "bg-[#FF8C00] text-white shadow-sm"
                    : isDisabled
                      ? "bg-gray-100 text-gray-300 line-through cursor-not-allowed"
                      : "bg-white border border-gray-200 text-gray-700 hover:border-[#FF8C00]/40 hover:bg-[#FF8C00]/5"
                }
              `}
            >
              {slot}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};

export default TimeSlotPicker;
