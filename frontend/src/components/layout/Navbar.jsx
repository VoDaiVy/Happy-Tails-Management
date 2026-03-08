import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  PawPrint,
  Menu,
  X,
  LogOut,
  CalendarDays,
  UserCircle,
  ChevronDown,
  Sparkles,
  Heart,
  ShoppingCart,
  Wallet,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { logoutApi } from "../../api/authApi";
import useCartStore from "../../store/cartStore";

/* ─── SCROLL THRESHOLD (px) before navbar shrinks ─── */
const SCROLL_THRESHOLD = 60;

const NAV_LINKS = [
  { label: "Services", href: "/service" },
  { label: "About Us", href: "/#about" },
  { label: "News", href: "/news" },
];

const Navbar = ({ onLoginClick, onRegisterClick, user, onLogout }) => {
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [activeLink, setActiveLink] = useState("");
  const dropdownRef = useRef(null);

  const { toggleDrawer, fetchCart, getItemCount, resetCart } = useCartStore();
  const itemCount = useCartStore((s) => s.cart?.totalItems ?? 0);
  const [badgePop, setBadgePop] = useState(false);

  // Fetch cart whenever user logs in
  useEffect(() => {
    if (user) {
      fetchCart();
    } else {
      resetCart();
    }
  }, [user, fetchCart, resetCart]);

  // Badge pop animation on count change
  useEffect(() => {
    if (itemCount === 0) return;
    setBadgePop(true);
    const t = setTimeout(() => setBadgePop(false), 350);
    return () => clearTimeout(t);
  }, [itemCount]);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > SCROLL_THRESHOLD);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        console.log("[Navbar] Click outside dropdown, closing...");
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      // Delay adding listener to prevent immediate trigger
      const timer = setTimeout(() => {
        document.addEventListener("mousedown", handleClickOutside);
      }, 100);

      return () => {
        clearTimeout(timer);
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isDropdownOpen]);

  const handleLogout = async () => {
    setIsDropdownOpen(false);
    setIsMobileMenuOpen(false);
    try {
      await logoutApi();
    } catch {}
    localStorage.removeItem("accessToken");
    localStorage.removeItem("user");
    resetCart();
    onLogout?.();
    // Reload page to reset all states
    window.location.href = "/";
  };

  const getInitials = (name) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <>
      <style>{`
        @keyframes navDown {
          from { opacity: 0; transform: translateY(-20px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0)    scale(1); }
        }
        @keyframes dropIn {
          from { opacity: 0; transform: translateY(-8px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)    scale(1); }
        }
        .nav-pill {
          position: relative;
          overflow: hidden;
          transition:
            max-width        0.6s cubic-bezier(0.4, 0, 0.2, 1),
            background-color 0.5s cubic-bezier(0.4, 0, 0.2, 1),
            border-color     0.5s cubic-bezier(0.4, 0, 0.2, 1),
            box-shadow       0.5s cubic-bezier(0.4, 0, 0.2, 1),
            padding          0.5s cubic-bezier(0.4, 0, 0.2, 1);
        }
        /* Inner top-edge shimmer line */
        .nav-pill::before {
          content: '';
          position: absolute;
          top: 0; left: 8%; right: 8%; height: 1px;
          background: linear-gradient(90deg,
            transparent 0%,
            rgba(255,255,255,0.0) 10%,
            rgba(255,255,255,0.5) 50%,
            rgba(255,255,255,0.0) 90%,
            transparent 100%);
          transition: opacity 0.5s ease;
          pointer-events: none;
        }
        /* Ambient glow blob sitting behind the pill */
        .nav-glow {
          position: absolute;
          top: -30px; left: 50%;
          transform: translateX(-50%);
          border-radius: 50%;
          filter: blur(38px);
          pointer-events: none;
          z-index: 0;
          transition: width 0.6s ease, height 0.6s ease,
                      background 0.6s ease, opacity 0.6s ease;
        }
        .nav-header {
          transition: padding 0.5s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .nav-item {
          position: relative;
          transition: color 0.22s ease, background-color 0.22s ease;
        }
        .nav-item::after {
          content: '';
          position: absolute;
          bottom: 4px; left: 50%;
          width: 16px; height: 2px;
          border-radius: 9999px;
          transform: translateX(-50%) scaleX(0);
          transition: transform 0.27s cubic-bezier(0.4,0,0.2,1),
                      background-color 0.4s ease;
        }
        .nav-item:hover::after, .nav-item.active::after { transform: translateX(-50%) scaleX(1); }
        .nav-is-light .nav-item::after { background: #FF8C42; }
        .nav-is-dark  .nav-item::after { background: rgba(255,255,255,0.55); }
        .nav-item.active::after { background: #FF8C42 !important; }
      `}</style>

      {/* ═══════════════ NAVBAR ═══════════════ */}
      <header
        className="nav-header fixed top-0 left-0 w-full z-50 px-4 md:px-6"
        style={{
          paddingTop: isScrolled ? "10px" : "20px",
          paddingBottom: isScrolled ? "10px" : "20px",
          animation: "navDown 0.5s cubic-bezier(0.22,1,0.36,1) both",
          overflow: "visible",
        }}
      >
        {/* ── Ambient glow that floats behind the pill ── */}
        <div
          className="nav-glow"
          style={{
            width: isScrolled ? "60%" : "70%",
            height: isScrolled ? "70px" : "60px",
            opacity: isScrolled ? 0.9 : 0.7,
            background: isScrolled
              ? "radial-gradient(ellipse, rgba(255,140,66,0.22) 0%, rgba(99,102,241,0.10) 50%, transparent 75%)"
              : "radial-gradient(ellipse, rgba(255,180,100,0.20) 0%, rgba(251,146,60,0.08) 50%, transparent 75%)",
          }}
        />

        <div
          className={`nav-pill relative z-[1] mx-auto flex items-center justify-between rounded-2xl
            ${
              isScrolled
                ? "max-w-5xl bg-[#0f172a]/95 border border-white/[0.09] backdrop-blur-xl px-5 md:px-7 py-2.5 nav-is-dark"
                : "max-w-6xl bg-white/97 border border-orange-100/60 backdrop-blur-sm px-5 md:px-7 py-3.5 nav-is-light"
            }`}
          style={{
            boxShadow: isScrolled
              ? "0 8px 40px rgba(0,0,0,0.55), 0 0 0 0.5px rgba(255,140,66,0.08), 0 -1px 0 0 rgba(255,255,255,0.04) inset"
              : "0 2px 24px rgba(0,0,0,0.07), 0 0 40px rgba(255,140,66,0.08), 0 0 0 1px rgba(255,140,66,0.06)",
            overflow: "visible",
          }}
        >
          {/* ── Logo ── */}
          <Link
            to="/"
            className="flex items-center gap-2.5 group select-none flex-shrink-0"
          >
            <div className="relative flex-shrink-0">
              <div
                className={`flex items-center justify-center rounded-xl
                  bg-gradient-to-br from-[#FF8C42] to-[#e0641a]
                  group-hover:scale-[1.08] transition-all duration-500
                  ${
                    isScrolled
                      ? "w-8 h-8 shadow-[0_0_14px_rgba(255,140,66,0.5)]"
                      : "w-10 h-10 shadow-[0_4px_16px_rgba(255,140,66,0.3)]"
                  }`}
              >
                <PawPrint
                  className="text-white transition-all duration-500"
                  size={isScrolled ? 15 : 18}
                />
              </div>
              <span
                className={`absolute -top-0.5 -right-0.5 rounded-full bg-emerald-400 animate-pulse
                  ${isScrolled ? "w-2 h-2 border-[1.5px] border-[#0f172a]" : "w-2.5 h-2.5 border-2 border-white"}`}
              />
            </div>

            <div className="flex flex-col leading-none overflow-hidden">
              {/* "Pet Spa" subtitle — hides on scroll */}
              <span
                className={`font-semibold tracking-[0.2em] uppercase overflow-hidden
                  transition-[font-size,max-height,opacity,margin] duration-500 ease-in-out
                  ${isScrolled ? "text-[0px] max-h-0 opacity-0 mb-0" : "text-[9px] max-h-4 opacity-100 mb-0.5 text-slate-400"}`}
              >
                Pet Spa
              </span>
              <span
                className={`font-black tracking-tight transition-all duration-500
                  ${isScrolled ? "text-[14px] text-white" : "text-[17px] text-slate-900"}`}
              >
                Happy<span className="text-[#FF8C42]">Tails</span>
              </span>
            </div>
          </Link>

          {/* ── Desktop Nav Links ── */}
          <nav
            className={`hidden md:flex items-center gap-0.5 ${isScrolled ? "nav-is-dark" : "nav-is-light"}`}
          >
            {NAV_LINKS.map((link) =>
              link.href.startsWith("/") ? (
                <Link
                  key={link.href}
                  to={link.href}
                  onClick={() => setActiveLink(link.href)}
                  className={`nav-item px-3.5 py-2 rounded-xl text-sm font-semibold
                    ${activeLink === link.href ? "active" : ""}
                    ${
                      isScrolled
                        ? `text-slate-400 hover:text-white ${activeLink === link.href ? "!text-white bg-white/[0.09]" : "hover:bg-white/[0.07]"}`
                        : `text-slate-600 hover:text-slate-900 ${activeLink === link.href ? "!text-slate-900 bg-slate-100" : "hover:bg-slate-100/80"}`
                    }`}
                >
                  {link.label}
                </Link>
              ) : (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setActiveLink(link.href)}
                  className={`nav-item px-3.5 py-2 rounded-xl text-sm font-semibold
                    ${activeLink === link.href ? "active" : ""}
                    ${
                      isScrolled
                        ? `text-slate-400 hover:text-white ${activeLink === link.href ? "!text-white bg-white/[0.09]" : "hover:bg-white/[0.07]"}`
                        : `text-slate-600 hover:text-slate-900 ${activeLink === link.href ? "!text-slate-900 bg-slate-100" : "hover:bg-slate-100/80"}`
                    }`}
                >
                  {link.label}
                </a>
              ),
            )}
          </nav>

          {/* ── Desktop Right ── */}
          <div className="hidden md:flex items-center gap-2 flex-shrink-0">
            {/* Cart Icon */}
            <button
              onClick={toggleDrawer}
              className={`relative w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-300
                ${
                  isScrolled
                    ? "text-slate-300 hover:text-white hover:bg-white/10"
                    : "text-slate-600 hover:text-[#E07A5F] hover:bg-orange-50"
                }`}
              aria-label="Open cart"
            >
              <ShoppingCart size={18} />
              <AnimatePresence>
                {itemCount > 0 && (
                  <motion.span
                    key={itemCount}
                    initial={{ scale: 0.4, opacity: 0 }}
                    animate={{ scale: badgePop ? [1, 1.35, 1] : 1, opacity: 1 }}
                    exit={{ scale: 0.4, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center bg-[#E07A5F] text-white text-[9px] font-black rounded-full px-1 shadow-md"
                  >
                    {itemCount > 99 ? "99+" : itemCount}
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
            {user ? (
              <div
                className="relative"
                style={{ zIndex: 9999 }}
                ref={dropdownRef}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    console.log(
                      "[Navbar] Avatar clicked, toggling dropdown from",
                      isDropdownOpen,
                      "to",
                      !isDropdownOpen,
                    );
                    setIsDropdownOpen(!isDropdownOpen);
                  }}
                  className={`flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-xl border transition-all duration-300
                    ${
                      isScrolled
                        ? "border-white/20 hover:border-white/40 bg-white/10 hover:bg-white/15"
                        : "border-slate-200 hover:border-orange-300 hover:bg-orange-50/50 bg-white shadow-sm"
                    }`}
                >
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#FF8C42] to-[#e86b1f] flex items-center justify-center text-white font-bold text-xs shadow">
                    {getInitials(user.name)}
                  </div>
                  <span
                    className={`text-sm font-semibold max-w-[100px] truncate transition-colors duration-300 ${isScrolled ? "text-white" : "text-slate-800"}`}
                  >
                    {user.name}
                  </span>
                  <ChevronDown
                    size={14}
                    className={`transition-all duration-300 ${isScrolled ? "text-white/50" : "text-slate-400"} ${isDropdownOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {isDropdownOpen && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="absolute right-0 top-full mt-3 w-60 bg-white rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.14)] border border-slate-100 overflow-hidden"
                    style={{
                      animation: "dropIn 0.2s cubic-bezier(.4,0,.2,1) both",
                      zIndex: 10000,
                    }}
                  >
                    <div className="px-4 py-3 bg-gradient-to-r from-orange-50 to-amber-50/50 border-b border-orange-100/60">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#FF8C42] to-[#e86b1f] flex items-center justify-center text-white font-bold text-sm shadow">
                          {getInitials(user.name)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-800 truncate">
                            {user.name}
                          </p>
                          <p className="text-xs text-slate-500 truncate">
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="py-1.5 px-2">
                      <button
                        onClick={() => {
                          setIsDropdownOpen(false);
                          navigate("/profile");
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-700 hover:bg-orange-50 hover:text-[#FF8C42] transition-all group"
                      >
                        <UserCircle
                          size={16}
                          className="text-slate-400 group-hover:text-[#FF8C42] transition-colors"
                        />
                        Profile
                      </button>
                      <button
                        onClick={() => {
                          setIsDropdownOpen(false);
                          navigate("/pets");
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-700 hover:bg-orange-50 hover:text-[#FF8C42] transition-all group"
                      >
                        <Heart
                          size={16}
                          className="text-slate-400 group-hover:text-[#FF8C42] transition-colors"
                        />
                        My Pets
                      </button>
                      <button
                        onClick={() => {
                          setIsDropdownOpen(false);
                          navigate("/cart");
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-700 hover:bg-orange-50 hover:text-[#FF8C42] transition-all group"
                      >
                        <ShoppingCart
                          size={16}
                          className="text-slate-400 group-hover:text-[#FF8C42] transition-colors"
                        />
                        Shopping Cart
                      </button>
                      <button
                        onClick={() => {
                          setIsDropdownOpen(false);
                          navigate("/bookings");
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-700 hover:bg-orange-50 hover:text-[#FF8C42] transition-all group"
                      >
                        <CalendarDays
                          size={16}
                          className="text-slate-400 group-hover:text-[#FF8C42] transition-colors"
                        />
                        Bookings
                      </button>
                      <button
                        onClick={() => {
                          setIsDropdownOpen(false);
                          navigate("/wallet");
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-700 hover:bg-orange-50 hover:text-[#FF8C42] transition-all group"
                      >
                        <Wallet
                          size={16}
                          className="text-slate-400 group-hover:text-[#FF8C42] transition-colors"
                        />
                        Wallet
                      </button>
                    </div>
                    <div className="px-2 pt-0.5 pb-1.5 border-t border-slate-100 mx-2">
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-red-500 hover:bg-red-50 hover:text-red-600 transition-all mt-1 group"
                      >
                        <LogOut
                          size={16}
                          className="group-hover:translate-x-0.5 transition-transform"
                        />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                <button
                  onClick={onLoginClick}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300
                    ${
                      isScrolled
                        ? "text-slate-300 hover:text-white hover:bg-white/10"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                    }`}
                >
                  Sign In
                </button>
                <button
                  onClick={onRegisterClick}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold bg-gradient-to-r from-[#FF8C42] to-[#e86b1f] text-white shadow-[0_4px_14px_rgba(255,140,66,0.4)] hover:shadow-[0_6px_22px_rgba(255,140,66,0.6)] hover:scale-[1.04] active:scale-[0.97] transition-all duration-200"
                >
                  <Sparkles size={13} />
                  Get Started
                </button>
              </>
            )}
          </div>

          {/* ── Mobile Cart + Toggle ── */}
          <div className="md:hidden flex items-center gap-1">
            {/* Mobile Cart Icon */}
            <button
              onClick={toggleDrawer}
              className={`relative p-2 rounded-xl transition-colors duration-300
                ${isScrolled ? "text-white hover:bg-white/10" : "text-slate-700 hover:bg-slate-100"}`}
              aria-label="Open cart"
            >
              <ShoppingCart size={20} />
              <AnimatePresence>
                {itemCount > 0 && (
                  <motion.span
                    key={itemCount}
                    initial={{ scale: 0.4, opacity: 0 }}
                    animate={{ scale: badgePop ? [1, 1.4, 1] : 1, opacity: 1 }}
                    exit={{ scale: 0.4, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] flex items-center justify-center bg-[#E07A5F] text-white text-[8px] font-black rounded-full px-0.5 shadow"
                  >
                    {itemCount > 99 ? "99+" : itemCount}
                  </motion.span>
                )}
              </AnimatePresence>
            </button>

            <button
              className={`p-2 rounded-xl transition-colors duration-300
              ${isScrolled ? "text-white hover:bg-white/10" : "text-slate-700 hover:bg-slate-100"}`}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </header>

      {/* ═══════════════ MOBILE DRAWER ═══════════════ */}
      <div
        className={`fixed inset-0 z-40 md:hidden transition-all duration-300 ${isMobileMenuOpen ? "visible" : "invisible"}`}
      >
        <div
          className={`absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${isMobileMenuOpen ? "opacity-100" : "opacity-0"}`}
          onClick={() => setIsMobileMenuOpen(false)}
        />
        <div
          className={`absolute top-0 right-0 h-full w-72 bg-white shadow-2xl transition-transform duration-300 ease-out ${isMobileMenuOpen ? "translate-x-0" : "translate-x-full"}`}
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#FF8C42] to-[#e86b1f] flex items-center justify-center shadow">
                <PawPrint className="text-white" size={16} />
              </div>
              <span className="font-black text-slate-900 text-[17px]">
                Happy<span className="text-[#FF8C42]">Tails</span>
              </span>
            </div>
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"
            >
              <X size={20} />
            </button>
          </div>

          <div className="px-4 py-4 flex flex-col gap-1">
            {NAV_LINKS.map((link) =>
              link.href.startsWith("/") ? (
                <Link
                  key={link.href}
                  to={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center px-4 py-3 rounded-xl text-sm font-semibold text-slate-700 hover:bg-orange-50 hover:text-[#FF8C42] transition-all"
                >
                  {link.label}
                </Link>
              ) : (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center px-4 py-3 rounded-xl text-sm font-semibold text-slate-700 hover:bg-orange-50 hover:text-[#FF8C42] transition-all"
                >
                  {link.label}
                </a>
              ),
            )}
          </div>

          <div className="px-4 border-t border-slate-100 pt-4">
            {user ? (
              <>
                <div className="flex items-center gap-3 px-4 py-3 bg-orange-50/80 rounded-xl mb-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF8C42] to-[#e86b1f] flex items-center justify-center text-white font-bold">
                    {getInitials(user.name)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-800 truncate">
                      {user.name}
                    </p>
                    <p className="text-xs text-slate-500 truncate">
                      {user.email}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    navigate("/profile");
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-slate-700 hover:bg-orange-50 hover:text-[#FF8C42] transition-all"
                >
                  <UserCircle size={16} /> Profile
                </button>
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    navigate("/pets");
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-slate-700 hover:bg-orange-50 hover:text-[#FF8C42] transition-all"
                >
                  <Heart size={16} /> My Pets
                </button>
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    navigate("/cart");
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-slate-700 hover:bg-orange-50 hover:text-[#FF8C42] transition-all"
                >
                  <ShoppingCart size={16} /> Shopping Cart
                </button>
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    navigate("/bookings");
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-slate-700 hover:bg-orange-50 hover:text-[#FF8C42] transition-all"
                >
                  <CalendarDays size={16} /> Bookings
                </button>
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    navigate("/wallet");
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-slate-700 hover:bg-orange-50 hover:text-[#FF8C42] transition-all"
                >
                  <Wallet size={16} /> Wallet
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-red-500 hover:bg-red-50 transition-all mt-1"
                >
                  <LogOut size={16} /> Sign Out
                </button>
              </>
            ) : (
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onLoginClick?.();
                  }}
                  className="w-full py-3 rounded-xl text-sm font-semibold text-slate-700 border border-slate-200 hover:border-[#FF8C42] hover:text-[#FF8C42] transition-all"
                >
                  Sign In
                </button>
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onRegisterClick?.();
                  }}
                  className="w-full py-3 rounded-xl text-sm font-bold bg-gradient-to-r from-[#FF8C42] to-[#e86b1f] text-white shadow-[0_4px_14px_rgba(255,140,66,0.3)] transition-all"
                >
                  Get Started
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default Navbar;
