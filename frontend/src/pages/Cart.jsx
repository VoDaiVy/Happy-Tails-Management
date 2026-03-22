import { useEffect, useMemo, useState } from "react";
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
import { getErrorMessage } from "../utils/apiResponseHandler";

const VND = new Intl.NumberFormat("vi-VN");
const toISODate = (d) => d.toISOString().split("T")[0];

const splitDateTime = (date, time) => new Date(`${date}T${time}:00`).toISOString();

const STAY_OPEN_MINUTES = 8 * 60;
const STAY_CLOSE_MINUTES = 23 * 60;
const STAY_INTERVAL_MINUTES = 15;

const minutesToSlot = (minutes) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

export default function CartPage() {
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

  const hasToken = Boolean(localStorage.getItem("accessToken"));

  const items = cart?.items || [];
  const summary = cart?.summary || {
    serviceSubtotal: 0,
    staySubtotal: 0,
    serviceDurationTotal: 0,
    stayDurationTotal: 0,
    grandTotal: 0,
    totalItems: 0,
  };

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

  const calculatedStayNights = useMemo(() => {
    if (!stayItem || !stayCheckInDate || !stayCheckOutDate || !stayCheckOutTime) return 0;

    const checkIn = new Date(`${stayCheckInDate}T${stayCheckInTime || "00:00"}:00`);
    const checkOut = new Date(`${stayCheckOutDate}T${stayCheckOutTime}:00`);

    if (Number.isNaN(checkIn.getTime()) || Number.isNaN(checkOut.getTime()) || checkOut <= checkIn) {
      return 0;
    }

    const diffMs = checkOut.getTime() - checkIn.getTime();
    return Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  }, [stayItem?._id, stayCheckInDate, stayCheckOutDate, stayCheckInTime, stayCheckOutTime]);

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
  }, [summary, stayItem?._id, stayUnitPrice, calculatedStayNights]);

  const requiredTopUpAmount = useMemo(() => {
    if (walletBalance === null) return 0;
    return Math.max(0, Math.ceil(Number(effectiveSummary.grandTotal || 0) - Number(walletBalance || 0)));
  }, [effectiveSummary.grandTotal, walletBalance]);

  const canAffordCheckout = walletBalance === null || requiredTopUpAmount <= 0;

  const canCheckout = Boolean(
    effectiveAppointmentDate &&
    effectiveAppointmentTime &&
    selectedPet &&
    serviceItems.length > 0 &&
    canAffordCheckout
  );

  const loadCart = async () => {
    if (!hasToken) {
      setCart({ items: [], summary });
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const result = await getCart();
      setCart(result.data);
    } catch (err) {
      setError(err?.response?.data?.message || "Không tải được giỏ hàng.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCart();
  }, []);

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
  }, [stayItem?._id]);

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
      if (!slotDate || !firstServiceId) {
        if (alive) setBookedSlots([]);
        return;
      }

      setSlotLoading(true);
      try {
        const res = await getAvailableSlots(slotDate, firstServiceId);
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
  }, [checkoutMode, selectedDate, firstServiceId]);

  const handleQtyChange = async (itemId, nextQty) => {
    if (nextQty < 1 || nextQty > 99) return;
    setActionBusy(true);
    setCheckoutError("");
    try {
      const result = await updateCartItem(itemId, nextQty);
      setCart(result.data);
    } catch (err) {
      setCheckoutError(err?.response?.data?.message || "Không cập nhật được số lượng.");
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
      setCheckoutError(err?.response?.data?.message || "Không xóa được sản phẩm.");
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
      setCheckoutError(err?.response?.data?.message || "Không xóa được giỏ hàng.");
    } finally {
      setActionBusy(false);
    }
  };

  const handleCheckout = async () => {
    setCheckoutError("");
    setCheckoutSuccess("");

    if (!canAffordCheckout) {
      setCheckoutError("Số dư ví không đủ. Vui lòng nạp thêm để tiếp tục thanh toán.");
      return;
    }

    if (!canCheckout) {
      setCheckoutError("Vui lòng chọn thời gian và thú cưng trước khi thanh toán.");
      return;
    }

    if (checkoutMode === "service-stay" && (!stayCheckInDate || !stayCheckOutDate || !stayCheckOutTime)) {
      setCheckoutError("Vui lòng nhập ngày nhận/trả phòng hợp lệ cho gói lưu trú.");
      return;
    }

    if (checkoutMode === "service-stay" && calculatedStayNights <= 0) {
      setCheckoutError("Vui lòng chọn from/to hợp lệ để tính số đêm lưu trú.");
      return;
    }

    setCheckoutBusy(true);
    try {
      const payload = {
        appointmentDate: splitDateTime(effectiveAppointmentDate, effectiveAppointmentTime),
        petId: selectedPet,
        notes,
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
          ? `Đặt lịch thành công (#${bookingNo}). Booking summary đã được chốt.`
          : "Đặt lịch thành công.",
      );

      setSelectedTime("");
      setSelectedPet("");
      setNotes("");
      await loadCart();
    } catch (err) {
      setCheckoutError(getErrorMessage(err) || "Thanh toán thất bại. Vui lòng thử lại.");
    } finally {
      setCheckoutBusy(false);
    }
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
            <h1 className="text-2xl font-black text-[#1F2A37]">Giỏ hàng & Booking</h1>
            <p className="text-sm text-[#1F2A37]/60">Chọn dịch vụ, lưu trú và xác nhận lịch hẹn</p>
          </div>
        </div>

        {!hasToken && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 mb-5 text-amber-800 text-sm">
            Vui lòng đăng nhập để sử dụng giỏ hàng và thanh toán booking.
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl border border-[#1F2A37]/10 bg-white p-8 text-center text-[#1F2A37]/60">Đang tải giỏ hàng...</div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700 text-sm">{error}</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[1.7fr_1fr] gap-6">
            <section className="space-y-4">
              {items.length === 0 ? (
                <div className="rounded-2xl border border-[#1F2A37]/10 bg-white p-8 text-center">
                  <ShoppingCart size={24} className="mx-auto text-[#1F2A37]/40 mb-2" />
                  <p className="text-[#1F2A37]/70 font-semibold">Giỏ hàng đang trống</p>
                  <p className="text-sm text-[#1F2A37]/50 mt-1">Hãy thêm dịch vụ hoặc phòng lưu trú để bắt đầu.</p>
                </div>
              ) : (
                <>
                  {items.map((item) => {
                    const type = item.type || "service";
                    return (
                      <motion.div
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
                                  ? `${calculatedStayNights || item.duration || item.metadata?.nights || 0} đêm`
                                  : `${item.duration || 0} phút x ${item.quantity || 1}`}
                              </p>
                              {type === "stay" && stayCheckInDate && stayCheckOutDate && (
                                <p className="text-xs text-[#1F2A37]/55 mt-1">
                                  {stayCheckInDate} {"->"} {stayCheckOutDate}
                                </p>
                              )}
                              {type === "stay" && !stayCheckInDate && !stayCheckOutDate && (
                                <p className="text-xs text-[#1F2A37]/55 mt-1">Chưa chọn from/to lưu trú</p>
                              )}
                              {!!item.note && (
                                <p className="text-xs text-[#1F2A37]/60 italic mt-1">Ghi chú: {item.note}</p>
                              )}
                            </div>
                          </div>

                          <div className="text-right">
                            <p className="text-sm font-bold text-[#E07A5F]">
                              {VND.format(type === "stay" ? effectiveSummary.staySubtotal : item.subtotal || 0)}đ
                            </p>
                            <p className="text-xs text-[#1F2A37]/50 mt-0.5">{VND.format(item.unitPrice || item.price || 0)}đ / đơn vị</p>
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
                            <span className="text-xs text-[#1F2A37]/55">Số lượng cố định theo kỳ lưu trú</span>
                          )}

                          <button
                            disabled={actionBusy}
                            onClick={() => handleRemove(item._id)}
                            className="inline-flex items-center gap-1.5 text-sm text-red-500 hover:text-red-600"
                          >
                            <Trash2 size={14} /> Xóa
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}

                  <button
                    disabled={actionBusy}
                    onClick={handleClear}
                    className="text-sm text-red-600 hover:text-red-700 font-semibold"
                  >
                    Xóa toàn bộ giỏ hàng
                  </button>
                </>
              )}
            </section>

            <aside className="rounded-2xl border border-[#1F2A37]/10 bg-white p-5 h-fit sticky top-24 space-y-4">
              <h2 className="text-lg font-black text-[#1F2A37]">Booking Summary</h2>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-[#1F2A37]/70">
                  <span>Số dư ví</span>
                  <span>
                    {walletLoading
                      ? "Đang tải..."
                      : walletBalance !== null
                        ? `${VND.format(walletBalance)}đ`
                        : "Không khả dụng"}
                  </span>
                </div>
                <div className="flex justify-between text-[#1F2A37]/70">
                  <span>Phí dịch vụ</span>
                  <span>{VND.format(effectiveSummary.serviceSubtotal)}đ</span>
                </div>
                <div className="flex justify-between text-[#1F2A37]/70">
                  <span>Thời gian dịch vụ</span>
                  <span>{effectiveSummary.serviceDurationTotal} phút</span>
                </div>
                <div className="flex justify-between text-[#1F2A37]/70">
                  <span>Phí lưu trú</span>
                  <span>{VND.format(effectiveSummary.staySubtotal)}đ</span>
                </div>
                <div className="flex justify-between text-[#1F2A37]/70">
                  <span>Thời gian lưu trú</span>
                  <span>{effectiveSummary.stayDurationTotal} đêm</span>
                </div>
                <hr className="border-dashed border-[#1F2A37]/15" />
                <div className="flex justify-between font-black text-[#1F2A37]">
                  <span>Tổng thanh toán</span>
                  <span className="text-[#E07A5F]">{VND.format(effectiveSummary.grandTotal)}đ</span>
                </div>
              </div>

              {!walletLoading && walletBalance !== null && requiredTopUpAmount > 0 && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  <p>
                    Số dư không đủ. Cần nạp thêm <span className="font-bold">{VND.format(requiredTopUpAmount)}đ</span> để thanh toán đơn này.
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

              {items.length > 0 && (
                <>
                  <div className="rounded-xl bg-[#F9F6F1] border border-[#1F2A37]/10 p-3 space-y-3">
                    <p className="text-xs font-bold uppercase tracking-wide text-[#1F2A37]/60">Checkout Form ({checkoutMode === "service-only" ? "Service only" : "Service + Stay"})</p>

                    {checkoutMode === "service-only" && (
                      <>
                        <div>
                          <label className="text-xs font-semibold text-[#1F2A37]/70">Ngày hẹn</label>
                          <CalendarPicker
                            selectedDate={selectedDate}
                            onChange={(d) => {
                              setSelectedDate(d);
                              setSelectedTime("");
                              setCheckoutError("");
                            }}
                            minDate={toISODate(new Date())}
                          />
                        </div>

                        <div>
                          <label className="text-xs font-semibold text-[#1F2A37]/70">Giờ hẹn</label>
                          {slotLoading ? (
                            <div className="text-xs text-[#1F2A37]/60 py-2">Đang kiểm tra slot...</div>
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

                    <div>
                      <label className="text-xs font-semibold text-[#1F2A37]/70">Thú cưng</label>
                      <div className="grid grid-cols-2 gap-2 mt-1">
                        {pets.map((pet) => (
                          <button
                            type="button"
                            key={pet._id}
                            onClick={() => setSelectedPet(pet._id)}
                            className={`text-left rounded-lg border px-2.5 py-2 text-xs transition ${selectedPet === pet._id ? "border-[#E07A5F] bg-[#E07A5F]/10 text-[#E07A5F]" : "border-[#1F2A37]/15 text-[#1F2A37]/70 hover:border-[#E07A5F]/40"}`}
                          >
                            <p className="font-semibold">{pet.petName}</p>
                            <p className="text-[11px] opacity-70">{pet.breed || pet.petType}</p>
                          </button>
                        ))}
                        {pets.length === 0 && <p className="text-xs text-[#1F2A37]/55">Bạn chưa có pet khả dụng.</p>}
                      </div>
                    </div>

                    {checkoutMode === "service-stay" && (
                      <>
                        <div>
                          <label className="text-xs font-semibold text-[#1F2A37]/70">Ngày nhận phòng</label>
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
                          <label className="text-xs font-semibold text-[#1F2A37]/70">Giờ nhận phòng (khung giờ lưu trú)</label>
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
                          <label className="text-xs font-semibold text-[#1F2A37]/70">Ngày trả phòng</label>
                          <CalendarPicker
                            selectedDate={stayCheckOutDate}
                            onChange={setStayCheckOutDate}
                            minDate={stayCheckInDate || toISODate(new Date())}
                          />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-[#1F2A37]/70">Giờ trả phòng</label>
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
                      <label className="text-xs font-semibold text-[#1F2A37]/70">Ghi chú</label>
                      <textarea
                        rows={2}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-[#1F2A37]/15 px-3 py-2 text-xs outline-none focus:border-[#E07A5F]"
                        placeholder="Ví dụ: thú cưng nhạy cảm với tiếng ồn"
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

                  <button
                    disabled={!canCheckout || checkoutBusy || checkoutMode === "service-stay" && (!stayCheckInDate || !stayCheckInTime || !stayCheckOutDate || !stayCheckOutTime || calculatedStayNights <= 0)}
                    onClick={handleCheckout}
                    className="w-full rounded-xl bg-[#E07A5F] text-white font-bold py-3 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#cb6d55]"
                  >
                    {checkoutBusy ? "Đang xử lý..." : "Thanh toán & Tạo booking"}
                  </button>

                  <p className="text-[11px] text-[#1F2A37]/55 flex items-center gap-1">
                    <CalendarDays size={12} /> Không chọn được ngày quá khứ, slot hết chỗ sẽ tự khóa.
                  </p>
                  <p className="text-[11px] text-[#1F2A37]/55 flex items-center gap-1">
                    <Clock3 size={12} /> {checkoutMode === "service-stay"
                      ? "Giờ nhận phòng dùng khung giờ lưu trú của phòng, không lấy theo slot dịch vụ."
                      : "Slot đang kiểm tra theo dịch vụ cụ thể, tránh chặn nhầm toàn hệ thống."}
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
