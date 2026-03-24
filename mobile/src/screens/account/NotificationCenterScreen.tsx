import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  broadcastNotification,
  deleteAllReadNotifications,
  deleteNotification,
  getNotifications,
  getStaffCustomers,
  getStaffOutbox,
  getUnreadCount,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  sendNotification,
  type StaffOutboxRow,
} from "../../api/modules/notificationApi";
import { useAuth } from "../../context/AuthContext";
import type { AppNotification } from "../../types/notification";
import { isStaffOrAdminRole } from "../../utils/role";

type StaffAudience = "All Customers" | "VIP Customers" | "New Customers" | "Specific Users";
type StaffDelivery = "Send now";
type StaffPriority = "Low" | "Normal" | "High";
type StaffType = "Promotion" | "Reminder" | "System Update" | "Booking Alert" | "Service Announcement";
type StaffStatus = "Draft" | "Scheduled" | "Sent" | "Failed" | "Archived";

type StaffNotificationRow = {
  id: string;
  title: string;
  content: string;
  type: StaffType;
  status: StaffStatus;
  targetAudience: StaffAudience;
  priority: StaffPriority;
  createdDate: string;
  scheduledAt?: string;
  delivery: string;
  deliveredCount: number;
  readCount: number;
  totalRecipients: number;
  bannerImage?: string;
  metadata?: Record<string, unknown>;
};

type StaffCustomer = {
  id: string;
  name: string;
  email: string;
};

type CustomerFilter = "All" | "Services" | "Social" | "Updates";

type FormState = {
  title: string;
  content: string;
  summary: string;
  type: StaffType;
  audience: StaffAudience;
  selectedUsers: string[];
  delivery: StaffDelivery;
  scheduledAt: string;
  priority: StaffPriority;
};

const TYPE_OPTIONS: StaffType[] = [
  "Promotion",
  "Reminder",
  "System Update",
  "Booking Alert",
  "Service Announcement",
];

const AUDIENCE_OPTIONS: StaffAudience[] = [
  "All Customers",
  "Specific Users",
];

const PRIORITY_OPTIONS: StaffPriority[] = ["Low", "Normal", "High"];

const UI_TO_API_TYPE: Record<StaffType, string> = {
  Promotion: "promotion",
  Reminder: "account",
  "System Update": "system",
  "Booking Alert": "order",
  "Service Announcement": "system",
};

const API_TO_UI_TYPE: Record<string, StaffType> = {
  promotion: "Promotion",
  account: "Reminder",
  system: "System Update",
  order: "Booking Alert",
  payment: "Reminder",
};

const DEFAULT_FORM: FormState = {
  title: "",
  content: "",
  summary: "",
  type: "Promotion",
  audience: "All Customers",
  selectedUsers: [],
  delivery: "Send now",
  scheduledAt: "",
  priority: "Normal",
};

