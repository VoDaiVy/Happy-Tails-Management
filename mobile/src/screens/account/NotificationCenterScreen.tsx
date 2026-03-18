import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import {
  deleteAllReadNotifications,
  deleteNotification,
  getNotifications,
  getUnreadCount,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "../../api/modules/notificationApi";
import type { AppNotification } from "../../types/notification";

export function NotificationCenterScreen() {
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [notificationResult, unread] = await Promise.all([
        getNotifications({ page: 1, limit: 50 }),
        getUnreadCount(),
      ]);
      setNotifications(notificationResult.notifications);
      setUnreadCount(unread);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Khong tai duoc notifications");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const onMarkAsRead = async (item: AppNotification) => {
    if (item.isRead) return;
    setActionLoading(true);
    setError("");
    try {
      await markNotificationAsRead(item._id);
      await loadNotifications();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Khong danh dau da doc duoc");
    } finally {
      setActionLoading(false);
    }
  };

  const onDelete = async (id: string) => {
    setActionLoading(true);
    setError("");
    try {
      await deleteNotification(id);
      await loadNotifications();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Khong xoa notification duoc");
    } finally {
      setActionLoading(false);
    }
  };

  const onMarkAllRead = async () => {
    setActionLoading(true);
    setError("");
    try {
      await markAllNotificationsAsRead();
      await loadNotifications();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Khong mark all read duoc");
    } finally {
      setActionLoading(false);
    }
  };

  const onDeleteAllRead = async () => {
    setActionLoading(true);
    setError("");
    try {
      await deleteAllReadNotifications();
      await loadNotifications();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Khong xoa read notifications duoc");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerBox}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerCard}>
        <Text style={styles.title}>Notification Center</Text>
        <Text style={styles.meta}>Unread: {unreadCount}</Text>
      </View>

      <View style={styles.actionRow}>
        <Pressable style={[styles.actionButton, actionLoading && styles.disabled]} onPress={onMarkAllRead} disabled={actionLoading}>
          <Text style={styles.actionText}>Mark All Read</Text>
        </Pressable>
        <Pressable style={[styles.actionButton, actionLoading && styles.disabled]} onPress={onDeleteAllRead} disabled={actionLoading}>
          <Text style={styles.actionText}>Delete Read</Text>
        </Pressable>
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <FlatList
        data={notifications}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={<Text style={styles.emptyText}>Ban chua co thong bao nao</Text>}
        renderItem={({ item }) => (
          <Pressable style={[styles.itemCard, !item.isRead && styles.unreadItem]} onPress={() => onMarkAsRead(item)}>
            <View style={styles.itemHeader}>
              <Text style={styles.itemTitle}>{item.title}</Text>
              <Text style={styles.itemType}>{item.type}</Text>
            </View>
            <Text style={styles.itemBody}>{item.body}</Text>
            <View style={styles.itemFooter}>
              <Text style={styles.itemDate}>{new Date(item.createdAt).toLocaleString()}</Text>
              <Pressable style={styles.deleteButton} onPress={() => onDelete(item._id)}>
                <Text style={styles.deleteText}>Delete</Text>
              </Pressable>
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC", padding: 16 },
  centerBox: { flex: 1, justifyContent: "center", alignItems: "center" },
  headerCard: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    backgroundColor: "#fff",
    padding: 12,
  },
  title: { fontSize: 20, fontWeight: "800", color: "#0F172A" },
  meta: { marginTop: 2, color: "#64748B" },
  actionRow: { marginTop: 10, flexDirection: "row", gap: 10 },
  actionButton: {
    flex: 1,
    borderRadius: 10,
    backgroundColor: "#E2E8F0",
    alignItems: "center",
    paddingVertical: 10,
  },
  actionText: { color: "#334155", fontWeight: "700" },
  listContent: { gap: 10, paddingVertical: 12 },
  itemCard: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    backgroundColor: "#fff",
    padding: 12,
    gap: 6,
  },
  unreadItem: { borderColor: "#93C5FD", backgroundColor: "#EFF6FF" },
  itemHeader: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  itemTitle: { flex: 1, fontWeight: "700", color: "#0F172A" },
  itemType: { color: "#2563EB", fontWeight: "700", textTransform: "capitalize" },
  itemBody: { color: "#475569" },
  itemFooter: { marginTop: 4, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  itemDate: { color: "#94A3B8", fontSize: 12 },
  deleteButton: {
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: 8,
    backgroundColor: "#FEF2F2",
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  deleteText: { color: "#B91C1C", fontWeight: "600" },
  emptyText: { color: "#64748B", textAlign: "center", marginTop: 16 },
  errorText: { marginTop: 8, color: "#DC2626" },
  disabled: { opacity: 0.65 },
});
