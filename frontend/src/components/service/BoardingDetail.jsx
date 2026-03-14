import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { motion as Motion, AnimatePresence } from "framer-motion";
import { CheckCircle, Clock, Video, Lock, XCircle, Bed } from "lucide-react";
import Navbar from "../layout/Navbar";
import Footer from "../layout/Footer";
import { AuthModal } from "../AuthModal";
import BoardingBookingPanel from "./BoardingBookingPanel";

/* ─── Gallery Images ─── */
const galleryImages = {
  standard: [
    "https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?w=800",
    "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400",
    "https://images.unsplash.com/photo-1601758174493-45d0a4d3e407?w=400",
    "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=400",
    "https://images.unsplash.com/photo-1611777009-01de60bb4b0b?w=400",
  ],
  vip: [
    "https://images.unsplash.com/photo-1566694271455-4ec414eb0027?w=800",
    "https://images.unsplash.com/photo-1601758174492-f6a13e28e7d2?w=400",
    "https://images.unsplash.com/photo-1518155317743-a8ff43ea6a5f?w=400",
    "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400",
    "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=400",
  ],
};

const roomData = {
  standard: {
    title: "Standard Room",
    price: 10,
    description:
      "Cozy, private suites designed for a peaceful and relaxing stay. Perfect for pets who need a quiet and comfortable environment.",
    features: [
      "Comfortable bedding",
      "Daily cleaning",
      "Quiet sleeping area",
      "2 playtime sessions",
      "Fresh water & feeding",
      "24/7 camera monitoring",
    ],
    pills: [
      "⭐ 4.8 (128 reviews)",
      "🛏 Cozy bedding",
      "📹 24/7 camera",
      "🐾 Pet-safe",
    ],
  },
  vip: {
    title: "VIP Penthouse",
    price: 25,
    description:
      "Spacious luxury suites with exclusive amenities, elegant decor, and a premium window view for the ultimate pet hotel experience.",
    features: [
      "Private luxury suite",
      "Window view",
      "Premium bedding",
      "Extra playtime sessions",
      "Daily photo updates",
      "24/7 camera monitoring",
    ],
    pills: [
      "⭐ 4.9 (96 reviews)",
      "🏨 Luxury suite",
      "📹 24/7 camera",
      "🐾 Premium care",
    ],
  },
};

/* ─── Mock active booking for camera demo ─── */
const mockActiveBooking = {
  checkIn: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  checkOut: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
  petName: "Milo",
};

/* ─── Countdown Timer ─── */
const CountdownTimer = ({ targetDate }) => {
  const [timeLeft, setTimeLeft] = useState({});

  useEffect(() => {
    const calc = () => {
      const diff = new Date(targetDate) - new Date();
      if (diff <= 0) return setTimeLeft({ expired: true });
      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
      });
    };
    calc();
    const id = setInterval(calc, 1000);
    return () => clearInterval(id);
  }, [targetDate]);

  if (timeLeft.expired) return null;

  return (
    <div className="flex gap-4 mt-2">
      {["days", "hours", "minutes", "seconds"].map((unit) => (
        <div key={unit} className="text-center">
          <div className="text-3xl font-black text-[#E07A5F] font-mono leading-none">
            {String(timeLeft[unit] ?? 0).padStart(2, "0")}
          </div>
          <div className="text-white/30 text-[10px] uppercase tracking-widest mt-1">
            {unit}
          </div>
        </div>
      ))}
    </div>
  );
};

