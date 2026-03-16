import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Star, Clock, ChevronRight, CheckCircle2 } from "lucide-react";

export default function ServicePreviewModal({ service, onClose }) {
  const navigate = useNavigate();

  useEffect(() => {
    document.body.style.overflow = "hidden";
    const handleEsc = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleEsc);
    };
  }, [onClose]);

  if (!service) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/55 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal — compact, no scroll */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 16 }}
          animate={{
            opacity: 1,
            scale: 1,
            y: 0,
            transition: { type: "spring", damping: 26, stiffness: 320 },
          }}
          exit={{
            opacity: 0,
            scale: 0.94,
            y: 16,
            transition: { duration: 0.18 },
          }}
          className="relative z-10 w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden"
        >
          {/* Hero */}
          <div className="relative h-44">
            <img
              src={service.image}
              alt={service.title}
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />

            <button
              onClick={onClose}
              className="absolute top-3 right-3 rounded-full bg-black/30 backdrop-blur-md p-1.5 text-white hover:bg-black/50 transition"
            >
              <X size={16} />
            </button>

            <span className="absolute top-3 left-3 rounded-full bg-[#E07A5F] px-2.5 py-0.5 text-xs font-bold text-white shadow">
              {service.price}
              {service.priceUnit ? ` ${service.priceUnit}` : ""}
            </span>

            <div className="absolute bottom-3 left-4 right-4 text-white">
              <h2 className="text-lg font-bold leading-tight">
                {service.title}
              </h2>
              <div className="mt-0.5 flex items-center gap-1.5 text-xs text-white/85">
                <Star
                  size={12}
                  fill="currentColor"
                  className="text-amber-400"
                />
                <span className="font-semibold">{service.rating}</span>
                <span className="text-white/55">·</span>
                <span>{service.reviewCount} reviews</span>
                <span className="text-white/55">·</span>
                <Clock size={12} />
                <span>{service.duration}</span>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="px-5 pt-4 pb-2">
            {/* Short description */}
            <p className="text-sm text-gray-600 leading-relaxed line-clamp-2 mb-3">
              {service.shortDesc}
            </p>

            {/* Top highlights — max 3 */}
            {service.highlights?.slice(0, 3).map((h) => (
              <div
                key={h}
                className="flex items-center gap-2 text-xs text-gray-600 mb-1.5"
              >
                <CheckCircle2
                  size={13}
                  className="flex-shrink-0 text-[#7FB069]"
                />
                {h}
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="px-5 pb-5 pt-3">
            <button
              onClick={() => {
                onClose();
                navigate(`/service/${service.slug}`, {
                  state: { apiService: service.apiService },
                });
              }}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#E07A5F] py-2.5 text-sm font-semibold text-white shadow hover:bg-[#c9694f] transition"
            >
              Book This Service <ChevronRight size={15} />
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
