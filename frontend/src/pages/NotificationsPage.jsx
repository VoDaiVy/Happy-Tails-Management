import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import {
  Bell,
  BellOff,
  CalendarCheck,
  CheckCheck,
  CreditCard,
  Dog,
  Inbox,
  Loader2,
  Megaphone,
  RefreshCw,
  Search,
  Settings,
  Trash2,
  UserCircle,
  X,
} from "lucide-react";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import { useAuth } from "../context/AuthContext";
import {
  getMyNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  deleteAllReadNotifications,
} from "../api/notificationApi";
import { toast } from "react-toastify";

/* ─── Type metadata ─── */
const TYPE_META = {
  promotion: { icon: Megaphone, color: "text-pink-500", bg: "bg-pink-50", label: "Promotion" },
  order: { icon: CalendarCheck, color: "text-blue-500", bg: "bg-blue-50", label: "Booking" },
  payment: { icon: CreditCard, color: "text-emerald-500", bg: "bg-emerald-50", label: "Payment" },
  system: { icon: Settings, color: "text-slate-400", bg: "bg-slate-50", label: "System" },
  account: { icon: UserCircle, color: "text-amber-500", bg: "bg-amber-50", label: "Account" },
  health: { icon: Dog, color: "text-purple-500", bg: "bg-purple-50", label: "Health" },
};

const FILTER_TABS = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
  { key: "order", label: "Booking" },
  { key: "payment", label: "Payment" },
  { key: "system", label: "System" },
  { key: "promotion", label: "Promotion" },
];

