import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
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
  Bell,
  Check,
  CheckCheck,
  Megaphone,
  CreditCard,
  Settings,
  Package,
  Trash2,
} from "lucide-react";
import { logoutApi } from "../../api/authApi";
import { getCart } from "../../api/cartApi";
import {
  getMyNotifications,
  getUnreadCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification as deleteNotificationApi,
} from "../../api/notificationApi";

/* ─── SCROLL THRESHOLD (px) before navbar shrinks ─── */
const SCROLL_THRESHOLD = 60;

const NAV_LINKS = [
  { label: "About Us", href: "/#about" },
  { label: "Services", href: "/service" },
  { label: "AI Health Scan", href: "/ai-health-scan" },
  { label: "Policies", href: "/policy" },
  { label: "News", href: "/news" },
];

/* ─── Notification type → icon + color map ─── */
const NOTIF_TYPE_META = {
  promotion: { icon: Megaphone, color: "text-pink-500", bg: "bg-pink-50" },
  order:     { icon: Package,   color: "text-blue-500", bg: "bg-blue-50" },
  payment:   { icon: CreditCard, color: "text-emerald-500", bg: "bg-emerald-50" },
  system:    { icon: Settings,  color: "text-slate-500", bg: "bg-slate-100" },
  account:   { icon: UserCircle, color: "text-amber-500", bg: "bg-amber-50" },
};

