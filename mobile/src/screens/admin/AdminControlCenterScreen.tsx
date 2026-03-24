import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Dimensions, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import Svg, { Path, Defs, LinearGradient, Stop, Circle, Line as SvgLine } from "react-native-svg";
import { useAuth } from "../../context/AuthContext";
import { getAdminOverview, getAdminRevenueStats, getAdminTopServices } from "../../api/modules/adminApi";

const COLORS = {
  bg: "#FFF9F5",
  cardBg: "#FFFFFF",
  primary: "#D97B48",
  primaryLight: "#F2AB82",
  primaryLighter: "#FFF0E6",
  primaryDark: "#B05D2E",
  textHeader: "#2B1D16",
  textBody: "#7A6458",
  textLabel: "#B59E92",
  textMuted: "#C4B2A8",
  border: "#F5E6DC",
  dangerText: "#D14E4E",
  dangerBg: "#FCECEC",
  warningBg: "#FDF3E1",
  successBg: "#E8F5E9",
  tooltipBg: "#1E2732",
};

const screenWidth = Dimensions.get("window").width;
const chartWidth = screenWidth - 48 - 36; // Padding & Y-axis width
const chartHeight = 160;

function formatCompactNumber(val: number) {
  if (val >= 1000) return (val / 1000).toFixed(1) + "k";
  return val.toString();
}

function formatCurrency(val: number) {
  return new Intl.NumberFormat("vi-VN").format(val) + " ₫";
}

