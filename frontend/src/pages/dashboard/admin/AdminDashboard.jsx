import React, { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertCircle,
  BarChart3,
  Clock3,
  RefreshCw,
  ShieldAlert,
  ShoppingBag,
  Users,
  Wallet,
} from "lucide-react";
import { getErrorMessage } from "../../../utils/apiResponseHandler";
import {
  getOverview,
  getRevenueStats,
  getTopServices,
} from "../../../api/userApi";

const currencyFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat("vi-VN");

const formatShort = (n) => {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return `${n || 0}`;
};

const RANGE_OPTIONS = [
  { label: "7 days", value: 7 },
  { label: "30 days", value: 30 },
  { label: "90 days", value: 90 },
];

const GROUP_OPTIONS = [
  { label: "Day", value: "day" },
  { label: "Week", value: "week" },
  { label: "Month", value: "month" },
];

const formatShortDate = (value) => {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
  }).format(date);
};

const RevenueChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: "rgba(15,24,32,0.96)",
        backdropFilter: "blur(14px)",
        border: "1px solid rgba(217,120,83,0.25)",
        boxShadow: "0 20px 40px -8px rgba(0,0,0,0.50)",
      }}
      className="rounded-2xl px-4 py-3"
    >
      <p className="text-[10px] font-black uppercase tracking-widest mb-2.5 text-white/40">
        {formatShortDate(label)}
      </p>
      <div className="flex items-center gap-2.5">
        <div
          className="w-2.5 h-2.5 rounded-full shrink-0"
          style={{ background: "linear-gradient(135deg,#D97853,#f59e0b)" }}
        />
        <span className="text-white font-black text-sm tabular-nums">
          {currencyFormatter.format(payload[0].value || 0)}
        </span>
      </div>
      <p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-white/35">
        {numberFormatter.format(payload[0].payload?.orders || 0)} orders
      </p>
    </div>
  );
};

const StatCard = ({ icon: Icon, label, value, accent, helper }) => (
  <div className="rounded-[24px] border border-[#2D3436]/8 bg-white p-5 shadow-[0_10px_30px_rgba(45,52,54,0.05)]">
    <div className="mb-4 flex items-center justify-between">
      <div
        className={`flex h-11 w-11 items-center justify-center rounded-2xl ${accent}`}
      >
        <Icon size={20} className="text-white" />
      </div>
      <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#2D3436]/35">
        Live
      </span>
    </div>
    <p className="text-sm font-medium text-[#2D3436]/55">{label}</p>
    <p className="mt-2 text-3xl font-black tracking-tight text-[#2D3436]">
      {value}
    </p>
    <p className="mt-3 text-xs font-medium text-[#2D3436]/45">{helper}</p>
  </div>
);

