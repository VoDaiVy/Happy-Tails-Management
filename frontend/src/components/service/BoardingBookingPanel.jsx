import { useEffect, useMemo, useState } from "react";
import {
  Calendar,
  Clock,
  PawPrint,
  Plus,
  CheckCircle2,
  Lock,
  AlertCircle,
  ChevronRight,
  ArrowRightLeft,
} from "lucide-react";
import { getMyPets } from "../../api/petApi";
import { getMyBookings } from "../../api/bookingApi";
import CalendarPicker from "./CalendarPicker";

const BOARDING_OPEN_MINUTES = 8 * 60; // 08:00
const BOARDING_CLOSE_MINUTES = 23 * 60; // 23:00 (exclusive start)
const BOARDING_SLOT_INTERVAL = 15;

const ROOM_NIGHT_CAPACITY = {
  standard: 4,
  vip: 2,
};

const toIsoDate = (date) => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
  return date.toISOString().split("T")[0];
};

const addDaysIso = (isoDate, days) => {
  if (!isoDate) return "";
  const d = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "";
  d.setDate(d.getDate() + days);
  return toIsoDate(d);
};

const slotToMinutes = (slot) => {
  const [h, m] = slot.split(":").map(Number);
  return h * 60 + m;
};

const minutesToSlot = (minutes) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

const roundUpToIntervalMinutes = (date, interval) => {
  const current = date.getHours() * 60 + date.getMinutes();
  return Math.ceil(current / interval) * interval;
};

const buildCheckInSlots = () => {
  const slots = [];
  for (
    let t = BOARDING_OPEN_MINUTES;
    t < BOARDING_CLOSE_MINUTES;
    t += BOARDING_SLOT_INTERVAL
  ) {
    slots.push(minutesToSlot(t));
  }
  return slots;
};

const CHECK_IN_SLOTS = buildCheckInSlots();

