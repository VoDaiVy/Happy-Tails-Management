import { useState, useMemo, useEffect } from "react";
import { motion as Motion } from "framer-motion";
import {
  CalendarDays,
  Clock,
  PawPrint,
  CreditCard,
  Lock,
  CheckCircle2,
  ChevronRight,
  Info,
} from "lucide-react";
import TimeSlotPicker from "./TimeSlotPicker";
import CalendarPicker from "./CalendarPicker";
import { checkoutBooking } from "../../api/bookingApi";
import { getMyPets } from "../../api/petApi";
import { generateTimeSlots } from "../../data/servicesData";

/* ── small helper ── */
const SectionLabel = ({ icon, label, step, locked }) => {
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

export default function ServiceBookingPanel({ service }) {
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedSlot, setSelectedSlot] = useState("");
  const [selectedPet, setSelectedPet] = useState("");
  const [note, setNote] = useState("");
  const [apiPets, setApiPets] = useState([]);
  const [petsLoading, setPetsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState("");

  const today = new Date().toISOString().split("T")[0];
  const hasToken = Boolean(localStorage.getItem("accessToken"));

  useEffect(() => {
    let alive = true;

    const loadPets = async () => {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        if (alive) setApiPets([]);
        return;
      }

      setPetsLoading(true);
      try {
        const result = await getMyPets({ active: "true", limit: 50 });
        const pets = Array.isArray(result?.data?.pets) ? result.data.pets : [];
        const mappedPets = pets.map((pet) => ({
          id: pet._id,
          name: pet.petName || "Unnamed pet",
          breed: pet.breed || pet.petType || "",
        }));
        if (alive) setApiPets(mappedPets);
      } catch {
        if (alive) setApiPets([]);
      } finally {
        if (alive) setPetsLoading(false);
      }
    };

    loadPets();

    return () => {
      alive = false;
    };
  }, []);

  const timeSlots = useMemo(
    () =>
      selectedDate ? generateTimeSlots(service.intervalMinutes || 15) : [],
    [selectedDate, service.intervalMinutes],
  );
  const bookedSlots = [];

  /* lock logic */
  const step2Locked = !selectedDate;
  const step3Locked = !selectedSlot;
  const step4Locked = !selectedPet;

  const linkedServiceId = service.apiServiceId || service._id || null;

  const canBook =
    selectedDate >= today &&
    selectedSlot &&
    selectedPet &&
    Boolean(linkedServiceId) &&
    !isSubmitting;
  const pets = apiPets;

  const handleConfirmBooking = async () => {
    setSubmitError("");
    setSubmitSuccess("");

    if (!linkedServiceId) {
      setSubmitError("Service nay chua lien ket voi backend API.");
      return;
    }

    const token = localStorage.getItem("accessToken");
    if (!token) {
      setSubmitError("Vui long dang nhap de dat lich.");
      return;
    }

    try {
      setIsSubmitting(true);
      const appointmentDate = new Date(
        `${selectedDate}T${selectedSlot}:00`,
      ).toISOString();

      const result = await checkoutBooking({
        serviceId: linkedServiceId,
        petId: selectedPet,
        appointmentDate,
        paymentMethod: "cash",
        notes: note,
      });

      const bookingNumber = result?.data?.booking?.bookingNumber;
      setSubmitSuccess(
        bookingNumber
          ? `Booking thanh cong (#${bookingNumber}).`
          : "Booking thanh cong.",
      );

      setSelectedSlot("");
      setSelectedPet("");
      setNote("");
    } catch (error) {
      setSubmitError(
        error?.response?.data?.message ||
          "Khong the dat lich luc nay. Vui long thu lai.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Motion.aside
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
    >
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-lg font-bold text-[#1F2A37]">Book This Service</h3>
      </div>
      <div className="flex items-baseline gap-2 mb-3">
        <span className="text-3xl font-extrabold text-[#E07A5F] tracking-tight">
          {service.price}
        </span>
        {service.priceUnit && (
          <span className="text-xs font-medium text-gray-400">
            {service.priceUnit}
          </span>
        )}
        <span className="text-[11px] font-semibold text-[#7FB069]">
          / session
        </span>
      </div>
      <p className="text-xs text-gray-400 mb-4 flex items-center gap-1">
        <Info size={12} /> Fill each step in order to unlock the next one.
      </p>

      {/* ══════════════ STEP 1 — Date ══════════════ */}
      <SectionLabel icon={CalendarDays} label="Select Date" step={1} />
      <CalendarPicker
        selectedDate={selectedDate}
        onChange={(date) => {
          setSelectedDate(date);
          setSelectedSlot("");
          setSelectedPet("");
          setSubmitError("");
          setSubmitSuccess("");
        }}
      />

      <Divider />

      {/* ══════════════ STEP 2 — Time ══════════════ */}
      <div className={step2Locked ? "opacity-40 pointer-events-none" : ""}>
        <SectionLabel
          icon={Clock}
          label="Pick a Time Slot"
          step={2}
          locked={step2Locked}
        />
        <TimeSlotPicker
          selectedDate={selectedDate}
          slots={timeSlots}
          bookedSlots={bookedSlots}
          selectedSlot={selectedSlot}
          onSelect={(slot) => {
            setSelectedSlot(slot);
          }}
          intervalMinutes={service.intervalMinutes}
        />
      </div>

      <Divider />

      {/* ══════════════ STEP 3 — Pet ══════════════ */}
      <div className={step3Locked ? "opacity-40 pointer-events-none" : ""}>
        <SectionLabel
          icon={PawPrint}
          label="Select Your Pet"
          step={3}
          locked={step3Locked}
        />
        {!hasToken ? (
          <div className="text-xs text-gray-500 py-2">
            Vui long dang nhap de tai danh sach pet.
          </div>
        ) : petsLoading ? (
          <div className="text-xs text-gray-400 py-2">Loading pets...</div>
        ) : pets.length === 0 ? (
          <div className="text-xs text-gray-500 py-2">
            Khong tim thay pet trong tai khoan. Vui long them pet truoc khi dat
            lich.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {pets.map((pet) => (
              <button
                key={pet.id}
                onClick={() => {
                  setSelectedPet(pet.id);
                  setSubmitError("");
                }}
                className={`rounded-lg border-2 px-3 py-2 text-left text-xs transition
                ${
                  selectedPet === pet.id
                    ? "border-[#E07A5F] bg-[#E07A5F]/5 text-[#E07A5F] shadow-sm"
                    : "border-gray-200 bg-white text-gray-600 hover:border-[#E07A5F]/40"
                }`}
              >
                <span className="font-semibold block">{pet.name}</span>
                <span className="text-[11px] text-gray-400">{pet.breed}</span>
              </button>
            ))}
          </div>
        )}

        {/* Note */}
        <textarea
          rows={2}
          placeholder="Special notes for this booking..."
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="mt-3 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-700 outline-none focus:border-[#E07A5F] focus:ring-2 focus:ring-[#E07A5F]/20 transition resize-none"
        />
      </div>

      <Divider />

      {/* ══════════════ STEP 4 — Confirm ══════════════ */}
      <div className={step4Locked ? "opacity-40 pointer-events-none" : ""}>
        <SectionLabel
          icon={CreditCard}
          label="Booking Summary"
          step={4}
          locked={step4Locked}
        />

        {canBook && (
          <div className="rounded-lg bg-[#F5F1EB] p-3 text-xs text-gray-600 space-y-1 mb-3">
            <p>
              <span className="font-semibold text-[#1F2A37]">Service:</span>{" "}
              {service.title}
            </p>
            <p>
              <span className="font-semibold text-[#1F2A37]">Date:</span>{" "}
              {selectedDate}
            </p>
            <p>
              <span className="font-semibold text-[#1F2A37]">Time:</span>{" "}
              {selectedSlot}
            </p>
            <p>
              <span className="font-semibold text-[#1F2A37]">Pet:</span>{" "}
              {pets.find((p) => p.id === selectedPet)?.name}
            </p>
            {note && (
              <p>
                <span className="font-semibold text-[#1F2A37]">Note:</span>{" "}
                {note}
              </p>
            )}
          </div>
        )}

        {!linkedServiceId && (
          <div className="mb-3 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-700">
            Service nay chua duoc map voi backend API, chua the checkout.
          </div>
        )}

        {submitSuccess && (
          <div className="mb-3 rounded-lg border border-green-100 bg-green-50 px-3 py-2 text-xs text-green-700">
            {submitSuccess}
          </div>
        )}

        {submitError && (
          <div className="mb-3 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-600">
            {submitError}
          </div>
        )}

        <button
          onClick={handleConfirmBooking}
          disabled={!canBook}
          className={`w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition shadow
            ${
              canBook
                ? "bg-[#E07A5F] text-white hover:bg-[#c9694f]"
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
            }`}
        >
          <CheckCircle2 size={16} />
          {isSubmitting ? "Booking..." : "Confirm Booking"}
          <ChevronRight size={16} />
        </button>
      </div>
    </Motion.aside>
  );
}
