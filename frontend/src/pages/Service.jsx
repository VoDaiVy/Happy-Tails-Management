import React, { useState, useEffect, useRef } from "react";
import { getAllServices } from "../api/serviceApi";
import { addServiceToCart, addStayToCart } from "../api/cartApi";
import { getRoomsList } from "../api/roomApi";
import { AnimatePresence, motion as Motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Search,
  MapPin,
  Calendar,
  ChevronDown,
  ChevronUp,
  Activity,
  Sparkles,
  Stethoscope,
  Heart,
  ArrowRight,
  CheckCircle,
  Phone,
  Mail,
  Clock,
  Video,
  Coffee,
  Shield,
  PawPrint,
  Monitor,
  Thermometer,
  UserCheck,
  Syringe,
  Star,
  Award,
  Upload,
  Scan,
  ClipboardList,
  Scissors,
  Droplet,
  Eye,
  Brush,
  Smile,
  Gamepad2,
  Utensils,
  Bed,
  Moon,
  ShoppingCart,
} from "lucide-react";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import AuthModal from "../components/AuthModal";
import CameraFeatureModal from "../components/CameraFeatureModal";
import { slugifyServiceName } from "../data/servicesData";
import ServicePreviewModal from "../components/service/ServicePreviewModal";
import { useAuth } from "../context/AuthContext";

const resolveServiceIcon = (name = "") => {
  const n = name.toLowerCase();
  if (n.includes("bath") || n.includes("spa")) return <Droplet size={20} />;
  if (n.includes("ear") || n.includes("eye")) return <Eye size={20} />;
  if (n.includes("dye") || n.includes("color")) return <Brush size={20} />;
  if (n.includes("dental") || n.includes("teeth")) return <Smile size={20} />;
  if (n.includes("nail") || n.includes("style") || n.includes("groom")) {
    return <Scissors size={20} />;
  }
  return <Sparkles size={20} />;
};

// Reuse Home's SocialButton style but adapted to new colors
const SocialButton = ({ icon }) => (
  <a
    href="#"
    className="w-10 h-10 border border-[#1F2A37]/10 rounded-full flex items-center justify-center text-[#1F2A37]/70 hover:bg-[#E07A5F] hover:text-[#F5F1EB] hover:border-[#E07A5F] transition-all"
  >
    {icon}
  </a>
);

