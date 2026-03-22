import { useState, useMemo, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
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
import {
  checkoutBooking,
  getAvailableSlots,
  getMyBookings,
} from "../../api/bookingApi";
import { addServiceToCart } from "../../api/cartApi";
import { getMyPets } from "../../api/petApi";
import { getWallet } from "../../api/walletApi";
import axiosInstance from "../../api/axiosInstance";
import { generateTimeSlots } from "../../data/servicesData";
import { useAuth } from "../../context/AuthContext";

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

const parsePriceToNumber = (value) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  const raw = String(value || "").trim();
  if (!raw) return 0;

  // Keep only digits and decimal separators from formatted values like "$120" or "120,000 VND".
  const cleaned = raw.replace(/[^\d.,-]/g, "");
  if (!cleaned) return 0;

  let normalized = cleaned;
  if (cleaned.includes(",") && cleaned.includes(".")) {
    normalized = cleaned.lastIndexOf(",") > cleaned.lastIndexOf(".")
      ? cleaned.replace(/\./g, "").replace(",", ".")
      : cleaned.replace(/,/g, "");
  } else if (cleaned.includes(",") && !cleaned.includes(".")) {
    const chunks = cleaned.split(",");
    normalized = chunks[chunks.length - 1]?.length === 3
      ? cleaned.replace(/,/g, "")
      : cleaned.replace(",", ".");
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

export default function ServiceBookingPanel({ service, onAddToCartSuccess }) {
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedSlot, setSelectedSlot] = useState("");
  const [selectedPet, setSelectedPet] = useState("");
  const [note, setNote] = useState("");
  const [apiPets, setApiPets] = useState([]);
  const [petsLoading, setPetsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState("");
  const [cartMessage, setCartMessage] = useState("");
  const [serviceDisabledSlots, setServiceDisabledSlots] = useState([]);
  const [petConflictSlots, setPetConflictSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotHint, setSlotHint] = useState("");
  const [confirmedData, setConfirmedData] = useState(null);
  const [walletBalance, setWalletBalance] = useState(null);
  const [walletLoading, setWalletLoading] = useState(false);
  const { isAuthenticated, user, token } = useAuth();

  const today = new Date().toISOString().split("T")[0];
  const hasValidSession = Boolean(isAuthenticated && user && token);
  const navigate = useNavigate();
  const location = useLocation();
  const servicePrice = useMemo(() => {
    const priceFromValue = parsePriceToNumber(service.priceValue);
    if (priceFromValue > 0) return priceFromValue;
    return parsePriceToNumber(service.price);
  }, [service.price, service.priceValue]);
  const serviceDurationMinutes = useMemo(() => {
    const parsed = parseInt(String(service.duration || "").replace(/\D/g, ""), 10);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
    return Math.max(15, Number(service.intervalMinutes) || 15);
  }, [service.duration, service.intervalMinutes]);
  const requiredTopUpAmount = useMemo(() => {
    if (walletBalance === null) return 0;
    return Math.max(0, Math.ceil(servicePrice - Number(walletBalance || 0)));
  }, [servicePrice, walletBalance]);

  const handleTopUpWallet = () => {
    const currentPath = `${location.pathname}${location.search || ""}${location.hash || ""}`;
    const params = new URLSearchParams();
    params.set("topupAmount", String(requiredTopUpAmount));
    params.set("returnTo", currentPath);
    params.set("source", "service-booking");
    navigate(`/wallet?${params.toString()}`);
  };

  useEffect(() => {
    if (!hasValidSession) {
      setWalletBalance(null);
      return;
    }
    setWalletLoading(true);
    getWallet()
      .then((res) => setWalletBalance(res?.data?.balance ?? null))
      .catch(() => setWalletBalance(null))
      .finally(() => setWalletLoading(false));
  }, [hasValidSession]);

  useEffect(() => {
    let alive = true;

    const loadPets = async () => {
      if (!hasValidSession) {
        if (alive) setApiPets([]);
        return;
      }

      setPetsLoading(true);
      try {
        const result = await getMyPets({ active: "true", limit: 50 });
        const pets = Array.isArray(result?.data?.pets) ? result.data.pets : [];
        const mappedPets = pets.map((pet) => ({
          id: String(pet._id || pet.id || ""),
          name: pet.petName || "Unnamed pet",
          breed: pet.breed || pet.petType || "",
        })).filter((pet) => pet.id);
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
  }, [hasValidSession]);

  const timeSlots = useMemo(
    () =>
      selectedDate ? generateTimeSlots(service.intervalMinutes || 15) : [],
    [selectedDate, service.intervalMinutes],
  );
  const linkedServiceId = service.apiServiceId || service._id || null;

  useEffect(() => {
    let alive = true;

    const slotToMinutes = (slot = "00:00") => {
      const [h, m] = String(slot).split(":").map(Number);
      return h * 60 + m;
    };

    const buildPetConflictSlotsFromBookings = (bookings = []) => {
      if (!selectedPet) return [];

      const activeStatuses = new Set(["pending", "confirmed", "in-progress"]);
      const ranges = [];

      bookings.forEach((booking) => {
        if (!activeStatuses.has(String(booking?.status || ""))) return;

        (booking?.items || []).forEach((item) => {
          const itemPetId = String(item?.pet?._id || item?.pet || "");
          if (!itemPetId || itemPetId !== String(selectedPet)) return;
          if (!item?.startTime || !item?.endTime) return;

          const start = new Date(item.startTime);
          const end = new Date(item.endTime);
          if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return;

          ranges.push({ start, end });
        });
      });

      if (!ranges.length) return [];

      return timeSlots.filter((slot) => {
        const slotStart = new Date(`${selectedDate}T${slot}:00`);
        if (Number.isNaN(slotStart.getTime())) return false;

        const slotEnd = new Date(
          slotStart.getTime() + serviceDurationMinutes * 60 * 1000,
        );

        return ranges.some(({ start, end }) => start < slotEnd && end > slotStart);
      });
    };

    const fetchSlots = async () => {
      if (!selectedDate || !selectedPet || !linkedServiceId) {
        if (alive) {
          setServiceDisabledSlots([]);
          setPetConflictSlots([]);
        }
        return;
      }

      setSlotsLoading(true);

      try {
        const normalizedPetId = selectedPet ? String(selectedPet) : undefined;
        const res = await getAvailableSlots(
          selectedDate,
          linkedServiceId,
          normalizedPetId,
        );

        const serviceDisabled = Array.isArray(res?.data?.serviceDisabledSlots)
          ? res.data.serviceDisabledSlots
          : Array.isArray(res?.data?.disabledSlots)
            ? res.data.disabledSlots
            : [];

        let petConflict = Array.isArray(res?.data?.petConflictSlots)
          ? res.data.petConflictSlots
          : [];

        if (normalizedPetId && petConflict.length === 0) {
          try {
            const myBookingsRes = await getMyBookings();
            const myBookings = Array.isArray(myBookingsRes?.data?.bookings)
              ? myBookingsRes.data.bookings
              : [];
            petConflict = buildPetConflictSlotsFromBookings(myBookings);
          } catch (fallbackErr) {
            console.error("Fallback pet conflict check failed", fallbackErr);
          }
        }

        const normalizedServiceDisabled = [...new Set(serviceDisabled)].sort(
          (a, b) => slotToMinutes(a) - slotToMinutes(b),
        );

        const normalizedPetConflict = normalizedPetId
          ? [...new Set(petConflict)].sort(
          (a, b) => slotToMinutes(a) - slotToMinutes(b),
          )
          : [];

        if (alive) {
          setServiceDisabledSlots(normalizedServiceDisabled);
          setPetConflictSlots(normalizedPetConflict);
        }
      } catch (err) {
        console.error("Failed to fetch disabled slots", err);
      } finally {
        if (alive) setSlotsLoading(false);
      }
    };
    fetchSlots();
    return () => {
      alive = false;
    };
  }, [
    selectedDate,
    linkedServiceId,
    selectedPet,
    timeSlots,
    serviceDurationMinutes,
  ]);

  useEffect(() => {
    if (!selectedSlot) return;

    const blockedByPetConflict = petConflictSlots.includes(selectedSlot);
    const blockedByServiceCapacity = serviceDisabledSlots.includes(selectedSlot);

    if (!blockedByPetConflict && !blockedByServiceCapacity) {
      setSlotHint("");
      return;
    }

    setSelectedSlot("");

    if (blockedByPetConflict) {
      setSlotHint(
        "The selected time conflicts with your pet's existing booking. Please choose another time.",
      );
      return;
    }

    setSlotHint("The selected time slot is full. Please choose another slot.");
  }, [petConflictSlots, selectedSlot, serviceDisabledSlots]);

  /* lock logic */
  const step2Locked = !selectedPet;
  const step3Locked = !selectedPet || !selectedDate;
  const step4Locked = !selectedPet || !selectedDate || !selectedSlot;

  const canBook =
    selectedDate >= today &&
    selectedSlot &&
    selectedPet &&
    Boolean(linkedServiceId) &&
    !isSubmitting &&
    (walletBalance === null || walletBalance >= servicePrice);
  const pets = apiPets;

  // Calculate End Time
  const calculatedEndTime = useMemo(() => {
    if (!selectedDate || !selectedSlot || !service.duration) return null;
    const durationNum = parseInt(
      String(service.duration).replace(/\D/g, ""),
      10,
    );
    if (isNaN(durationNum)) return null;

    const [h, m] = selectedSlot.split(":").map(Number);
    const startObj = new Date(0, 0, 0, h, m);
    startObj.setMinutes(startObj.getMinutes() + durationNum);
    const endH = String(startObj.getHours()).padStart(2, "0");
    const endM = String(startObj.getMinutes()).padStart(2, "0");
    return `${endH}:${endM}`;
  }, [selectedDate, selectedSlot, service.duration]);

  const handleAddToCart = async (event) => {
    setSubmitError("");
    setSubmitSuccess("");
    setCartMessage("");
    const sourceElement = event?.currentTarget;

    if (!hasValidSession) {
      setSubmitError("Please sign in or register to add a service to cart.");
      return;
    }

    if (!linkedServiceId) {
      setSubmitError("This service is not synced with the backend yet.");
      return;
    }

    try {
      await addServiceToCart({
        serviceId: linkedServiceId,
        quantity: 1,
        note: note || "",
        metadata: {
          source: "service-detail",
          serviceTitle: service.title,
        },
      });
      setCartMessage(
        "Service added to cart. You can complete checkout in Cart with multiple services.",
      );
      onAddToCartSuccess?.(sourceElement);
      window.dispatchEvent(new CustomEvent("cart:updated"));
    } catch (error) {
      const errPayload = error?.response?.data?.error || error?.response?.data || {};
      const errMsg = errPayload.message || error?.message || "Unable to add this service to cart.";
      setSubmitError(errMsg);
    }
  };

  const handleConfirmBooking = async () => {
    setSubmitError("");
    setSubmitSuccess("");

    if (!linkedServiceId) {
      setSubmitError("This service is not linked to the backend API.");
      return;
    }

    if (!hasValidSession) {
      setSubmitError("Please sign in to continue booking.");
      return;
    }

    try {
      setIsSubmitting(true);
      const appointmentDate = new Date(
        `${selectedDate}T${selectedSlot}:00`,
      ).toISOString();

      // Ensure the backend has this item in the cart, since it reads from cart based on user instruction to not touch backend
      try {
        await axiosInstance.delete("/cart");
      } catch (err) {
        // ignore error if cart is already empty
      }

      await axiosInstance.post("/cart/add", {
        serviceId: linkedServiceId,
        quantity: 1,
        note: note || "",
      });

      const result = await checkoutBooking({
        petId: selectedPet,
        appointmentDate,
        paymentMethod: "wallet",
        notes: note || "",
      });

      const bookingNumber = result?.data?.booking?.bookingNumber;

      const firstSchedule = result?.data?.schedule?.[0];
      const selectedPetName =
        pets.find((p) => p.id === selectedPet)?.name || "Unknown pet";

      if (firstSchedule) {
        setConfirmedData({
          serviceName: firstSchedule.service || service.title,
          group: firstSchedule.group,
          room: firstSchedule.room,
          duration: firstSchedule.durationMins,
          startTime: new Date(firstSchedule.startTime).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          }),
          endTime: new Date(firstSchedule.endTime).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          }),
          petName: selectedPetName,
        });
      }

      setSubmitSuccess(
        bookingNumber
          ? `Booking completed (#${bookingNumber}).`
          : "Booking completed.",
      );

      setSelectedSlot("");
      setSelectedPet("");
      setNote("");
    } catch (error) {
      console.error("Booking error:", error);
      console.error("Response data:", error?.response?.data);
      const errPayload =
        error?.response?.data?.error || error?.response?.data || {};
      const errMsg = errPayload.message || error?.message || "Unknown error";
      const isBookingNumberError =
        /bookingnumber/i.test(errMsg) ||
        /booking validation failed/i.test(errMsg);

      if (isBookingNumberError) {
        setSubmitError(
          "We could not create your booking because the system failed to generate a booking number. Please try again later or contact support.",
        );
        return;
      }
      if (error?.response?.status === 409 && errMsg.includes("is full")) {
        setServiceDisabledSlots((prev) =>
          prev.includes(selectedSlot) ? prev : [...prev, selectedSlot],
        );
        setSubmitError(
          "The selected time slot is already full (exceeds 6 pets). Please choose another time.",
        );
        setSelectedSlot("");
      } else {
        setSubmitError(errMsg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (confirmedData) {
    return (
      <Motion.aside
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
      >
        <div className="text-center mb-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#E07A5F]/10 mb-4">
            <CheckCircle2 size={32} className="text-[#E07A5F]" />
          </div>
          <h3 className="text-xl font-bold text-[#1F2A37]">
            Booking Confirmed
          </h3>
        </div>

        <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 space-y-3 text-sm">
          <div className="flex justify-between border-b border-gray-200 pb-2">
            <span className="text-gray-500">Service:</span>
            <span className="font-semibold text-gray-800 text-right">
              {confirmedData.serviceName}
            </span>
          </div>
          <div className="flex justify-between border-b border-gray-200 pb-2">
            <span className="text-gray-500">Group:</span>
            <span className="font-semibold text-gray-800 capitalize">
              {confirmedData.group} Service
            </span>
          </div>
          <div className="flex justify-between border-b border-gray-200 pb-2">
            <span className="text-gray-500">Room:</span>
            <span className="font-semibold text-gray-800">
              Room {confirmedData.room}
            </span>
          </div>
          <div className="flex justify-between border-b border-gray-200 pb-2">
            <span className="text-gray-500">Duration:</span>
            <span className="font-semibold text-gray-800">
              {confirmedData.duration} minutes
            </span>
          </div>
          <div className="flex justify-between border-b border-gray-200 pb-2">
            <span className="text-gray-500">Time:</span>
            <span className="font-semibold text-[#E07A5F]">
              {confirmedData.startTime}{" "}
              {confirmedData.endTime && `→ ${confirmedData.endTime}`}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Pet:</span>
            <span className="font-semibold text-gray-800">
              {confirmedData.petName}
            </span>
          </div>
        </div>

        <button
          onClick={() => {
            setConfirmedData(null);
            setSelectedDate("");
            setSelectedSlot("");
            setSelectedPet("");
            setSubmitSuccess("");
          }}
          className="mt-6 w-full rounded-xl bg-[#E07A5F] py-3 text-sm font-semibold text-white transition hover:bg-[#c9694f]"
        >
          Book Another Session
        </button>
      </Motion.aside>
    );
  }

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

      {hasValidSession && (
        <button
          type="button"
          onClick={(e) => handleAddToCart(e)}
          className="mb-4 w-full rounded-xl border border-[#E07A5F]/35 bg-[#E07A5F]/10 py-2.5 text-sm font-semibold text-[#E07A5F] hover:bg-[#E07A5F]/15 transition"
        >
          + Add Service To Cart
        </button>
      )}
      {cartMessage && (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
          {cartMessage}
        </div>
      )}

      {/* ══════════════ STEP 1 — Pet ══════════════ */}
      <SectionLabel icon={PawPrint} label="Select Your Pet" step={1} />
      {!hasValidSession ? (
        <div className="text-xs text-gray-500 py-2">
          Please sign in to load your pets.
        </div>
      ) : petsLoading ? (
        <div className="text-xs text-gray-400 py-2">Loading pets...</div>
      ) : pets.length === 0 ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-3">
          <p className="text-xs font-semibold text-amber-700">
            No pets found in your account.
          </p>
          <p className="mt-1 text-xs text-amber-600">
            Add your pet first to continue booking this service.
          </p>
          <button
            type="button"
            onClick={() => navigate("/pets")}
            className="mt-3 inline-flex items-center rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-700 transition hover:bg-amber-100"
          >
            + Add Pet
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {pets.map((pet) => (
            <button
              key={pet.id}
              onClick={() => {
                setSelectedPet(pet.id);
                setSelectedSlot("");
                setSlotHint("");
                setSubmitError("");
                setSubmitSuccess("");
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
        placeholder={
          selectedPet
            ? "Special notes for this booking..."
            : "Select a pet first to add notes"
        }
        value={note}
        disabled={!selectedPet}
        onChange={(e) => setNote(e.target.value)}
        className="mt-3 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-700 outline-none focus:border-[#E07A5F] focus:ring-2 focus:ring-[#E07A5F]/20 transition resize-none disabled:cursor-not-allowed disabled:opacity-60"
      />

      <Divider />

      {/* ══════════════ STEP 2 — Date ══════════════ */}
      <div className={step2Locked ? "opacity-40 pointer-events-none" : ""}>
        <SectionLabel
          icon={CalendarDays}
          label="Select Date"
          step={2}
          locked={step2Locked}
        />
        <CalendarPicker
          selectedDate={selectedDate}
          disabled={step2Locked}
          onChange={(date) => {
            setSelectedDate(date);
            setSelectedSlot("");
            setSlotHint("");
            setSubmitError("");
            setSubmitSuccess("");
          }}
        />
      </div>

      <Divider />

      {/* ══════════════ STEP 3 — Time ══════════════ */}
      <div className={step3Locked ? "opacity-40 pointer-events-none" : ""}>
        <SectionLabel
          icon={Clock}
          label="Pick a Time Slot"
          step={3}
          locked={step3Locked}
        />
        {slotsLoading ? (
          <div className="text-xs text-gray-400 py-2 animate-pulse">
            Checking slots...
          </div>
        ) : (
          <TimeSlotPicker
            selectedDate={selectedDate}
            slots={timeSlots}
            bookedSlots={serviceDisabledSlots}
            hiddenSlots={petConflictSlots}
            selectedSlot={selectedSlot}
            onSelect={(slot) => {
              setSlotHint("");
              setSelectedSlot(slot);
            }}
            intervalMinutes={service.intervalMinutes}
          />
        )}
        {slotHint && (
          <p className="mt-2 text-[11px] text-amber-600 font-medium">{slotHint}</p>
        )}
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

        {/* Wallet Balance */}
        {hasValidSession && (
          <div className="rounded-lg border border-gray-100 bg-gray-50 p-3 text-xs mb-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-500 font-semibold">Wallet balance:</span>
              {walletLoading ? (
                <span className="text-gray-400">Loading...</span>
              ) : walletBalance !== null ? (
                <span
                  className={
                    walletBalance >= servicePrice
                      ? "text-green-600 font-bold"
                      : "text-red-500 font-bold"
                  }
                >
                  {walletBalance.toLocaleString("en-US")} VND
                </span>
              ) : (
                <span className="text-gray-400">Unavailable</span>
              )}
            </div>
            <div className="flex justify-between items-center mt-1">
              <span className="text-gray-500">Service fee:</span>
              <span className="font-bold text-[#E07A5F]">
                {servicePrice.toLocaleString("en-US")} VND
              </span>
            </div>
            {walletBalance !== null && walletBalance < servicePrice && (
              <div className="mt-2 rounded bg-red-50 border border-red-100 px-2 py-1 text-red-600">
                Insufficient balance. Please{" "}
                <button
                  type="button"
                  onClick={handleTopUpWallet}
                  className="underline font-semibold"
                >
                  top up your wallet
                </button>
                .
              </div>
            )}
          </div>
        )}

        {canBook && (
          <div className="rounded-lg bg-[#F5F1EB] p-3 text-xs text-gray-600 space-y-1 mb-3">
            <p>
              <span className="font-semibold text-[#1F2A37]">Service:</span>{" "}
              {service.name || service.title}
            </p>
            <p>
              <span className="font-semibold text-[#1F2A37]">Duration:</span>{" "}
              {service.duration
                ? String(service.duration).includes("minute")
                  ? service.duration
                  : `${service.duration} minutes`
                : "N/A"}
            </p>
            <p>
              <span className="font-semibold text-[#1F2A37]">Date:</span>{" "}
              {selectedDate}
            </p>
            <p className="flex items-center gap-2">
              <span className="font-semibold text-[#1F2A37]">Time:</span>{" "}
              <span className="text-gray-700">{selectedSlot}</span>
              {calculatedEndTime && (
                <>
                  <span className="text-gray-400 text-[10px]">→</span>
                  <span className="text-gray-700">{calculatedEndTime}</span>
                </>
              )}
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
            This service is not mapped to the backend API yet, so checkout is unavailable.
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
