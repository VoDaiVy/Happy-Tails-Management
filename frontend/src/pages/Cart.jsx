import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingBag,
  Trash2,
  ArrowRight,
  PawPrint,
  Sparkles,
  Tag,
  Clock,
  ChevronRight,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import AuthModal from "../components/AuthModal";
import CartItemCard from "../components/cart/CartItemCard";
import useCartStore from "../store/cartStore";

/* ─── constants ─────────────────────── */
const TAX_RATE = 0.08;

const fmt = (val) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    val ?? 0,
  );

/* ─── Empty state ────────────────────── */
const EmptyCart = () => (
  <motion.div
    initial={{ opacity: 0, y: 24 }}
    animate={{ opacity: 1, y: 0 }}
    className="flex flex-col items-center justify-center py-24 text-center"
  >
    {/* Illustration */}
    <motion.div
      animate={{ y: [0, -10, 0] }}
      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      className="w-40 h-40 rounded-full bg-[#F5F1EB] flex items-center justify-center mb-8 shadow-inner relative"
    >
      <PawPrint
        size={72}
        className="text-[#E07A5F] opacity-50"
        strokeWidth={1.2}
      />
      {/* floating sparkles */}
      {[
        { top: "8%", left: "12%", size: 14, delay: 0 },
        { top: "10%", right: "10%", size: 10, delay: 0.6 },
        { bottom: "12%", left: "8%", size: 10, delay: 1.2 },
      ].map((s, i) => (
        <motion.div
          key={i}
          style={{
            position: "absolute",
            top: s.top,
            left: s.left,
            right: s.right,
            bottom: s.bottom,
          }}
          animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
          transition={{ duration: 2, repeat: Infinity, delay: s.delay }}
        >
          <Sparkles size={s.size} className="text-[#E07A5F]" />
        </motion.div>
      ))}
    </motion.div>

    <h2 className="text-3xl font-black text-[#1F2A37] mb-3">
      Your cart is empty
    </h2>
    <p className="text-slate-500 text-base max-w-xs leading-relaxed mb-10">
      Your furry friend is waiting for something special. Browse our premium
      services!
    </p>

    <Link
      to="/service"
      className="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-[#E07A5F] to-[#c9593e] text-white font-bold rounded-2xl shadow-[0_6px_24px_rgba(224,122,95,0.45)] hover:shadow-[0_10px_32px_rgba(224,122,95,0.6)] hover:scale-[1.04] transition-all"
    >
      <Sparkles size={16} />
      Browse Services
      <ChevronRight size={16} />
    </Link>
  </motion.div>
);

