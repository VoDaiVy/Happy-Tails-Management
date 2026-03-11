import React, { useState, useEffect } from "react";
import {
  useParams,
  useNavigate,
  useLocation,
  useSearchParams,
} from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Clock,
  CheckCircle,
  Calendar,
  PawPrint,
  ChevronRight,
  AlertCircle,
  Phone,
  Stethoscope,
  Sparkles,
  Heart,
  Shield,
  Star,
  Plus,
} from "lucide-react";
import DatePicker, { registerLocale } from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { vi } from "date-fns/locale";

registerLocale("vi", vi);
import { getServiceById } from "../api/serviceApi";
import { getMyPets } from "../api/petApi";
import { checkoutBooking } from "../api/bookingApi";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import { AuthModal } from "../components/AuthModal";

const TIME_SLOTS = [
  "09:00",
  "10:00",
  "11:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
];

const DEFAULT_INCLUDED = [
  "Certified pet groomers with 5+ years experience",
  "Pet-safe shampoo and organic products",
  "Nail trimming and ear cleaning included",
  "Post-service health report",
  "24/7 customer support",
  "Money-back satisfaction guarantee",
];

const DEFAULT_BENEFITS = {
  "Spa & Grooming": [
    "Hypoallergenic products",
    "Professional certified groomer",
    "Pet-safe equipment",
    "Post-service report",
  ],
  Veterinary: [
    "Certified veterinarian",
    "State-of-the-art equipment",
    "Detailed health report",
    "Follow-up support",
  ],
};

/* ─── MOCK DATA ─── */
const MOCK_SERVICE = {
  _id: "mock-001",
  name: "Premium Dog Grooming Experience",
  description:
    "Give your pet a relaxing and professional grooming experience with our certified pet specialists. We use only pet-safe products and provide individualized care for every furry friend.",
  highlightsText:
    "Transform your pet's grooming session into a relaxing spa experience with professional care and pet-safe products. Our experienced team ensures your furry friend receives the royal treatment they deserve in a stress-free environment.",
  price: 25,
  originalPrice: 35,
  duration: 45,
  category: { name: "Spa & Grooming" },
  rating: 4.8,
  totalReviews: 245,
  images: [
    "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=800&q=80",
    "https://images.unsplash.com/photo-1600334129128-685c5582fd35?w=800&q=80",
    "https://images.unsplash.com/photo-1519823551278-64ac92734fb1?w=800&q=80",
    "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=800&q=80",
  ],
  features: [
    "Certified pet groomers with 5+ years experience",
    "Pet-safe shampoo and organic products",
    "Nail trimming and ear cleaning included",
    "Post-service health report",
    "24/7 customer support",
    "Money-back satisfaction guarantee",
  ],
  petTypes: ["dog", "cat"],
  maxCapacity: 8,
  isActive: true,
};

const MOCK_PETS = [
  { _id: "pet-001", name: "Milo", breed: "Golden Retriever", type: "Dog" },
  { _id: "pet-002", name: "Luna", breed: "Persian", type: "Cat" },
];

const ServiceDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  // Service state
  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isStaticService, setIsStaticService] = useState(false);

  // Auth
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState("login");
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem("user");
    return stored ? JSON.parse(stored) : null;
  });

  // Booking form
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [selectedPet, setSelectedPet] = useState(null);
  const [notes, setNotes] = useState("");
  const [pets, setPets] = useState([]);
  const [petsLoading, setPetsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingResult, setBookingResult] = useState(null);
  const [formError, setFormError] = useState("");

  // Load service data
  useEffect(() => {
    window.scrollTo(0, 0);
    const stateService = location.state?.service;

    if (stateService) {
      setService(stateService);
      setIsStaticService(!stateService._id);
      setLoading(false);
      return;
    }

    const serviceId = id || searchParams.get("id");
    if (serviceId) {
      (async () => {
        try {
          setLoading(true);
          const result = await getServiceById(serviceId);
          setService(result?.data || result);
          setIsStaticService(false);
        } catch (err) {
          console.error("Failed to fetch service:", err);
          setError("Service not found");
        } finally {
          setLoading(false);
        }
      })();
    } else {
      // Fallback — mock data for preview/testing
      setService(MOCK_SERVICE);
      setIsStaticService(false);
      setLoading(false);
    }
  }, [id, searchParams, location.state, navigate]);

  // Fetch pets
  useEffect(() => {
    if (!user) {
      setPets(MOCK_PETS);
      return;
    }
    (async () => {
      try {
        setPetsLoading(true);
        const result = await getMyPets();
        const petsArray = Array.isArray(result?.data)
          ? result.data
          : Array.isArray(result)
            ? result
            : [];
        setPets(petsArray);
      } catch (err) {
        console.error("Failed to fetch pets:", err);
        setPets([]);
      } finally {
        setPetsLoading(false);
      }
    })();
  }, [user]);

  const openLoginModal = () => {
    setAuthModalMode("login");
    setIsAuthModalOpen(true);
  };
  const openRegisterModal = () => {
    setAuthModalMode("register");
    setIsAuthModalOpen(true);
  };
  const handleLoginSuccess = (userData) => {
    setUser(userData);
    setIsAuthModalOpen(false);
  };

  const handleDateChange = (date) => {
    if (date) {
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, "0");
      const dd = String(date.getDate()).padStart(2, "0");
      setSelectedDate(`${yyyy}-${mm}-${dd}`);
    } else {
      setSelectedDate("");
    }
    setFormError("");
  };

  const canSubmit = selectedDate && selectedTime && selectedPet;

  const handleBookNow = async () => {
    if (!selectedDate || !selectedTime || !selectedPet) {
      setFormError("Please select date, time and pet");
      return;
    }
    const appointmentDate = new Date(
      `${selectedDate}T${selectedTime}:00`,
    ).toISOString();
    try {
      setIsSubmitting(true);
      setFormError("");

      if (isStaticService || service?._id?.startsWith("mock")) {
        console.log("[StaticBooking]", {
          serviceName: service.name || service.title,
          servicePrice: service.price,
          petName: selectedPet.name,
          petId: selectedPet._id,
          appointmentDate,
          paymentMethod: "card",
          notes,
        });
        await new Promise((r) => setTimeout(r, 600));
        setBookingSuccess(true);
        setBookingResult({
          bookingNumber: "WI-" + Date.now().toString(36).toUpperCase(),
        });
      } else {
        const result = await checkoutBooking({
          serviceId: service._id,
          petId: selectedPet._id,
          appointmentDate,
          paymentMethod: "card",
          notes,
        });
        setBookingSuccess(true);
        setBookingResult(result?.data || result);
      }
    } catch (err) {
      setFormError(
        err.response?.data?.message || "Booking failed. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Derived display values
  const serviceName = service?.name || service?.title || "";
  const servicePrice =
    service?.price != null
      ? typeof service.price === "number"
        ? `$${service.price}`
        : service.price
      : "";
  const serviceDesc = service?.description || "";
  const serviceCategory = service?.category?.name || service?.category || "";
  const allImages = service?.images?.length
    ? service.images
    : service?.image
      ? [service.image]
      : [];
  const includedFeatures = service?.features || DEFAULT_INCLUDED;
  const highlightsText = service?.highlightsText || serviceDesc;
  const categoryColor =
    serviceCategory?.toLowerCase?.()?.includes("spa") ||
    serviceCategory?.toLowerCase?.()?.includes("groom")
      ? "#7FB069"
      : "#E07A5F";

  // ─── Loading ───
  if (loading) {
    return (
      <div className="bg-white min-h-screen font-sans text-[#1F2A37]">
        <Navbar
          onLoginClick={openLoginModal}
          onRegisterClick={openRegisterModal}
          user={user}
          onLogout={() => setUser(null)}
        />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-10 h-10 border-4 border-[#E07A5F]/30 border-t-[#E07A5F] rounded-full animate-spin" />
        </div>
        <Footer />
      </div>
    );
  }

  // ─── Error ───
  if (error || !service) {
    return (
      <div className="bg-white min-h-screen font-sans text-[#1F2A37]">
        <Navbar
          onLoginClick={openLoginModal}
          onRegisterClick={openRegisterModal}
          user={user}
          onLogout={() => setUser(null)}
        />
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <p className="text-[#1F2A37]/60 text-lg">
            {error || "Service not found"}
          </p>
          <button
            onClick={() => navigate("/service")}
            className="text-[#E07A5F] font-bold hover:underline"
          >
            Back to Services
          </button>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="bg-[#F8F9FA] min-h-screen font-sans text-[#1F2A37] selection:bg-[#E07A5F] selection:text-white">
      <Navbar
        onLoginClick={openLoginModal}
        onRegisterClick={openRegisterModal}
        user={user}
        onLogout={() => setUser(null)}
      />
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialMode={authModalMode}
        onLoginSuccess={handleLoginSuccess}
      />

      <motion.main
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-[1200px] mx-auto px-4 sm:px-6 pt-28 pb-20"
      >
        {/* ════════════════ 2-Column Layout ════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
          {/* ──── LEFT COLUMN (col-span-3) ──── */}
          <div className="lg:col-span-3 space-y-7">
            {/* ─── Image Gallery ─── */}
            {allImages.length > 0 ? (
              <div className="grid grid-cols-2 gap-2 h-[380px]">
                {/* Main large image */}
                <div className="row-span-2 rounded-l-2xl overflow-hidden">
                  <img
                    src={allImages[0]}
                    alt={serviceName}
                    className="w-full h-full object-cover"
                  />
                </div>
                {/* Right side: up to 3 smaller images */}
                <div className="grid grid-cols-2 grid-rows-2 gap-2 h-full">
                  {[1, 2, 3].map((idx) => (
                    <div
                      key={idx}
                      className={`overflow-hidden ${
                        idx === 1
                          ? "col-span-2 rounded-tr-2xl"
                          : idx === 2
                            ? "rounded-bl-none"
                            : "rounded-br-2xl"
                      }`}
                    >
                      {allImages[idx] ? (
                        <img
                          src={allImages[idx]}
                          alt={`${serviceName} ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                          <Sparkles size={20} className="text-gray-300" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-[300px] bg-gradient-to-br from-gray-100 to-gray-50 rounded-2xl flex items-center justify-center">
                <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
                  {serviceCategory?.toLowerCase?.()?.includes("vet") ? (
                    <Stethoscope size={40} />
                  ) : (
                    <Sparkles size={40} />
                  )}
                </div>
              </div>
            )}

            {/* ─── Title & Description ─── */}
            <div>
              <h1 className="flex items-center gap-2 text-[22px] sm:text-[26px] font-extrabold text-[#1F2A37] leading-snug mb-3">
                <Sparkles size={22} className="text-[#E07A5F] shrink-0" />
                {serviceName}
              </h1>
              <p className="text-[#555] text-[14px] leading-relaxed">
                {serviceDesc}
              </p>
            </div>

            {/* ─── Badges Row ─── */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Rating badge */}
              {service?.rating > 0 && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#1F2A37] text-white text-[12px] font-bold">
                  <Star size={13} className="fill-yellow-400 text-yellow-400" />
                  {service.rating}
                  {service.totalReviews > 0 && (
                    <span className="text-white/70 font-medium">
                      ({service.totalReviews} reviews)
                    </span>
                  )}
                </span>
              )}
              {/* Duration badge */}
              {service?.duration && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#1F2A37]/15 text-[#555] text-[12px] font-medium">
                  <Clock size={13} />
                  {service.duration} minutes
                </span>
              )}
              {/* Pet-safe badge */}
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#1F2A37]/15 text-[#555] text-[12px] font-medium">
                <PawPrint size={13} />
                Pet-safe equipment
              </span>
            </div>

            <div className="w-full h-px bg-[#1F2A37]/8" />

            {/* ─── Highlights ─── */}
            <div>
              <h2 className="flex items-center gap-2 text-[18px] font-extrabold text-[#1F2A37] mb-3">
                <Heart size={18} className="text-[#E07A5F]" />
                Highlights
              </h2>
              <p className="text-[#555] text-[14px] leading-relaxed">
                {highlightsText}
              </p>
            </div>

            {/* ─── What's Included ─── */}
            <div>
              <h2 className="text-[18px] font-extrabold text-[#E07A5F] mb-4">
                What's Included
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                {includedFeatures.map((item, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <CheckCircle
                      size={17}
                      className="text-[#E07A5F] shrink-0 mt-0.5"
                    />
                    <span className="text-[13px] text-[#444] leading-snug">
                      {item}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ──── RIGHT COLUMN — Booking Widget (col-span-2) ──── */}
          <div className="lg:col-span-2">
            <div className="sticky top-24 bg-white rounded-2xl shadow-[0_2px_24px_rgba(0,0,0,0.08)] border border-gray-100 p-6 space-y-5">
              {/* ── Price ── */}
              <div>
                <p className="text-[11px] font-bold text-[#1F2A37]/50 uppercase tracking-wider mb-1">
                  From
                </p>
                <div className="flex items-baseline gap-2">
                  <span className="text-[32px] font-black text-[#1F2A37]">
                    {servicePrice}
                  </span>
                  {service?.originalPrice &&
                    service.originalPrice > service.price && (
                      <span className="text-[16px] text-[#999] line-through">
                        ${service.originalPrice}
                      </span>
                    )}
                </div>
              </div>

              {/* Static service notice */}
              {isStaticService && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-2.5">
                  <AlertCircle
                    size={16}
                    className="text-amber-500 shrink-0 mt-0.5"
                  />
                  <p className="text-[12px] text-amber-700">
                    Walk-in only. Call{" "}
                    <a
                      href="tel:+18001234567"
                      className="font-bold hover:underline"
                    >
                      1-800-123-4567
                    </a>
                  </p>
                </div>
              )}

              {/* Booking Success */}
              {bookingSuccess ? (
                <div className="flex flex-col items-center text-center py-6">
                  <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center text-green-500 mb-3">
                    <CheckCircle size={32} />
                  </div>
                  <h4 className="font-bold text-[#1F2A37] text-[17px] mb-1">
                    Booking Confirmed!
                  </h4>
                  {bookingResult?.bookingNumber && (
                    <p className="text-[12px] text-[#1F2A37]/50 mb-3">
                      #{bookingResult.bookingNumber}
                    </p>
                  )}
                  <div className="text-[12px] text-[#555] space-y-1 mb-4">
                    <p>
                      <b className="text-[#1F2A37]">Service:</b> {serviceName}
                    </p>
                    <p>
                      <b className="text-[#1F2A37]">Date:</b> {selectedDate}
                    </p>
                    <p>
                      <b className="text-[#1F2A37]">Time:</b> {selectedTime}
                    </p>
                    <p>
                      <b className="text-[#1F2A37]">Pet:</b> {selectedPet?.name}
                    </p>
                  </div>
                  <button
                    onClick={() => navigate("/service")}
                    className="px-5 py-2 bg-[#E07A5F] text-white rounded-lg font-bold text-[13px] hover:bg-[#c56a52] transition-colors"
                  >
                    Back to Services
                  </button>
                </div>
              ) : (
                <>
                  {/* ── SELECT DATE ── */}
                  <div>
                    <label className="text-[11px] font-bold text-[#1F2A37] uppercase tracking-wider mb-2 block">
                      Select Date
                    </label>
                    <div className="relative">
                      <Calendar
                        size={15}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-[#999] pointer-events-none z-10"
                      />
                      <DatePicker
                        selected={
                          selectedDate
                            ? new Date(selectedDate + "T00:00:00")
                            : null
                        }
                        onChange={handleDateChange}
                        minDate={new Date()}
                        locale="vi"
                        dateFormat="dd/MM/yyyy"
                        placeholderText="dd/mm/yyyy"
                        todayButton="Hôm nay"
                        portalId="datepicker-portal"
                        className="w-full bg-white pl-10 pr-3 py-2.5 rounded-lg text-[13px] text-[#1F2A37] border border-gray-200 focus:border-[#E07A5F] focus:ring-2 focus:ring-[#E07A5F]/20 outline-none transition-all cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* ── SELECT TIME ── */}
                  <div>
                    <label className="text-[11px] font-bold text-[#1F2A37] uppercase tracking-wider mb-2 block">
                      Select Time
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {TIME_SLOTS.map((t) => (
                        <button
                          key={t}
                          onClick={() => {
                            setSelectedTime(t);
                            setFormError("");
                          }}
                          className={`py-2 rounded-lg text-[12px] font-semibold transition-all border ${
                            selectedTime === t
                              ? "bg-[#1F2A37] text-white border-[#1F2A37]"
                              : "bg-white text-[#1F2A37] border-gray-200 hover:border-[#1F2A37]/40"
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* ── SELECT YOUR PET ── */}
                  <div>
                    <label className="text-[11px] font-bold text-[#1F2A37] uppercase tracking-wider mb-2 block">
                      Select Your Pet
                    </label>
                    {petsLoading ? (
                      <div className="flex items-center justify-center py-4">
                        <div className="w-5 h-5 border-2 border-[#E07A5F]/30 border-t-[#E07A5F] rounded-full animate-spin" />
                      </div>
                    ) : pets.length === 0 ? (
                      <div className="text-center py-3">
                        <p className="text-[12px] text-[#999] mb-2">
                          No pets yet.
                        </p>
                        <button
                          onClick={() => navigate("/profile")}
                          className="text-[#E07A5F] text-[12px] font-bold hover:underline"
                        >
                          + Add new pet
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {pets.map((pet) => (
                          <button
                            key={pet._id}
                            onClick={() => {
                              setSelectedPet(pet);
                              setFormError("");
                            }}
                            className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${
                              selectedPet?._id === pet._id
                                ? "border-2 border-[#1F2A37] bg-[#F8F9FA]"
                                : "border border-gray-200 hover:border-gray-300 bg-white"
                            }`}
                          >
                            <div className="w-9 h-9 rounded-full bg-[#E07A5F]/10 flex items-center justify-center shrink-0">
                              <PawPrint size={16} className="text-[#E07A5F]" />
                            </div>
                            <div className="flex-grow min-w-0">
                              <p className="text-[13px] font-bold text-[#1F2A37] truncate">
                                {pet.name}
                              </p>
                              <p className="text-[11px] text-[#999]">
                                {pet.type || pet.breed || "Pet"}
                              </p>
                            </div>
                          </button>
                        ))}
                        <button
                          onClick={() => navigate("/profile")}
                          className="w-full flex items-center justify-center gap-1.5 py-2.5 text-[#1F2A37]/60 text-[12px] font-medium hover:text-[#1F2A37] transition-colors"
                        >
                          <Plus size={14} /> Add new pet
                        </button>
                      </div>
                    )}
                  </div>

                  {/* ── NOTES ── */}
                  <div>
                    <label className="text-[11px] font-bold text-[#1F2A37] uppercase tracking-wider mb-2 block">
                      Notes{" "}
                      <span className="font-normal normal-case text-[#999]">
                        (Optional)
                      </span>
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={2}
                      placeholder="Special requests..."
                      className="w-full bg-white px-3 py-2.5 rounded-lg text-[13px] text-[#1F2A37] border border-gray-200 focus:border-[#E07A5F] focus:ring-2 focus:ring-[#E07A5F]/20 outline-none transition-all resize-none placeholder:text-[#bbb]"
                    />
                  </div>

                  {/* Error */}
                  {formError && (
                    <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 flex items-center gap-2">
                      <AlertCircle
                        size={14}
                        className="text-red-500 shrink-0"
                      />
                      <p className="text-[12px] text-red-600 font-medium">
                        {formError}
                      </p>
                    </div>
                  )}

                  {/* ── BOOK BUTTON ── */}
                  <button
                    onClick={handleBookNow}
                    disabled={!canSubmit || isSubmitting}
                    className="w-full py-3 bg-[#E07A5F] text-white rounded-lg font-bold text-[14px] hover:bg-[#c56a52] transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        Book Appointment
                        <ArrowRight size={16} />
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </motion.main>

      <Footer />
      <div id="datepicker-portal" />
    </div>
  );
};

export default ServiceDetail;