const AdminDashboard = () => {
  const [rangeDays, setRangeDays] = useState(30);
  const [groupBy, setGroupBy] = useState("day");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);
  const [overview, setOverview] = useState(null);
  const [revenueSummary, setRevenueSummary] = useState(null);
  const [revenueChart, setRevenueChart] = useState([]);
  const [topServices, setTopServices] = useState([]);

  const filters = useMemo(() => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - (rangeDays - 1));

    return {
      from: from.toISOString().split("T")[0],
      to: to.toISOString().split("T")[0],
      groupBy,
    };
  }, [groupBy, rangeDays]);

  const loadDashboard = useCallback(
    async (silent = false) => {
      try {
        if (silent) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }
        setError("");

        const [overviewResponse, revenueResponse, topServicesResponse] =
          await Promise.all([
            getOverview(),
            getRevenueStats(filters),
            getTopServices({ from: filters.from, to: filters.to, limit: 3 }),
          ]);

        setOverview(overviewResponse.data || null);
        setRevenueSummary(revenueResponse.data?.summary || null);
        setRevenueChart(revenueResponse.data?.chart || []);
        setTopServices(topServicesResponse.data?.data || []);
        setLastUpdated(new Date());
      } catch (loadError) {
        setError(getErrorMessage(loadError));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [filters],
  );

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      loadDashboard(true);
    }, 60000);

    return () => window.clearInterval(intervalId);
  }, [loadDashboard]);

  const chartData = useMemo(
    () =>
      (revenueChart || []).map((item) => ({
        ...item,
      })),
    [revenueChart],
  );

  const stats = [
    {
      label: "Users",
      value: numberFormatter.format(overview?.totalUsers || 0),
      helper: `${numberFormatter.format(overview?.newUsersToday || 0)} new today`,
      icon: Users,
      accent: "bg-[#7FB069]",
    },
    {
      label: "Pending Orders",
      value: numberFormatter.format(overview?.pendingOrders || 0),
      helper: `${numberFormatter.format(overview?.totalOrders || 0)} total orders`,
      icon: ShoppingBag,
      accent: "bg-[#D97853]",
    },
    {
      label: "Revenue",
      value: currencyFormatter.format(overview?.totalRevenue || 0),
      helper: `Avg order ${currencyFormatter.format(overview?.avgOrderValue || 0)}`,
      icon: Wallet,
      accent: "bg-[#5B8C51]",
    },
    {
      label: "Blocked Users",
      value: numberFormatter.format(overview?.blockedUsers || 0),
      helper: `${numberFormatter.format(overview?.totalAdmins || 0)} admins active`,
      icon: ShieldAlert,
      accent: "bg-[#2D3436]",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#D97853] mb-1">
            Admin Overview
          </h1>
          <p className="text-sm text-[#2D3436]/60">
            Realtime snapshot of users, orders, revenue, and top-performing
            services.
          </p>
        </div>

        <div className="flex flex-col gap-3 lg:items-end">
          <div className="flex flex-wrap gap-2">
            {RANGE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setRangeDays(option.value)}
                className={`rounded-full px-4 py-2 text-xs font-bold transition-colors ${
                  rangeDays === option.value
                    ? "bg-[#D97853] text-white shadow-lg shadow-[#D97853]/20"
                    : "bg-white text-[#2D3436]/70 hover:text-[#D97853]"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-full bg-white p-1 shadow-sm">
              {GROUP_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setGroupBy(option.value)}
                  className={`rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
                    groupBy === option.value
                      ? "bg-[#2D3436] text-white"
                      : "text-[#2D3436]/50"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => loadDashboard(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-bold text-[#2D3436] shadow-sm transition hover:text-[#D97853] disabled:cursor-not-allowed disabled:opacity-70"
            >
              <RefreshCw
                size={14}
                className={refreshing ? "animate-spin" : ""}
              />
              Refresh
            </button>
          </div>

          <div className="inline-flex items-center gap-2 text-xs font-medium text-[#2D3436]/50">
            <Clock3 size={14} />
            Updated{" "}
            {lastUpdated ? lastUpdated.toLocaleTimeString("en-GB") : "--"}
          </div>
        </div>
      </div>

      {error ? (
        <div className="flex items-start gap-3 rounded-[22px] border border-red-200 bg-red-50 p-4 text-red-700">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-bold">Unable to load dashboard data</p>
            <p className="mt-1 text-sm">{error}</p>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.35fr_0.85fr] items-stretch">
        <div className="rounded-[24px] border border-[#2D3436]/8 bg-white p-6 shadow-[0_14px_40px_rgba(45,52,54,0.05)]">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-black text-[#2D3436]">
                Revenue Timeline
              </h3>
              <p className="mt-1 text-sm text-[#2D3436]/55">
                {revenueSummary
                  ? `${formatShortDate(revenueSummary.periodFrom)} to ${formatShortDate(revenueSummary.periodTo)}`
                  : "Loading selected period"}
              </p>
            </div>
            <div className="rounded-2xl bg-[#FDFBF7] px-4 py-3 text-right">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#2D3436]/35">
                Period Revenue
              </p>
              <p className="mt-1 text-lg font-black text-[#D97853]">
                {currencyFormatter.format(revenueSummary?.totalRevenue || 0)}
              </p>
            </div>
          </div>

          <div className="h-[260px] rounded-[24px] bg-[linear-gradient(180deg,#fdfbf7_0%,#ffffff_100%)] p-4">
            {loading ? (
              <div className="h-full animate-pulse rounded-2xl bg-[#E8F3D6]/50" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={chartData}
                  margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
                >
                  <defs>
                    <linearGradient id="gRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="0%"
                        stopColor="#D97853"
                        stopOpacity={0.55}
                      />
                      <stop
                        offset="45%"
                        stopColor="#f59e0b"
                        stopOpacity={0.18}
                      />
                      <stop
                        offset="100%"
                        stopColor="#D97853"
                        stopOpacity={0.02}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="4 8"
                    stroke="#EDE8E2"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatShortDate}
                    tick={{ fontSize: 11, fill: "#94A3B8", fontWeight: 600 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={formatShort}
                    tick={{ fontSize: 10, fill: "#94A3B8", fontWeight: 600 }}
                    axisLine={false}
                    tickLine={false}
                    width={52}
                  />
                  <Tooltip
                    content={<RevenueChartTooltip />}
                    cursor={{
                      stroke: "rgba(217,120,83,0.25)",
                      strokeWidth: 1,
                      strokeDasharray: "5 4",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#D97853"
                    strokeWidth={2.5}
                    fill="url(#gRevenue)"
                    dot={false}
                    activeDot={{
                      r: 6,
                      fill: "#D97853",
                      stroke: "#fff",
                      strokeWidth: 2.5,
                    }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="h-full">
          <div className="h-full rounded-[24px] border border-[#2D3436]/8 bg-white p-6 shadow-[0_14px_40px_rgba(45,52,54,0.05)]">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-[#2D3436]">
                  Top Services
                </h3>
                <p className="mt-1 text-sm text-[#2D3436]/55">
                  Top 3 services by completed booking orders
                </p>
              </div>
              <BarChart3 size={18} className="text-[#D97853]" />
            </div>

            <div className="space-y-3">
              {topServices.length ? (
                topServices.map((service) => (
                  <div
                    key={service.serviceId || service.rank}
                    className="rounded-[20px] bg-[#FDFBF7] p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#2D3436]/35">
                          #{service.rank}
                        </p>
                        <h4 className="mt-1 text-sm font-black text-[#2D3436]">
                          {service.serviceName}
                        </h4>
                      </div>
                      <span className="rounded-full bg-[#D97853]/10 px-3 py-1 text-xs font-bold text-[#D97853]">
                        {service.orderShare ||
                          `${numberFormatter.format(service.totalOrders || 0)} orders`}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs text-[#2D3436]/60">
                      <span>
                        {numberFormatter.format(service.totalOrders || 0)}{" "}
                        orders
                      </span>
                      <span>
                        {currencyFormatter.format(service.totalRevenue || 0)}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-[20px] bg-[#FDFBF7] p-5 text-sm text-[#2D3436]/55">
                  No completed booking data found for this period.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default AdminDashboard;
