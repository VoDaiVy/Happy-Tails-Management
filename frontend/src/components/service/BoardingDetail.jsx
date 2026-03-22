import React, { useState, useEffect } from "react";
import { useLocation, useParams } from "react-router-dom";
import { motion as Motion, AnimatePresence } from "framer-motion";
import { CheckCircle, Clock, Video, Lock, XCircle, Bed } from "lucide-react";
import Navbar from "../layout/Navbar";
import Footer from "../layout/Footer";
import { AuthModal } from "../AuthModal";
import BoardingBookingPanel from "./BoardingBookingPanel";
import { getRoomById, getRoomsList } from "../../api/roomApi";

/* ─── Gallery Fallbacks ─── */
const fallbackGalleryImages = {
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

const fallbackFeatures = [
  "Comfortable bedding",
  "Daily cleaning",
  "Quiet sleeping area",
  "24/7 camera monitoring",
];

const toTitle = (value = "") =>
  String(value)
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");

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
  const location = useLocation();
  const roomIdFromState = location.state?.roomId;
  const roomTypeFromState = location.state?.roomType;
  const roomIdFromQuery = new URLSearchParams(location.search).get("roomId");
  const selectedRoomId = roomIdFromQuery || roomIdFromState || "";
  const typeFallback =
    roomTypeFromState || (roomType === "vip" ? "vip" : "standard");

  const [roomDetail, setRoomDetail] = useState(null);
  const [roomLoading, setRoomLoading] = useState(true);
  const [roomLoadError, setRoomLoadError] = useState("");

  // Auth
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState("login");
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem("user");
    return stored ? JSON.parse(stored) : null;
  });

  const [activeImage, setActiveImage] = useState("");

  useEffect(() => {
    let alive = true;

    const loadRoom = async () => {
      setRoomLoading(true);
      setRoomLoadError("");
      try {
        if (selectedRoomId) {
          const detailRes = await getRoomById(selectedRoomId);
          const detail = detailRes?.data?.room || detailRes?.room || null;
          if (alive) setRoomDetail(detail);
          return;
        }

        const listRes = await getRoomsList({
          type: typeFallback,
          isActive: "true",
          isAvailable: "true",
        });
        const rooms = Array.isArray(listRes?.data?.rooms)
          ? listRes.data.rooms
          : Array.isArray(listRes?.rooms)
            ? listRes.rooms
            : [];

        if (alive) setRoomDetail(rooms[0] || null);
      } catch {
        if (alive) {
          setRoomLoadError("Unable to load room details.");
          setRoomDetail(null);
        }
      } finally {
        if (alive) setRoomLoading(false);
      }
    };

    loadRoom();

    return () => {
      alive = false;
    };
  }, [selectedRoomId, typeFallback]);

  const effectiveType =
    String(roomDetail?.type || typeFallback || "standard").toLowerCase() === "vip"
      ? "vip"
      : "standard";

  const images =
    Array.isArray(roomDetail?.images) && roomDetail.images.length > 0
      ? roomDetail.images
      : fallbackGalleryImages[effectiveType];

  const displayedImage = images.includes(activeImage) ? activeImage : images[0];

  const roomTitle =
    roomDetail?.name || `${toTitle(effectiveType)} Room`;
  const pricePerNight = Number(roomDetail?.pricePerNight || 0);
  const roomDescription =
    roomDetail?.description ||
    "Comfortable and secure boarding space with attentive pet care and monitoring.";
  const roomFeatures =
    Array.isArray(roomDetail?.amenities) && roomDetail.amenities.length > 0
      ? roomDetail.amenities
      : fallbackFeatures;
  const roomPetTypes =
    Array.isArray(roomDetail?.petTypes) && roomDetail.petTypes.length > 0
      ? roomDetail.petTypes.map((pet) => toTitle(pet))
      : ["All Pets"];
  const roomPills = [
    `Room ${roomDetail?.roomNumber || "-"}`,
    `Type: ${toTitle(roomDetail?.type || effectiveType)}`,
    `Capacity: ${Number(roomDetail?.capacity || 1)}`,
    `Pets: ${roomPetTypes.join(", ")}`,
  ];

  useEffect(() => {
    if (images.length > 0) {
      setActiveImage(images[0]);
    }
  }, [images]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [roomType, selectedRoomId]);

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
                  alt={roomTitle}
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
                    alt={`${roomTitle} ${i + 2}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>

            <div className="mt-5 bg-white rounded-[20px] border border-[#E8E3DB] shadow-[0_8px_28px_rgba(0,0,0,0.06)] p-5 space-y-4">
              <div>
                <div className="inline-flex items-center gap-2 bg-[#E07A5F]/10 text-[#E07A5F] px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest mb-3">
                  <Bed size={11} /> Pet Hotel
                </div>
                <h1 className="text-2xl font-serif font-black text-[#1F2A37] mb-2">
                  {roomTitle}
                </h1>
                <p className="text-[#1F2A37]/60 text-[13px] leading-relaxed">
                  {roomDescription}
                </p>
                {roomLoadError && (
                  <p className="text-xs text-amber-600 mt-2">{roomLoadError}</p>
                )}
                {roomLoading && (
                  <p className="text-xs text-[#1F2A37]/50 mt-2">Loading room details...</p>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {roomPills.map((feat, i) => (
                  <span
                    key={i}
                    className="flex items-center gap-1.5 text-[11px] font-semibold text-[#1F2A37]/70 bg-[#F8F5F1] border border-gray-100 px-2.5 py-1 rounded-full"
                  >
                    {feat}
                  </span>
                ))}
              </div>

              <div>
                <h2 className="text-base font-serif font-black text-[#1F2A37] mb-2.5">
                  What's Included
                </h2>
                <div className="grid grid-cols-1 gap-2">
                  {roomFeatures.map((f, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 text-[13px] text-[#1F2A37]/80"
                    >
                      <div className="w-4 h-4 rounded-full bg-[#E07A5F]/10 flex items-center justify-center shrink-0">
                        <CheckCircle size={10} className="text-[#E07A5F]" />
                      </div>
                      {f}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── RIGHT: Booking Card ── */}
          <div className="space-y-5 lg:sticky lg:top-24">
            <BoardingBookingPanel
              roomType={effectiveType}
              roomTitle={roomTitle}
              pricePerNight={pricePerNight}
              preferredRoomId={roomDetail?._id || selectedRoomId}
            />
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