const getStayNightDates = (checkInDate, checkOutDate) => {
  if (!checkInDate || !checkOutDate || checkOutDate <= checkInDate) return [];

  const nights = [];
  const cursor = new Date(`${checkInDate}T00:00:00`);
  const end = new Date(`${checkOutDate}T00:00:00`);

  while (cursor < end) {
    nights.push(toIsoDate(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return nights;
};

const rangesOverlap = (startA, endA, startB, endB) => {
  if (!startA || !endA || !startB || !endB) return false;
  return startA < endB && startB < endA;
};

const buildMockNightlyInventory = (todayIso) => ({
  standard: {
    [addDaysIso(todayIso, 3)]: ROOM_NIGHT_CAPACITY.standard,
  },
  vip: {
    [addDaysIso(todayIso, 2)]: ROOM_NIGHT_CAPACITY.vip,
  },
});

const StepLabel = ({ icon, label, step, locked }) => {
  const IconComponent = icon;

  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#E07A5F]/10 text-[#E07A5F] text-xs font-bold">
        {step}
      </span>
      <IconComponent size={15} className="text-[#E07A5F]" />
      <span className="text-sm font-semibold text-[#1F2A37]">{label}</span>
      {locked && <Lock size={13} className="ml-auto text-gray-300" />}
    </div>
  );
};

const Divider = () => <hr className="border-dashed border-gray-200 my-4" />;

export default function BoardingBookingPanel({
  roomType,
  roomTitle,
  pricePerNight,
}) {
  const [checkInDate, setCheckInDate] = useState("");
  const [checkInTime, setCheckInTime] = useState("");
  const [checkOutDate, setCheckOutDate] = useState("");
  const [selectedPet, setSelectedPet] = useState("");
  const [notes, setNotes] = useState("");

  const [pets, setPets] = useState([]);
  const [petsLoading, setPetsLoading] = useState(false);
  const [petStays, setPetStays] = useState([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState("");

  const todayStr = toIsoDate(new Date());
  const hasToken = Boolean(localStorage.getItem("accessToken"));

  // TODO: Replace with real room inventory endpoint by date-range.
  const [nightlyBookedByType] = useState(() =>
    buildMockNightlyInventory(toIsoDate(new Date())),
  );

  const minCheckOutDate = checkInDate
    ? addDaysIso(checkInDate, 1)
    : addDaysIso(todayStr, 1);

  const visibleCheckInSlots = useMemo(() => {
    if (!checkInDate) return [];

    if (checkInDate !== todayStr) return CHECK_IN_SLOTS;

    const nextQuarter = roundUpToIntervalMinutes(
      new Date(),
      BOARDING_SLOT_INTERVAL,
    );
    const threshold = Math.max(BOARDING_OPEN_MINUTES, nextQuarter);

    return CHECK_IN_SLOTS.filter((slot) => slotToMinutes(slot) >= threshold);
  }, [checkInDate, todayStr]);

  // TODO: Replace with intake capacity per check-in datetime.
  const unavailableCheckInSlots = useMemo(() => new Set(), []);

  const stayNightDates = useMemo(
    () => getStayNightDates(checkInDate, checkOutDate),
    [checkInDate, checkOutDate],
  );

  const nights = stayNightDates.length;
  const totalPrice = nights * pricePerNight;

  const unavailableNights = useMemo(() => {
    const bookedByNight = nightlyBookedByType[roomType] || {};
    const capacity = ROOM_NIGHT_CAPACITY[roomType] || 0;

    return stayNightDates.filter(
      (nightIso) => (bookedByNight[nightIso] || 0) >= capacity,
    );
  }, [nightlyBookedByType, roomType, stayNightDates]);

  const roomAvailabilityPass =
    stayNightDates.length > 0 && unavailableNights.length === 0;

  const overlappingPetIds = useMemo(() => {
    if (!checkInDate || !checkOutDate || stayNightDates.length === 0) {
      return new Set();
    }

    const blocked = petStays
      .filter((stay) =>
        rangesOverlap(checkInDate, checkOutDate, stay.startDate, stay.endDate),
      )
      .map((stay) => stay.petId);

    return new Set(blocked);
  }, [petStays, checkInDate, checkOutDate, stayNightDates.length]);

  const step2Locked = !checkInDate || !checkOutDate || nights < 1;
  const step3Locked = step2Locked || !checkInTime;
  const step4Locked = step3Locked || !selectedPet;
  const step5Locked = step4Locked;

  const selectedPetOverlaps =
    selectedPet && overlappingPetIds.has(String(selectedPet));

  const canConfirm =
    checkInDate &&
    checkInTime &&
    checkOutDate &&
    nights >= 1 &&
    nights <= 30 &&
    selectedPet &&
    roomAvailabilityPass &&
    !selectedPetOverlaps &&
    !isSubmitting;

  useEffect(() => {
    let alive = true;

    const loadData = async () => {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        if (alive) {
          setPets([]);
          setPetStays([]);
        }
        return;
      }

      setPetsLoading(true);
      setSubmitError("");
      try {
        const [petResult, bookingResult] = await Promise.all([
          getMyPets({ active: "true", limit: 100 }),
          getMyBookings({}),
        ]);

        const rawPets = Array.isArray(petResult?.data?.pets)
          ? petResult.data.pets
          : [];

        const mappedPets = rawPets.map((pet) => ({
          id: String(pet._id),
          name: pet.petName || "Unnamed pet",
          type: pet.petType || pet.breed || "Pet",
          breed: pet.breed || "",
        }));

        const rawBookings = Array.isArray(bookingResult?.data?.bookings)
          ? bookingResult.data.bookings
          : [];

        const activeStatuses = new Set(["pending", "confirmed", "in-progress"]);
        const stays = [];

        rawBookings.forEach((booking) => {
          if (!activeStatuses.has(booking?.status)) return;

          const bookingStartDate = toIsoDate(new Date(booking?.bookingDate));
          if (!bookingStartDate) return;

          const hasBoardingSignal =
            Boolean(booking?.room) ||
            (Array.isArray(booking?.items) &&
              booking.items.some((item) => {
                const serviceName = (item?.service?.name || "").toLowerCase();
                return (
                  serviceName.includes("board") ||
                  serviceName.includes("hotel") ||
                  serviceName.includes("room") ||
                  serviceName.includes("luu tru")
                );
              }));

          if (!hasBoardingSignal) return;

          // Backend currently has no check-out field for boarding bookings, so fallback 1 night.
          const bookingEndDate = addDaysIso(bookingStartDate, 1);

          (booking?.items || []).forEach((item) => {
            const petId = item?.pet?._id || item?.pet;
            if (!petId) return;

            stays.push({
              petId: String(petId),
              startDate: bookingStartDate,
              endDate: bookingEndDate,
            });
          });
        });

        if (alive) {
          setPets(mappedPets);
          setPetStays(stays);
        }
      } catch {
        if (alive) {
          setPets([]);
          setPetStays([]);
        }
      } finally {
        if (alive) setPetsLoading(false);
      }
    };

    loadData();

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (checkInTime && !visibleCheckInSlots.includes(checkInTime)) {
      setCheckInTime("");
      setSelectedPet("");
    }
  }, [checkInTime, visibleCheckInSlots]);

  useEffect(() => {
    if (checkOutDate && minCheckOutDate && checkOutDate < minCheckOutDate) {
      setCheckOutDate("");
      setSelectedPet("");
    }
  }, [checkOutDate, minCheckOutDate]);

  useEffect(() => {
    if (selectedPet && overlappingPetIds.has(String(selectedPet))) {
      setSelectedPet("");
    }
  }, [selectedPet, overlappingPetIds]);

  const validate = () => {
    if (!checkInDate) return "Please select a check-in date";
    if (!checkInTime) return "Please select a check-in time";
    if (!checkOutDate) return "Please select a check-out date";

    if (checkOutDate <= checkInDate) {
      return "Minimum stay is 1 night";
    }

    if (!selectedPet) return "Please select a pet for boarding";

    if (selectedPetOverlaps) {
      return "Selected pet has overlapping boarding booking in this stay";
    }

    if (!roomAvailabilityPass) {
      return `${roomTitle} is unavailable for one or more nights in your selected stay.`;
    }

    if (nights > 30) return "Maximum stay is 30 nights";

    return "";
  };

  const handleConfirm = async () => {
    setSubmitError("");
    setSubmitSuccess("");

    const error = validate();
    if (error) {
      setSubmitError(error);
      return;
    }

    try {
      setIsSubmitting(true);
      // TODO: Replace with boarding booking API submit.
      await new Promise((resolve) => setTimeout(resolve, 700));
      setSubmitSuccess("Boarding booking submitted successfully.");
    } catch {
      setSubmitError("Booking failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedPetData = pets.find((pet) => pet.id === selectedPet);

  return (
    <div className="bg-white rounded-[24px] shadow-[0_15px_50px_rgba(0,0,0,0.08)] p-6 space-y-5">
      <div className="border-b border-gray-100 pb-4">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">
          From
        </p>
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-black text-[#1F2A37]">
            ${pricePerNight}
          </span>
          <span className="text-gray-400 font-medium text-sm">/ night</span>
        </div>
      </div>

      <StepLabel icon={Calendar} step={1} label="Select Stay Dates" />
      <div className="rounded-2xl border border-[#E8E3DB] bg-[#F9F7F4] p-3.5">
        <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_28px_minmax(0,1fr)] gap-2.5 items-center">
          <div className="space-y-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
              Check-in
            </p>
            <CalendarPicker
              selectedDate={checkInDate}
              onChange={(date) => {
                setCheckInDate(date);
                setCheckInTime("");
                setCheckOutDate("");
                setSelectedPet("");
                setSubmitError("");
                setSubmitSuccess("");
              }}
              minDate={todayStr}
              placeholder="Select check-in date..."
              compact
            />
          </div>

          <div className="hidden sm:flex h-full items-center justify-center text-[#E07A5F]/55">
            <ArrowRightLeft size={16} />
          </div>

          <div className="space-y-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
              Check-out
            </p>
            <CalendarPicker
              selectedDate={checkOutDate}
              onChange={(date) => {
                setCheckOutDate(date);
                setSelectedPet("");
                setSubmitError("");
                setSubmitSuccess("");
              }}
              minDate={minCheckOutDate}
              placeholder={
                checkInDate
                  ? "Select check-out date..."
                  : "Choose check-in first"
              }
              disabled={!checkInDate}
              compact
            />
          </div>
        </div>

        <div className="mt-2.5 flex items-center justify-between text-[11px] text-gray-500">
          <span>Minimum stay is 1 night.</span>
          {nights > 0 ? (
            <span className="rounded-full bg-[#E07A5F]/10 px-2 py-0.5 font-semibold text-[#E07A5F]">
              {nights} night{nights > 1 ? "s" : ""}
            </span>
          ) : (
            <span className="text-gray-400">Select both dates to continue</span>
          )}
        </div>
      </div>

      {!step2Locked && !roomAvailabilityPass && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
          {roomTitle} is unavailable for one or more nights in your selected
          stay.
        </div>
      )}

      <Divider />

      <div className={step2Locked ? "opacity-40 pointer-events-none" : ""}>
        <StepLabel
          icon={Clock}
          step={2}
          label="Select Check-in Time"
          locked={step2Locked}
        />

        {!checkInDate ? (
          <div className="grid grid-cols-4 gap-1.5">
            {Array(8)
              .fill(null)
              .map((_, i) => (
                <div
                  key={i}
                  className="h-9 rounded-xl bg-gray-100 animate-pulse"
                />
              ))}
          </div>
        ) : visibleCheckInSlots.length === 0 ? (
          <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-center">
            <p className="text-amber-600 text-[13px] font-semibold">
              No check-in slots left for today (08:00-22:45).
            </p>
            <p className="text-amber-500 text-[12px] mt-0.5">
              Please choose another check-in date.
            </p>
          </div>
        ) : (
          <>
            <p className="text-[11px] text-gray-400 font-medium mb-2">
              <span className="font-bold text-[#1F2A37]/60">
                {visibleCheckInSlots.length}
              </span>{" "}
              slots available
            </p>
            <div className="grid grid-cols-4 gap-1.5 max-h-[210px] overflow-y-auto pr-0.5">
              {visibleCheckInSlots.map((slot) => {
                const unavailable = unavailableCheckInSlots.has(slot);
                const selected = checkInTime === slot;

                return (
                  <button
                    key={slot}
                    type="button"
                    disabled={unavailable}
                    onClick={() => {
                      if (unavailable) return;
                      setCheckInTime(slot);
                      setSelectedPet("");
                      setSubmitError("");
                      setSubmitSuccess("");
                    }}
                    className={[
                      "py-2 text-[11px] font-bold rounded-xl border-2 transition-all duration-150 leading-none text-center w-full",
                      selected
                        ? "bg-[#E07A5F] text-white border-[#E07A5F] shadow-md shadow-[#E07A5F]/25 scale-[1.04]"
                        : unavailable
                          ? "bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed line-through decoration-gray-300"
                          : "bg-white border border-gray-200 text-[#1F2A37] hover:border-[#E07A5F] hover:text-[#E07A5F] cursor-pointer active:scale-95",
                    ].join(" ")}
                  >
                    {slot}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      <Divider />

      <div className={step3Locked ? "opacity-40 pointer-events-none" : ""}>
        <StepLabel
          icon={PawPrint}
          step={3}
          label="Select Pet"
          locked={step3Locked}
        />

        {!hasToken ? (
          <div className="text-xs text-gray-500 py-2">
            Please sign in to load your pets.
          </div>
        ) : petsLoading ? (
          <div className="text-xs text-gray-400 py-2">Loading pets...</div>
        ) : pets.length === 0 ? (
          <div className="text-xs text-gray-500 py-2">
            No pets found in your account.
          </div>
        ) : (
          <div className="space-y-2">
            {pets.map((pet) => {
              const blocked = overlappingPetIds.has(String(pet.id));
              const selected = selectedPet === String(pet.id);

              return (
                <button
                  key={pet.id}
                  type="button"
                  disabled={blocked}
                  onClick={() => {
                    if (blocked) return;
                    setSelectedPet(String(pet.id));
                    setSubmitError("");
                  }}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                    blocked
                      ? "border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed"
                      : selected
                        ? "border-[#E07A5F] bg-[#E07A5F]/5"
                        : "border-gray-100 hover:border-gray-300"
                  }`}
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#E07A5F]/10 text-[#E07A5F]">
                    <PawPrint size={16} />
                  </span>
                  <div className="min-w-0">
                    <p className="font-bold text-sm text-[#1F2A37] truncate">
                      {pet.name}
                    </p>
                    <p className="text-xs text-gray-400 truncate">
                      {pet.type}
                      {pet.breed ? ` - ${pet.breed}` : ""}
                    </p>
                    {blocked && (
                      <p className="text-[11px] text-red-400 mt-0.5">
                        Unavailable due to overlapping boarding stay
                      </p>
                    )}
                  </div>
                  {selected && !blocked && (
                    <CheckCircle2
                      size={16}
                      className="ml-auto text-[#E07A5F]"
                    />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <Divider />

      <div className={step4Locked ? "opacity-40 pointer-events-none" : ""}>
        <StepLabel
          icon={Plus}
          step={4}
          label="Notes (Optional)"
          locked={step4Locked}
        />
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Special requests... (dietary needs, medication, etc.)"
          rows={2}
          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#E07A5F]/20 focus:border-[#E07A5F] placeholder:text-gray-300"
        />
      </div>

      <Divider />

      <div className={step5Locked ? "opacity-40 pointer-events-none" : ""}>
        <StepLabel
          icon={CheckCircle2}
          step={5}
          label="Booking Summary"
          locked={step5Locked}
        />

        {checkInDate && checkInTime && checkOutDate && nights > 0 && (
          <div className="bg-[#F5F1EB] rounded-xl p-4 text-xs text-gray-700 space-y-1.5 mb-3">
            <p>
              <span className="font-semibold text-[#1F2A37]">Room Type:</span>{" "}
              {roomTitle}
            </p>
            <p>
              <span className="font-semibold text-[#1F2A37]">Pet:</span>{" "}
              {selectedPetData?.name || "-"}
            </p>
            <p>
              <span className="font-semibold text-[#1F2A37]">Check-in:</span>{" "}
              {checkInDate} {checkInTime}
            </p>
            <p>
              <span className="font-semibold text-[#1F2A37]">Check-out:</span>{" "}
              {checkOutDate}
            </p>
            <p>
              <span className="font-semibold text-[#1F2A37]">Nights:</span>{" "}
              {nights}
            </p>
            <p>
              <span className="font-semibold text-[#1F2A37]">
                Price per night:
              </span>{" "}
              ${pricePerNight}
            </p>
            <p>
              <span className="font-semibold text-[#1F2A37]">Total:</span> $
              {totalPrice}
            </p>
          </div>
        )}

        {!roomAvailabilityPass && nights > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-700 mb-3">
            {roomTitle} is unavailable for one or more nights in your selected
            stay.
          </div>
        )}

        {submitSuccess && (
          <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-xs text-green-700 mb-3">
            {submitSuccess}
          </div>
        )}

        {submitError && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 flex items-center gap-2 mb-3">
            <AlertCircle size={14} className="text-red-500 shrink-0" />
            <p className="text-[12px] text-red-600 font-medium">
              {submitError}
            </p>
          </div>
        )}

        <button
          onClick={handleConfirm}
          disabled={!canConfirm}
          className={`w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition shadow ${
            canConfirm
              ? "bg-[#E07A5F] text-white hover:bg-[#c9694f]"
              : "bg-gray-200 text-gray-400 cursor-not-allowed"
          }`}
        >
          {isSubmitting ? "Booking..." : "Confirm Booking"}
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
