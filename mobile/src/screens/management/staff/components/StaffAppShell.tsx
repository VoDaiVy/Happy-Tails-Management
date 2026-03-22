import { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../../../context/AuthContext";
import { staffTheme } from "../../../../theme/staffTheme";
import type { StaffModuleKey } from "../types";
import { StaffBottomNav } from "./StaffBottomNav";
import { StaffDrawer } from "./StaffDrawer";
import { StaffHeaderBar } from "./StaffHeaderBar";
import { StaffSplash } from "./StaffSplash";
import {
  BookingsScreen,
  FeedbackScreen,
  MedicalRecordsScreen,
  NewsScreen,
  NotificationsScreen,
  OverviewScreen,
  ScheduleScreen,
} from "../screens";

export function StaffAppShell() {
  const navigation = useNavigation<any>();
  const { user, logout } = useAuth();
  const [showSplash, setShowSplash] = useState(true);
  const [activeModule, setActiveModule] = useState<StaffModuleKey>("overview");
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [openCreateNotification, setOpenCreateNotification] = useState(false);
  const [openCreateNews, setOpenCreateNews] = useState(false);
  const insets = useSafeAreaInsets();

  const moduleLabel = useMemo(() => {
    const labels: Record<StaffModuleKey, string> = {
      overview: "Overview",
      bookings: "Bookings",
      schedule: "Schedule",
      feedback: "Feedback",
      notifications: "Notifications",
      medical: "Medical Records",
      news: "News",
    };

    return labels[activeModule];
  }, [activeModule]);

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 700);
    return () => clearTimeout(timer);
  }, []);

  const content = useMemo(() => {
    switch (activeModule) {
      case "bookings":
        return <BookingsScreen />;
      case "schedule":
        return <ScheduleScreen />;
      case "feedback":
        return <FeedbackScreen />;
      case "notifications":
        return (
          <NotificationsScreen
            openCreate={openCreateNotification}
            onOpenCreate={() => setOpenCreateNotification(true)}
            onCloseCreate={() => setOpenCreateNotification(false)}
          />
        );
      case "medical":
        return <MedicalRecordsScreen />;
      case "news":
        return (
          <NewsScreen
            openCreate={openCreateNews}
            onOpenCreate={() => setOpenCreateNews(true)}
            onCloseCreate={() => setOpenCreateNews(false)}
          />
        );
      case "overview":
      default:
        return <OverviewScreen onOpenSchedule={() => setActiveModule("schedule")} />;
    }
  }, [activeModule, openCreateNews, openCreateNotification]);

  if (showSplash) {
    return <StaffSplash />;
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.bgAccentTop} />
      <View style={styles.bgAccentBottom} />

      <StaffHeaderBar
        activeModuleLabel={moduleLabel}
        staffName={String(user?.name || "Staff")}
        onOpenMenu={() => setDrawerVisible(true)}
      />

      <ScrollView
        style={styles.body}
        contentContainerStyle={[
          styles.bodyContent,
          {
            paddingTop: staffTheme.spacing.sm,
            paddingBottom: staffTheme.spacing.xxl + insets.bottom,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {content}
      </ScrollView>

      <StaffBottomNav active={activeModule} onChange={setActiveModule} />

      <StaffDrawer
        visible={drawerVisible}
        staffName={String(user?.name || "Staff")}
        staffEmail={String(user?.email || "")}
        staffRole={String(user?.role || "staff")}
        onClose={() => setDrawerVisible(false)}
        onGoManagement={() => setActiveModule("overview")}
        onGoNewsPolicy={() => navigation.navigate("InfoTab", { screen: "NewsPolicyHome" })}
        onGoProfile={() => navigation.navigate("AccountTab", { screen: "Profile" })}
        onSignOut={logout}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: staffTheme.colors.appBg,
    position: "relative",
  },
  bgAccentTop: {
    position: "absolute",
    top: -120,
    right: -70,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: "rgba(217, 120, 83, 0.1)",
  },
  bgAccentBottom: {
    position: "absolute",
    bottom: -90,
    left: -80,
    width: 230,
    height: 230,
    borderRadius: 115,
    backgroundColor: "rgba(35, 52, 69, 0.06)",
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    paddingHorizontal: staffTheme.spacing.lg,
    gap: staffTheme.spacing.lg,
  },
});
