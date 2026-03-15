import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Minus, Plus, Trash2, Clock } from "lucide-react";
import useCartStore from "../../store/cartStore";

const PLACEHOLDER_IMG =
  "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=120&q=70";

const CartItemCard = ({ item, compact = false }) => {
  const { updateQuantity, removeItem, isLoading } = useCartStore();
  const [removing, setRemoving] = useState(false);

  const handleRemove = async () => {
    setRemoving(true);
    await removeItem(item._id);
  };

  const handleDecrement = () => {
    if (item.quantity === 1) {
      handleRemove();
    } else {
      updateQuantity(item._id, item.quantity - 1);
    }
  };

  const handleIncrement = () => {
    if (item.quantity >= 99) return;
    updateQuantity(item._id, item.quantity + 1);
  };

  const formatPrice = (val) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(val);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: removing ? 0 : 1, y: 0, scale: removing ? 0.95 : 1 }}
      exit={{ opacity: 0, x: 60, scale: 0.92 }}
      transition={{ duration: 0.25 }}
      className={`group relative flex gap-3 bg-[#F5F1EB] rounded-2xl p-3 shadow-sm
        hover:shadow-md hover:-translate-y-0.5 transition-all duration-200
        ${compact ? "" : "sm:gap-4 sm:p-4"}`}
    >
      {/* ── Image ── */}
      <div
        className={`flex-shrink-0 rounded-xl overflow-hidden bg-white shadow-sm ${compact ? "w-16 h-16" : "w-20 h-20"}`}
      >
        <img
          src={item.imageUrl || PLACEHOLDER_IMG}
          alt={item.name}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.target.src = PLACEHOLDER_IMG;
          }}
        />
      </div>

      {/* ── Content ── */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-bold text-[#1F2A37] text-sm leading-snug truncate">
              {item.name}
            </p>
            {/* Duration badge */}
            <span className="inline-flex items-center gap-1 mt-0.5 text-[10px] font-semibold text-[#E07A5F] bg-[#E07A5F]/10 px-2 py-0.5 rounded-full">
              <Clock size={9} />
              {item.duration} min
            </span>
          </div>
          {/* Unit price */}
          <span className="flex-shrink-0 font-bold text-[#1F2A37] text-sm">
            {formatPrice(item.price)}
          </span>
        </div>

        {/* ── Quantity & Remove ── */}
        <div className="flex items-center justify-between mt-2">
          {/* Qty controls */}
          <div className="flex items-center gap-1 bg-white rounded-xl shadow-sm border border-black/5">
            <button
              onClick={handleDecrement}
              disabled={isLoading}
              className="w-7 h-7 flex items-center justify-center rounded-l-xl text-[#1F2A37] hover:bg-[#E07A5F] hover:text-white transition-colors disabled:opacity-40"
              aria-label="Decrease quantity"
            >
              <Minus size={12} strokeWidth={2.5} />
            </button>

            <AnimatePresence mode="wait">
              <motion.span
                key={item.quantity}
                initial={{ scale: 1.4, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.7, opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="w-7 text-center text-sm font-bold text-[#1F2A37] select-none"
              >
                {item.quantity}
              </motion.span>
            </AnimatePresence>

            <button
              onClick={handleIncrement}
              disabled={isLoading || item.quantity >= 99}
              className="w-7 h-7 flex items-center justify-center rounded-r-xl text-[#1F2A37] hover:bg-[#E07A5F] hover:text-white transition-colors disabled:opacity-40"
              aria-label="Increase quantity"
            >
              <Plus size={12} strokeWidth={2.5} />
            </button>
          </div>

          {/* Subtotal + Remove */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#7FB069]">
              {formatPrice(item.subtotal)}
            </span>
            <button
              onClick={handleRemove}
              disabled={isLoading}
              className="w-7 h-7 flex items-center justify-center rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all disabled:opacity-40"
              aria-label="Remove item"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default CartItemCard;