const formatNotifTime = (dateStr) => {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  if (diff < 0) return "Just now";
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const Navbar = ({ onLoginClick, onRegisterClick, user, onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const dropdownRef = useRef(null);

  /* ─── Notification state ─── */
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifLoading, setNotifLoading] = useState(false);
  const notifRef = useRef(null);

  // Debug: Log user state
  useEffect(() => {
    console.log("[Navbar] User state:", user);
    console.log("[Navbar] Has user?", !!user);
  }, [user]);

  // Debug: Log dropdown state
  useEffect(() => {
    console.log("[Navbar] Dropdown open:", isDropdownOpen);
  }, [isDropdownOpen]);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > SCROLL_THRESHOLD);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const loadCartCount = async () => {
      const token = localStorage.getItem("accessToken");
      if (!token || !user) {
        setCartCount(0);
        return;
      }

      try {
        const result = await getCart();
        const cartData = result?.data;
        if (typeof cartData?.summary?.totalItems === "number") {
          setCartCount(cartData.summary.totalItems);
          return;
        }

        if (Array.isArray(cartData?.items)) {
          const total = cartData.items.reduce(
            (sum, item) => sum + Number(item?.quantity || 1),
            0,
          );
          setCartCount(total);
          return;
        }

        setCartCount(0);
      } catch {
        setCartCount(0);
      }
    };

    loadCartCount();
  }, [user, location.pathname]);

  useEffect(() => {
    const handleCartUpdated = async () => {
      const token = localStorage.getItem("accessToken");
      if (!token || !user) {
        setCartCount(0);
        return;
      }

      try {
        const result = await getCart();
        const cartData = result?.data;
        if (typeof cartData?.summary?.totalItems === "number") {
          setCartCount(cartData.summary.totalItems);
          return;
        }
        if (Array.isArray(cartData?.items)) {
          const total = cartData.items.reduce(
            (sum, item) => sum + Number(item?.quantity || 1),
            0,
          );
          setCartCount(total);
          return;
        }
        setCartCount(0);
      } catch {
        setCartCount(0);
      }
    };

    window.addEventListener("cart:updated", handleCartUpdated);
    return () => window.removeEventListener("cart:updated", handleCartUpdated);
  }, [user]);

  /* ─── Load unread count on mount & when path changes ─── */
  const loadUnreadCount = useCallback(async () => {
    const token = localStorage.getItem("accessToken");
    if (!token || !user) { setUnreadCount(0); return; }
    try {
      const res = await getUnreadCount();
      setUnreadCount(res?.data?.data?.count ?? 0);
    } catch { setUnreadCount(0); }
  }, [user]);

  useEffect(() => { loadUnreadCount(); }, [loadUnreadCount, location.pathname]);

  const loadNotifications = useCallback(async () => {
    const token = localStorage.getItem("accessToken");
    if (!token || !user) return;
    setNotifLoading(true);
    try {
      const res = await getMyNotifications({ page: 1, limit: 20 });
      const items = res?.data?.data ?? [];
      setNotifications(items);
      // also refresh unread badge
      const cntRes = await getUnreadCount();
      setUnreadCount(cntRes?.data?.data?.count ?? 0);
    } catch { /* ignore */ }
    setNotifLoading(false);
  }, [user]);

  const handleMarkOneRead = async (id) => {
    try {
      await markNotificationAsRead(id);
      setNotifications((prev) => prev.map((n) => n._id === id ? { ...n, isRead: true } : n));
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch { /* ignore */ }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch { /* ignore */ }
  };

  const handleDeleteNotif = async (id) => {
    try {
      await deleteNotificationApi(id);
      const wasUnread = notifications.find((n) => n._id === id && !n.isRead);
      setNotifications((prev) => prev.filter((n) => n._id !== id));
      if (wasUnread) setUnreadCount((c) => Math.max(0, c - 1));
    } catch { /* ignore */ }
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsDropdownOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setIsNotifOpen(false);
      }
    };

    if (isDropdownOpen || isNotifOpen) {
      const timer = setTimeout(() => {
        document.addEventListener("mousedown", handleClickOutside);
      }, 100);

      return () => {
        clearTimeout(timer);
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isDropdownOpen, isNotifOpen]);

  const handleLogout = async () => {
    setIsDropdownOpen(false);
    setIsMobileMenuOpen(false);
    try {
      await logoutApi();
    } catch {
      /* ignore */
    }
    localStorage.removeItem("accessToken");
    localStorage.removeItem("user");
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
            {NAV_LINKS.map((link) => {
              const isActive =
                location.pathname === link.href ||
                (link.href.startsWith("/#") &&
                  location.pathname === "/" &&
                  window.location.hash === link.href.slice(1));
              return link.href.startsWith("/") && !link.href.includes("#") ? (
                <Link
                  key={link.href}
                  to={link.href}
                  onClick={() =>
                    window.scrollTo({ top: 0, behavior: "smooth" })
                  }
                  className={`nav-item px-3.5 py-2 rounded-xl text-sm font-semibold
                    ${isActive ? "active" : ""}
                    ${
                      isScrolled
                        ? `text-slate-400 hover:text-white ${isActive ? "!text-white bg-white/[0.09]" : "hover:bg-white/[0.07]"}`
                        : `text-slate-600 hover:text-slate-900 ${isActive ? "!text-slate-900 bg-slate-100" : "hover:bg-slate-100/80"}`
                    }`}
                >
                  {link.label}
                </Link>
              ) : (
                <a
                  key={link.href}
                  href={link.href}
                  className={`nav-item px-3.5 py-2 rounded-xl text-sm font-semibold
                    ${isActive ? "active" : ""}
                    ${
                      isScrolled
                        ? `text-slate-400 hover:text-white ${isActive ? "!text-white bg-white/[0.09]" : "hover:bg-white/[0.07]"}`
                        : `text-slate-600 hover:text-slate-900 ${isActive ? "!text-slate-900 bg-slate-100" : "hover:bg-slate-100/80"}`
                    }`}
                >
                  {link.label}
                </a>
              );
            })}
          </nav>

          {/* ── Desktop Right ── */}
          <div className="hidden md:flex items-center gap-2 flex-shrink-0">
            {user ? (
              <>
                {/* ── Cart Button ── */}
                <button
                  id="navbar-cart-button"
                  onClick={() => navigate("/cart")}
                  className={`relative p-2 rounded-xl transition-all duration-300 border ${
                    isScrolled
                      ? "border-white/20 bg-white/10 text-white hover:bg-white/15 hover:border-white/40"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-orange-50 hover:text-[#FF8C42] hover:border-orange-300 shadow-sm"
                  }`}
                  title="Shopping Cart"
                >
                  <ShoppingCart size={18} />
                  <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#FF8C42] text-white text-[10px] font-bold flex items-center justify-center leading-none border border-white">
                    {cartCount > 99 ? "99+" : cartCount}
                  </span>
                </button>

                {/* ── Notification Bell ── */}
                <div className="relative" ref={notifRef} style={{ zIndex: 9999 }}>
                  <button
                    id="navbar-notification-button"
                    onClick={() => {
                      const willOpen = !isNotifOpen;
                      setIsNotifOpen(willOpen);
                      if (willOpen) loadNotifications();
                    }}
                    className={`relative p-2 rounded-xl transition-all duration-300 border ${
                      isScrolled
                        ? "border-white/20 bg-white/10 text-white hover:bg-white/15 hover:border-white/40"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-orange-50 hover:text-[#FF8C42] hover:border-orange-300 shadow-sm"
                    }`}
                    title="Notifications"
                  >
                    <Bell size={18} />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center leading-none border-2 border-white animate-pulse">
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </span>
                    )}
                  </button>

                  {/* ── Notification Dropdown Panel ── */}
                  {isNotifOpen && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="absolute right-0 top-full mt-3 w-[380px] bg-white rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.18)] border border-slate-100/80 overflow-hidden"
                      style={{ animation: "dropIn 0.22s cubic-bezier(.4,0,.2,1) both", zIndex: 10000 }}
                    >
                      {/* Header */}
                      <div className="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-orange-50 to-amber-50/50 border-b border-orange-100/60">
                        <div className="flex items-center gap-2">
                          <Bell size={18} className="text-[#FF8C42]" />
                          <h3 className="text-sm font-bold text-slate-800">Notifications</h3>
                          {unreadCount > 0 && (
                            <span className="min-w-[20px] h-[20px] px-1.5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center leading-none">
                              {unreadCount}
                            </span>
                          )}
                        </div>
                        {unreadCount > 0 && (
                          <button
                            onClick={handleMarkAllRead}
                            className="flex items-center gap-1.5 text-xs font-semibold text-[#FF8C42] hover:text-[#e86b1f] transition-colors"
                          >
                            <CheckCheck size={14} />
                            Mark all read
                          </button>
                        )}
                      </div>

                      {/* Body */}
                      <div className="max-h-[400px] overflow-y-auto" style={{ scrollbarWidth: "thin", scrollbarColor: "#e5e7eb transparent" }}>
                        {notifLoading ? (
                          <div className="flex flex-col gap-3 p-4">
                            {[1, 2, 3].map((i) => (
                              <div key={i} className="animate-pulse flex gap-3">
                                <div className="w-9 h-9 rounded-xl bg-slate-100 flex-shrink-0" />
                                <div className="flex-1 space-y-2">
                                  <div className="h-3 bg-slate-100 rounded-full w-3/4" />
                                  <div className="h-2.5 bg-slate-50 rounded-full w-full" />
                                  <div className="h-2 bg-slate-50 rounded-full w-1/3" />
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : notifications.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-12 px-6">
                            <div className="w-14 h-14 rounded-2xl bg-orange-50 flex items-center justify-center mb-3">
                              <Bell size={24} className="text-[#FF8C42]/50" />
                            </div>
                            <p className="text-sm font-semibold text-slate-600">No notifications yet</p>
                            <p className="text-xs text-slate-400 mt-1 text-center">You'll see notifications from Happy Tails here</p>
                          </div>
                        ) : (
                          notifications.map((notif) => {
                            const meta = NOTIF_TYPE_META[notif.type] || NOTIF_TYPE_META.system;
                            const IconComp = meta.icon;
                            return (
                              <div
                                key={notif._id}
                                className={`group flex gap-3 px-4 py-3.5 border-b border-slate-50 last:border-b-0 transition-colors cursor-pointer ${
                                  notif.isRead
                                    ? "bg-white hover:bg-slate-50/80"
                                    : "bg-orange-50/40 hover:bg-orange-50/70"
                                }`}
                                onClick={() => {
                                  if (!notif.isRead) handleMarkOneRead(notif._id);
                                  if (notif.actionUrl) {
                                    setIsNotifOpen(false);
                                    navigate(notif.actionUrl);
                                  }
                                }}
                              >
                                {/* Icon or Image */}
                                {notif.imageUrl ? (
                                  <div className="w-9 h-9 rounded-xl overflow-hidden flex-shrink-0 border border-slate-100">
                                    <img
                                      src={notif.imageUrl}
                                      alt=""
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        e.target.style.display = "none";
                                        e.target.parentElement.classList.add(meta.bg);
                                        e.target.parentElement.innerHTML = `<div class="w-full h-full flex items-center justify-center"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="${meta.color}"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg></div>`;
                                      }}
                                    />
                                  </div>
                                ) : (
                                  <div className={`w-9 h-9 rounded-xl ${meta.bg} flex items-center justify-center flex-shrink-0`}>
                                    <IconComp size={16} className={meta.color} />
                                  </div>
                                )}

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-2">
                                    <p className={`text-[13px] leading-snug line-clamp-2 ${
                                      notif.isRead ? "text-slate-600 font-medium" : "text-slate-800 font-semibold"
                                    }`}>
                                      {notif.title}
                                    </p>
                                    {!notif.isRead && (
                                      <span className="w-2 h-2 rounded-full bg-[#FF8C42] flex-shrink-0 mt-1.5" />
                                    )}
                                  </div>
                                  <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">
                                    {notif.body}
                                  </p>
                                  <div className="flex items-center justify-between mt-1.5">
                                    <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">
                                      {formatNotifTime(notif.createdAt)}
                                    </span>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteNotif(notif._id);
                                      }}
                                      className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-slate-300 hover:text-red-400 hover:bg-red-50 transition-all"
                                      title="Delete"
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>

                      {/* Footer */}
                      {notifications.length > 0 && (
                        <div className="border-t border-slate-100 px-4 py-2.5 bg-slate-50/50">
                          <button
                            onClick={() => {
                              setIsNotifOpen(false);
                              // Could navigate to a full notifications page later
                            }}
                            className="w-full text-center text-xs font-semibold text-[#FF8C42] hover:text-[#e86b1f] transition-colors py-1"
                          >
                            View all notifications
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

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
                  {user.avatar ? (
                    <img
                      src={user.avatar}
                      alt="avatar"
                      className="w-7 h-7 rounded-lg object-cover shadow"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#FF8C42] to-[#e86b1f] flex items-center justify-center text-white font-bold text-xs shadow">
                      {getInitials(user.name)}
                    </div>
                  )}
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
                        {user.avatar ? (
                          <img
                            src={user.avatar}
                            alt="avatar"
                            className="w-9 h-9 rounded-xl object-cover shadow"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#FF8C42] to-[#e86b1f] flex items-center justify-center text-white font-bold text-sm shadow">
                            {getInitials(user.name)}
                          </div>
                        )}
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
              </>
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

          {/* ── Mobile Toggle ── */}
          <button
            className={`md:hidden p-2 rounded-xl transition-colors duration-300
              ${isScrolled ? "text-white hover:bg-white/10" : "text-slate-700 hover:bg-slate-100"}`}
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
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
            {NAV_LINKS.map((link) => {
              const isActive =
                location.pathname === link.href ||
                (link.href.startsWith("/#") &&
                  location.pathname === "/" &&
                  window.location.hash === link.href.slice(1));
              return link.href.startsWith("/") && !link.href.includes("#") ? (
                <Link
                  key={link.href}
                  to={link.href}
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className={`flex items-center px-4 py-3 rounded-xl text-sm font-semibold transition-all border-l-4 ${
                    isActive
                      ? "bg-orange-50 text-[#FF8C42] border-[#FF8C42]"
                      : "text-slate-700 hover:bg-orange-50 hover:text-[#FF8C42] border-transparent"
                  }`}
                >
                  {link.label}
                </Link>
              ) : (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center px-4 py-3 rounded-xl text-sm font-semibold transition-all border-l-4 ${
                    isActive
                      ? "bg-orange-50 text-[#FF8C42] border-[#FF8C42]"
                      : "text-slate-700 hover:bg-orange-50 hover:text-[#FF8C42] border-transparent"
                  }`}
                >
                  {link.label}
                </a>
              );
            })}
          </div>

          <div className="px-4 border-t border-slate-100 pt-4">
            {user ? (
              <>
                <div className="flex items-center gap-3 px-4 py-3 bg-orange-50/80 rounded-xl mb-3">
                  {user.avatar ? (
                    <img
                      src={user.avatar}
                      alt="avatar"
                      className="w-10 h-10 rounded-xl object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF8C42] to-[#e86b1f] flex items-center justify-center text-white font-bold">
                      {getInitials(user.name)}
                    </div>
                  )}
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
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-slate-700 hover:bg-orange-50 hover:text-[#FF8C42] transition-all justify-between"
                >
                  <span className="inline-flex items-center gap-3">
                    <ShoppingCart size={16} /> Shopping Cart
                  </span>
                  <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-[#FF8C42] text-white text-[10px] font-bold flex items-center justify-center leading-none">
                    {cartCount > 99 ? "99+" : cartCount}
                  </span>
                </button>
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    // Open notif dropdown or navigate
                    setIsNotifOpen(true);
                    loadNotifications();
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-slate-700 hover:bg-orange-50 hover:text-[#FF8C42] transition-all justify-between"
                >
                  <span className="inline-flex items-center gap-3">
                    <Bell size={16} /> Notifications
                  </span>
                  {unreadCount > 0 && (
                    <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center leading-none">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
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
