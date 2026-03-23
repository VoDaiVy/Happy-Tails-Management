import { useMemo } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useAuth } from "../../context/AuthContext";
import type { AdminStackParamList } from "../../navigation/types";
import type { UserRole } from "../../types/auth";

type RoleScope = "admin" | "staff";

interface ManagementModule {
  key: string;
  title: string;
  scope: RoleScope;
  webPath: string;
  description: string;
  badge: string;
  screen?: keyof AdminStackParamList;
}

type Props = NativeStackScreenProps<AdminStackParamList, "AdminHome">;

const WEB_MANAGEMENT_MODULES: ManagementModule[] = [
  {
    key: "admin-overview",
    title: "Admin Dashboard",
    scope: "admin",
    webPath: "/admin",
    description: "Tong quan nguoi dung, don hang, doanh thu va hieu suat service.",
    badge: "Overview",
  },
  {
    key: "booking-board",
    title: "Booking Board",
    scope: "staff",
    webPath: "/admin/bookings, /staff/bookings",
    description: "Theo doi va cap nhat lich dat dich vu theo trang thai.",
    badge: "Booking",
    screen: "AdminBookingBoard",
  },
  {
    key: "user-management",
    title: "User Management",
    scope: "admin",
    webPath: "/admin/users",
    description: "Quan ly tai khoan, vai tro va trang thai nguoi dung.",
    badge: "User",
    screen: "AdminUserManagement",
  },
  {
    key: "room-management",
    title: "Room Management",
    scope: "admin",
    webPath: "/admin/rooms",
    description: "Quan ly phong luu tru, suc chua va tinh trang su dung.",
    badge: "Room",
    screen: "AdminRoomManagement",
  },
  {
    key: "service-management",
    title: "Service Management",
    scope: "admin",
    webPath: "/admin/services",
    description: "Quan ly danh muc service, gia, thoi gian va hinh anh.",
    badge: "Service",
    screen: "AdminServiceManagement",
  },
  {
    key: "medical-record-management",
    title: "Medical Records",
    scope: "admin",
    webPath: "/admin/medical-records",
    description: "Quan ly ho so y te cua thu cung va tien su dieu tri.",
    badge: "Medical",
  },
  {
    key: "transaction-management",
    title: "Transaction Management",
    scope: "admin",
    webPath: "/admin/transactions",
    description: "Kiem soat giao dich, thanh toan va doi soat doanh thu.",
    badge: "Finance",
  },
  {
    key: "voucher-management",
    title: "Voucher Management",
    scope: "admin",
    webPath: "/admin/vouchers",
    description: "Tao va quan ly voucher khuyen mai, han su dung va dieu kien.",
    badge: "Voucher",
    screen: "AdminVoucherManagement",
  },
  {
    key: "staff-dashboard",
    title: "Staff Dashboard",
    scope: "staff",
    webPath: "/staff",
    description: "Tong quan van hanh cho nhan vien, theo doi tac vu trong ngay.",
    badge: "Staff",
  },
  {
    key: "staff-feedback",
    title: "Feedback Management",
    scope: "staff",
    webPath: "/staff/feedback",
    description: "Xu ly va phan hoi danh gia tu khach hang.",
    badge: "Feedback",
  },
  {
    key: "staff-news",
    title: "News Management",
    scope: "staff",
    webPath: "/staff/news",
    description: "Quan ly bai viet tin tuc va cap nhat noi dung truyen thong.",
    badge: "News",
  },
];

function canAccessModule(moduleScope: RoleScope, role: UserRole): boolean {
  if (role === "admin") {
    return true;
  }

  return moduleScope === "staff" && role === "staff";
}

