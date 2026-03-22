import { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { staffTheme } from "../../../../theme/staffTheme";
import type { StaffModuleKey } from "../types";
import { StaffBottomNav } from "./StaffBottomNav";
import { StaffDrawer } from "./StaffDrawer";
import { StaffSplash } from "./StaffSplash";
import { StaffHeaderBar } from "./StaffHeaderBar";
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
  const [showSplash, setShowSplash] = useState(true);
  const [activeModule, setActiveModule] = useState<StaffModuleKey>("overview");
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [openCreateNotification, setOpenCreateNotification] = useState(false);
  const [openCreateNews, setOpenCreateNews] = useState(false);
  const insets = useSafeAreaInsets();

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
      <StaffHeaderBar onOpenMenu={() => setDrawerVisible(true)} />

      <ScrollView
        style={styles.body}
        contentContainerStyle={[
          styles.bodyContent,
          {
            paddingTop: staffTheme.spacing.md,
            paddingBottom: staffTheme.spacing.xl + insets.bottom,
          },
        ]}
      >
        {content}
      </ScrollView>

      <StaffBottomNav active={activeModule} onChange={setActiveModule} />

      <StaffDrawer
        visible={drawerVisible}
        active={activeModule}
        onClose={() => setDrawerVisible(false)}
        onNavigate={setActiveModule}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: staffTheme.colors.appBg,
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    paddingHorizontal: staffTheme.spacing.lg,
    gap: staffTheme.spacing.lg,
  },
});
