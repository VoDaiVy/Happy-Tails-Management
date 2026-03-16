import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  X,
  Bed,
  Award,
  CheckCircle,
  Sparkles,
  Moon,
  Gamepad2,
  Eye,
  Heart,
  Upload,
} from "lucide-react";

const rooms = [
  {
    key: "standard",
    title: "Standard Room",
    price: "$10",
    description:
      "Cozy, private suites designed for a peaceful and relaxing stay. Perfect for a short getaway.",
    image: "/standard.webp",
    badgeIcon: <Bed size={12} />,
    badgeLabel: "Standard",
    badgeColor: "border-[#7FB069]/30",
    priceColor: "text-[#7FB069]",
    accentBg: "bg-[#7FB069]/20",
    accentText: "text-[#7FB069]",
    hoverBorder: "hover:border-[#7FB069]",
    hoverShadow: "hover:shadow-[0_15px_40px_rgba(127,176,105,0.25)]",
    features: [
      { icon: <Bed size={10} />, text: "Comfortable bedding" },
      { icon: <Sparkles size={10} />, text: "Daily cleaning" },
      { icon: <Moon size={10} />, text: "Quiet sleeping area" },
      { icon: <Gamepad2 size={10} />, text: "2 playtime sessions" },
    ],
  },
  {
    key: "vip",
    title: "VIP Penthouse",
    price: "$25",
    description:
      "Spacious luxury suites with exclusive amenities, elegant decor, and a premium window view.",
    image: "/viproom.jpg",
    badgeIcon: <Award size={12} />,
    badgeLabel: "VIP",
    badgeColor: "border-white/20",
    priceColor: "text-[#E07A5F]",
    accentBg: "bg-[#E07A5F]/20",
    accentText: "text-[#E07A5F]",
    hoverBorder: "hover:border-[#E07A5F]",
    hoverShadow: "hover:shadow-[0_15px_40px_rgba(224,122,95,0.25)]",
    features: [
      { icon: <Award size={10} />, text: "Private luxury suite" },
      { icon: <Eye size={10} />, text: "Window view" },
      { icon: <Heart size={10} />, text: "Premium bedding" },
      { icon: <Gamepad2 size={10} />, text: "Extra playtime" },
      { icon: <Upload size={10} />, text: "Daily photo updates" },
    ],
  },
];

const BoardingModal = ({ isOpen, onClose }) => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.addEventListener("keydown", handleEsc);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  const handleSelect = (roomKey) => {
    onClose();
    navigate(`/booking?room=${roomKey}`);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          onClick={onClose}
        >
          {/* Overlay */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="relative z-10 bg-[#0F172A] rounded-[28px] w-full max-w-[720px] p-6 md:p-8 border border-white/10 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/60 hover:bg-white/20 hover:text-white transition-colors"
            >
              <X size={16} />
            </button>

            {/* Header */}
            <div className="text-center mb-6 md:mb-8">
              <h3 className="text-2xl md:text-3xl font-serif font-black text-white mb-2">
                Choose Boarding Room
              </h3>
              <p className="text-white/50 text-[13px]">
                Select a room type for your pet's stay
              </p>
            </div>

            {/* Room Cards */}
            <div className="grid md:grid-cols-2 gap-5 mb-6">
              {rooms.map((room) => (
                <motion.div
                  key={room.key}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleSelect(room.key)}
                  className={`bg-[#1E293B] rounded-[20px] overflow-hidden border border-white/5 ${room.hoverBorder} ${room.hoverShadow} transition-all duration-300 cursor-pointer flex flex-col group`}
                >
                  {/* Image */}
                  <div className="relative h-36 overflow-hidden">
                    <img
                      src={room.image}
                      alt={room.title}
                      className="w-full h-full object-cover opacity-80 group-hover:scale-110 group-hover:opacity-100 transition-all duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#1E293B] via-transparent to-transparent opacity-90" />
                    <div
                      className={`absolute top-3 left-3 bg-white/10 backdrop-blur-md border ${room.badgeColor} px-2.5 py-1 rounded-full text-white text-[9px] font-bold uppercase tracking-wider flex items-center gap-1.5`}
                    >
                      <span className={room.accentText}>{room.badgeIcon}</span>
                      {room.badgeLabel}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-4 flex flex-col flex-grow -mt-4 relative z-10">
                    <div className="flex justify-between items-end mb-2">
                      <h4 className="text-white text-[16px] font-serif font-bold">
                        {room.title}
                      </h4>
                      <div className="flex items-end gap-1">
                        <span
                          className={`${room.priceColor} font-black text-lg leading-none`}
                        >
                          {room.price}
                        </span>
                        <span className="text-[9px] text-white/40 font-medium pb-0.5 uppercase tracking-widest">
                          / night
                        </span>
                      </div>
                    </div>
                    <p className="text-white/50 text-[11px] mb-3 leading-relaxed">
                      {room.description}
                    </p>

                    <div className="bg-white/5 rounded-xl p-3 border border-white/5 group-hover:bg-white/10 transition-colors">
                      <ul className="space-y-2">
                        {room.features.map((feat, i) => (
                          <li
                            key={i}
                            className="flex items-center gap-2 text-white/70 text-[11px]"
                          >
                            <div
                              className={`w-4 h-4 rounded-md ${room.accentBg} flex items-center justify-center ${room.accentText} shrink-0`}
                            >
                              {feat.icon}
                            </div>
                            {feat.text}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default BoardingModal;