/* ─── Order Summary Card ─────────────── */
const OrderSummary = ({ subtotal, discount = 0, onCheckout, loading }) => {
  const tax = subtotal * TAX_RATE;
  const total = subtotal - discount + tax;

  return (
    <div className="bg-white rounded-[20px] shadow-[0_4px_32px_rgba(0,0,0,0.07)] border border-slate-100 overflow-hidden sticky top-28">
      {/* Header */}
      <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-[#F5F1EB] to-[#faf8f5]">
        <h3 className="font-black text-[#1F2A37] text-lg">Order Summary</h3>
      </div>

      {/* Lines */}
      <div className="px-6 py-5 space-y-3">
        <div className="flex justify-between text-sm text-slate-600">
          <span>Subtotal</span>
          <span className="font-semibold text-[#1F2A37]">{fmt(subtotal)}</span>
        </div>

        {discount > 0 && (
          <div className="flex justify-between text-sm">
            <span className="flex items-center gap-1.5 text-[#7FB069]">
              <Tag size={13} /> Discount
            </span>
            <span className="font-semibold text-[#7FB069]">
              −{fmt(discount)}
            </span>
          </div>
        )}

        <div className="flex justify-between text-sm text-slate-600">
          <span>Tax (8%)</span>
          <span className="font-semibold text-[#1F2A37]">{fmt(tax)}</span>
        </div>

        <div className="h-px bg-slate-100 my-2" />

        <div className="flex justify-between text-lg">
          <span className="font-black text-[#1F2A37]">Total</span>
          <span className="font-black text-[#E07A5F] text-xl">
            {fmt(total)}
          </span>
        </div>
      </div>

      {/* Promo strip */}
      <div className="mx-6 mb-5 px-4 py-3 bg-[#7FB069]/10 rounded-xl border border-[#7FB069]/20 flex items-start gap-2.5">
        <PawPrint size={14} className="text-[#7FB069] mt-0.5 flex-shrink-0" />
        <p className="text-[11px] text-[#1F2A37]/70 font-medium leading-relaxed">
          Bring <strong>5 pets</strong> → Get <strong>20% spa discount</strong>{" "}
          automatically applied!
        </p>
      </div>

      {/* Checkout button */}
      <div className="px-6 pb-6">
        <button
          onClick={onCheckout}
          disabled={loading || subtotal === 0}
          className="w-full flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-[#E07A5F] to-[#c9593e] text-white font-bold rounded-2xl
            shadow-[0_4px_18px_rgba(224,122,95,0.45)] hover:shadow-[0_8px_28px_rgba(224,122,95,0.6)]
            hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
        >
          {loading ? (
            <span className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
          ) : (
            <>
              <Sparkles size={16} />
              Checkout
              <ArrowRight size={16} />
            </>
          )}
        </button>

        <div className="mt-3 flex items-center justify-center gap-4 text-[10px] text-slate-400 font-medium">
          {["Secure Payment", "Instant Booking", "Free Cancellation"].map(
            (t) => (
              <span key={t} className="flex items-center gap-1">
                <CheckCircle size={10} className="text-[#7FB069]" /> {t}
              </span>
            ),
          )}
        </div>
      </div>
    </div>
  );
};

/* ─── Toast ─────────────────────────── */
const Toast = ({ message, type = "success" }) => (
  <motion.div
    initial={{ opacity: 0, y: -20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    className={`fixed top-24 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl shadow-xl
      ${type === "success" ? "bg-[#7FB069] text-white" : "bg-red-500 text-white"}`}
  >
    {type === "success" ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
    <span className="text-sm font-semibold">{message}</span>
  </motion.div>
);

/* ─── Cart Page ──────────────────────── */
const Cart = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem("user");
    return stored ? JSON.parse(stored) : null;
  });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState("login");
  const [toast, setToast] = useState(null);

  const {
    cart,
    isLoading,
    fetchCart,
    checkout,
    clearCart,
    getItems,
    getSubtotal,
  } = useCartStore();
  const items = getItems();
  const subtotal = getSubtotal();

  /* fetch cart on mount */
  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  /* auto-dismiss toast */
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const showToast = (message, type = "success") => setToast({ message, type });

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    setIsAuthModalOpen(false);
    if (userData.role === "admin") navigate("/admin");
    else if (userData.role === "staff") navigate("/staff");
  };

  const handleCheckout = async () => {
    if (!user) {
      setAuthModalMode("login");
      setIsAuthModalOpen(true);
      return;
    }
    const result = await checkout();
    if (result.success) {
      showToast("Order placed successfully! 🐾");
      setTimeout(() => navigate("/"), 1500);
    } else {
      showToast(result.message ?? "Checkout failed", "error");
    }
  };

  return (
    <div className="bg-[#FDFBF7] min-h-screen font-sans text-[#2D3436]">
      <Navbar
        onLoginClick={() => {
          setAuthModalMode("login");
          setIsAuthModalOpen(true);
        }}
        onRegisterClick={() => {
          setAuthModalMode("register");
          setIsAuthModalOpen(true);
        }}
        user={user}
        onLogout={() => setUser(null)}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialMode={authModalMode}
        onLoginSuccess={handleLoginSuccess}
      />

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <Toast
            key="toast"
            message={toast.message}
            type={toast.type}
            onDismiss={() => setToast(null)}
          />
        )}
      </AnimatePresence>

      {/* ── Page title ── */}
      <section className="pt-32 pb-8 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Link
                to="/"
                className="text-slate-400 hover:text-[#E07A5F] text-sm font-medium transition-colors"
              >
                Home
              </Link>
              <ChevronRight size={14} className="text-slate-300" />
              <span className="text-[#1F2A37] text-sm font-semibold">
                Shopping Cart
              </span>
            </div>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h1 className="text-3xl sm:text-4xl font-black text-[#1F2A37] leading-tight">
                  Your Cart
                </h1>
                <p className="text-slate-500 mt-1">
                  {items.length === 0
                    ? "Start adding services for your pet"
                    : `${cart?.totalItems ?? 0} item${(cart?.totalItems ?? 0) !== 1 ? "s" : ""} · ${fmt(subtotal)}`}
                </p>
              </div>
              {items.length > 0 && (
                <button
                  onClick={clearCart}
                  disabled={isLoading}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-red-400 hover:text-red-600 hover:bg-red-50 border border-red-200 rounded-xl transition-all disabled:opacity-40"
                >
                  <Trash2 size={14} />
                  Clear Cart
                </button>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Main content ── */}
      <section className="px-4 sm:px-6 pb-20">
        <div className="max-w-6xl mx-auto">
          {/* Loading skeleton */}
          {isLoading && items.length === 0 && (
            <div className="space-y-4 mt-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-28 rounded-2xl bg-slate-100 animate-pulse"
                />
              ))}
            </div>
          )}

          {!isLoading && items.length === 0 && <EmptyCart />}

          {items.length > 0 && (
            <div className="grid lg:grid-cols-[1fr_360px] gap-8 items-start">
              {/* ── LEFT: items ── */}
              <div className="space-y-4">
                {/* Pet selector hint */}
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-white rounded-[20px] p-4 border border-slate-100 shadow-sm"
                >
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                    Select Your Pet
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { name: "Bella", breed: "Golden Retriever", emoji: "🐕" },
                      { name: "Milo", breed: "Cat", emoji: "🐈" },
                    ].map((pet) => (
                      <button
                        key={pet.name}
                        className="flex items-center gap-2 px-3 py-2 bg-[#F5F1EB] hover:bg-[#E07A5F]/10 border-2 border-transparent hover:border-[#E07A5F]/30 rounded-xl transition-all text-sm font-semibold text-[#1F2A37]"
                      >
                        <span>{pet.emoji}</span>
                        <span>{pet.name}</span>
                        <span className="text-xs text-slate-400 font-normal">
                          — {pet.breed}
                        </span>
                      </button>
                    ))}
                    <button className="flex items-center gap-1.5 px-3 py-2 border-2 border-dashed border-slate-200 hover:border-[#E07A5F]/40 rounded-xl text-slate-400 hover:text-[#E07A5F] transition-all text-sm font-semibold">
                      + Add pet
                    </button>
                  </div>
                </motion.div>

                {/* Cart items */}
                <AnimatePresence initial={false}>
                  {items.map((item, idx) => (
                    <motion.div
                      key={item._id}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.06 }}
                    >
                      <CartItemCard item={item} />
                    </motion.div>
                  ))}
                </AnimatePresence>

                {/* Estimated time card */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="flex items-center gap-3 px-4 py-3 bg-[#F5F1EB] rounded-xl border border-[#E07A5F]/15"
                >
                  <Clock size={16} className="text-[#E07A5F] flex-shrink-0" />
                  <p className="text-sm font-medium text-[#1F2A37]/70">
                    Estimated total session time:{" "}
                    <strong className="text-[#1F2A37]">
                      {Math.round(
                        items.reduce(
                          (sum, i) => sum + i.duration * i.quantity,
                          0,
                        ),
                      )}{" "}
                      minutes
                    </strong>
                  </p>
                </motion.div>

                {/* Continue shopping */}
                <div className="flex justify-start pt-1">
                  <Link
                    to="/service"
                    className="flex items-center gap-2 text-sm font-semibold text-[#E07A5F] hover:text-[#c9593e] transition-colors"
                  >
                    <ShoppingBag size={14} />
                    Continue Shopping
                  </Link>
                </div>
              </div>

              {/* ── RIGHT: summary ── */}
              <motion.div
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 }}
              >
                <OrderSummary
                  subtotal={subtotal}
                  onCheckout={handleCheckout}
                  loading={isLoading}
                />
              </motion.div>
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Cart;
