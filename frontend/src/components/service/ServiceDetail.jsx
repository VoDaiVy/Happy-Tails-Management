import { useState, useEffect } from "react";
import { useParams, Navigate, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Star,
  Clock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Tag,
  ShoppingCart,
} from "lucide-react";
import Navbar from "../layout/Navbar";
import Footer from "../layout/Footer";
import AuthModal from "../AuthModal";
import ServiceBookingPanel from "./ServiceBookingPanel";
import BoardingBookingPanel from "./BoardingBookingPanel";
import { slugifyServiceName } from "../../data/servicesData";
import { getAllServices } from "../../api/serviceApi";

const slideVariants = {
  enter: (dir) => ({ x: dir > 0 ? "60%" : "-60%", opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir) => ({ x: dir > 0 ? "-60%" : "60%", opacity: 0 }),
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" } },
};
const slideIn = (i) => ({
  hidden: { opacity: 0, x: -10 },
  show: {
    opacity: 1,
    x: 0,
    transition: { delay: i * 0.055, duration: 0.38, ease: "easeOut" },
  },
});

const mapApiServiceToDetail = (apiService) => {
  const features = Array.isArray(apiService?.features)
    ? apiService.features.filter(Boolean)
    : [];
  const gallery =
    Array.isArray(apiService?.images) && apiService.images.length > 0
      ? apiService.images
      : ["/placeholder-service.jpg"];

  const isBoarding = (apiService?.category?.name || "")
    .toLowerCase()
    .includes("board");

  const priceValue =
    typeof apiService?.price === "number" ? apiService.price : null;

  const tags = [
    apiService?.category?.name,
    typeof apiService?.duration === "number"
      ? `${apiService.duration} minutes`
      : null,
    apiService?.petTypes?.length
      ? `For ${apiService.petTypes.join(", ")}`
      : null,
  ].filter(Boolean);

  const highlights =
    features.length > 0
      ? features
      : [
          "Professional care by trained staff",
          "Pet-safe workflow and tools",
          "Service quality follow-up support",
        ];

  return {
    id: apiService?._id,
    slug: slugifyServiceName(apiService?.name || ""),
    title: apiService?.name || "Service",
    shortDesc: apiService?.description || "",
    fullDesc: apiService?.description || "",
    price: priceValue !== null ? `$${priceValue}` : "",
    priceValue,
    priceUnit: isBoarding ? "/ night" : undefined,
    serviceType: isBoarding ? "boarding" : "spa",
    intervalMinutes: isBoarding ? 30 : 15,
    duration:
      typeof apiService?.duration === "number"
        ? `${apiService.duration} minutes`
        : "",
    rating:
      typeof apiService?.rating === "number"
        ? apiService.rating.toFixed(1)
        : "0.0",
    reviewCount: apiService?.totalReviews ?? 0,
    image: gallery[0],
    gallery,
    tags,
    highlights,
    whatIncluded: highlights,
    apiServiceId: apiService?._id || null,
  };
};

export default function ServiceDetail() {
  const { serviceSlug } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState("login");
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem("user");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
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
    setUser(userData);
    setIsAuthModalOpen(false);

    if (userData?.role === "admin") {
      navigate("/admin");
      return;
    }
    if (userData?.role === "staff") {
      navigate("/staff");
    }
  };

  const [service, setService] = useState(() => {
    const initialApi = location.state?.apiService;
    if (!initialApi) return null;
    return mapApiServiceToDetail(initialApi);
  });
  const [loading, setLoading] = useState(!location.state?.apiService);
  const [flyToCartItems, setFlyToCartItems] = useState([]);

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

  useEffect(() => {
    let alive = true;

    const loadServiceBySlug = async () => {
      const fromRoute = location.state?.apiService;
      if (
        fromRoute &&
        slugifyServiceName(fromRoute.name || "") === serviceSlug
      ) {
        if (alive) {
          setService(mapApiServiceToDetail(fromRoute));
          setLoading(false);
        }
        return;
      }

      setLoading(true);

      try {
        const searchResult = await getAllServices({
          isActive: "true",
          search: serviceSlug.replace(/-/g, " "),
          limit: 20,
          sortBy: "name",
          sortOrder: "asc",
        });

        let list = Array.isArray(searchResult?.data) ? searchResult.data : [];
        let matched = list.find(
          (item) => slugifyServiceName(item?.name || "") === serviceSlug,
        );

        if (!matched) {
          const fallbackResult = await getAllServices({
            isActive: "true",
            limit: 200,
            sortBy: "name",
            sortOrder: "asc",
          });
          list = Array.isArray(fallbackResult?.data) ? fallbackResult.data : [];
          matched = list.find(
            (item) => slugifyServiceName(item?.name || "") === serviceSlug,
          );
        }

        if (alive) {
          setService(matched ? mapApiServiceToDetail(matched) : null);
        }
      } catch {
        if (alive) setService(null);
      } finally {
        if (alive) setLoading(false);
      }
    };

    loadServiceBySlug();

    return () => {
      alive = false;
    };
  }, [serviceSlug, location.state?.apiService]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [serviceSlug]);

  const [viewMode, setViewMode] = useState("collage"); // 'collage' | 'single'
  const [singleIdx, setSingleIdx] = useState(0);
  const [dir, setDir] = useState(1);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F1EB]">
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
        <main className="mx-auto max-w-6xl px-4 pt-24 pb-20">
          <div className="h-56 rounded-2xl bg-white border border-gray-200 shadow-sm flex items-center justify-center">
            <div className="text-sm text-gray-500">Loading service...</div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!service) return <Navigate to="/service" replace />;

  const gallery = service.gallery ?? [service.image];
  const boardingRoomType = /vip|penthouse/i.test(service.title || "")
    ? "vip"
    : "standard";
  const isBoardingService = service.serviceType === "boarding";
  const detailGridClass = isBoardingService
    ? "grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-8 items-start"
    : "grid grid-cols-1 lg:grid-cols-3 gap-8 items-start";
  const leftColumnClass = isBoardingService
    ? "space-y-5"
    : "lg:col-span-2 space-y-5";
  const rightColumnClass = isBoardingService ? "" : "lg:col-span-1";

  const goSingle = (idx, d = 1) => {
    setDir(d);
    setSingleIdx(idx);
    setViewMode("single");
  };

  const handleBackToServices = () => {
    // Prefer history back for natural flow; fallback to service listing.
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate("/service");
  };

  const goNext = () => {
    if (viewMode === "collage") {
      goSingle(0, 1);
      return;
    }
    if (singleIdx < gallery.length - 1) {
      setDir(1);
      setSingleIdx(singleIdx + 1);
    }
  };
  const goPrev = () => {
    if (viewMode === "single" && singleIdx === 0) {
      setViewMode("collage");
      return;
    }
    if (viewMode === "single") {
      setDir(-1);
      setSingleIdx(singleIdx - 1);
    }
  };
  const canPrev = viewMode === "single";
  const canNext = viewMode === "collage" || singleIdx < gallery.length - 1;

  return (
    <div className="min-h-screen bg-[#F5F1EB]">
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
          <motion.div
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
          </motion.div>
        ))}
      </AnimatePresence>

      <main className="mx-auto max-w-6xl px-4 pt-28 pb-20">
        <div className="mb-5">
          <button
            type="button"
            onClick={handleBackToServices}
            className="group inline-flex items-center gap-2 rounded-2xl border border-[#E8D7CB] bg-linear-to-r from-white to-[#FFF5EE] px-4 py-2.5 text-sm font-semibold text-[#2D3436] shadow-[0_10px_30px_rgba(45,52,54,0.08)] transition-all hover:-translate-y-0.5 hover:border-[#E07A5F]/35 hover:shadow-[0_14px_36px_rgba(224,122,95,0.18)]"
          >
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-xl bg-[#E07A5F] text-white shadow-sm transition-transform group-hover:-translate-x-0.5">
              <ChevronLeft size={15} />
            </span>
            Back to Services
          </button>
        </div>

        <div className={detailGridClass}>
          {/* ══ LEFT COLUMN ══ */}
          <div className={leftColumnClass}>
            {/* ── Gallery ── */}
            <div className="relative rounded-2xl overflow-hidden h-[360px] bg-gray-200 select-none">
              <AnimatePresence initial={false} custom={dir} mode="wait">
                {viewMode === "collage" ? (
                  <motion.div
                    key="collage"
                    className="absolute inset-0 grid grid-cols-2 gap-[3px]"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.28 }}
                  >
                    <img
                      src={gallery[0]}
                      alt={service.title}
                      className="h-full w-full object-cover"
                    />
                    {gallery.length > 1 && (
                      <div className="flex flex-col gap-[3px]">
                        {gallery.slice(1, 3).map((src, i) => (
                          <img
                            key={i}
                            src={src}
                            alt={`${service.title} ${i + 2}`}
                            onClick={() => goSingle(i + 1, 1)}
                            className="flex-1 w-full object-cover cursor-pointer hover:brightness-95 transition"
                          />
                        ))}
                      </div>
                    )}
                  </motion.div>
                ) : (
                  <motion.img
                    key={`single-${singleIdx}`}
                    custom={dir}
                    variants={slideVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.32, ease: "easeInOut" }}
                    src={gallery[singleIdx]}
                    alt={`${service.title} ${singleIdx + 1}`}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                )}
              </AnimatePresence>

              {/* Nav arrows */}
              {canPrev && (
                <button
                  onClick={goPrev}
                  className="absolute left-3 top-1/2 -translate-y-1/2 z-10 rounded-full bg-black/35 backdrop-blur-sm text-white p-2 hover:bg-black/55 transition"
                >
                  <ChevronLeft size={18} />
                </button>
              )}
              {canNext && (
                <button
                  onClick={goNext}
                  className="absolute right-3 top-1/2 -translate-y-1/2 z-10 rounded-full bg-black/35 backdrop-blur-sm text-white p-2 hover:bg-black/55 transition"
                >
                  <ChevronRight size={18} />
                </button>
              )}

              {/* Dot indicators (single mode) */}
              {viewMode === "single" && gallery.length > 1 && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-10">
                  {gallery.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setDir(i > singleIdx ? 1 : -1);
                        setSingleIdx(i);
                      }}
                      className={`rounded-full transition-all duration-300 ${i === singleIdx ? "w-5 h-[7px] bg-white" : "w-[7px] h-[7px] bg-white/45 hover:bg-white/75"}`}
                    />
                  ))}
                </div>
              )}

              {/* Image counter badge (single mode) */}
              {viewMode === "single" && (
                <span className="absolute top-3 right-3 z-10 rounded-full bg-black/40 px-2.5 py-0.5 text-xs text-white backdrop-blur-sm">
                  {singleIdx + 1} / {gallery.length}
                </span>
              )}
            </div>

            {/* Thumbnail strip */}
            {gallery.length > 1 && (
              <div className="flex gap-2 overflow-x-auto scrollbar-hide pl-0.5 py-0.5">
                {/* Collage thumbnail */}
                <button
                  onClick={() => setViewMode("collage")}
                  className={`flex-shrink-0 h-16 w-24 rounded-lg overflow-hidden ring-2 transition-all ${viewMode === "collage" ? "ring-[#E07A5F] opacity-100" : "ring-transparent opacity-55 hover:opacity-100 hover:ring-gray-300"}`}
                >
                  <div className="grid grid-cols-2 gap-px h-full pointer-events-none">
                    <img
                      src={gallery[0]}
                      className="h-full w-full object-cover"
                    />
                    <div className="flex flex-col gap-px">
                      {gallery.slice(1, 3).map((s, i) => (
                        <img
                          key={i}
                          src={s}
                          className="flex-1 w-full object-cover"
                        />
                      ))}
                    </div>
                  </div>
                </button>
                {/* Individual thumbs */}
                {gallery.map((src, i) => (
                  <img
                    key={i}
                    src={src}
                    onClick={() => goSingle(i, i >= singleIdx ? 1 : -1)}
                    className={`h-16 w-24 flex-shrink-0 rounded-lg object-cover cursor-pointer ring-2 transition-all
                      ${viewMode === "single" && singleIdx === i ? "ring-[#E07A5F] opacity-100" : "ring-transparent opacity-55 hover:opacity-100 hover:ring-gray-300"}`}
                  />
                ))}
              </div>
            )}

            {/* Title + meta */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
            >
              <h1 className="text-[26px] font-extrabold text-[#1F2A37] leading-tight">
                {service.title}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-gray-500">
                <span className="flex items-center gap-1 text-amber-500 font-semibold">
                  <Star size={13} fill="currentColor" /> {service.rating}
                  <span className="text-gray-400 font-normal ml-0.5">
                    ({service.reviewCount} reviews)
                  </span>
                </span>
                <span className="text-gray-300">·</span>
                <span className="flex items-center gap-1">
                  <Clock size={13} /> {service.duration}
                </span>
                <span className="text-gray-300">·</span>
                <span className="text-[#E07A5F] font-extrabold text-[17px]">
                  {service.price}
                  {service.priceUnit && (
                    <span className="text-xs font-normal text-gray-400 ml-0.5">
                      {service.priceUnit}
                    </span>
                  )}
                </span>
              </div>
            </motion.div>

            {/* Tags */}
            {service.tags?.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="flex flex-wrap gap-2"
              >
                {service.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 rounded-full bg-white/70 border border-gray-200 px-3 py-1 text-xs text-gray-500"
                  >
                    <Tag size={9} className="text-[#E07A5F]" /> {tag}
                  </span>
                ))}
              </motion.div>
            )}

            {/* ── Detail — plain text, scroll-triggered stagger ── */}
            <motion.div
              variants={stagger}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-30px" }}
              className="space-y-7 pt-1 pb-4"
            >
              {/* ABOUT */}
              <motion.div variants={fadeUp}>
                <div className="flex items-center gap-2.5 mb-2">
                  <span className="block h-[18px] w-[3px] rounded-full bg-[#E07A5F]" />
                  <span className="text-[11px] font-extrabold uppercase tracking-[0.15em] text-[#E07A5F]">
                    About this service
                  </span>
                </div>
                <p className="text-[15px] leading-[1.75] text-gray-600 pl-[18px]">
                  {service.fullDesc}
                </p>
              </motion.div>

              {(service.whatIncluded?.length > 0 ||
                service.highlights?.length > 0) && (
                <>
                  <motion.div variants={fadeUp}>
                    <div className="border-t border-gray-300/70 border-dashed" />
                  </motion.div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                    {/* What's Included */}
                    {service.whatIncluded?.length > 0 && (
                      <motion.div variants={fadeUp}>
                        <div className="flex items-center gap-2.5 mb-3">
                          <span className="block h-[18px] w-[3px] rounded-full bg-[#7FB069]" />
                          <span className="text-[11px] font-extrabold uppercase tracking-[0.15em] text-[#7FB069]">
                            What's included
                          </span>
                        </div>
                        <ul className="space-y-2 pl-[18px]">
                          {service.whatIncluded.map((it, i) => (
                            <motion.li
                              key={it}
                              variants={slideIn(i)}
                              className="flex items-center gap-2 text-[14px] text-gray-600"
                            >
                              <CheckCircle2
                                size={13}
                                className="text-[#7FB069] flex-shrink-0"
                              />
                              {it}
                            </motion.li>
                          ))}
                        </ul>
                      </motion.div>
                    )}

                    {/* Highlights */}
                    {service.highlights?.length > 0 && (
                      <motion.div variants={fadeUp}>
                        <div className="flex items-center gap-2.5 mb-3">
                          <span className="block h-[18px] w-[3px] rounded-full bg-[#E07A5F]" />
                          <span className="text-[11px] font-extrabold uppercase tracking-[0.15em] text-[#E07A5F]">
                            Highlights
                          </span>
                        </div>
                        <ul className="space-y-2 pl-[18px]">
                          {service.highlights.map((h, i) => (
                            <motion.li
                              key={h}
                              variants={slideIn(i)}
                              className="flex items-start gap-2 text-[14px] text-gray-600"
                            >
                              <CheckCircle2
                                size={13}
                                className="mt-0.5 text-[#E07A5F]/60 flex-shrink-0"
                              />
                              {h}
                            </motion.li>
                          ))}
                        </ul>
                      </motion.div>
                    )}
                  </div>
                </>
              )}
            </motion.div>
          </div>

          {/* ══ RIGHT COLUMN ══ */}
          <div className={rightColumnClass}>
            {isBoardingService ? (
              <BoardingBookingPanel
                roomType={boardingRoomType}
                roomTitle={service.title}
                pricePerNight={service.priceValue || 0}
              />
            ) : (
              <ServiceBookingPanel
                service={service}
                onAddToCartSuccess={triggerFlyToCart}
              />
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
