import { useMemo } from "react";
import { Feather } from "@expo/vector-icons";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useAuth } from "../../context/AuthContext";
import type { AdminStackParamList } from "../../navigation/types";

type Scope = "admin" | "staff" | "customer";

interface RoleModule {
  key: string;
  title: string;
  scope: Scope;
  route: string;
  description: string;
  badge: string;
  screen?: keyof AdminStackParamList;
}

type Props = NativeStackScreenProps<AdminStackParamList, "AdminHome">;

const ROLE_MODULES: RoleModule[] = [
  {
    key: "admin-overview",
    title: "Admin Dashboard",
    scope: "admin",
    route: "/admin",
    description: "KPI tong quan he thong, doanh thu va van hanh.",
    badge: "Overview",
  },
  {
    key: "booking-board",
    title: "Booking Board",
    scope: "admin",
    route: "/admin/bookings",
    description: "Theo doi booking va trang thai xu ly theo ngay.",
    badge: "Booking",
    screen: "AdminBookingBoard",
  },
  {
    key: "user-management",
    title: "User Management",
    scope: "admin",
    route: "/admin/users",
    description: "Quan ly role, trang thai va tai khoan nguoi dung.",
    badge: "Users",
    screen: "AdminUserManagement",
  },
  {
    key: "room-management",
    title: "Room Management",
    scope: "admin",
    route: "/admin/rooms",
    description: "Cau hinh suc chua, loai phong va kha dung.",
    badge: "Rooms",
    screen: "AdminRoomManagement",
  },
  {
    key: "service-management",
    title: "Service Management",
    scope: "admin",
    route: "/admin/services",
    description: "Quan ly service, thoi luong va bang gia.",
    badge: "Services",
    screen: "AdminServiceManagement",
  },
  {
    key: "medical-record-management",
    title: "Medical Records",
    scope: "admin",
    route: "/admin/medical-records",
    description: "Lich su dieu tri, theo doi suc khoe va canh bao.",
    badge: "Medical",
    screen: "AdminMedicalRecords",
  },
  {
    key: "transaction-management",
    title: "Transaction Management",
    scope: "admin",
    route: "/admin/transactions",
    description: "Thanh toan, doi soat va thong ke giao dich.",
    badge: "Finance",
    screen: "AdminTransactions",
  },
  {
    key: "voucher-management",
    title: "Voucher Management",
    scope: "admin",
    route: "/admin/vouchers",
    description: "Tao ma giam gia va theo doi hieu suat voucher.",
    badge: "Voucher",
    screen: "AdminVoucherManagement",
  },
  {
    key: "staff-bookings",
    title: "Staff Booking Workspace",
    scope: "staff",
    route: "/staff/bookings",
    description: "Tac vu booking theo ca truc nhan vien.",
    badge: "Ops",
  },
  {
    key: "staff-news",
    title: "Staff News Workspace",
    scope: "staff",
    route: "/staff/news",
    description: "Dang tin va cap nhat noi dung truyen thong.",
    badge: "News",
  },
  {
    key: "customer-service",
    title: "Customer Service Journey",
    scope: "customer",
    route: "/services",
    description: "Luong dat dich vu va trai nghiem customer.",
    badge: "Customer",
  },
  {
    key: "customer-account",
    title: "Customer Account & Wallet",
    scope: "customer",
    route: "/account",
    description: "Ho so, vi tien va thong bao cua customer.",
    badge: "Account",
  },
];

