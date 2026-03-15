import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AnimatePresence } from 'framer-motion';
import * as Framer from 'framer-motion';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

const MotionDiv = Framer.motion.div;
const MotionLi = Framer.motion.li;
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Wallet as WalletIcon,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  X,
  ExternalLink,
  Loader2,
  Banknote,
  TrendingUp,
  Hash,
  Activity,
} from 'lucide-react';
import Navbar from '../components/layout/Navbar';
import AuthModal from '../components/AuthModal';
import { getWallet, depositToWallet, getWalletTransactions, getPayOSDepositStatus } from '../api/walletApi';

// ─────────────────────────────────────────────────────────────
// Helpers & constants
// ─────────────────────────────────────────────────────────────
const formatVND = (amount) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);

const formatShort = (n) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return `${n}`;
};

const TX_TYPE_CONFIG = {
  deposit: { label: 'Top Up', icon: ArrowDownLeft, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100', amountColor: 'text-emerald-600' },
  payment: { label: 'Service Payment', icon: ArrowUpRight, color: 'text-rose-500', bg: 'bg-rose-50', border: 'border-rose-100', amountColor: 'text-rose-500' },
  refund: { label: 'Refund', icon: ArrowDownLeft, color: 'text-sky-500', bg: 'bg-sky-50', border: 'border-sky-100', amountColor: 'text-sky-500' },
};

const TX_STATUS_CONFIG = {
  completed: { label: 'Completed', icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  pending:   { label: 'Processing', icon: Clock,         color: 'text-amber-500',   bg: 'bg-amber-50'   },
  failed:    { label: 'Failed',     icon: XCircle,       color: 'text-rose-500',    bg: 'bg-rose-50'    },
  cancelled: { label: 'Cancelled',  icon: AlertCircle,   color: 'text-slate-400',   bg: 'bg-slate-50'   },
};

const PRESET_AMOUNTS = [50000, 100000, 200000, 500000, 1000000, 2000000];

const TX_FILTERS = [
  { key: 'all',     label: 'All'      },
  { key: 'deposit', label: 'Top Up'   },
  { key: 'payment', label: 'Payments' },
  { key: 'refund',  label: 'Refunds'  },
];

// ─────────────────────────────────────────────────────────────
// Decorative paw print SVG  (4 toe beans + 1 main pad)
// ─────────────────────────────────────────────────────────────
const PawPrint = () => (
  <svg viewBox="0 0 100 110" fill="currentColor" className="w-full h-full">
    {/* toe pads — arc of 4 ovals */}
    <ellipse cx="16" cy="34" rx="10" ry="13" transform="rotate(-22 16 34)" />
    <ellipse cx="39" cy="19" rx="10" ry="13" transform="rotate(-6 39 19)" />
    <ellipse cx="62" cy="19" rx="10" ry="13" transform="rotate(6 62 19)" />
    <ellipse cx="85" cy="34" rx="10" ry="13" transform="rotate(22 85 34)" />
    {/* main central pad */}
    <ellipse cx="50" cy="82" rx="31" ry="24" />
  </svg>
);

// ─────────────────────────────────────────────────────────────
// Custom recharts tooltip
// ─────────────────────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'rgba(15,24,32,0.96)', backdropFilter: 'blur(14px)', border: '1px solid rgba(217,120,83,0.25)', boxShadow: '0 20px 40px -8px rgba(0,0,0,0.50)' }} className="rounded-2xl px-4 py-3">
      <p className="text-[10px] font-black uppercase tracking-widest mb-2.5" style={{ color: 'rgba(255,255,255,0.35)' }}>{label}</p>
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: 'linear-gradient(135deg,#D97853,#f59e0b)' }} />
          <span className="text-white font-black text-sm tabular-nums">{formatVND(entry.value)}</span>
        </div>
      ))}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────
