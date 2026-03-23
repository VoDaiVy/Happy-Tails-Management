import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  CalendarDays,
  Clock3,
  PawPrint,
  Home,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import AuthModal from "../components/AuthModal";
import CalendarPicker from "../components/service/CalendarPicker";
import TimeSlotPicker from "../components/service/TimeSlotPicker";
import { generateTimeSlots } from "../data/servicesData";
import {
  getCart,
  updateCartItem,
  removeCartItem,
  clearCart,
} from "../api/cartApi";
import { checkoutBooking, getAvailableSlots } from "../api/bookingApi";
import { getMyPets } from "../api/petApi";
import { getWallet } from "../api/walletApi";
import { getAvailableVouchersForCustomer } from "../api/voucherApi";
import { getErrorMessage } from "../utils/apiResponseHandler";

const VND = new Intl.NumberFormat("vi-VN");
const toISODate = (d) => d.toISOString().split("T")[0];

const splitDateTime = (date, time) => new Date(`${date}T${time}:00`).toISOString();

const STAY_OPEN_MINUTES = 8 * 60;
const STAY_CLOSE_MINUTES = 23 * 60;
const STAY_INTERVAL_MINUTES = 15;
const EMPTY_SUMMARY = {
  serviceSubtotal: 0,
  staySubtotal: 0,
  serviceDurationTotal: 0,
  stayDurationTotal: 0,
  grandTotal: 0,
  totalItems: 0,
};

const minutesToSlot = (minutes) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

const toObjectIdString = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object") return String(value._id || value.id || "");
  return "";
};

const calculateVoucherDiscount = (voucher, amount) => {
  const total = Math.max(0, Number(amount) || 0);
  if (!voucher || total <= 0) return 0;

  if (voucher.discountType === "percentage") {
    const raw = (total * Number(voucher.discountValue || 0)) / 100;
    const maxDiscount = voucher.maxDiscount ? Number(voucher.maxDiscount) : Infinity;
    return Math.max(0, Math.min(raw, maxDiscount));
  }

  return Math.max(0, Number(voucher.discountValue || 0));
};