/* ─── Camera Access Panel ─── */
const CameraAccessPanel = ({ booking }) => {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const getState = () => {
    if (!booking) return "no-booking";
    const checkIn = new Date(booking.checkIn);
    const checkOut = new Date(booking.checkOut);
    if (now < checkIn) return "upcoming";
    if (now > checkOut) return "expired";
    return "active";
  };

  const state = getState();

  if (state === "active")
    return (
      <div
        className="bg-[#1E293B] rounded-[20px] overflow-hidden aspect-video relative
        border border-white/10 shadow-[0_0_40px_rgba(224,122,95,0.15)]"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-[#1E293B] to-[#0F172A] flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-[#E07A5F]/10 flex items-center justify-center mx-auto mb-3 border border-[#E07A5F]/20">
              <Video size={28} className="text-[#E07A5F]" />
            </div>
            <p className="text-white font-bold text-lg">
              {booking.petName} is resting
            </p>
            <p className="text-white/40 text-sm mt-1">Camera Feed — Room 101</p>
          </div>
        </div>
        <div className="absolute top-4 left-4 flex items-center gap-1.5 bg-red-600/80 backdrop-blur px-2.5 py-1 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          <span className="text-white text-[10px] font-bold uppercase">
            Live
          </span>
        </div>
        <div className="absolute bottom-4 right-4 bg-black/40 backdrop-blur px-2.5 py-1 rounded-full text-white/60 text-[11px] font-mono">
          {now.toLocaleTimeString()}
        </div>
      </div>
    );

  if (state === "upcoming")
    return (
      <div className="bg-[#1E293B] rounded-[20px] p-8 border border-white/5 flex flex-col items-center text-center">
        <Clock size={40} className="text-[#E07A5F]/60 mb-4" />
        <h3 className="text-white font-bold text-lg mb-2">
          Camera access starts at check-in
        </h3>
        <CountdownTimer targetDate={booking.checkIn} />
        <p className="text-white/30 text-sm mt-3">
          Check-in:{" "}
          {new Date(booking.checkIn).toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>
    );

  if (state === "expired")
    return (
      <div className="bg-[#1E293B] rounded-[20px] p-8 border border-white/5 flex flex-col items-center text-center">
        <XCircle size={40} className="text-gray-600 mb-4" />
        <h3 className="text-white/60 font-bold text-lg mb-1">
          Camera session expired
        </h3>
        <p className="text-white/30 text-sm">
          Your booking ended on{" "}
          {new Date(booking.checkOut).toLocaleDateString()}
        </p>
      </div>
    );

  return (
    <div className="bg-[#1E293B] rounded-[20px] p-8 border border-dashed border-white/10 flex flex-col items-center text-center">
      <Lock size={40} className="text-white/20 mb-4" />
      <h3 className="text-white/60 font-bold text-lg mb-2">
        Camera access requires an active booking
      </h3>
      <p className="text-white/30 text-sm max-w-sm">
        Book a boarding stay to unlock 24/7 live camera monitoring for your pet.
      </p>
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        className="mt-5 bg-[#E07A5F] text-white px-6 py-2.5 rounded-full text-sm font-bold hover:bg-[#c56a52] transition-colors"
      >
        Book Now to Unlock
      </button>
    </div>
  );
};

/* ════════════════════════════════════════════════════════════ */
/*  BoardingDetail Page                                        */
/* ════════════════════════════════════════════════════════════ */
const BoardingDetail = () => {
  const { roomType } = useParams();
  const type = roomType === "vip" ? "vip" : "standard";
  const room = roomData[type];
  const images = galleryImages[type];
  const pricePerNight = room.price;

  // Auth
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState("login");
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem("user");
    return stored ? JSON.parse(stored) : null;
  });

  // Gallery
  const [activeImage, setActiveImage] = useState(images[0]);
  const displayedImage = images.includes(activeImage) ? activeImage : images[0];

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [type]);

  return (
    <div className="bg-[#F5F1EB] min-h-screen font-sans text-[#1F2A37]">
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
        onLoginSuccess={(u) => {
          setUser(u);
          setIsAuthModalOpen(false);
        }}
      />

      <main className="w-full max-w-[1200px] mx-auto px-4 sm:px-6 pt-28 pb-12">
        {/* ════════ 2-Column: Gallery + Booking ════════ */}
        <div className="grid lg:grid-cols-[3fr_2fr] gap-8 items-start">
          {/* ── LEFT: Image Gallery ── */}
          <div>
            {/* Main image */}
            <div className="rounded-[20px] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.15)] aspect-[16/9] relative bg-gray-200">
              <AnimatePresence mode="wait">
                <Motion.img
                  key={displayedImage}
                  src={displayedImage}
                  alt={room.title}
                  initial={{ opacity: 0, scale: 1.03 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4 }}
                  className="w-full h-full object-cover absolute inset-0"
                />
              </AnimatePresence>
            </div>
            {/* Thumbnails */}
            <div className="grid grid-cols-4 gap-3 mt-3">
              {images.slice(1).map((img, i) => (
                <div
                  key={i}
                  onClick={() => setActiveImage(img)}
                  className={`rounded-[12px] overflow-hidden aspect-square cursor-pointer ring-2 transition-all ${
                    displayedImage === img
                      ? "ring-[#E07A5F] opacity-100"
                      : "ring-transparent opacity-70 hover:opacity-100"
                  }`}
                >
                  <img
                    src={img}
                    alt={`${room.title} ${i + 2}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* ── RIGHT: Booking Card ── */}
          <div className="lg:sticky lg:top-24">
            <BoardingBookingPanel
              roomType={type}
              roomTitle={room.title}
              pricePerNight={pricePerNight}
            />
          </div>
        </div>

        {/* ════════ BOTTOM: Service Info (full width) ════════ */}
        <div className="mt-14 space-y-8">
          {/* Badge + Title + Description */}
          <div>
            <div className="inline-flex items-center gap-2 bg-[#E07A5F]/10 text-[#E07A5F] px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-widest mb-3">
              <Bed size={12} /> Pet Hotel
            </div>
            <h1 className="text-3xl md:text-4xl font-serif font-black text-[#1F2A37] mb-3">
              {room.title}
            </h1>
            <p className="text-[#1F2A37]/60 text-[15px] leading-relaxed max-w-2xl">
              {room.description}
            </p>
          </div>

          {/* Feature pills */}
          <div className="flex flex-wrap gap-3">
            {room.pills.map((feat, i) => (
              <span
                key={i}
                className="flex items-center gap-1.5 text-[13px] font-medium text-[#1F2A37]/70 bg-white border border-gray-100 px-3 py-1.5 rounded-full shadow-sm"
              >
                {feat}
              </span>
            ))}
          </div>

          {/* What's Included */}
          <div>
            <h2 className="text-xl font-serif font-black text-[#1F2A37] mb-4">
              What's Included
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {room.features.map((f, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2.5 text-[14px] text-[#1F2A37]/80"
                >
                  <div className="w-5 h-5 rounded-full bg-[#E07A5F]/10 flex items-center justify-center shrink-0">
                    <CheckCircle size={12} className="text-[#E07A5F]" />
                  </div>
                  {f}
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* ════════ LIVE CAMERA SECTION ════════ */}
      <section className="bg-[#0F172A] py-12 px-6 md:px-12">
        <div className="max-w-[1100px] mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-red-400 text-[11px] font-bold uppercase tracking-widest">
              Live
            </span>
          </div>
          <h2 className="text-3xl font-serif font-black text-white mb-3">
            Live Camera Monitoring
          </h2>
          <p className="text-white/50 text-[14px] max-w-lg mb-8">
            Watch your pet in real-time during their stay. Available 24/7 for
            all active bookings.
          </p>
          <CameraAccessPanel booking={mockActiveBooking} />
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default BoardingDetail;