function formatDateTime(value?: string) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString([], {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function todayDateInputValue() {
  const date = new Date(Date.now() + 60 * 60 * 1000);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function normalizeStatus(meta?: Record<string, unknown>, row?: StaffOutboxRow): StaffStatus {
  const statusRaw = String(meta?.status || "");
  if (statusRaw === "Draft" || statusRaw === "Scheduled" || statusRaw === "Failed" || statusRaw === "Archived") return statusRaw;
  if (row?.deliveredCount === 0 && Number(row?.totalRecipients || 0) > 0) return "Scheduled";
  return "Sent";
}

function mapOutboxRow(item: StaffOutboxRow): StaffNotificationRow {
  const meta = item?.metadata && typeof item.metadata === "object" ? (item.metadata as Record<string, unknown>) : {};
  const type = API_TO_UI_TYPE[String(item.type || "").toLowerCase()] || "System Update";
  const status = normalizeStatus(meta, item);

  return {
    id: String(item._id || `tmp-${Date.now()}`),
    title: String(item.title || "Untitled"),
    content: String(item.body || ""),
    type,
    status,
    targetAudience: (meta.targetAudience as StaffAudience) || "All Customers",
    priority: (meta.priority as StaffPriority) || "Normal",
    createdDate: String(item.createdAt || ""),
    scheduledAt: typeof meta.scheduledAt === "string" ? meta.scheduledAt : "",
    delivery: String(meta.delivery || (item.deliveredCount ? `Sent to ${item.totalRecipients || 0}` : "Pending delivery")),
    deliveredCount: Number(item.deliveredCount || 0),
    readCount: Number(item.readCount || 0),
    totalRecipients: Number(meta.expectedRecipients || item.totalRecipients || 0),
    bannerImage: String(item.imageUrl || meta.bannerImage || ""),
    metadata: meta,
  };
}

function getStatusTone(status: StaffStatus) {
  if (status === "Sent") return { bg: "#ECFDF3", text: "#166534", border: "#B6E6C4" };
  if (status === "Scheduled") return { bg: "#FFF8E1", text: "#9C6B00", border: "#F8D27A" };
  if (status === "Draft") return { bg: "#F5F7FA", text: "#52606D", border: "#CBD2D9" };
  if (status === "Failed") return { bg: "#FFF1F1", text: "#B42318", border: "#F7B4B4" };
  return { bg: "#EEF2F7", text: "#4B5563", border: "#D8DEE9" };
}

export function NotificationCenterScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const isStaff = isStaffOrAdminRole(user?.role);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [customerFilter, setCustomerFilter] = useState<CustomerFilter>("All");

  const [staffRows, setStaffRows] = useState<StaffNotificationRow[]>([]);
  const [searchText, setSearchText] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | StaffStatus>("All");

  const [customers, setCustomers] = useState<StaffCustomer[]>([]);
  const [customerSearch, setCustomerSearch] = useState("");
  const [form, setForm] = useState<FormState>({ ...DEFAULT_FORM, scheduledAt: todayDateInputValue() });
  const [formError, setFormError] = useState("");

  const [createVisible, setCreateVisible] = useState(false);
  const [viewVisible, setViewVisible] = useState(false);
  const [selectedRow, setSelectedRow] = useState<StaffNotificationRow | null>(null);

  const loadInbox = useCallback(async () => {
    const [notificationResult, unread] = await Promise.all([
      getNotifications({ page: 1, limit: 50 }),
      getUnreadCount(),
    ]);
    setNotifications(notificationResult.notifications || []);
    setUnreadCount(unread || 0);
  }, []);

  const loadStaffOutbox = useCallback(async (search?: string) => {
    const [outbox, users] = await Promise.all([
      getStaffOutbox({ page: 1, limit: 50, search }),
      getStaffCustomers(),
    ]);

    setStaffRows((outbox.rows || []).map(mapOutboxRow));
    setCustomers((users || []).map((item) => ({
      id: String(item._id || ""),
      name: String(item.name || item.email || "Customer"),
      email: String(item.email || ""),
    })).filter((item) => item.id));
  }, []);

  const loadStaffCustomers = useCallback(async (search?: string) => {
    const users = await getStaffCustomers({ search });
    setCustomers((users || []).map((item) => ({
      id: String(item._id || ""),
      name: String(item.name || item.email || "Customer"),
      email: String(item.email || ""),
    })).filter((item) => item.id));
  }, []);

  const loadData = useCallback(async () => {
    setError("");
    try {
      if (isStaff) {
        await loadStaffOutbox();
      } else {
        await loadInbox();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load notifications");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isStaff, loadInbox, loadStaffOutbox]);

  useEffect(() => {
    setLoading(true);
    loadData();
  }, [loadData]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchText.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [searchText]);

  useEffect(() => {
    if (!isStaff || loading) return;

    const run = async () => {
      setError("");
      try {
        await loadStaffOutbox(debouncedSearch || undefined);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unable to search notifications");
      }
    };

    run();
  }, [debouncedSearch, isStaff, loadStaffOutbox, loading]);

  useEffect(() => {
    if (!isStaff || !createVisible || form.audience !== "Specific Users") return;

    const timer = setTimeout(async () => {
      setError("");
      try {
        await loadStaffCustomers(customerSearch.trim() || undefined);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unable to load customers");
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [createVisible, customerSearch, form.audience, isStaff, loadStaffCustomers]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const filteredStaffRows = useMemo(() => {
    const query = searchText.trim().toLowerCase();

    return staffRows.filter((item) => {
      const statusPass = statusFilter === "All" || item.status === statusFilter;
      const queryPass = !query || [item.title, item.content, item.type, item.targetAudience, item.id].join(" ").toLowerCase().includes(query);
      return statusPass && queryPass;
    });
  }, [searchText, staffRows, statusFilter]);

  const summary = useMemo(() => {
    const today = new Date();

    return {
      total: staffRows.length,
      sentToday: staffRows.filter((item) => {
        if (item.status !== "Sent") return false;
        const d = new Date(item.createdDate);
        if (Number.isNaN(d.getTime())) return false;
        return d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate();
      }).length,
      scheduled: staffRows.filter((item) => item.status === "Scheduled").length,
      drafts: staffRows.filter((item) => item.status === "Draft").length,
    };
  }, [staffRows]);

  const filteredCustomerNotifications = useMemo(() => {
    if (customerFilter === "All") return notifications;

    return notifications.filter((item) => {
      if (customerFilter === "Services") {
        return item.type === "order" || item.type === "payment";
      }
      if (customerFilter === "Social") {
        return item.type === "account";
      }
      return item.type === "system" || item.type === "promotion";
    });
  }, [customerFilter, notifications]);

  const onMarkAsRead = async (item: AppNotification) => {
    if (item.isRead) return;
    setActionLoading(true);
    setError("");
    try {
      await markNotificationAsRead(item._id);
      await loadData();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to mark as read");
    } finally {
      setActionLoading(false);
    }
  };

  const onDeleteInbox = async (id: string) => {
    setActionLoading(true);
    setError("");
    try {
      await deleteNotification(id);
      await loadData();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to delete notification");
    } finally {
      setActionLoading(false);
    }
  };

  const onMarkAllRead = async () => {
    setActionLoading(true);
    setError("");
    try {
      await markAllNotificationsAsRead();
      await loadData();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to mark all as read");
    } finally {
      setActionLoading(false);
    }
  };

  const onDeleteAllRead = async () => {
    setActionLoading(true);
    setError("");
    try {
      await deleteAllReadNotifications();
      await loadData();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to delete read notifications");
    } finally {
      setActionLoading(false);
    }
  };

  const resetForm = useCallback(() => {
    setForm({ ...DEFAULT_FORM, scheduledAt: todayDateInputValue() });
    setFormError("");
  }, []);

  const openCreate = useCallback(() => {
    resetForm();
    setCustomerSearch("");
    setCreateVisible(true);
  }, [resetForm]);

  const closeCreate = useCallback(() => {
    if (actionLoading) return;
    setCreateVisible(false);
    setCustomerSearch("");
    resetForm();
  }, [actionLoading, resetForm]);

  const submitStaffNotification = useCallback(async () => {
    if (!form.title.trim()) {
      setFormError("Notification title is required.");
      return;
    }
    if (!form.content.trim()) {
      setFormError("Message content is required.");
      return;
    }
    if (form.audience === "Specific Users" && form.selectedUsers.length === 0) {
      setFormError("Please select at least one recipient.");
      return;
    }
    setFormError("");
    setActionLoading(true);
    setError("");

    try {
      const expectedRecipients = form.audience === "Specific Users" ? form.selectedUsers.length : 0;

      const payload = {
        title: form.title.trim(),
        body: form.content.trim(),
        type: UI_TO_API_TYPE[form.type] || "system",
        metadata: {
          summary: form.summary.trim(),
          targetAudience: form.audience,
          audienceUsers: form.selectedUsers,
          scheduledAt: "",
          priority: form.priority,
          expectedRecipients,
          status: "Sent",
          delivery: "Sent",
          createdBy: user?.name || "Staff",
        },
      };

      if (form.audience === "Specific Users") {
        await Promise.all(
          form.selectedUsers.map((userId) => sendNotification({ ...payload, userId })),
        );
      } else {
        await broadcastNotification(payload);
      }

      setCreateVisible(false);
      resetForm();
      await loadData();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save notification");
    } finally {
      setActionLoading(false);
    }
  }, [form, loadData, resetForm, user?.name]);

  if (loading) {
    return (
      <View style={styles.centerBox}>
        <ActivityIndicator size="large" color="#D77D46" />
      </View>
    );
  }

  if (!isStaff) {
    return (
      <View style={styles.emptyRoot}>
        <ScrollView
          contentContainerStyle={[styles.emptyContent, { paddingBottom: Math.max(insets.bottom + 110, 130) }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#D77D46" />}
        >
          <View style={styles.customerActionRow}>
            <Text style={styles.customerSectionTitle}>Notifications</Text>
            <Pressable onPress={onMarkAllRead} disabled={actionLoading || unreadCount === 0}>
              <Text style={[styles.emptyMarkAllText, unreadCount === 0 && styles.emptyMarkAllTextDisabled]}>Mark all as read</Text>
            </Pressable>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.emptyChipRow}>
            {(["All", "Services", "Social", "Updates"] as CustomerFilter[]).map((label) => {
              const active = customerFilter === label;
              return (
                <Pressable
                  key={label}
                  style={[styles.emptyChip, active && styles.emptyChipActive]}
                  onPress={() => setCustomerFilter(label)}
                >
                  <Text style={[styles.emptyChipText, active && styles.emptyChipTextActive]}>{label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {filteredCustomerNotifications.length === 0 ? (
            <View style={styles.emptyMainCenter}>
              <View style={styles.emptyIllustrationWrap}>
                <View style={styles.emptyIllustrationGlow} />
                <View style={styles.emptyIllustrationCard}>
                  <View style={styles.emptyDogFace}>
                    <View style={styles.emptyDogEarLeft} />
                    <View style={styles.emptyDogEarRight} />
                    <Text style={styles.emptyDogEmoji}>🐶</Text>
                  </View>
                  <View style={styles.emptyBellBadge}>
                    <Feather name="bell-off" size={16} color="#97A3B5" />
                  </View>
                </View>
              </View>

              <Text style={styles.emptyHeading}>All Caught Up!</Text>
              <Text style={styles.emptySubtitle}>
                We&apos;ll notify you here when your pet&apos;s AI Health diagnosis is ready, or when we have exclusive spa offers.
              </Text>

              <Pressable style={styles.emptyCtaButton} onPress={() => navigation.navigate("AccountTab", { screen: "AIHealthScan" })}>
                <Feather name="camera" size={16} color="#FFFFFF" />
                <Text style={styles.emptyCtaText}>Scan Pet Health</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.customerListWrap}>
              {filteredCustomerNotifications.map((item) => (
                <Pressable
                  key={item._id}
                  style={[styles.customerNoticeCard, !item.isRead && styles.customerNoticeCardUnread]}
                  onPress={() => onMarkAsRead(item)}
                >
                  <View style={styles.customerNoticeHeader}>
                    <Text style={styles.customerNoticeTitle} numberOfLines={1}>{item.title}</Text>
                    {!item.isRead ? <View style={styles.customerNoticeDot} /> : null}
                  </View>
                  <Text style={styles.customerNoticeBody} numberOfLines={3}>{item.body}</Text>
                  <View style={styles.customerNoticeFooter}>
                    <Text style={styles.customerNoticeDate}>{formatDateTime(item.createdAt)}</Text>
                    <Pressable onPress={() => onDeleteInbox(item._id)}>
                      <Text style={styles.customerNoticeDelete}>Delete</Text>
                    </Pressable>
                  </View>
                </Pressable>
              ))}
            </View>
          )}
        </ScrollView>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredStaffRows}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#D77D46" />}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.staffHeaderWrap}>
            <View style={styles.staffHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>Notification Management</Text>
                <Text style={styles.meta}>Create, send, and track customer notifications</Text>
              </View>
              <Pressable style={styles.refreshIconBtn} onPress={onRefresh}>
                <Feather name="refresh-cw" size={15} color="#63788F" />
              </Pressable>
            </View>

            <View style={styles.searchRow}>
              <View style={styles.searchWrap}>
                <Feather name="search" size={16} color="#C06A37" />
                <TextInput
                  style={styles.searchInput}
                  value={searchText}
                  onChangeText={setSearchText}
                  placeholder="Search by title, content, audience..."
                  placeholderTextColor="#98A4B4"
                />
              </View>
              <Pressable style={styles.createBtn} onPress={openCreate}>
                <Feather name="plus" size={15} color="#FFFFFF" />
                <Text style={styles.createBtnText}>Create</Text>
              </Pressable>
            </View>

            <View style={styles.filterChipRow}>
              {["All", "Sent", "Scheduled", "Draft", "Failed"].map((status) => {
                const active = statusFilter === status;
                return (
                  <Pressable
                    key={status}
                    style={[styles.filterChip, active && styles.filterChipActive]}
                    onPress={() => setStatusFilter(status as typeof statusFilter)}
                  >
                    <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{status}</Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.kpiGrid}>
              {[
                { label: "Total", value: summary.total, icon: "bell" as const },
                { label: "Sent Today", value: summary.sentToday, icon: "send" as const },
                { label: "Scheduled", value: summary.scheduled, icon: "clock" as const },
                { label: "Drafts", value: summary.drafts, icon: "file-text" as const },
              ].map((item) => (
                <View key={item.label} style={styles.kpiCard}>
                  <View>
                    <Text style={styles.kpiLabel}>{item.label}</Text>
                    <Text style={styles.kpiValue}>{item.value}</Text>
                  </View>
                  <View style={styles.kpiIconWrap}>
                    <Feather name={item.icon} size={14} color="#C16A36" />
                  </View>
                </View>
              ))}
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </View>
        }
        ListEmptyComponent={<Text style={styles.emptyText}>No notification records found.</Text>}
        renderItem={({ item }) => {
          const tone = getStatusTone(item.status);
          return (
            <View style={styles.staffCard}>
              <View style={styles.staffCardTop}>
                <Text style={styles.staffTitle} numberOfLines={1}>{item.title}</Text>
                <View style={[styles.statusBadge, { backgroundColor: tone.bg, borderColor: tone.border }]}> 
                  <Text style={[styles.statusBadgeText, { color: tone.text }]}>{item.status}</Text>
                </View>
              </View>

              <Text style={styles.staffSub} numberOfLines={1}>{item.type} · {item.targetAudience} · {item.priority}</Text>
              <Text style={styles.staffBody} numberOfLines={2}>{item.content || "No content"}</Text>

              <View style={styles.staffFooter}>
                <Text style={styles.staffDate}>{formatDateTime(item.createdDate)}</Text>
                <View style={styles.actionIconRow}>
                  <Pressable
                    style={styles.iconBtn}
                    onPress={() => {
                      setSelectedRow(item);
                      setViewVisible(true);
                    }}
                  >
                    <Feather name="eye" size={14} color="#5E7289" />
                  </Pressable>
                  <Pressable
                    style={[styles.iconBtn, styles.iconBtnDelete]}
                    onPress={() => {
                      setSelectedRow(item);
                      setViewVisible(true);
                    }}
                  >
                    <Feather name="info" size={14} color="#B14856" />
                  </Pressable>
                </View>
              </View>
            </View>
          );
        }}
      />

      <Modal visible={createVisible} transparent animationType="fade" onRequestClose={closeCreate}>
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={closeCreate} />

          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Create Notification</Text>
                <Text style={styles.modalSubTitle}>Compose and send to customers</Text>
              </View>
              <Pressable style={styles.modalCloseBtn} onPress={closeCreate}>
                <Feather name="x" size={15} color="#6E8094" />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.modalBody} showsVerticalScrollIndicator={false}>
              <View style={styles.formBlock}>
                <Text style={styles.inputLabel}>Title</Text>
                <TextInput
                  style={styles.inputControl}
                  value={form.title}
                  onChangeText={(value) => setForm((prev) => ({ ...prev, title: value }))}
                  placeholder="Notification title"
                  placeholderTextColor="#99A5B5"
                />
              </View>

              <View style={styles.formBlock}>
                <Text style={styles.inputLabel}>Type</Text>
                <View style={styles.wrapRow}>
                  {TYPE_OPTIONS.map((value) => {
                    const active = form.type === value;
                    return (
                      <Pressable
                        key={value}
                        style={[styles.chip, active && styles.chipActive]}
                        onPress={() => setForm((prev) => ({ ...prev, type: value }))}
                      >
                        <Text style={[styles.chipText, active && styles.chipTextActive]}>{value}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View style={styles.formBlock}>
                <Text style={styles.inputLabel}>Short Preview</Text>
                <TextInput
                  style={styles.inputControl}
                  value={form.summary}
                  onChangeText={(value) => setForm((prev) => ({ ...prev, summary: value }))}
                  placeholder="One-line preview"
                  placeholderTextColor="#99A5B5"
                />
              </View>

              <View style={styles.formBlock}>
                <Text style={styles.inputLabel}>Message Content</Text>
                <TextInput
                  style={[styles.inputControl, styles.textareaControl]}
                  value={form.content}
                  onChangeText={(value) => setForm((prev) => ({ ...prev, content: value }))}
                  placeholder="Write notification message..."
                  placeholderTextColor="#99A5B5"
                  multiline
                />
              </View>

              <View style={styles.formBlock}>
                <Text style={styles.inputLabel}>Audience</Text>
                <View style={styles.wrapRow}>
                  {AUDIENCE_OPTIONS.map((value) => {
                    const active = form.audience === value;
                    return (
                      <Pressable
                        key={value}
                        style={[styles.chip, active && styles.chipActive]}
                        onPress={() => setForm((prev) => ({ ...prev, audience: value, selectedUsers: value === "Specific Users" ? prev.selectedUsers : [] }))}
                      >
                        <Text style={[styles.chipText, active && styles.chipTextActive]}>{value}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {form.audience === "Specific Users" ? (
                <View style={styles.formBlock}>
                  <Text style={styles.inputLabel}>Select Users</Text>
                  <TextInput
                    style={styles.inputControl}
                    value={customerSearch}
                    onChangeText={setCustomerSearch}
                    placeholder="Search customer by name or email"
                    placeholderTextColor="#99A5B5"
                  />
                  <View style={styles.wrapRow}>
                    {customers.slice(0, 20).map((item) => {
                      const active = form.selectedUsers.includes(item.id);
                      return (
                        <Pressable
                          key={item.id}
                          style={[styles.chip, active && styles.chipActive]}
                          onPress={() => setForm((prev) => {
                            const exists = prev.selectedUsers.includes(item.id);
                            return {
                              ...prev,
                              selectedUsers: exists
                                ? prev.selectedUsers.filter((id) => id !== item.id)
                                : [...prev.selectedUsers, item.id],
                            };
                          })}
                        >
                          <Text style={[styles.chipText, active && styles.chipTextActive]}>{item.name}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ) : null}

              <View style={styles.formBlock}>
                <Text style={styles.inputLabel}>Priority</Text>
                <View style={styles.wrapRow}>
                  {PRIORITY_OPTIONS.map((value) => {
                    const active = form.priority === value;
                    return (
                      <Pressable
                        key={value}
                        style={[styles.chip, active && styles.chipActive]}
                        onPress={() => setForm((prev) => ({ ...prev, priority: value }))}
                      >
                        <Text style={[styles.chipText, active && styles.chipTextActive]}>{value}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View style={styles.formBlock}>
                <Text style={styles.inputLabel}>Delivery Mode</Text>
                <View style={styles.wrapRow}>
                  {(["Send now"] as StaffDelivery[]).map((value) => {
                    const active = form.delivery === value;
                    return (
                      <Pressable
                        key={value}
                        style={[styles.chip, active && styles.chipActive]}
                        onPress={() => setForm((prev) => ({ ...prev, delivery: value }))}
                      >
                        <Text style={[styles.chipText, active && styles.chipTextActive]}>{value}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <Text style={styles.meta}>Current backend supports immediate send only.</Text>

              {formError ? <Text style={styles.errorText}>{formError}</Text> : null}
            </ScrollView>

            <View style={styles.modalFooter}>
              <Pressable style={styles.secondaryBtn} onPress={closeCreate} disabled={actionLoading}>
                <Text style={styles.secondaryBtnText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.primaryBtn} onPress={submitStaffNotification} disabled={actionLoading}>
                {actionLoading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryBtnText}>Send Notification</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={viewVisible} transparent animationType="fade" onRequestClose={() => setViewVisible(false)}>
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setViewVisible(false)} />

          <View style={styles.viewCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Notification Detail</Text>
                <Text style={styles.modalSubTitle}>{selectedRow?.id || ""}</Text>
              </View>
              <Pressable style={styles.modalCloseBtn} onPress={() => setViewVisible(false)}>
                <Feather name="x" size={15} color="#6E8094" />
              </Pressable>
            </View>

            <View style={styles.viewBody}>
              <Text style={styles.viewTitle}>{selectedRow?.title || "-"}</Text>
              <Text style={styles.viewText}>{selectedRow?.content || "No content"}</Text>
              <Text style={styles.viewMeta}>Type: {selectedRow?.type || "-"}</Text>
              <Text style={styles.viewMeta}>Audience: {selectedRow?.targetAudience || "-"}</Text>
              <Text style={styles.viewMeta}>Status: {selectedRow?.status || "-"}</Text>
              <Text style={styles.viewMeta}>Created: {formatDateTime(selectedRow?.createdDate)}</Text>
              <Text style={styles.viewMeta}>Scheduled: {formatDateTime(selectedRow?.scheduledAt)}</Text>
            </View>

            <View style={styles.modalFooterSingle}>
              <Pressable style={styles.secondaryBtn} onPress={() => setViewVisible(false)}>
                <Text style={styles.secondaryBtnText}>Close</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  emptyRoot: {
    flex: 1,
    backgroundColor: "#F7F3EE",
  },
  customerActionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  customerSectionTitle: {
    color: "#2B3A50",
    fontSize: 24,
    fontWeight: "900",
  },
  emptyTopBar: {
    paddingHorizontal: 20,
    paddingBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  emptyBackBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTopTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 34,
    lineHeight: 40,
    fontWeight: "900",
    color: "#1C2536",
    marginRight: 18,
  },
  emptyMarkAllText: {
    color: "#CDA58B",
    fontSize: 14,
    fontWeight: "700",
  },
  emptyMarkAllTextDisabled: {
    opacity: 0.55,
  },
  emptyContent: {
    paddingHorizontal: 20,
  },
  emptyChipRow: {
    flexDirection: "row",
    gap: 10,
    paddingBottom: 8,
  },
  emptyChip: {
    paddingHorizontal: 22,
    paddingVertical: 11,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E8DED4",
    backgroundColor: "#EAE4DE",
  },
  emptyChipActive: {
    backgroundColor: "#E66819",
    borderColor: "#D35E16",
  },
  emptyChipText: {
    color: "#5D4B3E",
    fontSize: 15,
    fontWeight: "700",
  },
  emptyChipTextActive: {
    color: "#FFFFFF",
  },
  emptyMainCenter: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 620,
    paddingTop: 40,
  },
  customerListWrap: {
    gap: 12,
    paddingTop: 14,
    paddingBottom: 8,
  },
  customerNoticeCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#EADFD2",
    backgroundColor: "#FFFEFC",
    paddingHorizontal: 14,
    paddingVertical: 13,
    shadowColor: "#5C4634",
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  customerNoticeCardUnread: {
    borderColor: "#F1C6AA",
    backgroundColor: "#FFF9F5",
  },
  customerNoticeHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  customerNoticeTitle: {
    flex: 1,
    color: "#1F2B3D",
    fontSize: 17,
    fontWeight: "900",
  },
  customerNoticeDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: "#E66819",
  },
  customerNoticeBody: {
    marginTop: 6,
    color: "#495A70",
    fontSize: 14,
    lineHeight: 22,
  },
  customerNoticeFooter: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  customerNoticeDate: {
    color: "#95A3B3",
    fontSize: 12,
    fontWeight: "600",
  },
  customerNoticeDelete: {
    color: "#B14856",
    fontSize: 12,
    fontWeight: "800",
  },
  emptyIllustrationWrap: {
    width: 220,
    height: 190,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 22,
  },
  emptyIllustrationGlow: {
    position: "absolute",
    width: 190,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(231, 162, 118, 0.22)",
  },
  emptyIllustrationCard: {
    width: 178,
    height: 138,
    borderRadius: 38,
    backgroundColor: "#FFF9F1",
    borderWidth: 1,
    borderColor: "#F0E2D6",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#654025",
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  emptyDogFace: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#FFE2C9",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyDogEarLeft: {
    position: "absolute",
    top: 12,
    left: 10,
    width: 18,
    height: 24,
    borderRadius: 10,
    backgroundColor: "#F6B07B",
    transform: [{ rotate: "-22deg" }],
  },
  emptyDogEarRight: {
    position: "absolute",
    top: 12,
    right: 10,
    width: 18,
    height: 24,
    borderRadius: 10,
    backgroundColor: "#F6B07B",
    transform: [{ rotate: "22deg" }],
  },
  emptyDogEmoji: {
    fontSize: 44,
  },
  emptyBellBadge: {
    position: "absolute",
    right: 16,
    bottom: 14,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#EEF0F3",
    borderWidth: 1,
    borderColor: "#DFE3E8",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyHeading: {
    color: "#1E293B",
    fontSize: 36,
    lineHeight: 42,
    fontWeight: "900",
    textAlign: "center",
  },
  emptySubtitle: {
    marginTop: 10,
    color: "#8A97A9",
    fontSize: 16,
    lineHeight: 26,
    textAlign: "center",
    paddingHorizontal: 20,
    maxWidth: 360,
  },
  emptyCtaButton: {
    marginTop: 22,
    paddingHorizontal: 24,
    paddingVertical: 13,
    borderRadius: 999,
    backgroundColor: "#E66819",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    shadowColor: "#E66819",
    shadowOpacity: 0.33,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 7 },
    elevation: 6,
  },
  emptyCtaText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
  emptyBottomNavWrap: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 0,
    zIndex: 30,
  },
  emptyBottomNav: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(225, 214, 203, 0.9)",
    backgroundColor: "rgba(252, 249, 244, 0.88)",
    paddingHorizontal: 10,
    paddingVertical: 10,
    minHeight: 76,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#4D3827",
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  emptyNavItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
  },
  emptyNavText: {
    color: "#503D30",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  emptyActiveNavItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  emptyActiveNavCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#E66819",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#E66819",
    shadowOpacity: 0.38,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 9 },
    elevation: 7,
  },
  emptyActiveNavText: {
    color: "#B94F0F",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  container: {
    flex: 1,
    backgroundColor: "#FCF8F2",
    paddingHorizontal: 14,
    paddingBottom: 10,
  },
  centerBox: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FCF8F2",
  },
  headerCard: {
    borderWidth: 1,
    borderColor: "#E7DECF",
    borderRadius: 12,
    backgroundColor: "#FFFEFB",
    padding: 12,
    marginTop: 6,
  },
  title: {
    fontSize: 26,
    lineHeight: 31,
    fontWeight: "900",
    color: "#D27743",
  },
  meta: {
    marginTop: 3,
    color: "#6C7F96",
    fontSize: 13,
  },
  actionRow: {
    marginTop: 10,
    flexDirection: "row",
    gap: 10,
  },
  actionButton: {
    flex: 1,
    minHeight: 38,
    borderRadius: 11,
    backgroundColor: "#EEF2F6",
    alignItems: "center",
    justifyContent: "center",
  },
  actionText: {
    color: "#344B63",
    fontWeight: "700",
    fontSize: 13,
  },
  listContent: {
    gap: 8,
    paddingVertical: 10,
    paddingBottom: 22,
  },
  itemCard: {
    borderWidth: 1,
    borderColor: "#E7DECF",
    borderRadius: 12,
    backgroundColor: "#FFFEFB",
    padding: 11,
    gap: 5,
  },
  unreadItem: {
    borderColor: "#F2C9BC",
    backgroundColor: "#FFF4EF",
  },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  itemTitle: {
    flex: 1,
    fontWeight: "800",
    color: "#24364D",
  },
  itemType: {
    color: "#D87D4A",
    fontWeight: "700",
    textTransform: "capitalize",
    fontSize: 12,
  },
  itemBody: {
    color: "#586D84",
    fontSize: 13,
  },
  itemFooter: {
    marginTop: 3,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  itemDate: {
    color: "#95A3B3",
    fontSize: 11,
  },
  deleteButton: {
    borderWidth: 1,
    borderColor: "#F2C9CD",
    borderRadius: 8,
    backgroundColor: "#FEF3F4",
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  deleteText: {
    color: "#B14856",
    fontWeight: "700",
    fontSize: 12,
  },
  emptyText: {
    color: "#6F8297",
    textAlign: "center",
    marginTop: 16,
  },
  errorText: {
    marginTop: 8,
    color: "#B14856",
    fontSize: 12,
  },
  disabled: {
    opacity: 0.65,
  },
  staffHeaderWrap: {
    gap: 9,
  },
  staffHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 3,
  },
  refreshIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5DACD",
    backgroundColor: "#FFFCF7",
    alignItems: "center",
    justifyContent: "center",
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  searchWrap: {
    flex: 1,
    minHeight: 42,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E7DBCD",
    backgroundColor: "#FFFAF4",
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    color: "#2D4157",
    fontSize: 14,
    paddingVertical: 0,
  },
  createBtn: {
    minHeight: 40,
    borderRadius: 11,
    backgroundColor: "#D77D46",
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  createBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  filterChipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },
  filterChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E8DCCD",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  filterChipActive: {
    borderColor: "#E5C6AA",
    backgroundColor: "#FFF1E3",
  },
  filterChipText: {
    color: "#6E7F95",
    fontSize: 12,
    fontWeight: "700",
  },
  filterChipTextActive: {
    color: "#C06A37",
  },
  kpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  kpiCard: {
    width: "48.7%",
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#E8DED2",
    backgroundColor: "#FFFEFB",
    paddingHorizontal: 10,
    paddingVertical: 9,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  kpiLabel: {
    color: "#6F8094",
    fontSize: 10,
    textTransform: "uppercase",
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  kpiValue: {
    marginTop: 2,
    color: "#2A3F57",
    fontSize: 20,
    fontWeight: "900",
  },
  kpiIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: "#FFF3E8",
    alignItems: "center",
    justifyContent: "center",
  },
  staffCard: {
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#E8DFD3",
    backgroundColor: "#FFFEFC",
    paddingHorizontal: 11,
    paddingVertical: 10,
    gap: 4,
  },
  staffCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 6,
  },
  staffTitle: {
    flex: 1,
    color: "#22374F",
    fontSize: 14,
    fontWeight: "800",
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "800",
  },
  staffSub: {
    color: "#6B7E93",
    fontSize: 12,
    fontWeight: "600",
  },
  staffBody: {
    color: "#4B5F76",
    fontSize: 13,
  },
  staffFooter: {
    marginTop: 3,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  staffDate: {
    color: "#95A3B3",
    fontSize: 11,
    flex: 1,
  },
  actionIconRow: {
    flexDirection: "row",
    gap: 6,
  },
  iconBtn: {
    width: 28,
    height: 28,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "#E7DCCE",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  iconBtnDelete: {
    backgroundColor: "#FFF3F4",
    borderColor: "#F2CFD3",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(20, 31, 49, 0.3)",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  modalCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E8DACA",
    backgroundColor: "#FFFDFA",
    maxHeight: "88%",
    overflow: "hidden",
  },
  modalHeader: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#EFE3D6",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modalTitle: {
    color: "#2C435D",
    fontSize: 16,
    fontWeight: "900",
  },
  modalSubTitle: {
    marginTop: 2,
    color: "#74859C",
    fontSize: 12,
  },
  modalCloseBtn: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: "#F6EFE5",
    alignItems: "center",
    justifyContent: "center",
  },
  modalBody: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 12,
    gap: 10,
  },
  formBlock: {
    gap: 6,
  },
  inputLabel: {
    color: "#5D7087",
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  inputControl: {
    minHeight: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E8DECF",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 10,
    color: "#2F435A",
    fontSize: 14,
  },
  textareaControl: {
    minHeight: 94,
    textAlignVertical: "top",
    paddingVertical: 10,
  },
  wrapRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E8DCCD",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  chipActive: {
    borderColor: "#E5C6AA",
    backgroundColor: "#FFF1E3",
  },
  chipText: {
    color: "#6E7F95",
    fontSize: 12,
    fontWeight: "700",
  },
  chipTextActive: {
    color: "#C06A37",
  },
  modalFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#EFE3D6",
    backgroundColor: "#FFFCF8",
  },
  modalFooterSingle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 8,
    paddingHorizontal: 12,
    paddingBottom: 12,
    paddingTop: 8,
  },
  secondaryBtn: {
    minHeight: 38,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: "#E7DCCE",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  secondaryBtnText: {
    color: "#5E738B",
    fontSize: 13,
    fontWeight: "800",
  },
  ghostBtn: {
    minHeight: 38,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: "#DCE3EC",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  ghostBtnText: {
    color: "#5E7289",
    fontSize: 13,
    fontWeight: "800",
  },
  primaryBtn: {
    flex: 1,
    minHeight: 38,
    borderRadius: 11,
    backgroundColor: "#D77D46",
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  viewCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E8DACA",
    backgroundColor: "#FFFDFA",
    overflow: "hidden",
  },
  viewBody: {
    paddingHorizontal: 12,
    paddingTop: 10,
    gap: 6,
  },
  viewTitle: {
    color: "#263C55",
    fontSize: 16,
    fontWeight: "900",
  },
  viewText: {
    color: "#53687F",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 3,
  },
  viewMeta: {
    color: "#6F8094",
    fontSize: 12,
    fontWeight: "600",
  },
  deleteCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#F1D9D9",
    backgroundColor: "#FFFEFB",
    paddingTop: 14,
  },
  deleteIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: "#FFF1F1",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
  },
  deleteTitle: {
    marginTop: 8,
    textAlign: "center",
    color: "#2E4157",
    fontSize: 15,
    fontWeight: "900",
  },
  deleteTextBody: {
    marginTop: 5,
    marginHorizontal: 14,
    textAlign: "center",
    color: "#6C7D93",
    fontSize: 12,
    lineHeight: 17,
  },
  dangerBtn: {
    minHeight: 38,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: "#F1B6B6",
    backgroundColor: "#FFF1F1",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  dangerBtnText: {
    color: "#B42318",
    fontSize: 13,
    fontWeight: "800",
  },
});