const ExpandableService = ({ title, duration, price, description }) => {
  const [expanded, setExpanded] = useState(false);
  return (
    <div
      className="border border-[#1F2A37]/10 rounded-[16px] p-4 bg-white/60 hover:bg-white transition-all cursor-pointer shadow-sm"
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex justify-between items-center">
        <h4 className="font-bold text-[#1F2A37] text-sm md:text-base">
          {title}
        </h4>
        <div className="flex items-center gap-3">
          <span className="text-[#E07A5F] font-bold text-sm tracking-wide">
            {price}
          </span>
          <div className="w-6 h-6 rounded-full bg-[#F5F1EB] flex items-center justify-center">
            {expanded ? (
              <ChevronUp size={14} className="text-[#1F2A37]" />
            ) : (
              <ChevronDown size={14} className="text-[#1F2A37]" />
            )}
          </div>
        </div>
      </div>
      <AnimatePresence>
        {expanded && (
          <Motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="pt-4 mt-4 border-t border-[#1F2A37]/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-1.5 text-[13px] font-medium text-[#1F2A37]/60 mb-1.5">
                  <Clock size={14} /> <span>{duration}</span>
                </div>
                <p className="text-sm text-[#1F2A37]/70 leading-relaxed">
                  {description}
                </p>
              </div>
              <button className="bg-[#1F2A37] text-white text-xs font-medium px-5 py-2.5 rounded-full hover:bg-[#E07A5F] transition-colors whitespace-nowrap shadow-md">
                Book Now
              </button>
            </div>
          </Motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const AIExpandableService = ({ title, price, customDesc }) => {
  const [expanded, setExpanded] = useState(false);
  return (
    <div
      className="border border-white/10 shadow-md rounded-[16px] p-4 bg-white hover:bg-white/95 transition-all cursor-pointer"
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex justify-between items-center">
        <h4 className="font-bold text-[#1F2A37] text-[15px]">{title}</h4>
        <div className="flex items-center gap-4">
          <span className="text-[#E07A5F] font-bold text-sm tracking-wide">
            {price}
          </span>
          <div className="w-7 h-7 rounded-full bg-[#1F2A37]/5 flex items-center justify-center">
            {expanded ? (
              <ChevronUp size={16} className="text-[#1F2A37]" />
            ) : (
              <ChevronDown size={16} className="text-[#1F2A37]" />
            )}
          </div>
        </div>
      </div>
      <AnimatePresence>
        {expanded && (
          <Motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="pt-3 mt-3 border-t border-[#1F2A37]/10">
              <p className="text-sm text-[#1F2A37]/70 leading-relaxed font-medium">
                {customDesc}
              </p>
            </div>
          </Motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const MedicalCard = ({ icon, title, description, priceRange }) => (
  <div className="bg-white rounded-[24px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-[#7FB069]/10 group hover:-translate-y-1 transition-transform duration-300">
    <div className="w-12 h-12 rounded-2xl bg-[#7FB069]/10 text-[#7FB069] flex items-center justify-center mb-5 group-hover:bg-[#7FB069] group-hover:text-white transition-colors">
      {icon}
    </div>
    <h3 className="text-lg font-bold text-[#1F2A37] mb-2">{title}</h3>
    <p className="text-sm text-[#1F2A37]/60 mb-4 line-clamp-2">{description}</p>
    <div className="flex items-center justify-between mt-auto">
      <span className="text-sm font-bold text-[#7FB069]">{priceRange}</span>
      <button className="text-xs font-medium text-[#1F2A37] border border-[#1F2A37]/20 rounded-full px-4 py-2 hover:bg-[#7FB069] hover:text-white hover:border-[#7FB069] transition-all">
        Book Consultation
      </button>
    </div>
  </div>
);

const RoomCard = ({ title, price, features, image }) => (
  <div className="bg-white rounded-[24px] overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col">
    <div className="h-48 overflow-hidden relative">
      <img
        src={image}
        alt={title}
        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
      />
      <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-bold text-[#1F2A37]">
        {price} <span className="text-[#1F2A37]/50 font-normal">/ night</span>
      </div>
    </div>
    <div className="p-6 flex flex-col flex-grow">
      <h3 className="text-xl font-bold text-[#1F2A37] mb-4 font-serif">
        {title}
      </h3>
      <ul className="space-y-2.5 mb-6 flex-grow">
        {features.map((feat, idx) => (
          <li
            key={idx}
            className="flex items-center gap-2 text-sm text-[#1F2A37]/70"
          >
            <CheckCircle size={16} className="text-[#E07A5F]" /> {feat}
          </li>
        ))}
      </ul>
      <button className="w-full bg-[#1F2A37] text-white font-medium py-3 rounded-xl hover:bg-[#E07A5F] transition-colors">
        Reserve Now
      </button>
    </div>
  </div>
);

const Dropdown = ({ icon, label, options, selected, onSelect }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div
      className={`flex flex-col gap-1.5 relative ${isOpen ? "z-50" : "z-10"}`}
      ref={dropdownRef}
    >
      <label className="text-[11px] font-bold text-[#1F2A37]/80 ml-2 uppercase tracking-widest">
        {label}
      </label>
      <div
        className={`flex items-center gap-2.5 bg-white/95 px-3.5 py-2.5 rounded-[10px] cursor-pointer transition-all h-[40px] shadow-sm border ${isOpen ? "border-[#E07A5F] ring-2 ring-[#E07A5F]/20" : "border-white/50 hover:border-[#E07A5F]/40"}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="text-[#7FB069] shrink-0 opacity-90 scale-90">
          {icon}
        </div>
        <span className="w-full text-[12px] text-[#1F2A37] font-semibold truncate">
          {selected}
        </span>
        <ChevronDown
          size={14}
          className={`text-[#1F2A37]/50 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </div>

      <AnimatePresence>
        {isOpen && (
          <Motion.div
            initial={{ height: 0, opacity: 0, y: -5 }}
            animate={{ height: "auto", opacity: 1, y: 0 }}
            exit={{ height: 0, opacity: 0, y: -5 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="absolute top-full left-0 mt-1.5 w-full bg-white/95 backdrop-blur-xl rounded-[12px] shadow-[0_15px_35px_rgba(0,0,0,0.1)] border border-[#1F2A37]/5 overflow-hidden z-[100]"
          >
            <div className="py-1.5">
              {options.map((opt, i) => (
                <div
                  key={i}
                  className={`px-4 py-2.5 text-[12px] cursor-pointer transition-all ${
                    selected === opt
                      ? "bg-[#E07A5F]/10 text-[#E07A5F] font-bold border-l-[3px] border-[#E07A5F]"
                      : "text-[#1F2A37]/80 font-medium hover:bg-[#F5F1EB] border-l-[3px] border-transparent hover:text-[#1F2A37]"
                  }`}
                  onClick={() => {
                    onSelect(opt);
                    setIsOpen(false);
                  }}
                >
                  {opt}
                </div>
              ))}
            </div>
          </Motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const toSpaCard = (service, index = 0) => {
  const slug = slugifyServiceName(service.name || "");
  const fallbackHighlights = [
    "Professional pet-safe process",
    "Experienced staff on-site",
    "Post-service check and support",
  ];

  return {
    id: service._id || `${slug || 'service'}-${index}`,
    slug,
    title: service.name || "Service",
    shortDesc: service.description || "Professional care for your pet.",
    fullDesc: service.description || "",
    price:
      typeof service.price === "number"
        ? `$${service.price}`
        : service.price || "",
    priceValue: typeof service.price === "number" ? service.price : 0,
    duration:
      typeof service.duration === "number" ? `${service.duration} minutes` : "",
    rating:
      typeof service.rating === "number" ? service.rating.toFixed(1) : "0.0",
    reviewCount: service.totalReviews ?? 0,
    icon: resolveServiceIcon(service.name || ""),
    image: service.images?.[0] || "/placeholder-service.jpg",
    gallery:
      Array.isArray(service.images) && service.images.length > 0
        ? service.images
        : ["/placeholder-service.jpg"],
    highlights:
      Array.isArray(service.features) && service.features.length > 0
        ? service.features
        : fallbackHighlights,
    apiService: service,
  };
};

const extractServicesFromApiResponse = (result) => {
  if (Array.isArray(result)) return result;
  if (Array.isArray(result?.data)) return result.data;
  if (Array.isArray(result?.data?.services)) return result.data.services;
  if (Array.isArray(result?.services)) return result.services;
  return [];
};

const ServicePage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, token } = useAuth();
  const [category, setCategory] = useState("All Categories");
  const [sortBy, setSortBy] = useState("Default");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSpa, setActiveSpa] = useState(0);
  const [previewService, setPreviewService] = useState(null);

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState("login");
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem("user");
    return stored ? JSON.parse(stored) : null;
  });

  const openLoginModal = () => {
    setAuthModalMode("login");
    setIsAuthModalOpen(true);
  };

  const openRegisterModal = () => {
    setAuthModalMode("register");
    setIsAuthModalOpen(true);
  };

  const handleLoginSuccess = (userData) => {
    console.log("[Login Success] User data:", userData);
    setUser(userData);
    setIsAuthModalOpen(false);

    // Redirect based on user role
    if (userData.role === "admin") {
      navigate("/admin");
    } else if (userData.role === "staff") {
      navigate("/staff");
    } else {
      // Customer stays on current page or redirect to profile
      window.location.reload(); // Reload to update navbar with user info
    }
  };

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchedKeyword, setSearchedKeyword] = useState("");
  const [searchError, setSearchError] = useState("");
  const [spaServices, setSpaServices] = useState([]);
  const [spaLoading, setSpaLoading] = useState(true);
  const [cartMessage, setCartMessage] = useState("");
  const [flyToCartItems, setFlyToCartItems] = useState([]);
  const hasValidSession = Boolean(isAuthenticated && token && user);

  const triggerFlyToCart = (sourceElement) => {
    const sourceRect = sourceElement?.getBoundingClientRect?.();
    const targetRect = document
      .getElementById("navbar-cart-button")
      ?.getBoundingClientRect?.();
    if (!sourceRect || !targetRect) return;

    const id = `${Date.now()}-${Math.random()}`;
    setFlyToCartItems((prev) => [
      ...prev,
      {
        id,
        startX: sourceRect.left + sourceRect.width / 2,
        startY: sourceRect.top + sourceRect.height / 2,
        endX: targetRect.left + targetRect.width / 2,
        endY: targetRect.top + targetRect.height / 2,
      },
    ]);

    window.setTimeout(() => {
      setFlyToCartItems((prev) => prev.filter((item) => item.id !== id));
    }, 720);
  };

  const showCartMessage = (message) => {
    setCartMessage(message);
    setTimeout(() => {
      setCartMessage("");
    }, 2800);
  };

  const isBoardingService = (service = {}) => {
    const categoryName = (service?.category?.name || service?.apiService?.category?.name || "").toLowerCase();
    const serviceName = (service?.name || service?.title || service?.apiService?.name || "").toLowerCase();
    return (
      categoryName.includes("board") ||
      serviceName.includes("penthouse") ||
      serviceName.includes("room") ||
      serviceName.includes("boarding") ||
      serviceName.includes("lưu trú") ||
      serviceName.includes("luu tru")
    );
  };

  const openStaySetup = async (service, sourceElement) => {
    const roomName = (service?.name || service?.title || "").toLowerCase();
    const roomType = roomName.includes("vip") || roomName.includes("penthouse") ? "vip" : "standard";

    try {
      const res = await getRoomsList({ type: roomType, isAvailable: "true", isActive: "true" });
      const rooms = Array.isArray(res?.data?.rooms)
        ? res.data.rooms
        : Array.isArray(res?.rooms)
          ? res.rooms
          : Array.isArray(res?.data)
            ? res.data
            : [];
      const roomId = rooms[0]?._id;
      if (!roomId) {
        showCartMessage("Hiện chưa có phòng khả dụng cho loại lưu trú này.");
        return;
      }

      await addStayToCart({
        roomId,
        metadata: {
          source: "service-page",
          roomType,
          serviceName: service?.name || service?.title,
          presetFromService: true,
          needConfirmInCart: true,
        },
      });

      triggerFlyToCart(sourceElement);
      window.dispatchEvent(new CustomEvent("cart:updated"));

      showCartMessage("Đã thêm boarding vào giỏ. Bạn chọn ngày giờ chính thức ở trang Cart.");
    } catch (error) {
      const message = error?.response?.data?.message || "Không thể thêm gói lưu trú vào giỏ hàng.";
      showCartMessage(message);
    }
  };

  const handleAddToCart = async (event, service) => {
    event.stopPropagation();
    const sourceElement = event.currentTarget;

    const token = localStorage.getItem("accessToken");
    if (!token) {
      openLoginModal();
      return;
    }

    if (isBoardingService(service)) {
      await openStaySetup(service, sourceElement);
      return;
    }

    const serviceId = service?._id || service?.apiService?._id;
    if (!serviceId) {
      showCartMessage("Không tìm thấy thông tin dịch vụ để thêm giỏ hàng.");
      return;
    }

    try {
      await addServiceToCart({
        serviceId,
        quantity: 1,
        metadata: {
          source: "service-page",
        },
      });
      triggerFlyToCart(sourceElement);
      window.dispatchEvent(new CustomEvent("cart:updated"));
      showCartMessage(`Đã thêm \"${service.name || service.title || "dịch vụ"}\" vào giỏ hàng.`);
    } catch (error) {
      const message = error?.response?.data?.message || "Không thể thêm gói lưu trú vào giỏ hàng.";
      showCartMessage(message);
    }
  };

  useEffect(() => {
    let alive = true;

    const loadSpaServices = async () => {
      setSpaLoading(true);
      try {
        const result = await getAllServices({
          isActive: "true",
          limit: 100,
          sortBy: "name",
          sortOrder: "asc",
        });

        const list = extractServicesFromApiResponse(result);
        const spaList = list.filter((service) => {
          const cat = (service.category?.name || "").toLowerCase();
          const name = (service.name || "").toLowerCase();
          if (cat.includes("spa") || cat.includes("groom")) return true;
          return [
            "bath",
            "ear",
            "eye",
            "nail",
            "dental",
            "style",
            "dye",
            "groom",
          ].some((kw) => name.includes(kw));
        });

        const mapped = spaList.map((service, index) => toSpaCard(service, index));
        if (alive) {
          setSpaServices(mapped);
          setActiveSpa(0);
        }
      } catch {
        if (alive) {
          setSpaServices([]);
        }
      } finally {
        if (alive) setSpaLoading(false);
      }
    };

    loadSpaServices();

    return () => {
      alive = false;
    };
  }, []);

  const handleSearch = async () => {
    setIsSearching(true);
    try {
      // Fetch ALL active services, filter client-side for reliability
      const params = { isActive: "true", limit: 100 };

      // Only send search keyword to API (text search)
      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }

      // Sort
      if (sortBy === "Price (Low - High)") {
        params.sortBy = "price";
        params.sortOrder = "asc";
      } else if (sortBy === "Price (High - Low)") {
        params.sortBy = "price";
        params.sortOrder = "desc";
      } else if (sortBy === "Name (A - Z)") {
        params.sortBy = "name";
        params.sortOrder = "asc";
      } else if (sortBy === "Name (Z - A)") {
        params.sortBy = "name";
        params.sortOrder = "desc";
      }

      const result = await getAllServices(params);
      let services = extractServicesFromApiResponse(result);

      // Client-side category filter for reliability
      if (category !== "All Categories") {
        services = services.filter((s) => {
          const catName = (s.category?.name || "").toLowerCase();
          if (category === "AI Health")
            return catName.includes("ai") || catName.includes("health scan");
          if (category === "Spa & Grooming")
            return catName.includes("spa") || catName.includes("groom");
          if (category === "Boarding") return catName.includes("board");
          return false;
        });
      }

      setSearchResults(services);
      setShowSearchResults(true);
      setSearchedKeyword(searchQuery.trim());
      setSearchError("");
    } catch (error) {
      console.error("Error fetching services:", error);
      setSearchResults([]);
      setShowSearchResults(true);
      setSearchedKeyword(searchQuery.trim());
      setSearchError("Unable to connect to server. Please try again later.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleClearSearch = () => {
    setShowSearchResults(false);
    setSearchResults([]);
    setSearchedKeyword("");
    setSearchError("");
    setSearchQuery("");
    setCategory("All Categories");
    setSortBy("Default");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const activeSpaService = spaServices[activeSpa] || null;

  return (
    <div className="bg-[#F5F1EB] min-h-screen font-sans text-[#1F2A37] selection:bg-[#E07A5F] selection:text-white overflow-x-hidden">
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

      <AnimatePresence>
        {flyToCartItems.map((item) => (
          <Motion.div
            key={item.id}
            className="fixed left-0 top-0 z-[70] pointer-events-none"
            initial={{
              x: item.startX - 18,
              y: item.startY - 18,
              scale: 1.15,
              opacity: 1,
            }}
            animate={{
              x: [item.startX - 18, item.startX + 30, item.endX - 18],
              y: [item.startY - 18, item.startY - 36, item.endY - 18],
              scale: [1.15, 1, 0.68],
              opacity: [1, 0.95, 0.3],
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.15, ease: "easeInOut" }}
          >
            <div className="w-9 h-9 rounded-full bg-[#E07A5F] text-white flex items-center justify-center shadow-[0_10px_22px_rgba(224,122,95,0.45)] ring-2 ring-white/70">
              <ShoppingCart size={17} />
            </div>
          </Motion.div>
        ))}
      </AnimatePresence>

      <main className="w-full mx-auto px-6 md:px-12 lg:px-[5%] pt-28 pb-20">
        {cartMessage && (
          <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 font-semibold">
            {cartMessage}
          </div>
        )}

        {/* SECTION 1 - HERO CAROUSEL WITH SEARCH */}
        <section className="relative mb-32 z-30">
          <div className="absolute inset-0 z-0 rounded-[28px] overflow-hidden bg-[#1F2A37]">
            <video
              autoPlay
              loop
              muted
              playsInline
              className="absolute inset-0 w-full h-full object-cover"
            >
              <source src="/hero-video.mp4" type="video/mp4" />
            </video>
            <div className="absolute inset-0 bg-gradient-to-r from-[#6e8a6d]/90 to-[#6e8a6d]/60 mix-blend-multiply" />
          </div>

          <div className="relative z-10 pt-16 pb-36 px-8 md:px-16 flex flex-col justify-center min-h-[420px]">
            <Motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="max-w-xl text-white"
            >
              <h1 className="font-serif text-4xl lg:text-5xl font-medium leading-[1.1] mb-3 text-white">
                Comprehensive Care <br /> For Your Pets
              </h1>
              <p className="text-sm md:text-base text-white font-medium mb-2 max-w-md mt-3 tracking-wide drop-shadow-md">
                Professional spa, styling, veterinary clinics, and luxury
                boarding - all tailored perfectly for your furry family members.
              </p>
            </Motion.div>

            {/* Floating Glass Card Search Bar */}
            <Motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="absolute -bottom-10 left-6 right-6 md:left-12 md:right-12 lg:left-24 lg:right-24 bg-[#F5F2EB] p-6 rounded-[24px] shadow-[0_20px_40px_rgba(31,42,55,0.15)] z-20"
            >
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-[#1F2A37]/80 ml-2 uppercase tracking-widest">
                    Search Service
                  </label>
                  <div className="flex items-center gap-2.5 bg-white/95 px-3.5 py-2.5 rounded-[10px] border border-white/50 focus-within:border-[#E07A5F] focus-within:ring-2 focus-within:ring-[#E07A5F]/20 transition-all h-[40px] shadow-sm">
                    <Search size={14} className="text-[#7FB069] shrink-0" />
                    <input
                      type="text"
                      placeholder="Enter service name"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                      className="bg-transparent border-none outline-none w-full text-[12px] text-[#1F2A37] font-semibold placeholder:font-medium placeholder:text-[#1F2A37]/40"
                    />
                  </div>
                </div>

                <Dropdown
                  label="Category"
                  icon={<Monitor size={16} className="text-[#7FB069]" />}
                  options={[
                    "All Categories",
                    "AI Health",
                    "Spa & Grooming",
                    "Boarding",
                  ]}
                  selected={category}
                  onSelect={setCategory}
                />

                <Dropdown
                  label="Sort By"
                  icon={<Activity size={16} className="text-[#7FB069]" />}
                  options={[
                    "Default",
                    "Name (A - Z)",
                    "Name (Z - A)",
                    "Price (Low - High)",
                    "Price (High - Low)",
                  ]}
                  selected={sortBy}
                  onSelect={setSortBy}
                />

                <button
                  onClick={handleSearch}
                  disabled={isSearching}
                  className="bg-[#E07A5F] text-white h-[40px] rounded-[10px] font-bold text-[12px] hover:bg-[#c56a52] hover:shadow-lg transition-all flex items-center justify-center gap-2 shadow-md disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isSearching ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <Search size={14} />
                  )}
                  {isSearching ? "Searching..." : "Search"}
                </button>
              </div>
            </Motion.div>
          </div>
        </section>

        {/* SEARCH RESULTS SECTION */}
        {showSearchResults && (
          <section className="w-full max-w-[1100px] mx-auto px-6 xl:px-4 mt-8 mb-16">
            <div className="flex items-start justify-between mb-8">
              <div>
                <h2 className="text-3xl font-serif font-black text-[#1F2A37] mb-2">
                  {searchResults.length} Service
                  {searchResults.length !== 1 ? "s" : ""} Found
                </h2>
                {searchedKeyword && (
                  <p className="text-[#1F2A37]/60 text-sm">
                    Showing results for:{" "}
                    <span className="font-bold text-[#1F2A37]">
                      "{searchedKeyword}"
                    </span>
                  </p>
                )}
              </div>
              <button
                onClick={handleClearSearch}
                className="flex items-center gap-2 px-5 py-2.5 border border-[#1F2A37]/20 rounded-full text-[13px] font-semibold text-[#1F2A37]/70 hover:bg-[#1F2A37] hover:text-white transition-all"
              >
                <span className="text-lg leading-none">&times;</span> Clear &
                Show All
              </button>
            </div>

            {searchError ? (
              <div className="text-center py-20">
                <p className="text-red-500/80 text-lg">{searchError}</p>
              </div>
            ) : searchResults.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-[#1F2A37]/50 text-lg">
                  No services found matching your criteria.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {searchResults.map((service) => (
                  <Motion.div
                    key={service._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={() => {
                      const slug = slugifyServiceName(service.name || "");
                      if (slug) {
                        navigate(`/service/${slug}`, {
                          state: { apiService: service },
                        });
                      }
                    }}
                    className="bg-white rounded-[20px] overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.04)] border border-[#1F2A37]/5 hover:shadow-[0_10px_30px_rgba(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col"
                  >
                    {/* Image */}
                    <div className="relative h-48 overflow-hidden bg-[#F5F2EB]">
                      <img
                        src={service.images?.[0] || "/placeholder-service.jpg"}
                        alt={service.name}
                        className="w-full h-full object-cover"
                      />
                      {/* Category Badge */}
                      {service.category?.name && (
                        <span className="absolute top-3 right-3 bg-[#7FB069]/90 text-white px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide">
                          {service.category.name}
                        </span>
                      )}
                      {/* Smile icon */}
                      <div className="absolute bottom-3 left-3 w-9 h-9 rounded-full bg-[#7FB069]/80 text-white flex items-center justify-center shadow-md">
                        <Smile size={16} />
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-5 flex flex-col flex-grow">
                      <h3 className="font-bold text-[#1F2A37] text-[16px] mb-1.5">
                        {service.name}
                      </h3>
                      <p className="text-[#1F2A37]/60 text-[13px] leading-relaxed mb-4 line-clamp-2 flex-grow">
                        {service.description}
                      </p>
                      <div className="flex items-center justify-between mt-auto pt-3 border-t border-[#1F2A37]/5 gap-2">
                        <span className="text-[#E07A5F] font-black text-[16px]">
                          ${service.price}
                        </span>
                        <div className="flex items-center gap-2">
                          {hasValidSession && (
                            <button
                              onClick={(e) => handleAddToCart(e, service)}
                              className="bg-white border border-[#E07A5F]/35 text-[#E07A5F] text-[12px] font-bold px-3 py-2 rounded-full hover:bg-[#E07A5F]/10 transition-colors shadow-sm inline-flex items-center gap-1.5"
                            >
                              <ShoppingCart size={13} /> Add to Cart
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const slug = slugifyServiceName(service.name || "");
                              if (slug) {
                                navigate(`/service/${slug}`, {
                                  state: { apiService: service },
                                });
                              }
                            }}
                            className="bg-[#E07A5F] text-white text-[12px] font-bold px-5 py-2 rounded-full hover:bg-[#c56a52] transition-colors shadow-md"
                          >
                            Book Now
                          </button>
                        </div>
                      </div>

                    </div>
                  </Motion.div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* MAIN SERVICE SECTIONS */}
        {!showSearchResults && (
          <div className="flex flex-col w-full">
            {/* NEW AI HEALTH SCAN SECTION */}
            <section
              id="ai-health"
              className="relative z-10 w-full max-w-[1100px] mx-auto px-6 xl:px-4 order-4 mt-6 mb-4"
            >
              <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
                {/* Left Content */}
                <div className="pr-2">
                  <div className="inline-flex items-center gap-2 bg-[#7FB069]/10 text-[#7FB069] px-3 py-1.5 rounded-full font-bold text-[11px] mb-4">
                    <Sparkles size={12} /> Future Tech Innovation
                  </div>
                  <h2 className="text-3xl md:text-4xl font-serif font-black text-[#1F2A37] mb-3 leading-tight">
                    AI Health Scan <br /> for Your Pet
                  </h2>
                  <p className="text-[#1F2A37]/70 mb-10 text-[14px] md:text-[15px] leading-relaxed max-w-[95%]">
                    Experience the future of pet wellness. Our state-of-the-art
                    AI technology helps identify potential health concerns
                    before they become serious. Upload an image, and let our
                    system provide an instant preliminary diagnosis.
                  </p>

                  <div className="space-y-6 mb-10">
                    <div className="flex gap-4">
                      <div className="w-10 h-10 rounded-xl bg-white shadow-sm border border-[#1F2A37]/5 flex items-center justify-center text-[#7FB069] shrink-0">
                        <Upload size={18} />
                      </div>
                      <div>
                        <h4 className="font-bold text-[#1F2A37] mb-1 text-[14px]">
                          Step 1: Upload Pet Photo
                        </h4>
                        <p className="text-[12px] text-[#1F2A37]/60">
                          Simply drag and drop a clear photo of your pet.
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <div className="w-10 h-10 rounded-xl bg-white shadow-sm border border-[#1F2A37]/5 flex items-center justify-center text-[#7FB069] shrink-0">
                        <Scan size={18} />
                      </div>
                      <div>
                        <h4 className="font-bold text-[#1F2A37] mb-1 text-[14px]">
                          Step 2: AI Scan Analysis
                        </h4>
                        <p className="text-[12px] text-[#1F2A37]/60">
                          Our advanced AI analyzes over 1,000 health indicators.
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <div className="w-10 h-10 rounded-xl bg-white shadow-sm border border-[#1F2A37]/5 flex items-center justify-center text-[#7FB069] shrink-0">
                        <ClipboardList size={18} />
                      </div>
                      <div>
                        <h4 className="font-bold text-[#1F2A37] mb-1 text-[14px]">
                          Step 3: Receive Diagnosis Suggestion
                        </h4>
                        <p className="text-[12px] text-[#1F2A37]/60">
                          Get immediate insights and veterinary recommendations.
                        </p>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      navigate("/ai-health-scan");
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="px-6 py-3 bg-[#7FB069] text-white rounded-xl font-bold text-[13px] hover:bg-[#6e8a6d] transition-colors shadow-md"
                  >
                    Upload Image Now
                  </button>
                </div>

                {/* Right UI Card */}
                <div className="relative w-full ml-auto lg:pl-4">
                  <div className="bg-white rounded-[24px] p-5 lg:p-6 shadow-[0_15px_40px_rgba(0,0,0,0.06)] border border-[#1F2A37]/5 relative z-10 w-full max-w-[480px] mx-auto">
                    {/* Header */}
                    <div className="flex items-center gap-2.5 px-2 py-0.5 mb-3">
                      <div className="w-8 h-8 rounded-full bg-[#7FB069]/10 flex items-center justify-center text-[#7FB069]">
                        <Monitor size={14} />
                      </div>
                      <div>
                        <h5 className="font-bold text-[13px] text-[#1F2A37] mb-0.5">
                          Happytails AI
                        </h5>
                        <div className="flex items-center gap-1.5 text-[9px] text-[#1F2A37]/50 font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#7FB069]"></span>{" "}
                          System Online
                        </div>
                      </div>
                    </div>

                    {/* Image w/ Scan Overlay */}
                    <div className="relative rounded-[16px] overflow-hidden aspect-[4/3] mb-5 border border-[#1F2A37]/5 h-[240px] w-full">
                      <img
                        src="https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=800"
                        alt="Dog on beach"
                        className="w-full h-full object-cover"
                      />
                      {/* Scanner Line */}
                      <Motion.div
                        animate={{ y: ["-10%", "300%", "-10%"] }}
                        transition={{
                          repeat: Infinity,
                          duration: 4,
                          ease: "linear",
                        }}
                        className="absolute top-0 left-0 w-full h-[30%] bg-gradient-to-b from-transparent to-[#7FB069]/40 border-b-[3px] border-[#7FB069] z-10 shadow-[0_4px_15px_rgba(127,176,105,0.4)]"
                      />
                      {/* Frame Brackets */}
                      <div className="absolute top-3 left-3 w-6 h-6 border-t-[2px] border-l-[2px] border-[#7FB069]/60 rounded-tl-lg z-10" />
                      <div className="absolute top-3 right-3 w-6 h-6 border-t-[2px] border-r-[2px] border-[#7FB069]/60 rounded-tr-lg z-10" />
                      <div className="absolute bottom-3 left-3 w-6 h-6 border-b-[2px] border-l-[2px] border-[#7FB069]/60 rounded-bl-lg z-10" />
                      <div className="absolute bottom-3 right-3 w-6 h-6 border-b-[2px] border-r-[2px] border-[#7FB069]/60 rounded-br-lg z-10" />
                    </div>

                    {/* Analysis Result Box */}
                    <div className="bg-[#F5F2EB]/60 rounded-[16px] p-4 border border-[#1F2A37]/5 pb-4">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <span className="text-[9px] font-bold text-[#1F2A37]/40 uppercase tracking-widest block mb-1">
                            Analysis Result
                          </span>
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded-full border-[1.5px] border-[#E07A5F] flex items-center justify-center text-[#E07A5F] shrink-0">
                              <CheckCircle size={8} />
                            </div>
                            <h4 className="font-bold text-[#1F2A37] text-[13px]">
                              Possible Skin Infection
                            </h4>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-2xl font-black text-[#7FB069] leading-none block mb-0.5">
                            87%
                          </span>
                          <span className="text-[8px] font-bold text-[#1F2A37]/40 uppercase tracking-widest">
                            Confidence
                          </span>
                        </div>
                      </div>

                      <div className="bg-white rounded-[12px] p-3 flex gap-3 items-start shadow-sm border border-[#1F2A37]/5 mb-4">
                        <div className="w-6 h-6 rounded-full bg-[#E07A5F]/10 flex items-center justify-center text-[#E07A5F] shrink-0 mt-0.5">
                          <Activity size={10} />
                        </div>
                        <div>
                          <h5 className="font-bold text-[#1F2A37] text-[11px] mb-0.5">
                            Veterinary Suggestion
                          </h5>
                          <p className="text-[10px] text-[#1F2A37]/50 leading-relaxed font-medium">
                            We recommend consulting a veterinarian for a proper
                            diagnosis and treatment plan.
                          </p>
                        </div>
                      </div>

                      <button className="w-full py-2.5 bg-white border border-[#1F2A37]/10 rounded-xl font-bold text-[#1F2A37] text-[12px] hover:border-[#1F2A37]/30 hover:shadow-sm transition-all focus:outline-none">
                        Book Vet Appointment
                      </button>
                    </div>
                  </div>

                  {/* Floating Side Icon */}
                  <Motion.div
                    animate={{ y: [0, -8, 0] }}
                    transition={{
                      duration: 4,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                    className="absolute top-1/3 -right-4 lg:-right-8 w-12 h-12 bg-white rounded-2xl shadow-md border border-[#1F2A37]/5 flex items-center justify-center text-[#7FB069] z-20"
                  >
                    <Monitor size={18} className="opacity-80" />
                  </Motion.div>
                </div>
              </div>
            </section>

            {/* PREMIUM SPA & GROOMING SHOWCASE */}
            <section
              id="spa-grooming"
              className="relative z-10 w-full max-w-[1100px] mx-auto px-6 xl:px-4 order-2 mt-6 mb-6"
            >
              <div className="text-center mb-8">
                <span className="text-[#7FB069] font-bold tracking-widest uppercase text-[11px] mb-2 block">
                  Luxury Experience
                </span>
                <h2 className="text-3xl md:text-5xl font-serif font-black text-[#1F2A37]">
                  Spa & Grooming
                </h2>
              </div>

              {/* Interactive Layout */}
              <div className="grid lg:grid-cols-2 gap-8 lg:gap-14 items-stretch bg-transparent rounded-[24px] p-0">
                {/* Visual Showcase (Left) */}
                <div className="relative rounded-[24px] overflow-hidden bg-[#F5F2EB] aspect-[4/3] lg:aspect-auto w-full shadow-inner border border-[#1F2A37]/5 h-full min-h-[400px]">
                  <AnimatePresence mode="wait">
                    <Motion.img
                      key={activeSpaService?.id || "spa-placeholder"}
                      src={
                        activeSpaService?.image || "/placeholder-service.jpg"
                      }
                      initial={{ opacity: 0, scale: 1.05 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.6, ease: "easeInOut" }}
                      className="absolute inset-0 w-full h-full object-cover"
                      alt={activeSpaService?.title || "Spa service"}
                    />
                  </AnimatePresence>

                  {/* Paw Pattern Overlay (Subtle) */}
                  <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+PHBhdGggZD0iTTUgNWgxdjFINXoiIGZpbGw9InJnYmEoMCwwLDAsMC4wMikiLz48L3N2Zz4=')] mix-blend-multiply opacity-50 z-10 pointer-events-none"></div>

                  {/* Premium Glass Badge */}
                  <Motion.div
                    animate={{ y: [0, -5, 0] }}
                    transition={{
                      duration: 4,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                    className="absolute bottom-6 left-6 bg-white/60 backdrop-blur-xl border border-white/40 rounded-2xl p-3 pr-4 flex items-center gap-3 shadow-[0_10px_30px_rgba(0,0,0,0.08)] z-20"
                  >
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#7FB069] to-[#5B8C51] flex items-center justify-center text-white shadow-md shrink-0">
                      <PawPrint size={16} />
                    </div>
                    <div>
                      <h5 className="font-bold text-[#1F2A37] text-[13px] leading-tight mb-0.5">
                        Premium Pet Spa
                      </h5>
                      <p className="text-[#1F2A37]/60 text-[9px] uppercase font-bold tracking-widest">
                        Hypoallergenic Products
                      </p>
                    </div>
                  </Motion.div>
                </div>

                {/* Service Menu (Right) */}
                <div className="flex flex-col justify-center space-y-3 lg:pl-2">
                  {spaLoading ? (
                    <div className="rounded-[16px] border border-white/60 bg-white/40 p-4 text-[13px] text-[#1F2A37]/55">
                      Loading services...
                    </div>
                  ) : spaServices.length === 0 ? (
                    <div className="rounded-[16px] border border-white/60 bg-white/40 p-4 text-[13px] text-[#1F2A37]/55">
                      Khong co du lieu dich vu tu backend.
                    </div>
                  ) : (
                    spaServices.map((service, idx) => {
                      const isActive = activeSpa === idx;
                      return (
                        <Motion.div
                          key={`${service.id || service.slug || service.title}-${idx}`}
                          onClick={() => setActiveSpa(idx)}
                          whileHover={{ scale: isActive ? 1 : 1.02 }}
                          className={`cursor-pointer rounded-[16px] p-3 flex items-center gap-3 transition-all duration-300 border ${
                            isActive
                              ? "bg-[#1F2A37] text-white shadow-xl border-[#1F2A37]"
                              : "bg-white/40 hover:bg-white shadow-sm border-white/60 text-[#1F2A37]"
                          }`}
                        >
                          <Motion.div
                            animate={
                              isActive ? { rotate: [0, 10, -10, 0] } : {}
                            }
                            transition={{ duration: 0.5 }}
                            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors duration-300 ${
                              isActive
                                ? "bg-[#E07A5F] text-white shadow-lg"
                                : "bg-white text-[#7FB069] shadow-sm border border-[#1F2A37]/5"
                            }`}
                          >
                            {service.icon}
                          </Motion.div>

                          <div className="flex-grow flex flex-col justify-center">
                            <div className="flex justify-between items-start mb-0.5">
                              <h4
                                className={`font-bold text-[14px] transition-colors pr-2 break-words ${isActive ? "text-white" : "text-[#1F2A37]"}`}
                              >
                                {service.title}
                              </h4>
                              <span className={`font-black text-[14px] shrink-0 ${isActive ? "text-[#E07A5F]" : "text-[#7FB069]"}`}>
                                {service.price}
                              </span>
                            </div>
                            <p
                              className={`text-[12px] leading-snug transition-colors pr-1 ${isActive ? "text-white/70" : "text-[#1F2A37]/50 font-medium"}`}
                            >
                              {service.shortDesc}
                            </p>
                            {isActive && (
                              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                {hasValidSession && (
                                  <button
                                    onClick={(e) => handleAddToCart(e, service.apiService || service)}
                                    className="px-3 py-1.5 bg-white/90 text-[#E07A5F] rounded-lg font-bold text-[10px] uppercase tracking-wide hover:bg-white shadow-sm transition-colors whitespace-nowrap inline-flex items-center gap-1"
                                  >
                                    <ShoppingCart size={12} /> Add to Cart
                                  </button>
                                )}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/service/${service.slug}`, {
                                      state: { apiService: service.apiService },
                                    });
                                  }}
                                  className="px-3 py-1.5 bg-[#E07A5F] text-white rounded-lg font-bold text-[10px] uppercase tracking-wide hover:bg-[#c56a52] shadow-sm transition-colors whitespace-nowrap"
                                >
                                  Book Now
                                </button>
                              </div>
                            )}
                          </div>
                        </Motion.div>
                      );
                    })
                  )}
                </div>
              </div>
            </section>

            {/* BOARDING SERVICES / PET HOTEL */}
            <section
              id="boarding"
              className="relative z-10 w-[100vw] left-[50%] right-[50%] -ml-[50vw] -mr-[50vw] bg-[#0F172A] pt-12 pb-16 px-6 md:px-8 order-3 mt-6"
            >
              <div className="max-w-[1100px] mx-auto">
                {/* Header: Left-aligned with Button */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
                  <div className="max-w-md">
                    <div className="inline-flex items-center gap-1.5 border border-white/10 bg-white/5 text-white/80 px-4 py-1.5 rounded-full font-bold text-[10px] uppercase tracking-widest mb-4">
                      <Monitor size={14} /> Pet Resort Experience
                    </div>
                    <h2 className="text-3xl md:text-5xl font-serif font-black text-white mb-4">
                      BOARDING
                    </h2>
                    <p className="text-white/60 text-[14px] md:text-[15px] leading-relaxed">
                      Your pet deserves a vacation too. Our state-of-the-art
                      boarding facility provides comfort, care, and continuous
                      monitoring in a luxurious environment.
                    </p>
                  </div>
                </div>

                {/* Room Cards Grid */}
                <div className="grid md:grid-cols-2 gap-8 mb-14">
                  {/* Standard Room */}
                  <div
                    onClick={() => navigate("/service/standard-room")}
                    className="bg-[#1E293B] group rounded-[24px] overflow-hidden border border-white/5 hover:border-[#7FB069]/30 hover:-translate-y-2 hover:scale-[1.02] hover:shadow-[0_15px_40px_rgba(127,176,105,0.15)] transition-all duration-300 relative flex flex-col cursor-pointer"
                  >
                    <div className="relative h-48 bg-gray-800 overflow-hidden">
                      <img
                        src="/standard.webp"
                        alt="Standard Room"
                        className="w-full h-full object-cover opacity-80 group-hover:scale-110 group-hover:opacity-100 transition-all duration-700 ease-out"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#1E293B] via-transparent to-transparent opacity-90"></div>
                      <div className="absolute top-4 left-4 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full text-white/90 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 border border-[#7FB069]/30 shadow-lg">
                        <Monitor size={12} className="text-[#7FB069]" />{" "}
                        Standard
                      </div>
                    </div>
                    <div className="p-5 flex-grow flex flex-col relative z-10 -mt-6">
                      <div className="flex justify-between items-end mb-2">
                        <h3 className="text-white text-[18px] md:text-[20px] font-serif font-bold drop-shadow-md">
                          Standard Room
                        </h3>
                        <div className="flex items-end gap-1 transition-opacity">
                          <span className="text-[#7FB069] font-black text-xl leading-none">
                            $10
                          </span>
                          <span className="text-[10px] text-white/40 font-medium pb-0.5 uppercase tracking-widest">
                            / night
                          </span>
                        </div>
                      </div>
                      <p className="text-white/50 text-[12px] mb-6 flex-grow leading-relaxed">
                        Cozy, private suites designed for a peaceful and
                        relaxing stay. Perfect for a short getaway.
                      </p>

                      <div className="bg-white/5 rounded-2xl p-4 border border-white/5 group-hover:bg-white/10 transition-colors duration-300">
                        <ul className="space-y-3">
                          <li className="flex items-center gap-3 text-white/80 text-[12px]">
                            <div className="w-5 h-5 rounded-md bg-[#7FB069]/20 flex items-center justify-center text-[#7FB069] shrink-0">
                              <Bed size={10} />
                            </div>{" "}
                            Comfortable bedding
                          </li>
                          <li className="flex items-center gap-3 text-white/80 text-[12px]">
                            <div className="w-5 h-5 rounded-md bg-[#7FB069]/20 flex items-center justify-center text-[#7FB069] shrink-0">
                              <Sparkles size={10} />
                            </div>{" "}
                            Daily cleaning
                          </li>
                          <li className="flex items-center gap-3 text-white/80 text-[12px]">
                            <div className="w-5 h-5 rounded-md bg-[#7FB069]/20 flex items-center justify-center text-[#7FB069] shrink-0">
                              <Moon size={10} />
                            </div>{" "}
                            Quiet sleeping area
                          </li>
                          <li className="flex items-center gap-3 text-white/80 text-[12px]">
                            <div className="w-5 h-5 rounded-md bg-[#7FB069]/20 flex items-center justify-center text-[#7FB069] shrink-0">
                              <Gamepad2 size={10} />
                            </div>{" "}
                            2 playtime sessions
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* VIP Penthouse */}
                  <div
                    onClick={() => navigate("/service/vip-penthouse")}
                    className="bg-[#1E293B] group rounded-[24px] overflow-hidden border border-[#E07A5F]/30 hover:border-[#E07A5F] relative shadow-[0_4px_20px_rgba(224,122,95,0.08)] hover:-translate-y-2 hover:scale-[1.02] hover:shadow-[0_15px_40px_rgba(224,122,95,0.25)] transition-all duration-300 flex flex-col cursor-pointer"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-[#E07A5F]/10 via-transparent to-transparent pointer-events-none z-10"></div>
                    <div className="relative h-48 bg-gray-800 overflow-hidden">
                      <img
                        src="/viproom.jpg"
                        alt="VIP Penthouse"
                        className="w-full h-full object-cover opacity-90 group-hover:scale-110 group-hover:opacity-100 transition-all duration-700 ease-out"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#1E293B] via-[#1E293B]/20 to-transparent opacity-90"></div>
                      <div className="absolute top-4 left-4 bg-white/10 backdrop-blur-md border border-white/20 px-3 py-1.5 rounded-full text-white text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-xl">
                        <Award size={12} className="text-[#E07A5F]" />{" "}
                        <span className="text-white">VIP</span>
                      </div>
                    </div>
                    <div className="p-5 flex-grow flex flex-col relative z-20 -mt-6">
                      <div className="flex justify-between items-end mb-2">
                        <h3 className="text-white text-[18px] md:text-[20px] font-serif font-bold drop-shadow-md">
                          VIP Penthouse
                        </h3>
                        <div className="flex items-end gap-1 transition-opacity">
                          <span className="text-[#E07A5F] font-black text-xl leading-none">
                            $25
                          </span>
                          <span className="text-[10px] text-white/40 font-medium pb-0.5 uppercase tracking-widest">
                            / night
                          </span>
                        </div>
                      </div>
                      <p className="text-white/50 text-[12px] mb-6 flex-grow leading-relaxed">
                        Spacious luxury suites with exclusive amenities, elegant
                        decor, and a premium window view.
                      </p>

                      <div className="bg-[#E07A5F]/5 rounded-2xl p-4 border border-[#E07A5F]/10 group-hover:bg-[#E07A5F]/10 transition-colors duration-300">
                        <ul className="space-y-3">
                          <li className="flex items-center gap-3 text-white/80 text-[12px]">
                            <div className="w-5 h-5 rounded-md bg-[#E07A5F]/20 flex items-center justify-center text-[#E07A5F] shrink-0">
                              <Award size={10} />
                            </div>{" "}
                            Private luxury suite
                          </li>
                          <li className="flex items-center gap-3 text-white/80 text-[12px]">
                            <div className="w-5 h-5 rounded-md bg-[#E07A5F]/20 flex items-center justify-center text-[#E07A5F] shrink-0">
                              <Eye size={10} />
                            </div>{" "}
                            Window view
                          </li>
                          <li className="flex items-center gap-3 text-white/80 text-[12px]">
                            <div className="w-5 h-5 rounded-md bg-[#E07A5F]/20 flex items-center justify-center text-[#E07A5F] shrink-0">
                              <Heart size={10} />
                            </div>{" "}
                            Premium bedding
                          </li>
                          <li className="flex items-center gap-3 text-white/80 text-[12px]">
                            <div className="w-5 h-5 rounded-md bg-[#E07A5F]/20 flex items-center justify-center text-[#E07A5F] shrink-0">
                              <Gamepad2 size={10} />
                            </div>{" "}
                            Extra playtime
                          </li>
                          <li className="flex items-center gap-3 text-white/80 text-[12px]">
                            <div className="w-5 h-5 rounded-md bg-[#E07A5F]/20 flex items-center justify-center text-[#E07A5F] shrink-0">
                              <Upload size={10} />
                            </div>{" "}
                            Daily photo updates
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Meal Plan & Add-ons Section */}
                <div className="mb-12">
                  <h3 className="text-white font-bold text-[16px] mb-4 font-serif">
                    Premium Upgrades
                  </h3>
                  <div className="bg-white/5 border border-white/5 rounded-[20px] p-5 md:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 hover:border-white/10 transition-colors shadow-inner mb-6">
                    <div className="flex gap-4 items-start md:items-center">
                      <div className="w-12 h-12 rounded-xl bg-[#E07A5F]/10 text-[#E07A5F] flex items-center justify-center shrink-0">
                        <Utensils size={20} />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-3 mb-1">
                          <h4 className="text-white font-bold text-[15px]">
                            Premium Meal Plan
                          </h4>
                          <span className="bg-[#E07A5F]/20 text-[#E07A5F] px-2 py-0.5 rounded text-[11px] font-bold">
                            +$4 / day
                          </span>
                        </div>
                        <p className="text-white/50 text-[12px] tracking-wide">
                          Premium kibble or wet food - Customized feeding
                          schedule - Healthy snack treats
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-[12px] font-medium text-white/50 mr-2 flex items-center gap-1.5">
                      <Sparkles size={12} /> Optional Add-on Services:
                    </span>
                    <div className="group cursor-pointer bg-white/5 border border-white/5 hover:border-[#7FB069]/40 hover:bg-[#7FB069]/10 px-3 py-1.5 rounded-full text-white/70 hover:text-white text-[12px] transition-all flex items-center gap-2">
                      Extra Playtime{" "}
                      <span className="font-bold text-[#7FB069] group-hover:text-[#7FB069] opacity-80 group-hover:opacity-100 transition-opacity">
                        - $3
                      </span>
                    </div>
                    <div className="group cursor-pointer bg-white/5 border border-white/5 hover:border-[#7FB069]/40 hover:bg-[#7FB069]/10 px-3 py-1.5 rounded-full text-white/70 hover:text-white text-[12px] transition-all flex items-center gap-2">
                      Medication Care{" "}
                      <span className="font-bold text-[#E07A5F] group-hover:text-[#E07A5F] opacity-80 group-hover:opacity-100 transition-opacity">
                        - $2
                      </span>
                    </div>
                    <div className="group cursor-pointer bg-white/5 border border-white/5 hover:border-[#7FB069]/40 hover:bg-[#7FB069]/10 px-3 py-1.5 rounded-full text-white/70 hover:text-white text-[12px] transition-all flex items-center gap-2">
                      Grooming Before Checkout{" "}
                      <span className="font-bold text-[#7FB069] group-hover:text-[#7FB069] opacity-80 group-hover:opacity-100 transition-opacity">
                        - $15
                      </span>
                    </div>
                  </div>
                </div>

                {/* What Your Pet Enjoys & Safety */}
                <div>
                  <h3 className="text-white font-bold text-[16px] mb-4 font-serif">
                    What Your Pet Enjoys
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    {/* Item 1 */}
                    <div className="bg-white/5 border border-white/5 rounded-[20px] p-5 hover:bg-white/10 transition-colors">
                      <div className="w-10 h-10 rounded-xl bg-[#7FB069]/10 flex items-center justify-center text-[#7FB069] mb-4">
                        <Gamepad2 size={18} />
                      </div>
                      <h4 className="text-white font-bold text-[14px] mb-1">
                        Playtime
                      </h4>
                      <p className="text-white/40 text-[12px] leading-relaxed">
                        Secure outdoor yard and social play.
                      </p>
                    </div>
                    {/* Item 2 */}
                    <div className="bg-white/5 border border-white/5 rounded-[20px] p-5 hover:bg-white/10 transition-colors">
                      <div className="w-10 h-10 rounded-xl bg-[#E07A5F]/10 flex items-center justify-center text-[#E07A5F] mb-4">
                        <Utensils size={18} />
                      </div>
                      <h4 className="text-white font-bold text-[14px] mb-1">
                        Feeding & Hygiene
                      </h4>
                      <p className="text-white/40 text-[12px] leading-relaxed">
                        Scheduled meals and clean water system.
                      </p>
                    </div>
                    {/* Item 3 */}
                    <div className="bg-white/5 border border-white/5 rounded-[20px] p-5 hover:bg-white/10 transition-colors">
                      <div className="w-10 h-10 rounded-xl bg-[#7FB069]/10 flex items-center justify-center text-[#7FB069] mb-4">
                        <Sparkles size={18} />
                      </div>
                      <h4 className="text-white font-bold text-[14px] mb-1">
                        Clean Environment
                      </h4>
                      <p className="text-white/40 text-[12px] leading-relaxed">
                        Medical-grade sanitation of living spaces.
                      </p>
                    </div>
                  </div>

                  <h3 className="text-white font-bold text-[16px] mb-4 font-serif">
                    Safety & Monitoring
                  </h3>
                  <div className="bg-gradient-to-r from-white/5 to-transparent border border-white/5 rounded-[20px] p-6 md:p-8 flex flex-col md:flex-row gap-8 justify-between items-start md:items-center shadow-inner hover:border-white/10 transition-colors">
                    <div
                      className="flex items-center gap-4 group cursor-pointer"
                      onClick={() => setIsCameraModalOpen(true)}
                    >
                      <div className="w-12 h-12 rounded-xl bg-[#1F2A37] shadow-lg border border-white/10 flex items-center justify-center text-white/50 group-hover:text-white group-hover:bg-[#E07A5F]/20 group-hover:border-[#E07A5F]/50 transition-all">
                        <Video size={18} />
                      </div>
                      <div>
                        <span className="text-white/80 text-[14px] font-medium tracking-wide block">
                          24/7 Camera Monitoring
                        </span>
                        <span className="text-[#E07A5F] text-[11px] font-medium">
                          Click to learn more -&gt;
                        </span>
                      </div>
                    </div>

                    <div className="hidden md:block w-px h-10 bg-white/10"></div>

                    <div className="flex items-center gap-4 group">
                      <div className="w-12 h-12 rounded-xl bg-[#1F2A37] shadow-lg border border-white/10 flex items-center justify-center text-white/50 group-hover:text-white group-hover:bg-[#E07A5F]/20 group-hover:border-[#E07A5F]/50 transition-all">
                        <Upload size={18} />
                      </div>
                      <span className="text-white/80 text-[14px] font-medium tracking-wide">
                        Daily Photo Updates
                      </span>
                    </div>

                    <div className="hidden md:block w-px h-10 bg-white/10"></div>

                    <div className="flex items-center gap-4 group">
                      <div className="w-12 h-12 rounded-xl bg-[#1F2A37] shadow-lg border border-white/10 flex items-center justify-center text-white/50 group-hover:text-white group-hover:bg-[#E07A5F]/20 group-hover:border-[#E07A5F]/50 transition-all">
                        <Shield size={18} />
                      </div>
                      <span className="text-white/80 text-[14px] font-medium tracking-wide">
                        Vaccination Requirement
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* END SERVICE SECTIONS */}
          </div>
        )}
      </main>

      {/* PREVIEW MODAL */}
      {previewService && (
        <ServicePreviewModal
          service={previewService}
          onClose={() => setPreviewService(null)}
        />
      )}

      {/* FOOTER */}
      <Footer />

      {/* Camera Feature Modal */}
      <CameraFeatureModal
        isOpen={isCameraModalOpen}
        onClose={() => setIsCameraModalOpen(false)}
      />
    </div>
  );
};

export default ServicePage;