/* ─── Time helpers ─── */
const formatTime = (dateStr) => {
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

const formatFullDate = (dateStr) => {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleString("en-US", {
    weekday: "short", month: "long", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
};

/** Backend stores promotion banner as `imageUrl`; staff form may mirror in metadata */
const getNotificationImageRaw = (notif) => {
  if (!notif) return "";
  return (
    notif.imageUrl ||
    notif.metadata?.bannerImage ||
    notif.metadata?.imageUrl ||
    ""
  );
};

const getApiOrigin = () => {
  const u = import.meta.env.VITE_API_URL || "http://localhost:3001/api";
  return u.replace(/\/api\/?$/i, "") || "http://localhost:3001";
};

/** Turn relative paths (/uploads/...) into absolute URLs for <img src> */
const resolveNotificationImageUrl = (raw) => {
  if (!raw || typeof raw !== "string") return "";
  const t = raw.trim();
  if (!t) return "";
  if (/^https?:\/\//i.test(t) || t.startsWith("data:")) return t;
  if (t.startsWith("//")) return `https:${t}`;
  const base = getApiOrigin().replace(/\/$/, "");
  return t.startsWith("/") ? `${base}${t}` : `${base}/${t}`;
};

const getNotificationImageUrl = (notif) => resolveNotificationImageUrl(getNotificationImageRaw(notif));

/* ─── List row: thumbnail or type icon ─── */
const NotificationRowAvatar = ({ notif, meta }) => {
  const Icon = meta.icon;
  const url = getNotificationImageUrl(notif);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [notif._id, url]);

  if (url && !failed) {
    return (
      <img
        src={url}
        alt=""
        loading="lazy"
        onError={() => setFailed(true)}
        className="w-9 h-9 rounded-xl object-cover shrink-0 mt-0.5 border border-slate-100/80 bg-slate-50"
      />
    );
  }
  return (
    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${meta.bg}`}>
      <Icon size={16} className={meta.color} />
    </div>
  );
};

/* ─── Notification Detail Modal ─── */
const NotifDetailModal = ({ notification, onClose, onMarkRead, onDelete, onAction }) => {
  if (!notification) return null;

  const meta = TYPE_META[notification.type] || { icon: Bell, color: "text-slate-400", bg: "bg-slate-50", label: "Notification" };
  const Icon = meta.icon;
  const bannerUrl = getNotificationImageUrl(notification);
  const [bannerFailed, setBannerFailed] = useState(false);

  useEffect(() => {
    setBannerFailed(false);
  }, [notification._id]);

  const getActionLabel = (type, targetUrl) => {
    if (!targetUrl) return null;
    const map = { order: "View Booking", payment: "View Payment", promotion: "View Offer", system: "View Details", account: "View Profile", health: "View Report" };
    return map[type] || "View Details";
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/45 backdrop-blur-sm px-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100/80">
        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-slate-100/80">
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${meta.bg}`}>
              <Icon size={18} className={meta.color} />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{meta.label}</p>
              <h3 className="text-[15px] font-bold text-slate-800 mt-0.5 leading-snug">{notification.title}</h3>
              <p className="text-[11px] text-slate-400 mt-1">{formatFullDate(notification.createdAt)}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors shrink-0 ml-2"
          >
            <X size={16} />
          </button>
        </div>

        {/* Banner image (promotions / optional) */}
        {bannerUrl && !bannerFailed && (
          <div className="px-5 pt-0 -mt-1 pb-2">
            <img
              src={bannerUrl}
              alt=""
              onError={() => setBannerFailed(true)}
              className="w-full max-h-56 rounded-2xl object-cover border border-slate-100/80 bg-slate-50"
            />
          </div>
        )}

        {/* Body */}
        <div className="px-5 py-4">
          <p className="text-sm text-slate-600 leading-relaxed">{notification.body || notification.message}</p>
        </div>

        {/* Actions */}
        <div className="px-5 pb-4 flex items-center gap-2">
          {!notification.isRead && (
            <button
              onClick={() => onMarkRead(notification._id, false)}
              className="flex-1 py-2.5 rounded-2xl text-sm font-medium border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Mark as unread
            </button>
          )}
          {getActionLabel(notification.type, notification.targetUrl || notification.actionUrl) ? (
            <button
              onClick={() => onAction(notification)}
              className="flex-1 py-2.5 rounded-2xl text-sm font-bold bg-[#D97853] text-white hover:bg-[#B5633F] transition-colors"
            >
              {getActionLabel(notification.type, notification.targetUrl || notification.actionUrl)}
            </button>
          ) : null}
          <button
            onClick={() => onDelete(notification._id)}
            className="w-10 h-10 flex items-center justify-center rounded-2xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

/* ─── Confirm Modal ─── */
const ConfirmModal = ({ open, title, message, confirmLabel, variant, onConfirm, onCancel, loading }) => {
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/45 backdrop-blur-sm px-4" onClick={onCancel}>
      <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden border border-slate-100/80" onClick={(e) => e.stopPropagation()}>
        <div className="p-6">
          <h3 className="text-[15px] font-bold text-slate-800 mb-2">{title}</h3>
          <p className="text-sm text-slate-500 mb-5 leading-relaxed">{message}</p>
          <div className="flex gap-2.5 justify-end">
            <button onClick={onCancel} disabled={loading}
              className="px-4 py-2.5 rounded-2xl text-sm font-medium border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">
              Cancel
            </button>
            <button onClick={onConfirm} disabled={loading}
              className={`px-4 py-2.5 rounded-2xl text-sm font-bold transition-colors flex items-center gap-2 ${
                variant === "danger"
                  ? "bg-red-500 text-white hover:bg-red-600"
                  : "bg-[#D97853] text-white hover:bg-[#B5633F]"
              }`}>
              {loading && <Loader2 size={13} className="animate-spin" />}
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

/* ─── Skeleton ─── */
const SkeletonRow = () => (
  <div className="flex items-start gap-3.5 px-4 py-4 border-b border-slate-100/60 animate-pulse last:border-b-0">
    <div className="w-9 h-9 rounded-xl bg-slate-100 shrink-0" />
    <div className="flex-1 min-w-0 pt-0.5 space-y-2">
      <div className="h-3.5 bg-slate-100 rounded-full w-1/3" />
      <div className="h-3 bg-slate-50 rounded-full w-4/5" />
      <div className="h-2.5 bg-slate-50 rounded-full w-1/4" />
    </div>
  </div>
);

/* ─── Main ─── */
const NotificationsPage = () => {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  const [detailNotif, setDetailNotif] = useState(null);
  const [confirmModal, setConfirmModal] = useState({ open: false });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  /* ─── Fetch ─── */
  const fetchNotifications = useCallback(async ({ pageToLoad = 1, append = false } = {}) => {
    if (append) setLoadingMore(true);
    else setLoading(true);
    setError(null);

    try {
      const params = { page: pageToLoad, limit: 20 };
      if (activeTab === "unread") params.isRead = false;
      else if (activeTab !== "all") params.type = activeTab;

      const res = await getMyNotifications(params);
      const items = res?.data?.data || res?.data?.notifications || res?.notifications || [];
      const pagination = res?.data?.pagination || {};

      if (append) {
        setNotifications((prev) => [...prev, ...items]);
      } else {
        setNotifications(items);
      }
      setPage(pagination.page || pageToLoad);
      setTotalPages(pagination.totalPages || 1);
    } catch {
      if (!append) { setNotifications([]); setError("Failed to load notifications."); }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [activeTab]);

  useEffect(() => { fetchNotifications({ pageToLoad: 1 }); }, [fetchNotifications]);

  /* ─── Filtered list ─── */
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return notifications;
    return notifications.filter(
      (n) =>
        (n.title || "").toLowerCase().includes(term) ||
        (n.body || n.message || "").toLowerCase().includes(term)
    );
  }, [notifications, search]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const canLoadMore = page < totalPages;

  /* ─── Mark read ─── */
  const handleMarkRead = async (id, read = true) => {
    try { await markNotificationAsRead(id); } catch { /* optimistic */ }
    setNotifications((prev) => prev.map((n) => n._id === id ? { ...n, isRead: read } : n));
    if (detailNotif?._id === id) setDetailNotif((p) => p ? { ...p, isRead: read } : p);
    toast.success(read ? "Marked as read" : "Marked as unread");
  };

  /* ─── Delete ─── */
  const handleDelete = async (id) => {
    try { await deleteNotification(id); } catch { /* optimistic */ }
    setNotifications((prev) => prev.filter((n) => n._id !== id));
    if (detailNotif?._id === id) setDetailNotif(null);
    toast.success("Notification deleted");
  };

  /* ─── Mark all read ─── */
  const handleMarkAllRead = () => {
    setConfirmModal({
      open: true,
      title: "Mark all as read?",
      message: "All notifications will be marked as read.",
      confirmLabel: "Mark all read",
      variant: "primary",
      onConfirm: async () => {
        setConfirmModal((p) => ({ ...p, loading: true }));
        try {
          await markAllNotificationsAsRead();
          setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
          toast.success("All notifications marked as read");
        } catch {
          setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        } finally {
          setConfirmModal((p) => ({ ...p, open: false, loading: false }));
        }
      },
    });
  };

  /* ─── Clear all read ─── */
  const handleClearRead = () => {
    setConfirmModal({
      open: true,
      title: "Clear read notifications?",
      message: "All read notifications will be permanently deleted. Unread ones are kept.",
      confirmLabel: "Clear all read",
      variant: "danger",
      onConfirm: async () => {
        setConfirmModal((p) => ({ ...p, loading: true }));
        try {
          await deleteAllReadNotifications();
          setNotifications((prev) => prev.filter((n) => !n.isRead));
          toast.success("Read notifications cleared");
        } catch {
          setNotifications((prev) => prev.filter((n) => !n.isRead));
        } finally {
          setConfirmModal((p) => ({ ...p, open: false, loading: false }));
        }
      },
    });
  };

  /* ─── Open detail modal ─── */
  const handleOpenDetail = (notif) => {
    setDetailNotif(notif);
    if (!notif.isRead) handleMarkRead(notif._id, true);
  };

  /* ─── CTA from modal ─── */
  const handleModalAction = (notif) => {
    const url = notif.targetUrl || notif.actionUrl;
    setDetailNotif(null);
    if (url) navigate(url);
  };

  return (
    <div className="min-h-screen bg-[#F8F6F3]">
      <Navbar user={user} onLogout={() => setUser(null)} />

      <main className="pt-28 pb-20 px-4 md:px-6">
        <div className="max-w-4xl mx-auto">

          {/* ── Page Header ── */}
          <div className="mb-5">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
                  Notifications
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                  Stay updated with your bookings, payments, and more.
                </p>
              </div>

              {/* Header actions */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={handleMarkAllRead}
                  disabled={unreadCount === 0}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <CheckCheck size={13} />
                  Mark all read
                </button>
                <button
                  onClick={handleClearRead}
                  disabled={notifications.filter((n) => n.isRead).length === 0}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border border-slate-200 text-slate-600 hover:bg-red-50 hover:text-red-500 hover:border-red-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <Trash2 size={13} />
                  Clear read
                </button>
                <button
                  onClick={() => fetchNotifications({ pageToLoad: 1 })}
                  disabled={loading}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
                </button>
              </div>
            </div>

            {/* Unread badge */}
            {unreadCount > 0 && (
              <div className="mt-3 flex items-center gap-2">
                <span className="inline-flex items-center px-2.5 py-1 rounded-xl text-[11px] font-bold bg-[#D97853]/10 text-[#D97853] border border-[#D97853]/20">
                  {unreadCount} unread
                </span>
              </div>
            )}
          </div>

          {/* ── Filter & Search Bar ── */}
          <div className="bg-white rounded-2xl border border-slate-100/80 shadow-sm mb-4 overflow-hidden">
            {/* Tabs row */}
            <div className="px-4 pt-3.5 pb-0">
              <div className="flex gap-1 overflow-x-auto pb-0 scrollbar-hide">
                {FILTER_TABS.map((tab) => {
                  const isActive = activeTab === tab.key;
                  return (
                    <button
                      key={tab.key}
                      onClick={() => { setActiveTab(tab.key); setSearch(""); }}
                      className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all shrink-0 ${
                        isActive
                          ? "bg-[#D97853] text-white shadow-sm"
                          : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {tab.label}
                      {tab.key === "unread" && unreadCount > 0 && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                          isActive ? "bg-white/25 text-white" : "bg-[#D97853]/10 text-[#D97853]"
                        }`}>
                          {unreadCount}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Search row */}
            <div className="px-4 py-3.5 border-t border-slate-100/60">
              <div className="relative">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search notifications..."
                  className="w-full h-9 pl-9.5 pr-9 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-[#D97853] focus:bg-white transition-colors"
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-slate-300 hover:bg-slate-400 flex items-center justify-center transition-colors"
                  >
                    <X size={9} className="text-white" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ── Results meta ── */}
          {!loading && notifications.length > 0 && (
            <p className="text-xs text-slate-400 mb-3 px-0.5">
              {filtered.length === notifications.length
                ? `${notifications.length} notification${notifications.length !== 1 ? "s" : ""}`
                : `${filtered.length} of ${notifications.length} results`}
            </p>
          )}

          {/* ── List ── */}
          <div className="bg-white rounded-2xl border border-slate-100/80 shadow-sm overflow-hidden">
            {/* Loading */}
            {loading && (
              <div>
                {[...Array(5)].map((_, i) => <SkeletonRow key={i} />)}
              </div>
            )}

            {/* Error */}
            {!loading && error && (
              <div className="py-14 px-6 text-center">
                <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-3">
                  <BellOff size={24} className="text-red-400" />
                </div>
                <p className="text-sm text-slate-600 font-medium mb-3">{error}</p>
                <button
                  onClick={() => fetchNotifications({ pageToLoad: 1 })}
                  className="px-5 py-2.5 rounded-xl bg-[#D97853] text-white text-sm font-bold hover:bg-[#B5633F] transition-colors"
                >
                  Try again
                </button>
              </div>
            )}

            {/* Empty: no data */}
            {!loading && !error && notifications.length === 0 && (
              <div className="py-14 px-6 text-center">
                <div className="w-14 h-14 rounded-2xl bg-orange-50 flex items-center justify-center mx-auto mb-3">
                  <Inbox size={26} className="text-[#D97853]/50" />
                </div>
                <p className="text-sm font-semibold text-slate-700 mb-1">No notifications yet</p>
                <p className="text-xs text-slate-400">You're all caught up. New updates will appear here.</p>
              </div>
            )}

            {/* Empty: filtered */}
            {!loading && !error && notifications.length > 0 && filtered.length === 0 && (
              <div className="py-14 px-6 text-center">
                <div className="w-14 h-14 rounded-2xl bg-orange-50 flex items-center justify-center mx-auto mb-3">
                  <Search size={24} className="text-[#D97853]/50" />
                </div>
                <p className="text-sm font-semibold text-slate-700 mb-1">No results found</p>
                <p className="text-xs text-slate-400 mb-3">Try a different search term.</p>
                <button
                  onClick={() => setSearch("")}
                  className="px-5 py-2.5 rounded-xl bg-[#D97853] text-white text-sm font-bold hover:bg-[#B5633F] transition-colors"
                >
                  Clear search
                </button>
              </div>
            )}

            {/* Notification rows */}
            {!loading && !error && filtered.length > 0 && (
              <div>
                {filtered.map((notif) => {
                  const meta = TYPE_META[notif.type] || { icon: Bell, color: "text-slate-400", bg: "bg-slate-50", label: "Notification" };
                  const body = notif.body || notif.message || "";

                  return (
                    <button
                      key={notif._id}
                      onClick={() => handleOpenDetail(notif)}
                      className={`w-full text-left px-4 py-3.5 border-b border-slate-100/60 last:border-b-0 transition-colors hover:bg-slate-50/60 ${
                        !notif.isRead ? "bg-[#FFFCF8]" : "bg-white"
                      }`}
                    >
                      <div className="flex items-start gap-3.5">
                        <NotificationRowAvatar notif={notif} meta={meta} />

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className={`text-[13px] font-semibold leading-snug ${!notif.isRead ? "text-slate-800" : "text-slate-600"}`}>
                              {notif.title}
                            </p>
                            <div className="flex items-center gap-2 shrink-0">
                              {!notif.isRead && <span className="w-1.5 h-1.5 rounded-full bg-[#D97853] mt-1.5" />}
                              <span className="text-[11px] text-slate-400 whitespace-nowrap">{formatTime(notif.createdAt)}</span>
                            </div>
                          </div>
                          <p className="text-[12px] text-slate-400 mt-0.5 leading-relaxed line-clamp-1">{body}</p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{meta.label}</span>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}

                {/* Load more */}
                {canLoadMore && (
                  <div className="px-4 py-3.5 border-t border-slate-100/60 flex justify-center">
                    <button
                      onClick={() => fetchNotifications({ pageToLoad: page + 1, append: true })}
                      disabled={loadingMore}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors"
                    >
                      {loadingMore && <Loader2 size={13} className="animate-spin" />}
                      {loadingMore ? "Loading..." : "Load more"}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />

      {/* ── Detail Modal ── */}
      {detailNotif && (
        <NotifDetailModal
          notification={detailNotif}
          onClose={() => setDetailNotif(null)}
          onMarkRead={handleMarkRead}
          onDelete={handleDelete}
          onAction={handleModalAction}
        />
      )}

      {/* ── Confirm Modal ── */}
      <ConfirmModal
        open={confirmModal.open}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmLabel={confirmModal.confirmLabel}
        variant={confirmModal.variant}
        loading={confirmModal.loading}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal({ open: false })}
      />
    </div>
  );
};

export default NotificationsPage;