export default function CartPage() {
  const MotionDiv = motion.div;
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem("user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState("login");

  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionBusy, setActionBusy] = useState(false);

  const [pets, setPets] = useState([]);
  const [selectedPet, setSelectedPet] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [bookedSlots, setBookedSlots] = useState([]);
  const [slotLoading, setSlotLoading] = useState(false);
  const [notes, setNotes] = useState("");
  const [stayCheckInDate, setStayCheckInDate] = useState("");
  const [stayCheckOutDate, setStayCheckOutDate] = useState("");
  const [stayCheckInTime, setStayCheckInTime] = useState("09:00");
  const [stayCheckOutTime, setStayCheckOutTime] = useState("10:00");
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [checkoutSuccess, setCheckoutSuccess] = useState("");
  const [walletBalance, setWalletBalance] = useState(null);
  const [walletLoading, setWalletLoading] = useState(false);
  const [availableVouchers, setAvailableVouchers] = useState([]);
  const [voucherLoading, setVoucherLoading] = useState(false);
  const [voucherInput, setVoucherInput] = useState("");
  const [appliedVoucher, setAppliedVoucher] = useState(null);
  const [voucherMessage, setVoucherMessage] = useState("");
  const [voucherError, setVoucherError] = useState("");

  const hasToken = Boolean(localStorage.getItem("accessToken"));

  const items = useMemo(() => cart?.items || [], [cart?.items]);
  const summary = useMemo(() => cart?.summary || EMPTY_SUMMARY, [cart?.summary]);

  const serviceItems = useMemo(
    () => items.filter((item) => (item.type || "service") === "service"),
    [items],
  );
  const stayItem = useMemo(
    () => items.find((item) => (item.type || "service") === "stay") || null,
    [items],
  );

  const checkoutMode = stayItem ? "service-stay" : "service-only";
  const effectiveAppointmentDate = checkoutMode === "service-stay" ? stayCheckInDate : selectedDate;
  const effectiveAppointmentTime = checkoutMode === "service-stay" ? stayCheckInTime : selectedTime;
  const stayUnitPrice = Number(stayItem?.unitPrice ?? stayItem?.price ?? 0);
  const cartServiceIds = useMemo(
    () =>
      serviceItems
        .map((item) => toObjectIdString(item?.serviceId))
        .filter(Boolean),
    [serviceItems],
  );

  const calculatedStayNights = useMemo(() => {
    if (!stayItem || !stayCheckInDate || !stayCheckOutDate || !stayCheckOutTime) return 0;

    const checkIn = new Date(`${stayCheckInDate}T${stayCheckInTime || "00:00"}:00`);
    const checkOut = new Date(`${stayCheckOutDate}T${stayCheckOutTime}:00`);

    if (Number.isNaN(checkIn.getTime()) || Number.isNaN(checkOut.getTime()) || checkOut <= checkIn) {
      return 0;
    }

    const diffMs = checkOut.getTime() - checkIn.getTime();
    return Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  }, [stayItem, stayCheckInDate, stayCheckOutDate, stayCheckInTime, stayCheckOutTime]);

  const effectiveSummary = useMemo(() => {
    const serviceSubtotal = Number(summary.serviceSubtotal || 0);
    const serviceDurationTotal = Number(summary.serviceDurationTotal || 0);
    const staySubtotal = stayItem ? stayUnitPrice * calculatedStayNights : 0;
    const stayDurationTotal = stayItem ? calculatedStayNights : 0;

    return {
      serviceSubtotal,
      staySubtotal,
      serviceDurationTotal,
      stayDurationTotal,
      grandTotal: serviceSubtotal + staySubtotal,
      totalItems: Number(summary.totalItems || 0),
    };
  }, [summary, stayItem, stayUnitPrice, calculatedStayNights]);

  const isVoucherApplicableToCart = useMemo(
    () => (voucher) => {
      if (!voucher) return false;

      const minSpend = Number(voucher.minSpend || 0);
      if (Number(effectiveSummary.grandTotal || 0) < minSpend) return false;

      const applicableServices = Array.isArray(voucher.applicableServices)
        ? voucher.applicableServices.map((id) => toObjectIdString(id)).filter(Boolean)
        : [];

      if (!applicableServices.length) return true;
      return applicableServices.some((id) => cartServiceIds.includes(id));
    },
    [effectiveSummary.grandTotal, cartServiceIds],
  );

  const discountAmount = useMemo(() => {
    if (!appliedVoucher || !isVoucherApplicableToCart(appliedVoucher)) return 0;
    return calculateVoucherDiscount(appliedVoucher, effectiveSummary.grandTotal);
  }, [appliedVoucher, isVoucherApplicableToCart, effectiveSummary.grandTotal]);

  const grandTotalAfterDiscount = useMemo(
    () => Math.max(0, Number(effectiveSummary.grandTotal || 0) - Number(discountAmount || 0)),
    [effectiveSummary.grandTotal, discountAmount],
  );

  const requiredTopUpAmount = useMemo(() => {
    if (walletBalance === null) return 0;
    return Math.max(0, Math.ceil(Number(grandTotalAfterDiscount || 0) - Number(walletBalance || 0)));
  }, [grandTotalAfterDiscount, walletBalance]);

  const canAffordCheckout = walletBalance === null || requiredTopUpAmount <= 0;

  const canCheckout = Boolean(
    effectiveAppointmentDate &&
    effectiveAppointmentTime &&
    selectedPet &&
    serviceItems.length > 0 &&
    canAffordCheckout
  );

  const loadCart = useCallback(async () => {
    if (!hasToken) {
      setCart({ items: [], summary: EMPTY_SUMMARY });
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const result = await getCart();
      setCart(result.data);
    } catch (err) {
      setError(err?.response?.data?.message || "Unable to load cart.");
    } finally {
      setLoading(false);
    }
  }, [hasToken]);

  useEffect(() => {
    loadCart();
  }, [loadCart]);

  useEffect(() => {
    let alive = true;
    if (!hasToken) return;
    getMyPets({ active: "true", limit: 100 })
      .then((res) => {
        if (!alive) return;
        const rows = Array.isArray(res?.data?.pets) ? res.data.pets : [];
        setPets(rows);
      })
      .catch(() => {
        if (!alive) return;
        setPets([]);
      });

    return () => {
      alive = false;
    };
  }, [hasToken]);

  useEffect(() => {
    let alive = true;
    if (!hasToken) {
      setAvailableVouchers([]);
      return;
    }

    setVoucherLoading(true);
    getAvailableVouchersForCustomer({ limit: 50 })
      .then((res) => {
        if (!alive) return;
        const rows = Array.isArray(res?.data?.data?.vouchers)
          ? res.data.data.vouchers
          : [];
        setAvailableVouchers(rows);
      })
      .catch(() => {
        if (!alive) return;
        setAvailableVouchers([]);
      })
      .finally(() => {
        if (alive) setVoucherLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [hasToken]);

  useEffect(() => {
    if (!appliedVoucher) return;
    if (isVoucherApplicableToCart(appliedVoucher)) return;

    setAppliedVoucher(null);
    setVoucherMessage("");
    setVoucherError("This voucher is no longer applicable to this cart.");
  }, [appliedVoucher, isVoucherApplicableToCart]);

  useEffect(() => {
    let alive = true;
    if (!hasToken) {
      setWalletBalance(null);
      return;
    }

    setWalletLoading(true);
    getWallet()
      .then((res) => {
        if (!alive) return;
        setWalletBalance(res?.data?.balance ?? null);
      })
      .catch(() => {
        if (!alive) return;
        setWalletBalance(null);
      })
      .finally(() => {
        if (alive) setWalletLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [hasToken]);

  useEffect(() => {
    const metadata = stayItem?.metadata || {};
    setStayCheckInDate(metadata.checkInDate ? toISODate(new Date(metadata.checkInDate)) : "");
    setStayCheckOutDate(metadata.checkOutDate ? toISODate(new Date(metadata.checkOutDate)) : "");
    setStayCheckInTime(metadata.checkInTime || "09:00");
    setStayCheckOutTime(metadata.checkOutTime || "10:00");
  }, [stayItem]);

  const firstServiceId = serviceItems[0]?.serviceId?._id || serviceItems[0]?.serviceId;
  const serviceTimeSlots = useMemo(() => generateTimeSlots(15), []);
  const stayTimeSlots = useMemo(() => {
    const slots = [];
    for (
      let t = STAY_OPEN_MINUTES;
      t < STAY_CLOSE_MINUTES;
      t += STAY_INTERVAL_MINUTES
    ) {
      slots.push(minutesToSlot(t));
    }
    return slots;
  }, []);

  useEffect(() => {
    let alive = true;

    const loadSlots = async () => {
      if (checkoutMode !== "service-only") {
        if (alive) {
          setBookedSlots([]);
          setSlotLoading(false);
        }
        return;
      }

      const slotDate = selectedDate;
      if (!selectedPet || !slotDate || !firstServiceId) {
        if (alive) setBookedSlots([]);
        return;
      }

      setSlotLoading(true);
      try {
        const res = await getAvailableSlots(slotDate, firstServiceId, selectedPet);
        if (!alive) return;
        setBookedSlots(Array.isArray(res?.data?.disabledSlots) ? res.data.disabledSlots : []);
      } catch {
        if (!alive) return;
        setBookedSlots([]);
      } finally {
        if (alive) setSlotLoading(false);
      }
    };

    loadSlots();
    return () => {
      alive = false;
    };
  }, [checkoutMode, selectedDate, firstServiceId, selectedPet]);

  const handleQtyChange = async (itemId, nextQty) => {
    if (nextQty < 1 || nextQty > 99) return;
    setActionBusy(true);
    setCheckoutError("");
    try {
      const result = await updateCartItem(itemId, nextQty);
      setCart(result.data);
    } catch (err) {
      setCheckoutError(err?.response?.data?.message || "Unable to update quantity.");
    } finally {
      setActionBusy(false);
    }
  };

  const handleRemove = async (itemId) => {
    setActionBusy(true);
    setCheckoutError("");
    try {
      const result = await removeCartItem(itemId);
      setCart(result.data);
    } catch (err) {
      setCheckoutError(err?.response?.data?.message || "Unable to remove item.");
    } finally {
      setActionBusy(false);
    }
  };

  const handleClear = async () => {
    setActionBusy(true);
    setCheckoutError("");
    try {
      const result = await clearCart();
      setCart(result.data);
    } catch (err) {
      setCheckoutError(err?.response?.data?.message || "Unable to clear cart.");
    } finally {
      setActionBusy(false);
    }
  };

  const handleCheckout = async () => {
    setCheckoutError("");
    setCheckoutSuccess("");

    if (!canAffordCheckout) {
      setCheckoutError("Insufficient wallet balance. Please top up to continue checkout.");
      return;
    }

    if (!canCheckout) {
      setCheckoutError("Please select a time and pet before checkout.");
      return;
    }

    if (checkoutMode === "service-stay" && (!stayCheckInDate || !stayCheckOutDate || !stayCheckOutTime)) {
      setCheckoutError("Please enter a valid check-in/check-out date for the stay package.");
      return;
    }

    if (checkoutMode === "service-stay" && calculatedStayNights <= 0) {
      setCheckoutError("Please choose a valid from/to range to calculate stay nights.");
      return;
    }

    setCheckoutBusy(true);
    try {
      const payload = {
        appointmentDate: splitDateTime(effectiveAppointmentDate, effectiveAppointmentTime),
        petId: selectedPet,
        notes,
        ...(appliedVoucher?.code ? { voucherCode: appliedVoucher.code } : {}),
        ...(checkoutMode === "service-stay"
          ? {
              stayCheckInDate,
              stayCheckInTime,
              stayCheckOutDate,
              stayCheckOutTime,
            }
          : {}),
      };

      const result = await checkoutBooking(payload);
      const bookingNo = result?.data?.booking?.bookingNumber;
      setCheckoutSuccess(
        bookingNo
          ? `Booking successful (#${bookingNo}). Booking summary has been finalized.`
          : "Booking successful.",
      );

      setSelectedTime("");
      setSelectedPet("");
      setNotes("");
      setAppliedVoucher(null);
      setVoucherInput("");
      setVoucherMessage("");
      setVoucherError("");
      await loadCart();
    } catch (err) {
      setCheckoutError(getErrorMessage(err) || "Checkout failed. Please try again.");
    } finally {
      setCheckoutBusy(false);
    }
  };

  const handleApplyVoucher = () => {
    setVoucherError("");
    setVoucherMessage("");

    const code = voucherInput.trim().toUpperCase();
    if (!code) {
      setVoucherError("Please enter a voucher code.");
      return;
    }

    const found = availableVouchers.find(
      (voucher) => String(voucher.code || "").toUpperCase() === code,
    );

    if (!found) {
      setVoucherError("Voucher code is invalid or unavailable for your account.");
      return;
    }

    if (!isVoucherApplicableToCart(found)) {
      setVoucherError("Voucher cannot be applied to this cart yet (min spend or service mismatch).");
      return;
    }

    setAppliedVoucher(found);
    setVoucherMessage("Voucher applied successfully.");
  };

  return (
    <div className="min-h-screen bg-[#F5F1EB]">
      <Navbar
        user={user}
        onLogout={() => setUser(null)}
        onLoginClick={() => {
          setAuthMode("login");
          setAuthOpen(true);
        }}
        onRegisterClick={() => {
          setAuthMode("register");
          setAuthOpen(true);
        }}
      />

      <AuthModal
        isOpen={authOpen}
        onClose={() => setAuthOpen(false)}
        initialMode={authMode}
        onLoginSuccess={(u) => {
          setUser(u);
          setAuthOpen(false);
          loadCart();
        }}
      />

      <main className="mx-auto max-w-6xl px-4 pt-24 pb-16">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-2xl bg-[#E07A5F] text-white flex items-center justify-center">
            <ShoppingCart size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-[#1F2A37]">Shopping Cart & Booking</h1>
            <p className="text-sm text-[#1F2A37]/60">Select services, accommodation, and confirm appointment</p>
          </div>
        </div>

        {!hasToken && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 mb-5 text-amber-800 text-sm">
            Please log in to use shopping cart and process booking payment.
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl border border-[#1F2A37]/10 bg-white p-8 text-center text-[#1F2A37]/60">Loading cart...</div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700 text-sm">{error}</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[1.7fr_1fr] gap-6">
            <section className="space-y-4">
              {items.length === 0 ? (
                <div className="rounded-2xl border border-[#1F2A37]/10 bg-white p-8 text-center">
                  <ShoppingCart size={24} className="mx-auto text-[#1F2A37]/40 mb-2" />
                  <p className="text-[#1F2A37]/70 font-semibold">Cart is empty</p>
                  <p className="text-sm text-[#1F2A37]/50 mt-1">Add services or accommodation rooms to get started.</p>
                </div>
              ) : (
                <>
                  {items.map((item) => {
                    const type = item.type || "service";
                    return (
                      <MotionDiv
                        key={item._id}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="rounded-2xl border border-[#1F2A37]/10 bg-white p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${type === "stay" ? "bg-[#7FB069]/15 text-[#5F8E4E]" : "bg-[#E07A5F]/15 text-[#E07A5F]"}`}>
                              {type === "stay" ? <Home size={18} /> : <PawPrint size={18} />}
                            </div>
                            <div>
                              <p className="font-bold text-[#1F2A37]">{item.name}</p>
                              <p className="text-xs text-[#1F2A37]/60 mt-1">
                                {type === "stay"
                                  ? `${calculatedStayNights || item.duration || item.metadata?.nights || 0} nights`
                                  : `${item.duration || 0} minutes x ${item.quantity || 1}`}
                              </p>
                              {type === "stay" && stayCheckInDate && stayCheckOutDate && (
                                <p className="text-xs text-[#1F2A37]/55 mt-1">
                                  {stayCheckInDate} {"->"} {stayCheckOutDate}
                                </p>
                              )}
                              {type === "stay" && !stayCheckInDate && !stayCheckOutDate && (
                                <p className="text-xs text-[#1F2A37]/55 mt-1">Haven't selected check-in/check-out dates yet</p>
                              )}
                              {!!item.note && (
                                <p className="text-xs text-[#1F2A37]/60 italic mt-1">Note: {item.note}</p>
                              )}
                            </div>
                          </div>

                          <div className="text-right">
                            <p className="text-sm font-bold text-[#E07A5F]">
                              {VND.format(type === "stay" ? effectiveSummary.staySubtotal : item.subtotal || 0)}đ
                            </p>
                            <p className="text-xs text-[#1F2A37]/50 mt-0.5">{VND.format(item.unitPrice || item.price || 0)}đ / unit</p>
                          </div>
                        </div>

                        <div className="mt-3 flex items-center justify-between">
                          {type === "service" ? (
                            <div className="inline-flex items-center gap-2 rounded-xl border border-[#1F2A37]/10 px-2 py-1">
                              <button
                                disabled={actionBusy || item.quantity <= 1}
                                onClick={() => handleQtyChange(item._id, Number(item.quantity || 1) - 1)}
                                className="p-1 text-[#1F2A37]/70 disabled:opacity-40"
                              >
                                <Minus size={14} />
                              </button>
                              <span className="text-sm font-semibold min-w-5 text-center">{item.quantity || 1}</span>
                              <button
                                disabled={actionBusy || item.quantity >= 99}
                                onClick={() => handleQtyChange(item._id, Number(item.quantity || 1) + 1)}
                                className="p-1 text-[#1F2A37]/70 disabled:opacity-40"
                              >
                                <Plus size={14} />
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-[#1F2A37]/55">Quantity is fixed per stay period</span>
                          )}

                          <button
                            disabled={actionBusy}
                            onClick={() => handleRemove(item._id)}
                            className="inline-flex items-center gap-1.5 text-sm text-red-500 hover:text-red-600"
                          >
                            <Trash2 size={14} /> Remove
                          </button>
                        </div>
                      </MotionDiv>
                    );
                  })}

                  <button
                    disabled={actionBusy}
                    onClick={handleClear}
                    className="text-sm text-red-600 hover:text-red-700 font-semibold"
                  >
                    Clear entire cart
                  </button>
                </>
              )}
            </section>

            <aside className="rounded-2xl border border-[#1F2A37]/10 bg-white p-5 h-fit sticky top-24 space-y-4">
              <h2 className="text-lg font-black text-[#1F2A37]">Booking Summary</h2>

              {items.length > 0 && (
                <>
                  <div className="rounded-xl bg-[#F9F6F1] border border-[#1F2A37]/10 p-3 space-y-3">
                    <p className="text-xs font-bold uppercase tracking-wide text-[#1F2A37]/60">Checkout Form ({checkoutMode === "service-only" ? "Service only" : "Service + Stay"})</p>

                    <div>
                      <label className="text-xs font-semibold text-[#1F2A37]/70">Pet</label>
                      <div className="grid grid-cols-2 gap-2 mt-1">
                        {pets.map((pet) => (
                          <button
                            type="button"
                            key={pet._id}
                            onClick={() => {
                              setSelectedPet(pet._id);
                              setSelectedTime("");
                              setCheckoutError("");
                            }}
                            className={`text-left rounded-lg border px-2.5 py-2 text-xs transition ${selectedPet === pet._id ? "border-[#E07A5F] bg-[#E07A5F]/10 text-[#E07A5F]" : "border-[#1F2A37]/15 text-[#1F2A37]/70 hover:border-[#E07A5F]/40"}`}
                          >
                            <p className="font-semibold">{pet.petName}</p>
                            <p className="text-[11px] opacity-70">{pet.breed || pet.petType}</p>
                          </button>
                        ))}
                        {pets.length === 0 && <p className="text-xs text-[#1F2A37]/55">You don't have any available pets.</p>}
                      </div>
                    </div>

                    {checkoutMode === "service-only" && (
                      <>
                        <div>
                          <label className="text-xs font-semibold text-[#1F2A37]/70">Appointment Date</label>
                          {selectedPet ? (
                            <CalendarPicker
                              selectedDate={selectedDate}
                              onChange={(d) => {
                                setSelectedDate(d);
                                setSelectedTime("");
                                setCheckoutError("");
                              }}
                              minDate={toISODate(new Date())}
                            />
                          ) : (
                            <div className="mt-1 rounded-lg border border-dashed border-[#1F2A37]/20 px-3 py-2 text-xs text-[#1F2A37]/55">
                              Please select a pet before choosing appointment date.
                            </div>
                          )}
                        </div>

                        <div>
                          <label className="text-xs font-semibold text-[#1F2A37]/70">Appointment Time</label>
                          {!selectedPet || !selectedDate ? (
                            <div className="text-xs text-[#1F2A37]/60 py-2">
                              {!selectedPet
                                ? "Please select a pet first."
                                : "Please select appointment date first."}
                            </div>
                          ) : slotLoading ? (
                            <div className="text-xs text-[#1F2A37]/60 py-2">Checking available slots...</div>
                          ) : (
                            <TimeSlotPicker
                              selectedDate={selectedDate}
                              slots={serviceTimeSlots}
                              bookedSlots={bookedSlots}
                              selectedSlot={selectedTime}
                              onSelect={setSelectedTime}
                              intervalMinutes={15}
                            />
                          )}
                        </div>
                      </>
                    )}

                    {checkoutMode === "service-stay" && (
                      <>
                        <div>
                          <label className="text-xs font-semibold text-[#1F2A37]/70">Check-in Date</label>
                          <CalendarPicker
                            selectedDate={stayCheckInDate}
                            onChange={(d) => {
                              setStayCheckInDate(d);
                              setStayCheckInTime("");
                              setCheckoutError("");
                            }}
                            minDate={toISODate(new Date())}
                          />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-[#1F2A37]/70">Check-in Time (boarding hours)</label>
                          <TimeSlotPicker
                            selectedDate={stayCheckInDate}
                            slots={stayTimeSlots}
                            bookedSlots={[]}
                            selectedSlot={stayCheckInTime}
                            onSelect={setStayCheckInTime}
                            intervalMinutes={STAY_INTERVAL_MINUTES}
                          />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-[#1F2A37]/70">Check-out Date</label>
                          <CalendarPicker
                            selectedDate={stayCheckOutDate}
                            onChange={setStayCheckOutDate}
                            minDate={stayCheckInDate || toISODate(new Date())}
                          />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-[#1F2A37]/70">Check-out Time</label>
                          <input
                            type="time"
                            value={stayCheckOutTime}
                            onChange={(e) => setStayCheckOutTime(e.target.value)}
                            className="mt-1 w-full rounded-lg border border-[#1F2A37]/15 px-3 py-2 text-xs outline-none focus:border-[#E07A5F]"
                          />
                        </div>
                      </>
                    )}

                    <div>
                      <label className="text-xs font-semibold text-[#1F2A37]/70">Notes</label>
                      <textarea
                        rows={2}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-[#1F2A37]/15 px-3 py-2 text-xs outline-none focus:border-[#E07A5F]"
                        placeholder="Example: pet is sensitive to loud noises"
                      />
                    </div>
                  </div>

                  {checkoutError && (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 flex items-start gap-2">
                      <AlertTriangle size={15} className="mt-0.5" /> {checkoutError}
                    </div>
                  )}

                  {checkoutSuccess && (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 flex items-start gap-2">
                      <CheckCircle2 size={15} className="mt-0.5" /> {checkoutSuccess}
                    </div>
                  )}

                  <div className="rounded-lg border border-[#1F2A37]/10 bg-[#FAF8F4] p-2.5 space-y-1.5">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-[#1F2A37]/60">Voucher</p>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        value={voucherInput}
                        onChange={(e) => setVoucherInput(e.target.value.toUpperCase())}
                        className="flex-1 rounded-md border border-[#1F2A37]/15 px-2 py-1.5 text-[11px] outline-none focus:border-[#E07A5F]"
                        placeholder="Enter voucher code"
                      />
                      <button
                        type="button"
                        onClick={handleApplyVoucher}
                        disabled={voucherLoading || !voucherInput.trim()}
                        className="rounded-md bg-[#E07A5F] text-white text-[11px] font-bold px-2.5 py-1.5 disabled:opacity-50"
                      >
                        Apply
                      </button>
                    </div>

                    {appliedVoucher && (
                      <div className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] text-emerald-700 flex items-center justify-between gap-2">
                        <span>Voucher applied successfully</span>
                        <button
                          type="button"
                          onClick={() => {
                            setAppliedVoucher(null);
                            setVoucherInput("");
                            setVoucherMessage("");
                            setVoucherError("");
                          }}
                          className="underline"
                        >
                          Remove
                        </button>
                      </div>
                    )}

                    {voucherLoading && (
                      <p className="text-[11px] text-[#1F2A37]/55">Checking voucher...</p>
                    )}
                    {voucherMessage && (
                      <p className="text-[11px] text-emerald-700">{voucherMessage}</p>
                    )}
                    {voucherError && (
                      <p className="text-[11px] text-red-600">{voucherError}</p>
                    )}
                  </div>

                  <div className="rounded-xl border border-[#1F2A37]/10 bg-[#F9F6F1] p-3 space-y-2">
                    <p className="text-xs font-bold uppercase tracking-wide text-[#1F2A37]/60">Payment Bill</p>
                    <div className="flex justify-between text-[#1F2A37]/70 text-sm">
                      <span>Service Fee</span>
                      <span>{VND.format(effectiveSummary.serviceSubtotal)}đ</span>
                    </div>
                    <div className="flex justify-between text-[#1F2A37]/70 text-sm">
                      <span>Service Duration</span>
                      <span>{effectiveSummary.serviceDurationTotal} minutes</span>
                    </div>
                    <div className="flex justify-between text-[#1F2A37]/70 text-sm">
                      <span>Accommodation Fee</span>
                      <span>{VND.format(effectiveSummary.staySubtotal)}đ</span>
                    </div>
                    <div className="flex justify-between text-[#1F2A37]/70 text-sm">
                      <span>Accommodation Duration</span>
                      <span>{effectiveSummary.stayDurationTotal} nights</span>
                    </div>
                    <div className="flex justify-between text-[#1F2A37]/70 text-sm">
                      <span>Voucher Discount</span>
                      <span className="text-emerald-700">-{VND.format(discountAmount)}đ</span>
                    </div>
                    <hr className="border-dashed border-[#1F2A37]/15" />
                    <div className="flex justify-between font-black text-[#1F2A37] text-sm">
                      <span>Total Payment</span>
                      <span className="text-[#E07A5F]">{VND.format(grandTotalAfterDiscount)}đ</span>
                    </div>
                  </div>

                  <div className="rounded-xl border border-[#1F2A37]/10 bg-white px-3 py-2 text-sm">
                    <div className="flex justify-between text-[#1F2A37]/70">
                      <span>Wallet Balance</span>
                      <span>
                        {walletLoading
                          ? "Loading..."
                          : walletBalance !== null
                            ? `${VND.format(walletBalance)}đ`
                            : "Unavailable"}
                      </span>
                    </div>
                  </div>

                  {!walletLoading && walletBalance !== null && requiredTopUpAmount > 0 && (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                      <p>
                        Insufficient balance. You need to top up <span className="font-bold">{VND.format(requiredTopUpAmount)}đ</span> to process this booking.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          const currentPath = `${location.pathname}${location.search || ""}${location.hash || ""}`;
                          const params = new URLSearchParams();
                          params.set("topupAmount", String(requiredTopUpAmount));
                          params.set("returnTo", currentPath);
                          params.set("source", "cart-checkout");
                          navigate(`/wallet?${params.toString()}`);
                        }}
                        className="mt-2 underline font-semibold"
                      >
                        Top up your wallet
                      </button>
                    </div>
                  )}

                  <button
                    disabled={!canCheckout || checkoutBusy || checkoutMode === "service-stay" && (!stayCheckInDate || !stayCheckInTime || !stayCheckOutDate || !stayCheckOutTime || calculatedStayNights <= 0)}
                    onClick={handleCheckout}
                    className="w-full rounded-xl bg-[#E07A5F] text-white font-bold py-3 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#cb6d55]"
                  >
                    {checkoutBusy ? "Processing..." : "Process Payment & Create Booking"}
                  </button>

                  <p className="text-[11px] text-[#1F2A37]/55 flex items-center gap-1">
                    <CalendarDays size={12} /> Cannot select past dates, fully booked slots will auto-lock.
                  </p>
                  <p className="text-[11px] text-[#1F2A37]/55 flex items-center gap-1">
                    <Clock3 size={12} /> {checkoutMode === "service-stay"
                      ? "Check-in time uses boarding room hours, not service slot times."
                      : "Slots are checked per specific service to avoid system-wide locking."}
                  </p>
                </>
              )}
            </aside>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