export function AdminControlCenterScreen({ navigation }: Props) {
  const { user } = useAuth();

  const visibleModules = useMemo<ManagementModule[]>(() => {
    if (!user) return [];

    return WEB_MANAGEMENT_MODULES.filter((module) => canAccessModule(module.scope, user.role));
  }, [user]);

  if (!user) {
    return (
      <View style={styles.emptyWrap}>
        <Text style={styles.emptyTitle}>Khong tim thay phien dang nhap</Text>
      </View>
    );
  }

  if (user.role === "customer") {
    return (
      <View style={styles.emptyWrap}>
        <Text style={styles.emptyTitle}>Ban khong co quyen truy cap khu quan tri</Text>
        <Text style={styles.emptyDescription}>
          Khu vuc nay chi danh cho vai tro staff hoac admin.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.heroCard}>
        <Text style={styles.heroTitle}>Admin Control Center</Text>
        <Text style={styles.heroDescription}>
          Tong hop day du cac module quan ly dang su dung tren web, toi uu de theo doi nhanh tren mobile.
        </Text>
        <View style={styles.heroPillRow}>
          <View style={styles.heroPill}>
            <Text style={styles.heroPillValue}>{visibleModules.length}</Text>
            <Text style={styles.heroPillLabel}>Module</Text>
          </View>
          <View style={styles.heroPill}>
            <Text style={styles.heroPillValue}>{user.role.toUpperCase()}</Text>
            <Text style={styles.heroPillLabel}>Role</Text>
          </View>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Quan ly he thong</Text>

      <View style={styles.gridWrap}>
        {visibleModules.map((item: ManagementModule) => (
          <Pressable
            key={item.key}
            style={styles.moduleCard}
            onPress={() => {
              if (item.screen) {
                navigation.navigate(item.screen);
                return;
              }

              Alert.alert(
                item.title,
                `Module web: ${item.webPath}\n\nModule nay se duoc mo rong tiep theo.`,
              );
            }}
          >
            <View style={styles.moduleHeader}>
              <Text style={styles.moduleBadge}>{item.badge}</Text>
              <Text style={styles.moduleScope}>{item.scope.toUpperCase()}</Text>
            </View>
            <Text style={styles.moduleTitle}>{item.title}</Text>
            <Text style={styles.moduleDescription}>{item.description}</Text>
            <Text style={styles.modulePath}>Web route: {item.webPath}</Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#F8FAFC",
    padding: 16,
    gap: 14,
  },
  heroCard: {
    borderRadius: 16,
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#0F172A",
  },
  heroDescription: {
    marginTop: 6,
    color: "#475569",
    fontSize: 14,
    lineHeight: 20,
  },
  heroPillRow: {
    marginTop: 14,
    flexDirection: "row",
    gap: 10,
  },
  heroPill: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FED7AA",
    backgroundColor: "#FFF7ED",
    paddingVertical: 10,
    alignItems: "center",
  },
  heroPillValue: {
    color: "#C2410C",
    fontSize: 16,
    fontWeight: "800",
  },
  heroPillLabel: {
    marginTop: 2,
    color: "#9A3412",
    fontSize: 12,
    fontWeight: "600",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1E293B",
  },
  gridWrap: {
    gap: 10,
    paddingBottom: 20,
  },
  moduleCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    padding: 14,
    gap: 8,
  },
  moduleHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  moduleBadge: {
    backgroundColor: "#0F766E",
    color: "#FFFFFF",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    fontSize: 11,
    fontWeight: "700",
    overflow: "hidden",
  },
  moduleScope: {
    color: "#64748B",
    fontSize: 11,
    fontWeight: "700",
  },
  moduleTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  moduleDescription: {
    color: "#475569",
    fontSize: 13,
    lineHeight: 18,
  },
  modulePath: {
    marginTop: 2,
    color: "#D97706",
    fontSize: 12,
    fontWeight: "600",
  },
  emptyWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#F8FAFC",
  },
  emptyTitle: {
    color: "#0F172A",
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  emptyDescription: {
    marginTop: 8,
    color: "#64748B",
    textAlign: "center",
  },
});