export function AdminControlCenterScreen({ navigation }: Props) {
  const { user } = useAuth();

  const groupedModules = useMemo(() => {
    const canViewAdmin = user?.role === "admin";
    const canViewStaff = user?.role === "admin" || user?.role === "staff";

    return {
      admin: canViewAdmin ? ROLE_MODULES.filter((item) => item.scope === "admin") : [],
      staff: canViewStaff ? ROLE_MODULES.filter((item) => item.scope === "staff") : [],
      customer: canViewAdmin ? ROLE_MODULES.filter((item) => item.scope === "customer") : [],
    };
  }, [user?.role]);

  if (!user || user.role !== "admin") {
    return (
      <View style={styles.emptyWrap}>
        <Text style={styles.emptyTitle}>Khu vuc nay danh cho admin</Text>
        <Text style={styles.emptyDescription}>Staff va customer khong the truy cap module quan tri.</Text>
      </View>
    );
  }

  const openModule = (module: RoleModule) => {
    if (module.screen) {
      navigation.navigate(module.screen);
      return;
    }

    Alert.alert(module.title, `Web route: ${module.route}\n\nModule nay dang duoc dong bo UI theo mobile.`);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.heroCard}>
        <Text style={styles.heroTitle}>Role Control Center</Text>
        <Text style={styles.heroSubtitle}>UI da duoc chia theo role admin, staff, customer de map dung voi frontend.</Text>

        <View style={styles.heroMetaRow}>
          <View style={styles.heroMetaChip}>
            <Text style={styles.heroMetaValue}>{user.role.toUpperCase()}</Text>
            <Text style={styles.heroMetaLabel}>Current Role</Text>
          </View>
          <View style={styles.heroMetaChip}>
            <Text style={styles.heroMetaValue}>{groupedModules.admin.length + groupedModules.staff.length + groupedModules.customer.length}</Text>
            <Text style={styles.heroMetaLabel}>Modules</Text>
          </View>
        </View>
      </View>

      <RoleSection title="Admin" icon="shield" data={groupedModules.admin} onOpen={openModule} />
      <RoleSection title="Staff" icon="briefcase" data={groupedModules.staff} onOpen={openModule} />
      <RoleSection title="Customer" icon="user" data={groupedModules.customer} onOpen={openModule} />
    </ScrollView>
  );
}

function RoleSection({
  title,
  icon,
  data,
  onOpen,
}: {
  title: string;
  icon: React.ComponentProps<typeof Feather>["name"];
  data: RoleModule[];
  onOpen: (module: RoleModule) => void;
}) {
  if (!data.length) return null;

  return (
    <View style={styles.sectionWrap}>
      <View style={styles.sectionTitleRow}>
        <Feather name={icon} size={16} color="#B46232" />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>

      {data.map((module) => (
        <Pressable key={module.key} style={styles.moduleCard} onPress={() => onOpen(module)}>
          <View style={styles.moduleHead}>
            <Text style={styles.moduleBadge}>{module.badge}</Text>
            <Text style={styles.moduleRoute}>{module.route}</Text>
          </View>
          <Text style={styles.moduleTitle}>{module.title}</Text>
          <Text style={styles.moduleDescription}>{module.description}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FCF8F2",
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 24,
    gap: 12,
  },
  heroCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#EFE2D4",
    backgroundColor: "#FFFDF9",
    padding: 14,
    gap: 8,
  },
  heroTitle: {
    color: "#22364D",
    fontSize: 23,
    fontWeight: "800",
  },
  heroSubtitle: {
    color: "#63788D",
    fontSize: 13,
    lineHeight: 20,
  },
  heroMetaRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 2,
  },
  heroMetaChip: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#F2D9C3",
    backgroundColor: "#FFF5EA",
    paddingVertical: 9,
    alignItems: "center",
  },
  heroMetaValue: {
    color: "#A85A2F",
    fontSize: 15,
    fontWeight: "800",
  },
  heroMetaLabel: {
    color: "#8A6A55",
    fontSize: 11,
    fontWeight: "700",
    marginTop: 2,
  },
  sectionWrap: {
    gap: 8,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    color: "#2B3E53",
    fontSize: 17,
    fontWeight: "800",
  },
  moduleCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#EFE2D4",
    backgroundColor: "#FFFFFF",
    padding: 12,
    gap: 6,
  },
  moduleHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  moduleBadge: {
    backgroundColor: "#DE7E42",
    color: "#FFFFFF",
    borderRadius: 999,
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 3,
    fontSize: 11,
    fontWeight: "700",
  },
  moduleRoute: {
    color: "#B27852",
    fontSize: 11,
    fontWeight: "700",
  },
  moduleTitle: {
    color: "#2A3E54",
    fontSize: 15,
    fontWeight: "800",
  },
  moduleDescription: {
    color: "#677A8E",
    fontSize: 13,
    lineHeight: 19,
  },
  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FCF8F2",
    paddingHorizontal: 22,
  },
  emptyTitle: {
    color: "#24364C",
    fontWeight: "800",
    fontSize: 18,
    textAlign: "center",
  },
  emptyDescription: {
    marginTop: 8,
    color: "#67788B",
    textAlign: "center",
    lineHeight: 20,
  },
});
