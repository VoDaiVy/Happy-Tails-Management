import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  ShoppingBag,
  ArrowRight,
  PawPrint,
  Sparkles,
  Trash2,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import useCartStore from "../../store/cartStore";
import CartItemCard from "./CartItemCard";

const TAX_RATE = 0.08;

const formatPrice = (val) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    val ?? 0,
  );

/* ── Empty State ── */
const EmptyState = ({ onClose }) => (
  <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 text-center">
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 200, damping: 18 }}
      className="w-28 h-28 rounded-full bg-[#F5F1EB] flex items-center justify-center mb-6 shadow-inner"
    >
      <PawPrint
        size={52}
        className="text-[#E07A5F] opacity-60"
        strokeWidth={1.4}
      />
    </motion.div>
    <h3 className="font-black text-[#1F2A37] text-xl mb-2">
      Your cart is empty
    </h3>
    <p className="text-slate-500 text-sm leading-relaxed mb-8 max-w-[220px]">
      Treat your furry friend to something special today!
    </p>
    <Link
      to="/service"
      onClick={onClose}
      className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#E07A5F] to-[#c9593e] text-white font-bold rounded-2xl shadow-lg hover:shadow-xl hover:scale-[1.03] transition-all text-sm"
    >
      <Sparkles size={14} />
      Browse Services
    </Link>
  </div>
);

/* ── Cart Summary ── */
const CartSummary = ({ subtotal, onCheckout }) => {
  const tax = subtotal * TAX_RATE;
  const total = subtotal + tax;

  return (
    <div className="border-t border-slate-100 px-5 py-4 space-y-3">
      {/* Totals card */}
      <div className="bg-[#F5F1EB] rounded-2xl px-4 py-3 space-y-2">
        <div className="flex justify-between text-sm text-slate-600">
          <span>Subtotal</span>
          <span className="font-semibold text-[#1F2A37]">
            {formatPrice(subtotal)}
          </span>
        </div>
        <div className="flex justify-between text-sm text-slate-600">
          <span>Tax (8%)</span>
          <span className="font-semibold text-[#1F2A37]">
            {formatPrice(tax)}
          </span>
        </div>
        <div className="h-px bg-slate-200 my-1" />
        <div className="flex justify-between text-base">
          <span className="font-bold text-[#1F2A37]">Total</span>
          <span className="font-black text-[#E07A5F] text-lg">
            {formatPrice(total)}
          </span>
        </div>
      </div>

      {/* CTA buttons */}
      <button
        onClick={onCheckout}
        className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-[#E07A5F] to-[#c9593e] text-white font-bold rounded-2xl shadow-[0_4px_18px_rgba(224,122,95,0.45)] hover:shadow-[0_6px_26px_rgba(224,122,95,0.6)] hover:scale-[1.02] active:scale-[0.98] transition-all text-sm"
      >
        <Sparkles size={15} />
        Checkout
        <ArrowRight size={15} />
      </button>

      <Link
        to="/cart"
        className="w-full flex items-center justify-center gap-2 py-3 border-2 border-[#1F2A37]/10 hover:border-[#E07A5F]/50 text-[#1F2A37] font-semibold rounded-2xl hover:bg-[#F5F1EB] transition-all text-sm"
      >
        <ShoppingBag size={15} />
        View Full Cart
      </Link>
    </div>
  );
};

/* ── Main Drawer ── */
const CartDrawer = () => {
  const {
    cart,
    isDrawerOpen,
    isLoading,
    closeDrawer,
    clearCart,
    checkout,
    getItems,
    getSubtotal,
  } = useCartStore();
  const navigate = useNavigate();

  const items = getItems();
  const subtotal = getSubtotal();
  const itemCount = cart?.totalItems ?? 0;

  const handleCheckout = async () => {
    const user = localStorage.getItem("user");
    if (!user) {
      closeDrawer();
      return;
    }
    const result = await checkout();
    if (result.success) {
      navigate("/");
    }
  };

  return (
    <>
      {/* ── Backdrop ── */}
      <AnimatePresence>
        {isDrawerOpen && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60]"
            onClick={closeDrawer}
          />
        )}
      </AnimatePresence>

      {/* ── Drawer Panel ── */}
      <AnimatePresence>
        {isDrawerOpen && (
          <motion.div
            key="drawer"
            initial={{ x: "100%", opacity: 0.5 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0.5 }}
            transition={{ type: "spring", stiffness: 340, damping: 34 }}
            className="fixed top-0 right-0 h-full w-full max-w-[420px] bg-white z-[61] flex flex-col"
            style={{ boxShadow: "-12px 0 60px rgba(0,0,0,0.18)" }}
          >
            {/* ── Header ── */}
            <div className="flex items-center justify-between px-5 pt-6 pb-4 border-b border-slate-100">
              <div>
                <h2 className="font-black text-[#1F2A37] text-xl leading-tight">
                  Your Cart
                </h2>
                <p className="text-slate-500 text-sm mt-0.5">
                  {itemCount === 0
                    ? "No items yet"
                    : `${itemCount} item${itemCount !== 1 ? "s" : ""} selected`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {items.length > 0 && (
                  <button
                    onClick={clearCart}
                    disabled={isLoading}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                    title="Clear all"
                  >
                    <Trash2 size={13} />
                    Clear
                  </button>
                )}
                <button
                  onClick={closeDrawer}
                  className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 hover:text-[#1F2A37] hover:bg-slate-100 transition-all"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* ── Body ── */}
            {items.length === 0 ? (
              <EmptyState onClose={closeDrawer} />
            ) : (
              <>
                {/* Items list */}
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                  <AnimatePresence initial={false}>
                    {items.map((item) => (
                      <CartItemCard key={item._id} item={item} compact />
                    ))}
                  </AnimatePresence>

                  {/* Recommended upsell hint */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-2 px-3 py-2 bg-[#7FB069]/10 rounded-xl border border-[#7FB069]/20"
                  >
                    <PawPrint
                      size={13}
                      className="text-[#7FB069] flex-shrink-0"
                    />
                    <p className="text-[11px] text-[#1F2A37]/70 font-medium">
                      Customers who booked Grooming also booked{" "}
                      <strong>Nail Trim</strong>.
                    </p>
                  </motion.div>
                </div>

                {/* Summary + buttons */}
                <CartSummary subtotal={subtotal} onCheckout={handleCheckout} />
              </>
            )}

            {/* Loading overlay */}
            <AnimatePresence>
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center z-10 rounded-none"
                >
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 rounded-full border-4 border-[#E07A5F]/20 border-t-[#E07A5F] animate-spin" />
                    <p className="text-sm font-semibold text-[#1F2A37]/60">
                      Updating cart…
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default CartDrawer;
