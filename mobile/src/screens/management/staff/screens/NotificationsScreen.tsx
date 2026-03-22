import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert } from "react-native";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { broadcastNotification, getStaffOutbox, sendNotification } from "../../../../api/modules/notificationApi";
import { staffTheme } from "../../../../theme/staffTheme";
import type { NotificationCardModel } from "../types";
import {
  InfoCard,
  KPIStatCard,
  NotificationCard,
  PrimaryButton,
  ReusableModalSheet,
  SearchBar,
  SectionHeader,
  SecondaryButton,
} from "../components";

interface OutboxRow {
  _id: string;
  title: string;
  body: string;
  type: string;
  totalRecipients: number;
  deliveredCount: number;
  createdAt: string;
}

function toNotificationCard(item: OutboxRow): NotificationCardModel {
  const dateText = item.createdAt ? new Date(item.createdAt).toLocaleDateString("en-GB") : "--";
  const deliveryPercent = item.totalRecipients > 0
    ? Math.round((item.deliveredCount / item.totalRecipients) * 100)
    : 0;

  return {
    title: item.title,
    type: item.type || "general",
    targetAudience: `${item.totalRecipients} recipient(s)`,
    createdBy: "Staff",
    createdDate: dateText,
    scheduledAt: "Immediate",
    status: "Sent",
    delivery: `${deliveryPercent}% delivered`,
  };
}

interface NotificationsScreenProps {
  openCreate: boolean;
  onOpenCreate: () => void;
  onCloseCreate: () => void;
}