export default function WalletPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [paymentBanner, setPaymentBanner] = useState(null); // { type: 'success'|'cancelled'|'pending', amount, code }
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
  });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState('login');

  const [wallet, setWallet]             = useState(null);
  const [walletLoading, setWalletLoading] = useState(true);
  const [walletError, setWalletError]   = useState(null);

  const [transactions, setTransactions]   = useState([]);
  const [txLoading, setTxLoading]         = useState(false);
  const [txPagination, setTxPagination]   = useState({ page: 1, pages: 1, total: 0 });
  const [txFilter, setTxFilter]           = useState('all');

  const [showDepositModal, setShowDepositModal] = useState(false);
  const [depositAmount, setDepositAmount]       = useState('');
  const [depositNote, setDepositNote]           = useState('');
  const [depositLoading, setDepositLoading]     = useState(false);
  const [depositResult, setDepositResult]       = useState(null);
  const [depositError, setDepositError]         = useState(null);
  const [checkingDepositStatus, setCheckingDepositStatus] = useState(false);

  // ── Fetchers ─────────────────────────────────────────────────
  const fetchWallet = useCallback(async () => {
    if (!user) return;
    setWalletLoading(true); setWalletError(null);
    try {
      const res = await getWallet();
      setWallet(res.data);
    } catch (err) {
      setWalletError(err?.response?.data?.message || 'Failed to load wallet');
    } finally { setWalletLoading(false); }
  }, [user]);

  const fetchTransactions = useCallback(async (page = 1) => {
    if (!user) return;
    setTxLoading(true);
    try {
      const params = { page, limit: 8 };
      if (txFilter !== 'all') params.type = txFilter;
      const res = await getWalletTransactions(params);
      setTransactions(res.data || []);
      setTxPagination(res.pagination || { page: 1, pages: 1, total: 0 });
    } catch (err) { console.error(err); }
    finally { setTxLoading(false); }
  }, [user, txFilter]);

  useEffect(() => {
    if (!user) { setWalletLoading(false); setIsAuthModalOpen(true); return; }
    fetchWallet();
  }, [user, fetchWallet]);

  useEffect(() => { if (user) fetchTransactions(1); }, [user, txFilter, fetchTransactions]);

  // ── Chart data: last 7 days ───────────────────────────────────
  const chartData = useMemo(() => {
    const DAYS = 7;
    const now = new Date();
    return Array.from({ length: DAYS }, (_, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() - (DAYS - 1 - i));
      d.setHours(0, 0, 0, 0);
      const next = new Date(d); next.setDate(next.getDate() + 1);
      const dayTxs = transactions.filter(tx => {
        const t = new Date(tx.createdAt);
        return t >= d && t < next && tx.status === 'completed';
      });
      return {
        date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        'Top Up': dayTxs.filter(tx => tx.type === 'deposit').reduce((s, tx) => s + tx.amount, 0),
      };
    });
  }, [transactions]);

  // ── Handlers ─────────────────────────────────────────────────
  const handleLoginSuccess = (userData) => {
    setUser(userData);
    setIsAuthModalOpen(false);
    if (userData.role === 'admin') navigate('/admin');
    else if (userData.role === 'staff') navigate('/staff');
  };

  const handleDeposit = async () => {
    const amount = parseInt(depositAmount);
    if (!amount || amount < 10000) { setDepositError('Minimum deposit is 10,000 VND'); return; }
    setDepositLoading(true); setDepositError(null);
    try {
      const res = await depositToWallet({ amount, note: depositNote || undefined });

      if (res?.data?.checkoutUrl) {
        window.location.assign(res.data.checkoutUrl);
        return;
      }

      setDepositResult(res.data);
    } catch (err) {
      setDepositError(err?.response?.data?.message || 'Failed to create payment link. Please try again.');
    } finally { setDepositLoading(false); }
  };

  const applyPaymentStatusBanner = useCallback((paymentData) => {
    const type = paymentData?.status === 'completed'
      ? 'success'
      : paymentData?.status === 'cancelled' || paymentData?.status === 'failed'
      ? 'cancelled'
      : 'pending';

    setPaymentBanner({
      type,
      amount: paymentData?.amount ?? null,
      code: paymentData?.transactionCode || paymentData?.orderCode || null,
    });

    return type;
  }, []);

  const syncPayOSDepositStatus = useCallback(async (orderCode) => {
    if (!orderCode) return null;
    const res = await getPayOSDepositStatus(orderCode);
    return res.data;
  }, []);

  const closeDepositModal = useCallback(() => {
    setShowDepositModal(false); setDepositAmount(''); setDepositNote('');
    setDepositResult(null); setDepositError(null);
    fetchWallet(); fetchTransactions(1);
  }, [fetchTransactions, fetchWallet]);

  const handleCheckDepositStatus = useCallback(async (orderCode, { closeOnFinal = false } = {}) => {
    if (!orderCode) return null;

    setCheckingDepositStatus(true);
    setDepositError(null);

    try {
      const paymentData = await syncPayOSDepositStatus(orderCode);
      const type = applyPaymentStatusBanner(paymentData);

      await fetchWallet();
      await fetchTransactions(1);

      if (type === 'pending') {
        setDepositError('Payment is still pending. Complete the PayOS payment and check again.');
      } else if (closeOnFinal) {
        closeDepositModal();
      }

      return { type, paymentData };
    } catch (err) {
      setDepositError(err?.response?.data?.message || 'Failed to check payment status.');
      return null;
    } finally {
      setCheckingDepositStatus(false);
    }
  }, [applyPaymentStatusBanner, closeDepositModal, fetchTransactions, fetchWallet, syncPayOSDepositStatus]);

  // ── Lock body scroll + hide floating chat when any modal is open
  useEffect(() => {
    const isOpen = showDepositModal || isAuthModalOpen;
    document.body.style.overflow = isOpen ? 'hidden' : '';
    document.documentElement.style.overflow = isOpen ? 'hidden' : '';
    window.dispatchEvent(new CustomEvent('app-modal-change', { detail: { open: isOpen } }));
    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
      window.dispatchEvent(new CustomEvent('app-modal-change', { detail: { open: false } }));
    };
  }, [showDepositModal, isAuthModalOpen]);

  // ── Read PayOS return params and synchronize with backend when possible
  useEffect(() => {
    const payment = searchParams.get('payment');
    const payosStatus = searchParams.get('status');
    const payosCancel = searchParams.get('cancel');
    const payosCode = searchParams.get('code');
    const orderCode = searchParams.get('orderCode');
    const hasPayOSNative = payosStatus || payosCancel !== null || payosCode;

    if (!payment && !hasPayOSNative) return;
    if (orderCode && !user) return;

    let disposed = false;
    let dismissTimer = null;

    const setFallbackBanner = async () => {
      let type;
      let amount = null;
      let code = null;

      if (payment) {
        type = payment;
        amount = searchParams.get('amount') ? parseInt(searchParams.get('amount'), 10) : null;
        code = searchParams.get('code') || null;
      } else {
        if (payosCancel === 'true' || payosStatus === 'CANCELLED') {
          type = 'cancelled';
        } else if (payosCode === '00' || payosStatus === 'PAID') {
          type = 'success';
        } else {
          type = 'pending';
        }
        code = orderCode;
      }

      if (disposed) return;
      setPaymentBanner({ type, amount, code });

      if ((type === 'success' || type === 'pending') && user) {
        await fetchWallet();
        await fetchTransactions(1);
      }
    };

    const syncReturnStatus = async () => {
      try {
        let bannerType = null;

        if (orderCode && user) {
          for (let attempt = 0; attempt < 4 && !disposed; attempt += 1) {
            try {
              const paymentData = await syncPayOSDepositStatus(orderCode);
              if (disposed || !paymentData) return;

              bannerType = applyPaymentStatusBanner(paymentData);
              await fetchWallet();
              await fetchTransactions(1);

              if (bannerType !== 'pending') {
                break;
              }

              if (attempt < 3) {
                await new Promise((resolve) => setTimeout(resolve, 2000));
              }
            } catch (error) {
              console.error('Failed to sync PayOS return status:', error);
              bannerType = null;
              break;
            }
          }
        }

        if (!bannerType && !disposed) {
          await setFallbackBanner();
        }

        if (!disposed) {
          setSearchParams({}, { replace: true });
          dismissTimer = setTimeout(() => {
            if (!disposed) setPaymentBanner(null);
          }, 8000);
        }
      } catch (error) {
        console.error('Failed to process PayOS return params:', error);
      }
    };

    syncReturnStatus();

    return () => {
      disposed = true;
      if (dismissTimer) clearTimeout(dismissTimer);
    };
  }, [
    applyPaymentStatusBanner,
    fetchTransactions,
    fetchWallet,
    searchParams,
    setSearchParams,
    syncPayOSDepositStatus,
    user,
  ]);

  // ─────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#F6F3EF] relative overflow-x-hidden font-sans text-[#1C2B33]">

      {/* ── Paw-print background ── */}
      <div className="fixed inset-0 pointer-events-none select-none overflow-hidden z-0 text-[#7A5230] opacity-[0.05]">
        {[
          { top: '6%',  left: '4%',  size: '88px',  rotate: '-22deg' },
          { top: '12%', left: '78%', size: '68px',  rotate: '38deg'  },
          { top: '32%', left: '90%', size: '54px',  rotate: '-8deg'  },
          { top: '55%', left: '1%',  size: '78px',  rotate: '18deg'  },
          { top: '72%', left: '68%', size: '96px',  rotate: '-28deg' },
          { top: '86%', left: '28%', size: '62px',  rotate: '30deg'  },
          { top: '48%', left: '48%', size: '115px', rotate: '-6deg'  },
          { top: '22%', left: '38%', size: '48px',  rotate: '44deg'  },
          { top: '3%',  left: '53%', size: '72px',  rotate: '-42deg' },
          { top: '93%', left: '82%', size: '58px',  rotate: '12deg'  },
          { top: '40%', left: '20%', size: '42px',  rotate: '-50deg' },
          { top: '65%', left: '52%', size: '36px',  rotate: '55deg'  },
        ].map((p, i) => (
          <div key={i} className="absolute" style={{ top: p.top, left: p.left, width: p.size, height: p.size, transform: `rotate(${p.rotate})` }}>
            <PawPrint />
          </div>
        ))}
      </div>

      <Navbar
        onLoginClick={() => { setAuthModalMode('login'); setIsAuthModalOpen(true); }}
        onRegisterClick={() => { setAuthModalMode('register'); setIsAuthModalOpen(true); }}
        user={user}
        onLogout={() => { setUser(null); navigate('/'); }}
      />

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} initialMode={authModalMode} onLoginSuccess={handleLoginSuccess} />

      <main className="relative z-10 pt-32 pb-16 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto space-y-6">

          {/* ══ PAYMENT RESULT BANNER ════════════════════════════ */}
          <AnimatePresence>
            {paymentBanner && (
              <MotionDiv
                initial={{ opacity: 0, y: -16, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -12, scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 320, damping: 28 }}
                className={`flex items-center justify-between gap-4 px-5 py-3.5 rounded-2xl border ${
                  paymentBanner.type === 'success'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : paymentBanner.type === 'cancelled'
                    ? 'bg-rose-50 border-rose-200 text-rose-800'
                    : 'bg-amber-50 border-amber-200 text-amber-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  {paymentBanner.type === 'success'
                    ? <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
                    : paymentBanner.type === 'cancelled'
                    ? <XCircle size={18} className="text-rose-400 shrink-0" />
                    : <Clock size={18} className="text-amber-500 shrink-0" />}
                  <div>
                    <p className="font-black text-sm">
                      {paymentBanner.type === 'success' ? 'Top-up successful!' :
                       paymentBanner.type === 'cancelled' ? 'Payment cancelled' :
                       'Payment is being processed'}
                    </p>
                    {paymentBanner.type === 'success' && paymentBanner.amount ? (
                      <p className="text-xs font-medium opacity-70">
                        {formatVND(paymentBanner.amount)} added to your wallet
                        {paymentBanner.code ? ` · ${paymentBanner.code}` : ''}
                      </p>
                    ) : paymentBanner.code ? (
                      <p className="text-xs font-medium opacity-70">Ref: {paymentBanner.code}</p>
                    ) : null}
                  </div>
                </div>
                <button onClick={() => setPaymentBanner(null)} className="shrink-0 opacity-50 hover:opacity-100 transition-opacity">
                  <X size={15} />
                </button>
              </MotionDiv>
            )}
          </AnimatePresence>

          {/* ══ PAGE HEADER ══════════════════════════════════════════ */}
          <MotionDiv initial={{ opacity: 0, y: -14 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-black tracking-tight">My Wallet</h1>
              <p className="text-sm text-[#1C2B33]/40 font-medium mt-0.5">Manage your HappyTails balance</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => { fetchWallet(); fetchTransactions(1); }}
                className="w-9 h-9 rounded-xl border border-[#1C2B33]/10 bg-white hover:bg-[#EDE8E2] flex items-center justify-center text-[#1C2B33]/50 hover:text-[#1C2B33] transition-all shadow-sm"
                title="Refresh"
              >
                <RefreshCw size={14} className={walletLoading ? 'animate-spin' : ''} />
              </button>
              <button
                onClick={() => setShowDepositModal(true)}
                disabled={!user}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#D97853] hover:bg-[#c86035] text-white text-sm font-bold rounded-xl shadow-lg shadow-orange-200/60 transition-all active:scale-95 disabled:opacity-40"
              >
                <Plus size={15} /> Top Up
              </button>
            </div>
          </MotionDiv>

          {/* ══ HERO CARD + STAT CARDS ══════════════════════════════ */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

            {/* Hero balance card — 2 cols */}
            <MotionDiv
              initial={{ opacity: 0, y: 32, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 220, damping: 22 }}
              className="lg:col-span-2 relative rounded-3xl overflow-hidden shadow-2xl shadow-[#1C2B33]/15 min-h-52"
            >
              <div className="absolute inset-0 bg-[#151f22]" />
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_82%_15%,rgba(217,120,83,0.50),transparent_58%)]" />
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_5%_95%,rgba(46,90,115,0.35),transparent_52%)]" />
              {/* Decorative paws inside card */}
              <div className="absolute -right-10 -bottom-8 w-52 h-52 text-white opacity-[0.045]"><PawPrint /></div>
              <div className="absolute right-24 top-2 w-20 h-20 text-white opacity-[0.055]"><PawPrint /></div>

              <div className="relative z-10 p-7 h-full flex flex-col justify-between gap-8">
                {/* Top row */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-sm border border-white/10 shadow-inner">
                      <WalletIcon size={20} className="text-white" />
                    </div>
                    <div>
                      <p className="text-white font-bold text-sm">HappyTails Wallet</p>
                      {user && <p className="text-white/40 text-[11px] truncate max-w-52">{user.email}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm border border-white/10 rounded-full px-3 py-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-white/55 text-[10px] font-bold uppercase tracking-wider">Active</span>
                  </div>
                </div>

                {/* Balance */}
                <div>
                  <p className="text-white/30 text-[11px] font-bold uppercase tracking-[0.18em] mb-3">Available Balance</p>
                  {walletLoading ? (
                    <div className="h-12 w-52 bg-white/10 rounded-xl animate-pulse" />
                  ) : walletError ? (
                    <p className="text-rose-400 text-sm font-semibold">{walletError}</p>
                  ) : (
                    <p className="text-5xl font-black text-white tracking-tight tabular-nums leading-none">
                      {wallet ? formatVND(wallet.balance) : '0 ₫'}
                    </p>
                  )}
                </div>
              </div>
            </MotionDiv>

            {/* Stat cards column */}
            <div className="flex flex-col gap-4">
              <MotionDiv
                initial={{ opacity: 0, x: 28, scale: 0.94 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                whileHover={{ y: -5, transition: { type: 'spring', stiffness: 400, damping: 20 } }}
                transition={{ type: 'spring', stiffness: 280, damping: 22, delay: 0.12 }}
                className="flex-1 bg-white border border-[#1C2B33]/8 rounded-3xl p-5 shadow-sm relative overflow-hidden cursor-default"
              >
                <div className="absolute -right-5 -top-5 w-24 h-24 rounded-full bg-emerald-500/8" />
                <div className="flex items-center justify-between mb-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
                    <TrendingUp size={17} className="text-emerald-600" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#1C2B33]/30">Total In</span>
                </div>
                <p className="text-2xl font-black text-emerald-600 tabular-nums">
                  {wallet ? formatVND(wallet.totalDeposited) : '—'}
                </p>
                <p className="text-xs text-[#1C2B33]/35 font-medium mt-0.5">Lifetime deposits</p>
              </MotionDiv>

              <MotionDiv
                initial={{ opacity: 0, x: 28, scale: 0.94 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                whileHover={{ y: -5, transition: { type: 'spring', stiffness: 400, damping: 20 } }}
                transition={{ type: 'spring', stiffness: 280, damping: 22, delay: 0.19 }}
                className="flex-1 bg-white border border-[#1C2B33]/8 rounded-3xl p-5 shadow-sm relative overflow-hidden cursor-default"
              >
                <div className="absolute -right-5 -top-5 w-24 h-24 rounded-full bg-violet-500/8" />
                <div className="flex items-center justify-between mb-3">
                  <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center">
                    <Hash size={17} className="text-violet-500" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#1C2B33]/30">Transactions</span>
                </div>
                <p className="text-2xl font-black text-violet-600 tabular-nums">
                  {txPagination.total || 0}
                </p>
                <p className="text-xs text-[#1C2B33]/35 font-medium mt-0.5">Total recorded</p>
              </MotionDiv>
            </div>
          </div>

          {/* ══ ACTIVITY CHART + TRANSACTION LIST ══════════════════ */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

            {/* Activity chart — 3 cols — light card */}
            <MotionDiv
              initial={{ opacity: 0, y: 32, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 230, damping: 24, delay: 0.22 }}
              className="lg:col-span-3 relative rounded-3xl overflow-hidden bg-white border border-[#1C2B33]/8 flex flex-col lg:h-[560px]"
              style={{ boxShadow: '0 8px 32px -4px rgba(28,43,51,0.10)' }}
            >
              {/* Subtle orange radial accent top-right */}
              <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 92% 0%, rgba(217,120,83,0.10) 0%, transparent 55%)' }} />
              {/* Paw watermarks */}
              <div className="absolute -right-8 -bottom-8 text-[#D97853]" style={{ width: 160, height: 160, opacity: 0.055 }}><PawPrint /></div>

              <div className="relative z-10 p-6 h-full flex flex-col">
                {/* Header */}
                <div className="flex items-end justify-between mb-5">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-[#D97853]/10">
                        <Activity size={14} className="text-[#D97853]" />
                      </div>
                      <h3 className="text-[#1C2B33] font-black text-sm">Activity Overview</h3>
                    </div>
                    <p className="text-[11px] font-medium text-[#1C2B33]/40">Last 7 days · completed top-ups</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black text-[#D97853] tabular-nums leading-none">
                      {formatShort(chartData.reduce((s, d) => s + d['Top Up'], 0))}
                    </p>
                    <p className="text-[10px] font-bold mt-0.5 text-[#1C2B33]/35">VND this week</p>
                  </div>
                </div>

                {/* Legend */}
                <div className="flex items-center gap-2 mb-5">
                  <div className="w-8 h-0.5 rounded-full" style={{ background: 'linear-gradient(to right, #D97853, #f59e0b)' }} />
                  <span className="text-[11px] font-bold text-[#1C2B33]/40">Top Up</span>
                </div>

                {txLoading ? (
                  <div className="h-52 lg:h-full flex items-center justify-center">
                    <Loader2 size={24} className="animate-spin text-[#D97853]" />
                  </div>
                ) : (
                  <div className="h-52 lg:flex-1 lg:min-h-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                        <defs>
                          <linearGradient id="gDeposit" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%"   stopColor="#D97853" stopOpacity={0.55} />
                            <stop offset="45%"  stopColor="#f59e0b" stopOpacity={0.18} />
                            <stop offset="100%" stopColor="#D97853" stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="4 8" stroke="#EDE8E2" vertical={false} />
                        <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94A3B8', fontWeight: 600 }} axisLine={false} tickLine={false} />
                        <YAxis tickFormatter={formatShort} tick={{ fontSize: 10, fill: '#94A3B8', fontWeight: 600 }} axisLine={false} tickLine={false} width={46} />
                        <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'rgba(217,120,83,0.25)', strokeWidth: 1, strokeDasharray: '5 4' }} />
                        <Area
                          type="monotone"
                          dataKey="Top Up"
                          stroke="#D97853"
                          strokeWidth={2.5}
                          fill="url(#gDeposit)"
                          dot={false}
                          activeDot={{ r: 6, fill: '#D97853', stroke: '#fff', strokeWidth: 2.5 }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </MotionDiv>

            {/* Transaction list — 2 cols */}
            <MotionDiv
              initial={{ opacity: 0, y: 32, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 230, damping: 24, delay: 0.30 }}
              className="lg:col-span-2 bg-white border border-[#1C2B33]/8 rounded-3xl overflow-hidden shadow-sm flex flex-col lg:h-[560px] min-h-0"
            >
              {/* Header */}
              <div className="px-5 pt-5 pb-4 border-b border-[#1C2B33]/5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-base">Transactions</h3>
                  {txPagination.total > 0 && (
                    <span className="text-xs font-black px-2 py-0.5 bg-[#1C2B33]/6 rounded-full text-[#1C2B33]/40">{txPagination.total}</span>
                  )}
                </div>
                <div className="flex gap-1 flex-wrap">
                  {TX_FILTERS.map(tab => (
                    <button
                      key={tab.key}
                      onClick={() => setTxFilter(tab.key)}
                      className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all ${
                        txFilter === tab.key ? 'text-white' : 'text-[#1C2B33]/40 hover:text-[#1C2B33] hover:bg-[#1C2B33]/5'
                      }`}
                      style={txFilter === tab.key ? { background: 'linear-gradient(135deg, #D97853, #f59e0b)', boxShadow: '0 4px 12px -2px rgba(217,120,83,0.35)' } : {}}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* List body */}
              <div className="flex-1 min-h-0 overflow-y-auto">
                {txLoading ? (
                  <div className="flex flex-col items-center justify-center py-14 gap-3">
                    <Loader2 size={24} className="animate-spin text-[#D97853]" />
                    <p className="text-sm text-[#1C2B33]/30 font-medium">Loading...</p>
                  </div>
                ) : transactions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-14 px-6">
                    <div className="w-14 h-14 rounded-2xl bg-[#1C2B33]/5 flex items-center justify-center mb-3">
                      <Banknote size={24} className="text-[#1C2B33]/20" />
                    </div>
                    <p className="font-bold text-[#1C2B33]/40 text-sm mb-1">No transactions yet</p>
                    <p className="text-xs text-[#1C2B33]/25 text-center">
                      {txFilter === 'all' ? 'Top up your wallet to get started' : 'No transactions of this type'}
                    </p>
                    {txFilter === 'all' && (
                      <button
                        onClick={() => setShowDepositModal(true)}
                        className="mt-4 flex items-center gap-2 px-4 py-2 bg-[#D97853] hover:bg-[#c86035] text-white text-xs font-bold rounded-xl transition-all"
                      >
                        <Plus size={13} /> Top Up Now
                      </button>
                    )}
                  </div>
                ) : (
                  <ul className="divide-y divide-[#1C2B33]/5">
                    {transactions.map((tx, idx) => {
                      const typeConf   = TX_TYPE_CONFIG[tx.type]   || TX_TYPE_CONFIG.deposit;
                      const statusConf = TX_STATUS_CONFIG[tx.status] || TX_STATUS_CONFIG.pending;
                      const TxIcon     = typeConf.icon;
                      const StatusIcon = statusConf.icon;
                      const isIncoming = tx.type === 'deposit' || tx.type === 'refund';
                      return (
                        <MotionLi
                          key={tx._id || idx}
                          initial={{ opacity: 0, x: 8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.04 }}
                          className="flex items-center gap-3.5 px-5 py-3.5 hover:bg-[#F6F3EF]/70 transition-colors"
                        >
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${typeConf.bg} border ${typeConf.border}`}>
                            <TxIcon size={16} className={typeConf.color} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <p className="text-xs font-bold truncate">{typeConf.label}</p>
                              <span className={`flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-md ${statusConf.bg} ${statusConf.color}`}>
                                <StatusIcon size={8} />{statusConf.label}
                              </span>
                            </div>
                            <p className="text-[10px] text-[#1C2B33]/30 font-medium">
                              {new Date(tx.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                          <p className={`text-sm font-black tabular-nums shrink-0 ${typeConf.amountColor}`}>
                            {isIncoming ? '+' : '−'}{formatVND(tx.amount)}
                          </p>
                        </MotionLi>
                      );
                    })}
                  </ul>
                )}
              </div>

              {/* Pagination */}
              {txPagination.pages > 1 && (
                <div className="flex items-center justify-between px-5 py-3 border-t border-[#1C2B33]/5 bg-[#F6F3EF]/50">
                  <span className="text-[10px] text-[#1C2B33]/35 font-medium">
                    Page {txPagination.page} of {txPagination.pages}
                  </span>
                  <div className="flex gap-1">
                    <button disabled={txPagination.page <= 1} onClick={() => fetchTransactions(txPagination.page - 1)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white border border-[#1C2B33]/8 disabled:opacity-30 transition-all"><ChevronLeft size={13} /></button>
                    <button disabled={txPagination.page >= txPagination.pages} onClick={() => fetchTransactions(txPagination.page + 1)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white border border-[#1C2B33]/8 disabled:opacity-30 transition-all"><ChevronRight size={13} /></button>
                  </div>
                </div>
              )}
            </MotionDiv>

          </div>
        </div>
      </main>

      {/* ══ DEPOSIT MODAL ══════════════════════════════════════════ */}
      <AnimatePresence>
        {showDepositModal && (
          <MotionDiv
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={(e) => { if (e.target === e.currentTarget) closeDepositModal(); }}
          >
            <MotionDiv
              initial={{ opacity: 0, y: 40, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 320, damping: 30 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              {/* Modal header */}
              <div className="relative bg-[#151f22] px-6 pt-6 pb-5">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(217,120,83,0.35),transparent_58%)]" />
                <div className="absolute -right-6 -bottom-4 w-28 h-28 text-white opacity-[0.07]"><PawPrint /></div>
                <div className="relative flex items-center justify-between">
                  <div>
                    <p className="text-white/40 text-[11px] font-bold uppercase tracking-widest mb-1">HappyTails Wallet</p>
                    <p className="text-white font-black text-lg">Top Up Balance</p>
                  </div>
                  <button onClick={closeDepositModal} className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors">
                    <X size={16} />
                  </button>
                </div>
                {wallet && (
                  <div className="relative mt-3 flex items-center gap-2">
                    <WalletIcon size={12} className="text-white/30" />
                    <p className="text-white/30 text-xs font-medium">
                      Current balance: <span className="text-white/55 font-bold">{formatVND(wallet.balance)}</span>
                    </p>
                  </div>
                )}
              </div>

              <div className="p-6">
                {!depositResult ? (
                  <>
                    {/* Preset grid */}
                    <div className="grid grid-cols-3 gap-2 mb-5">
                      {PRESET_AMOUNTS.map(preset => (
                        <button
                          key={preset}
                          onClick={() => setDepositAmount(String(preset))}
                          className={`py-3 px-2 rounded-2xl text-xs font-black border-2 transition-all active:scale-95 ${
                            depositAmount === String(preset)
                              ? 'bg-[#D97853] text-white border-[#D97853] shadow-lg shadow-orange-200'
                              : 'bg-white text-[#1C2B33] border-[#1C2B33]/10 hover:border-[#D97853]/40 hover:bg-orange-50/50'
                          }`}
                        >
                          {new Intl.NumberFormat('vi-VN').format(preset)}
                          <span className="block text-[9px] font-semibold opacity-60 mt-0.5">VND</span>
                        </button>
                      ))}
                    </div>

                    {/* Custom amount */}
                    <div className="mb-4">
                      <label className="text-[11px] font-bold text-[#1C2B33]/40 uppercase tracking-wider block mb-2">Custom Amount</label>
                      <div className="relative">
                        <input
                          type="number" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)}
                          placeholder="0" min={10000}
                          className="w-full border-2 border-[#1C2B33]/10 rounded-2xl pl-4 pr-16 py-3.5 text-xl font-black tabular-nums focus:outline-none focus:border-[#D97853] transition-all"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-[#1C2B33]/25">VND</span>
                      </div>
                      {depositAmount && parseInt(depositAmount) >= 10000 && (
                        <p className="text-sm text-[#D97853] font-bold mt-2 tabular-nums">→ {formatVND(parseInt(depositAmount))}</p>
                      )}
                    </div>

                    {/* Note */}
                    <div className="mb-5">
                      <label className="text-[11px] font-bold text-[#1C2B33]/40 uppercase tracking-wider block mb-2">Note (optional)</label>
                      <input
                        type="text" value={depositNote} onChange={(e) => setDepositNote(e.target.value)}
                        placeholder="e.g. March top-up..." maxLength={100}
                        className="w-full border-2 border-[#1C2B33]/10 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-[#D97853] transition-all"
                      />
                    </div>

                    <div className="flex items-start gap-2.5 p-3.5 bg-[#F6F3EF] border border-[#1C2B33]/8 rounded-2xl mb-4">
                      <ExternalLink size={15} className="text-[#D97853] shrink-0 mt-0.5" />
                      <p className="text-sm text-[#1C2B33]/60 font-medium leading-snug">
                        After you continue, HappyTails will open the PayOS checkout page immediately. Once payment succeeds, your wallet will sync automatically when you return.
                      </p>
                    </div>

                    {depositError && (
                      <div className="flex items-start gap-2.5 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl mb-4">
                        <AlertCircle size={15} className="text-rose-500 shrink-0 mt-0.5" />
                        <p className="text-sm text-rose-600 font-medium leading-snug">{depositError}</p>
                      </div>
                    )}

                    <div className="flex gap-3">
                      <button
                        onClick={closeDepositModal}
                        className="w-28 shrink-0 py-3.5 border-2 border-[#1C2B33]/10 text-[#1C2B33]/60 hover:text-[#1C2B33] hover:border-[#1C2B33]/20 font-bold rounded-2xl text-sm transition-all"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleDeposit}
                        disabled={depositLoading || !depositAmount || parseInt(depositAmount) < 10000}
                        className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-[#D97853] hover:bg-[#c86035] text-white font-black rounded-2xl text-sm shadow-lg shadow-orange-200 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {depositLoading
                          ? <><Loader2 size={16} className="animate-spin" /> Redirecting to PayOS...</>
                          : <><ExternalLink size={16} /> Continue to PayOS</>
                        }
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-4">
                      <CheckCircle2 size={32} className="text-emerald-500" />
                    </div>
                    <h4 className="font-black text-xl mb-1">Payment Link Ready</h4>
                    <p className="text-sm text-[#1C2B33]/40 mb-5">
                      Automatic redirect did not start. Open PayOS to top up{' '}
                      <span className="font-black text-[#D97853]">{formatVND(depositResult.amount)}</span>
                    </p>
                    <div className="flex flex-col gap-2.5">
                      <a
                        href={depositResult.checkoutUrl} target="_blank" rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 py-3.5 bg-[#D97853] hover:bg-[#c86035] text-white font-black rounded-2xl text-sm shadow-lg shadow-orange-200 transition-all"
                      >
                        <ExternalLink size={15} /> Go to PayOS now
                      </a>
                      <button
                        onClick={() => handleCheckDepositStatus(depositResult.orderCode, { closeOnFinal: true })}
                        disabled={checkingDepositStatus}
                        className="flex items-center justify-center gap-2 py-3 border-2 border-[#D97853]/20 text-sm font-bold text-[#D97853] hover:bg-orange-50 rounded-2xl transition-all disabled:opacity-50"
                      >
                        {checkingDepositStatus ? (
                          <><Loader2 size={15} className="animate-spin" /> Checking status...</>
                        ) : (
                          <><RefreshCw size={15} /> I have paid, check status</>
                        )}
                      </button>
                      <button onClick={closeDepositModal} className="py-3 border-2 border-[#1C2B33]/10 text-sm font-bold text-[#1C2B33]/50 hover:text-[#1C2B33] hover:border-[#1C2B33]/20 rounded-2xl transition-all">
                        Close &amp; Refresh Wallet
                      </button>
                    </div>
                    {depositError && (
                      <div className="mt-3 flex items-start gap-2.5 p-3 bg-amber-50 border border-amber-200 rounded-2xl text-left">
                        <AlertCircle size={15} className="text-amber-500 shrink-0 mt-0.5" />
                        <p className="text-sm text-amber-700 font-medium leading-snug">{depositError}</p>
                      </div>
                    )}
                    <p className="text-[10px] text-[#1C2B33]/20 font-mono mt-4">{depositResult.transactionCode}</p>
                  </div>
                )}
              </div>
            </MotionDiv>
          </MotionDiv>
        )}
      </AnimatePresence>
    </div>
  );
}