// Generate smooth cubic bezier line path
function generateChartPath(data: any[], width: number, height: number, maxVal: number) {
  if (!data || data.length === 0) return { line: "", area: "", points: [] };
  const safeMax = Math.max(maxVal, 1);
  
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - (d.amount / safeMax) * (height - 20) - 10;
    return { x, y, ...d };
  });
  
  let d = `M ${points[0].x},${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];
    const midX = (p1.x + p2.x) / 2;
    d += ` C ${midX},${p1.y} ${midX},${p2.y} ${p2.x},${p2.y}`;
  }
  
  const area = `${d} L ${points[points.length - 1].x},${height} L ${points[0].x},${height} Z`;
  
  return { line: d, area, points };
}

const DEFAULT_CHART_DATA = [
  { day: "11 Mar", amount: 0, orders: 0 },
  { day: "12 Mar", amount: 0, orders: 0 },
  { day: "13 Mar", amount: 10000, orders: 1 },
  { day: "14 Mar", amount: 59000, orders: 5 },
  { day: "15 Mar", amount: 60500, orders: 5 },
  { day: "16 Mar", amount: 0, orders: 0 },
  { day: "17 Mar", amount: 1000, orders: 1 },
  { day: "18 Mar", amount: 60000, orders: 4 },
  { day: "19 Mar", amount: 0, orders: 0 },
  { day: "22 Mar", amount: 500, orders: 1 },
  { day: "23 Mar", amount: 0, orders: 0 },
  { day: "24 Mar", amount: 0, orders: 0 },
];

const DEFAULT_SERVICES = [
  { id: 1, name: "Bath & Dry", icon: "home", revenue: 1125000, average: "25 orders", trend: "59.52%", iconBg: "#FFF1E6", iconColor: "#D97B48" },
  { id: 2, name: "Creative Dye", icon: "scissors", revenue: 1320000, average: "11 orders", trend: "26.19%", iconBg: "#FCECEC", iconColor: "#D14E4E" },
  { id: 3, name: "Ear & Eye Cleaning", icon: "briefcase", revenue: 120000, average: "6 orders", trend: "14.29%", iconBg: "#FDF3E1", iconColor: "#DDA032" },
];

export function AdminControlCenterScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeIdx, setActiveIdx] = useState<number | null>(4); // Default to a point
  
  // States
  const [kpi, setKpi] = useState({ users: 12482, pending: 84, revenue: 42800, suspended: 12 });
  const [chartData, setChartData] = useState<any[]>(DEFAULT_CHART_DATA);
  const [services, setServices] = useState<any[]>(DEFAULT_SERVICES);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [overviewRes, revenueRes, servicesRes] = await Promise.all([
        getAdminOverview().catch(() => null),
        getAdminRevenueStats().catch(() => null),
        getAdminTopServices().catch(() => null)
      ]);
      
      if (overviewRes) {
        setKpi(prev => ({
          users: Number(overviewRes.totalUsers ?? overviewRes.users ?? prev.users),
          pending: Number(overviewRes.pendingOrders ?? overviewRes.pendingApprovals ?? prev.pending),
          revenue: Number(overviewRes.totalRevenue ?? overviewRes.revenue ?? prev.revenue),
          suspended: Number(overviewRes.blockedUsers ?? overviewRes.suspendedUsers ?? prev.suspended),
        }));
      }

      const revList = revenueRes?.chart || revenueRes?.timeline || revenueRes?.data;
      if (Array.isArray(revList) && revList.length > 0) {
        const mappedChart = revList.map((d: any) => {
          // Format date string from backend (e.g. "2024-03-15" => "15 Mar")
          let dayStr = d.date || d.day || "Unknown";
          if (dayStr.includes("-")) {
            const dateObj = new Date(dayStr);
            if (!isNaN(dateObj.getTime())) {
              const parts = dateObj.toDateString().split(" ");
              dayStr = `${parts[2]} ${parts[1]}`;
            }
          }
          return {
            day: dayStr,
            amount: Number(d.amount ?? d.revenue ?? d.value) || 0,
            orders: Number(d.orders ?? d.count) || 0
          };
        });
        setChartData(mappedChart);
      }

      const svcList = servicesRes?.topServices || servicesRes?.data;
      if (Array.isArray(svcList) && svcList.length > 0) {
        const mappedServices = svcList.slice(0, 3).map((s: any, idx: number) => {
          const fallback = DEFAULT_SERVICES[idx % DEFAULT_SERVICES.length];
          return {
            id: s.serviceId || s.id || s._id || idx,
            name: s.serviceName || s.name || s.title || fallback.name,
            icon: s.icon || fallback.icon,
            revenue: Number(s.totalRevenue ?? s.revenue) || fallback.revenue,
            average: s.totalOrders ? `${s.totalOrders} orders` : fallback.average,
            trend: s.orderShare ? String(s.orderShare).replace(" %", "%") : fallback.trend,
            iconBg: fallback.iconBg,
            iconColor: fallback.iconColor
          };
        });
        setServices(mappedServices);
      }
    } catch (error) {
       // Proceed with current default data gracefully
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (!user || user.role !== "admin") {
    return (
      <View style={styles.centerWrap}>
        <Text style={styles.errorTitle}>Khu vuc danh rieng cho admin</Text>
      </View>
    );
  }

  const maxY = Math.max(...chartData.map(d => d.amount), 80000);
  const maxLabel = Math.ceil(maxY / 20000) * 20000 || 80000;
  const yLabels = [maxLabel, maxLabel * 0.75, maxLabel * 0.5, maxLabel * 0.25, 0];
  const { line, area, points } = generateChartPath(chartData, chartWidth, chartHeight, maxLabel);

  const periodRevenue = chartData.reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Dynamic Header Overlay */}
      <View style={styles.heroSection}>
        <Text style={styles.heroTitle}>Dashboard Overview</Text>
        <Text style={styles.heroSubtitle}>Welcome back, administrator. Here's your daily pulse.</Text>
      </View>

      {/* KPI GRID */}
      <View style={styles.kpiGrid}>
        <View style={styles.kpiRow}>
          <View style={styles.kpiCard}>
            <View style={styles.kpiIconBox}><Feather name="users" size={16} color={COLORS.primary} /></View>
            <Text style={styles.kpiLabel}>TOTAL USERS</Text>
            <Text style={styles.kpiValue}>{formatCompactNumber(kpi.users)}</Text>
            <View style={styles.kpiTrendWrap}>
              <Feather name="trending-up" size={12} color={COLORS.textBody} />
              <Text style={styles.kpiTrend}>+12% vs last month</Text>
            </View>
          </View>
          <View style={styles.kpiCard}>
            <View style={[styles.kpiIconBox, { backgroundColor: COLORS.dangerBg }]}><Feather name="clipboard" size={16} color={COLORS.dangerText} /></View>
            <Text style={styles.kpiLabel}>PENDING</Text>
            <Text style={styles.kpiValue}>{kpi.pending}</Text>
            <View style={styles.kpiTrendWrap}>
              <Feather name="alert-circle" size={12} color={COLORS.dangerText} />
              <Text style={[styles.kpiTrend, { color: COLORS.dangerText }]}>Requires action</Text>
            </View>
          </View>
        </View>

        <View style={styles.kpiRow}>
          <View style={styles.kpiCard}>
            <View style={styles.kpiIconBox}><Feather name="dollar-sign" size={16} color={COLORS.primary} /></View>
            <Text style={styles.kpiValue}>
              {new Intl.NumberFormat("vi-VN").format(kpi.revenue)} <Text style={{ textDecorationLine: "underline" }}>đ</Text>
            </Text>
            <View style={styles.kpiTrendWrap}>
              <Feather name="trending-up" size={12} color={COLORS.textBody} />
              <Text style={styles.kpiTrend}>+5.4% increase</Text>
            </View>
          </View>
          <View style={styles.kpiCard}>
            <View style={[styles.kpiIconBox, { backgroundColor: COLORS.border }]}><Feather name="slash" size={16} color={COLORS.dangerText} /></View>
            <Text style={styles.kpiLabel}>SUSPENDED</Text>
            <Text style={styles.kpiValue}>{kpi.suspended}</Text>
            <View style={styles.kpiTrendWrap}>
              <Feather name="check-circle" size={12} color={COLORS.textBody} />
              <Text style={styles.kpiTrend}>Status: Stable</Text>
            </View>
          </View>
        </View>
      </View>

      {/* REVENUE TIMELINE SECTION */}
      <View style={styles.chartSection}>
        <View style={styles.chartHeader}>
          <View>
            <Text style={styles.sectionTitle}>Revenue Timeline</Text>
            <Text style={styles.chartSubtitle}>Financial growth overview across current fiscal period</Text>
          </View>
          <View style={styles.periodBadge}>
            <Text style={styles.periodBadgeText}>PERIOD REVENUE</Text>
            <Text style={styles.periodBadgeValue}>{formatCurrency(periodRevenue)}</Text>
          </View>
        </View>

        <View style={styles.chartWrapper}>
          <View style={styles.yAxisLayout}>
            {yLabels.map((val, idx) => (
              <Text key={idx} style={styles.axisLabel}>{val === 0 ? "0" : formatCompactNumber(val)}</Text>
            ))}
          </View>
          
          <View style={styles.svgWrapper}>
            <Svg width={chartWidth} height={chartHeight}>
              <Defs>
                <LinearGradient id="gradient" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={COLORS.primary} stopOpacity="0.4" />
                  <Stop offset="0.8" stopColor={COLORS.primary} stopOpacity="0.05" />
                  <Stop offset="1" stopColor={COLORS.primary} stopOpacity="0" />
                </LinearGradient>
              </Defs>

              {/* Grid Lines */}
              {[0, 0.25, 0.5, 0.75, 1].map(r => (
                  <SvgLine key={r} x1="0" y1={r * chartHeight} x2={chartWidth} y2={r * chartHeight} stroke={COLORS.border} strokeDasharray="3 3" strokeWidth={1} />
              ))}

              {/* Area & Line */}
              <Path d={area} fill="url(#gradient)" />
              <Path d={line} fill="none" stroke={COLORS.primary} strokeWidth={3} strokeLinejoin="round" />

             {/* Active Marker */}
             {activeIdx !== null && points[activeIdx] && (
                <>
                  <SvgLine x1={points[activeIdx].x} y1={0} x2={points[activeIdx].x} y2={chartHeight} stroke="#E5D9CC" strokeDasharray="4 4" strokeWidth="1.5" />
                  <Circle cx={points[activeIdx].x} cy={points[activeIdx].y} r={5} fill="#FFF" stroke={COLORS.primary} strokeWidth={3} />
                </>
              )}
            </Svg>

            {/* Invisible Pressables for Interactions */}
            <View style={[StyleSheet.absoluteFill, { flexDirection: "row" }]}>
              {points.map((p, i) => (
                <Pressable
                  key={i}
                  style={{ flex: 1 }}
                  onPressIn={() => setActiveIdx(i)}
                />
              ))}
            </View>

            {/* Tooltip render */}
            {activeIdx !== null && points[activeIdx] && (
              <View style={[
                  styles.tooltip, 
                  { 
                    left: Math.min(Math.max(points[activeIdx].x - 55, 0), chartWidth - 110),
                    top: Math.max(points[activeIdx].y - 85, -20)
                  }
                ]}
                pointerEvents="none"
              >
                  <Text style={styles.ttDate}>{points[activeIdx].day.toUpperCase()}</Text>
                  <View style={styles.ttValueRow}>
                     <View style={styles.ttDot} />
                     <Text style={styles.ttValue}>{formatCurrency(points[activeIdx].amount)}</Text>
                  </View>
                  <Text style={styles.ttOrders}>{points[activeIdx].orders} ORDERS</Text>
              </View>
            )}
          </View>
        </View>

        {/* X Axis */}
        <View style={styles.xAxisLayout}>
          {chartData.filter((_, i) => i % 2 === 0).map((d, i) => (
            <Text key={i} style={styles.axisLabelDate}>{d.day.split(" ")[0]} {d.day.split(" ")[1]}</Text>
          ))}
        </View>
      </View>

      {/* TOP SERVICES SECTION */}
      <View style={styles.topServicesSection}>
        <View style={styles.sectionHeaderRow}>
          <View>
            <Text style={styles.sectionTitle}>Top Services</Text>
            <Text style={styles.chartSubtitle}>Top 3 services by completed booking orders</Text>
          </View>
          <Feather name="bar-chart-2" size={20} color={COLORS.primaryDark} />
        </View>

        <View style={styles.servicesList}>
          {services.map((svc, idx) => (
             <View key={svc.id} style={styles.serviceAltCard}>
               <View style={styles.svcAltHeader}>
                  <Text style={styles.svcAltRank}># {idx + 1}</Text>
                  <View style={styles.svcAltBadge}>
                     <Text style={styles.svcAltBadgeText}>{svc.trend}</Text>
                  </View>
               </View>
               <Text style={styles.svcAltName}>{svc.name}</Text>
               <View style={styles.svcAltFooter}>
                  <Text style={styles.svcAltOrders}>{svc.average}</Text>
                  <Text style={styles.svcAltRevenue}>
                    {new Intl.NumberFormat("vi-VN").format(svc.revenue)} <Text style={{ textDecorationLine: "underline" }}>đ</Text>
                  </Text>
               </View>
             </View>
          ))}
        </View>
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 40,
  },
  centerWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.bg,
  },
  errorTitle: {
    color: COLORS.textHeader,
    fontSize: 18,
    fontWeight: "800",
  },
  heroSection: {
    marginBottom: 24,
  },
  heroTitle: {
    color: COLORS.textHeader,
    fontSize: 26,
    fontWeight: "900",
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  heroSubtitle: {
    color: COLORS.textBody,
    fontSize: 14,
    lineHeight: 20,
    maxWidth: "80%",
  },
  kpiGrid: {
    gap: 12,
    marginBottom: 32,
  },
  kpiRow: {
    flexDirection: "row",
    gap: 12,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: COLORS.cardBg,
    borderRadius: 24,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  kpiIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primaryLighter,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
  kpiLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: COLORS.textLabel,
    letterSpacing: 1,
    marginBottom: 4,
  },
  kpiValue: {
    fontSize: 22,
    fontWeight: "900",
    color: COLORS.textHeader,
    marginBottom: 8,
  },
  kpiTrendWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  kpiTrend: {
    fontSize: 11,
    color: COLORS.textBody,
    fontWeight: "600",
  },
  chartSection: {
    marginBottom: 36,
  },
  chartHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: COLORS.textHeader,
    marginBottom: 4,
  },
  chartSubtitle: {
    fontSize: 12,
    color: COLORS.textBody,
    maxWidth: 200,
    lineHeight: 16,
  },
  periodBadge: {
    backgroundColor: COLORS.cardBg,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "flex-end",
  },
  periodBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: COLORS.textLabel,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  periodBadgeValue: {
    fontSize: 16,
    fontWeight: "900",
    color: COLORS.primary,
  },
  chartWrapper: {
    flexDirection: "row",
    backgroundColor: COLORS.cardBg,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingTop: 24,
    paddingBottom: 16,
    paddingLeft: 12,
    paddingRight: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 10,
  },
  yAxisLayout: {
    width: 30,
    height: chartHeight,
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  axisLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: COLORS.textMuted,
  },
  svgWrapper: {
    flex: 1,
    position: "relative",
  },
  tooltip: {
    position: "absolute",
    backgroundColor: COLORS.tooltipBg,
    borderRadius: 12,
    padding: 10,
    width: 110,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  ttDate: {
    fontSize: 9,
    fontWeight: "800",
    color: "#8B9DAE",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  ttValueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  ttDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
  },
  ttValue: {
    fontSize: 13,
    fontWeight: "900",
    color: "#FFF",
  },
  ttOrders: {
    fontSize: 9,
    fontWeight: "700",
    color: "#8B9DAE",
  },
  xAxisLayout: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingLeft: 46, // 30 (y-axis) + 16 (svg padding)
    paddingRight: 10,
    marginTop: 8,
  },
  axisLabelDate: {
    fontSize: 9,
    fontWeight: "700",
    color: COLORS.textMuted,
    textAlign: "center",
  },
  topServicesSection: {
    marginBottom: 20,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 16,
  },
  viewAnalytics: {
    fontSize: 12,
    fontWeight: "800",
    color: COLORS.primaryDark,
  },
  servicesList: {
    gap: 12,
  },
  serviceAltCard: {
    backgroundColor: "#FFFBF8",
    padding: 18,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.01,
    shadowRadius: 6,
  },
  svcAltHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  svcAltRank: {
    fontSize: 12,
    fontWeight: "800",
    color: COLORS.textLabel,
  },
  svcAltBadge: {
    backgroundColor: COLORS.primaryLighter,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  svcAltBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.primaryDark,
  },
  svcAltName: {
    fontSize: 18,
    fontWeight: "900",
    color: COLORS.textHeader,
    marginBottom: 16,
  },
  svcAltFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  svcAltOrders: {
    fontSize: 13,
    fontWeight: "500",
    color: COLORS.textLabel,
  },
  svcAltRevenue: {
    fontSize: 13,
    fontWeight: "500",
    color: COLORS.textLabel,
  },
});