export function NotificationsScreen({ openCreate, onOpenCreate, onCloseCreate }: NotificationsScreenProps) {
  const [keyword, setKeyword] = useState("");
  const [deliveryMode, setDeliveryMode] = useState("Immediate");
  const [rows, setRows] = useState<OutboxRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [formTitle, setFormTitle] = useState("");
  const [formType, setFormType] = useState("system");
  const [formBody, setFormBody] = useState("");
  const [formTargetUserId, setFormTargetUserId] = useState("");

  const loadOutbox = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const result = await getStaffOutbox({ page: 1, limit: 100, search: keyword.trim() || undefined });
      setRows((result.rows || []) as OutboxRow[]);
    } catch (fetchError) {
      const err = fetchError as { message?: string };
      setError(err.message || "Failed to load notifications.");
    } finally {
      setLoading(false);
    }
  }, [keyword]);

  useEffect(() => {
    loadOutbox();
  }, [loadOutbox]);

  const notificationCards = useMemo(() => rows.map(toNotificationCard), [rows]);

  const stats = useMemo(() => {
    const total = rows.length;
    const totalRecipients = rows.reduce((sum, item) => sum + Number(item.totalRecipients || 0), 0);
    const totalDelivered = rows.reduce((sum, item) => sum + Number(item.deliveredCount || 0), 0);
    const deliveryRate = totalRecipients > 0 ? `${Math.round((totalDelivered / totalRecipients) * 100)}%` : "0%";

    return [
      { label: "Total campaigns", value: String(total) },
      { label: "Delivered", value: String(totalDelivered) },
      { label: "Delivery rate", value: deliveryRate },
      { label: "Recipients", value: String(totalRecipients) },
    ];
  }, [rows]);

  const handleSubmit = async () => {
    if (!formTitle.trim() || !formBody.trim()) {
      Alert.alert("Validation", "Title and content are required.");
      return;
    }

    try {
      if (formTargetUserId.trim()) {
        await sendNotification({
          userId: formTargetUserId.trim(),
          title: formTitle.trim(),
          body: formBody.trim(),
          type: formType.trim() || "system",
        });
      } else {
        await broadcastNotification({
          title: formTitle.trim(),
          body: formBody.trim(),
          type: formType.trim() || "system",
        });
      }

      setFormTitle("");
      setFormType("system");
      setFormBody("");
      setFormTargetUserId("");
      onCloseCreate();
      await loadOutbox();
    } catch (submitError) {
      const err = submitError as { message?: string };
      Alert.alert("Send failed", err.message || "Unable to send notification.");
    }
  };

  return (
    <View style={styles.wrap}>
      <SectionHeader
        title="Notification Management"
        subtitle="Design, schedule, and monitor outgoing notifications"
        action={<PrimaryButton title="Create Notification" onPress={onOpenCreate} />}
      />

      <View style={styles.filterBlock}>
        <SearchBar placeholder="Search title, type, audience" value={keyword} onChangeText={setKeyword} />
      </View>

      <View style={styles.statsGrid}>
        {stats.map((item, index) => (
          <KPIStatCard key={item.label} label={item.label} value={item.value} icon={["◉", "↗", "◷", "✎"][index]} />
        ))}
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {loading ? <Text style={styles.loadingText}>Loading notifications...</Text> : null}

      {notificationCards.map((item) => (
        <NotificationCard key={`${item.title}-${item.createdDate}`} item={item} />
      ))}

      <ReusableModalSheet visible={openCreate} onClose={onCloseCreate}>
        <ScrollView contentContainerStyle={styles.formWrap}>
          <SectionHeader title="Create Notification" subtitle="Web-style flow adapted for mobile" />

          <InfoCard title="Basic Information">
            <TextInput style={styles.input} value={formTitle} onChangeText={setFormTitle} placeholder="Title" placeholderTextColor="#8A8F99" />
            <TextInput style={styles.input} value={formType} onChangeText={setFormType} placeholder="Type" placeholderTextColor="#8A8F99" />
          </InfoCard>

          <InfoCard title="Content & Audience">
            <TextInput
              style={[styles.input, styles.multiline]}
              multiline
              value={formBody}
              onChangeText={setFormBody}
              placeholder="Notification content"
              placeholderTextColor="#8A8F99"
            />
            <TextInput
              style={styles.input}
              value={formTargetUserId}
              onChangeText={setFormTargetUserId}
              placeholder="Target user ID (optional)"
              placeholderTextColor="#8A8F99"
            />
          </InfoCard>

          <InfoCard title="Upload banner">
            <View style={styles.uploadBox}><Text style={styles.uploadText}>Tap to upload banner</Text></View>
          </InfoCard>

          <InfoCard title="Preview">
            <View style={styles.previewBox}><Text style={styles.previewTitle}>[Preview] Notification title</Text><Text style={styles.previewBody}>Body preview appears here...</Text></View>
          </InfoCard>

          <InfoCard title="Audience / Priority / Delivery">
            <TextInput style={styles.input} placeholder="Audience segment" placeholderTextColor="#8A8F99" />
            <TextInput style={styles.input} placeholder="Priority" placeholderTextColor="#8A8F99" />
            <TextInput style={styles.input} value={deliveryMode} onChangeText={setDeliveryMode} placeholderTextColor="#8A8F99" />
            <TextInput style={styles.input} placeholder="Schedule datetime" placeholderTextColor="#8A8F99" />
          </InfoCard>

          <View style={styles.actionsRow}>
            <View style={{ flex: 1 }}><SecondaryButton title="Cancel" onPress={onCloseCreate} /></View>
            <View style={{ flex: 1 }}><PrimaryButton title="Send / Schedule" onPress={handleSubmit} /></View>
          </View>
        </ScrollView>
      </ReusableModalSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: staffTheme.spacing.lg,
  },
  filterBlock: {
    padding: staffTheme.spacing.sm,
    borderRadius: staffTheme.radius.xl,
    borderWidth: 1,
    borderColor: staffTheme.colors.borderSoft,
    backgroundColor: staffTheme.colors.surfaceAlt,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  loadingText: {
    color: staffTheme.colors.textSecondary,
    fontSize: 12,
  },
  errorText: {
    color: staffTheme.colors.danger,
    fontSize: 12,
    fontWeight: "600",
  },
  formWrap: {
    gap: 12,
    paddingBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: staffTheme.colors.borderSoft,
    borderRadius: 14,
    backgroundColor: staffTheme.colors.surface,
    color: staffTheme.colors.text,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  multiline: {
    minHeight: 84,
    textAlignVertical: "top",
  },
  uploadBox: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#D7C1AA",
    borderRadius: 14,
    padding: 22,
    alignItems: "center",
    backgroundColor: "#FFF7EE",
  },
  uploadText: {
    color: staffTheme.colors.textSecondary,
    fontSize: 13,
    fontWeight: "600",
  },
  previewBox: {
    borderWidth: 1,
    borderColor: staffTheme.colors.borderSoft,
    borderRadius: 14,
    backgroundColor: "#FFF7EE",
    padding: 14,
    gap: 4,
  },
  previewTitle: {
    color: staffTheme.colors.text,
    fontWeight: "700",
    fontSize: 13,
  },
  previewBody: {
    color: staffTheme.colors.textSecondary,
    fontSize: 12,
  },
  actionsRow: {
    marginTop: 4,
    flexDirection: "row",
    gap: 8,
  },
});
