import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  createFeedback,
  deleteFeedback,
  getEligibleBookingsForFeedback,
  getMyFeedback,
} from "../../api/modules/feedbackApi";
import { useAuth } from "../../context/AuthContext";
import type { EligibleFeedbackBooking, FeedbackItem } from "../../types/feedback";
import { canUseCustomerFeatures } from "../../utils/role";

const RATING_OPTIONS = [1, 2, 3, 4, 5];

export function FeedbackScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [eligibleBookings, setEligibleBookings] = useState<EligibleFeedbackBooking[]>([]);
  const [selectedBookingId, setSelectedBookingId] = useState("");
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const canAccess = canUseCustomerFeatures(user?.role);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [myFeedbackList, eligibleList] = await Promise.all([
        getMyFeedback(),
        getEligibleBookingsForFeedback(),
      ]);
      setFeedbacks(myFeedbackList);
      setEligibleBookings(eligibleList);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Khong tai duoc du lieu feedback");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!canAccess) {
      setLoading(false);
      return;
    }
    loadData();
  }, [canAccess, loadData]);

  if (!canAccess) {
    return (
      <View style={styles.centerBox}>
        <Text style={styles.errorText}>Tinh nang nay chi danh cho tai khoan customer.</Text>
      </View>
    );
  }

  const selectedBooking = useMemo(
    () => eligibleBookings.find((booking) => booking._id === selectedBookingId),
    [eligibleBookings, selectedBookingId],
  );

  const servicesForSelectedBooking = useMemo(() => {
    if (!selectedBooking) return [];
    return selectedBooking.items.filter((item) => item.service?._id && !item.hasReviewed);
  }, [selectedBooking]);

  const submitFeedback = async () => {
    if (!selectedBookingId) {
      setError("Vui long chon booking");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");
    try {
      const result = await createFeedback({
        booking: selectedBookingId,
        service: selectedServiceId || undefined,
        rating,
        comment: comment.trim() || undefined,
      });
      setMessage(result.message || "Gui feedback thanh cong");
      setComment("");
      setSelectedServiceId("");
      await loadData();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gui feedback that bai");
    } finally {
      setSaving(false);
    }
  };

  const removeFeedback = async (id: string) => {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await deleteFeedback(id);
      setMessage("Da xoa feedback");
      await loadData();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Xoa feedback that bai");
    } finally {
      setSaving(false);
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
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      data={feedbacks}
      keyExtractor={(item, index) => `${item._id}-${index}`}
      ListHeaderComponent={
        <View style={styles.headerWrap}>
          <Text style={styles.title}>Feedback Module</Text>
          <Text style={styles.subtitle}>Danh gia dich vu tu booking da hoan thanh</Text>

          <Text style={styles.sectionTitle}>1) Chon Booking</Text>
          <View style={styles.optionWrap}>
            {eligibleBookings.length === 0 ? <Text style={styles.emptyText}>Khong co booking hoan thanh nao</Text> : null}
            {eligibleBookings.map((booking, bookingIndex) => {
              const active = selectedBookingId === booking._id;
              return (
                <Pressable
                  key={`${booking._id}-${bookingIndex}`}
                  style={[styles.optionButton, active && styles.optionActive]}
                  onPress={() => {
                    setSelectedBookingId(booking._id);
                    setSelectedServiceId("");
                  }}
                >
                  <Text style={[styles.optionText, active && styles.optionTextActive]}>
                    {booking.bookingNumber || booking._id.slice(-8)} - {booking.bookingDate ? new Date(booking.bookingDate).toLocaleDateString() : "No date"}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.sectionTitle}>2) Chon Service (optional)</Text>
          <View style={styles.optionWrap}>
            <Pressable
              style={[styles.optionButton, !selectedServiceId && styles.optionActive]}
              onPress={() => setSelectedServiceId("")}
            >
              <Text style={[styles.optionText, !selectedServiceId && styles.optionTextActive]}>Overall Booking</Text>
            </Pressable>

            {servicesForSelectedBooking.map((item, itemIndex) => {
              const serviceId = item.service?._id || "";
              const active = selectedServiceId === serviceId;
              return (
                <Pressable
                  key={`${selectedBookingId}-${serviceId || item._id || "svc"}-${itemIndex}`}
                  style={[styles.optionButton, active && styles.optionActive]}
                  onPress={() => setSelectedServiceId(serviceId)}
                >
                  <Text style={[styles.optionText, active && styles.optionTextActive]}>{item.service?.name || "Service"}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.sectionTitle}>3) Rating</Text>
          <View style={styles.ratingRow}>
            {RATING_OPTIONS.map((value) => (
              <Pressable
                key={value}
                style={[styles.ratingButton, rating === value && styles.ratingActive]}
                onPress={() => setRating(value)}
              >
                <Text style={[styles.ratingText, rating === value && styles.ratingTextActive]}>{value}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.sectionTitle}>4) Comment</Text>
          <TextInput
            style={styles.commentInput}
            value={comment}
            onChangeText={setComment}
            multiline
            numberOfLines={4}
            placeholder="Nhap nhan xet cua ban"
            placeholderTextColor="#94A3B8"
          />

          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          {message ? <Text style={styles.successText}>{message}</Text> : null}

          <Pressable style={[styles.submitButton, saving && styles.disabled]} onPress={submitFeedback} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Submit Feedback</Text>}
          </Pressable>

          <Text style={styles.sectionTitle}>My Feedback</Text>
          {feedbacks.length === 0 ? <Text style={styles.emptyText}>Ban chua gui feedback nao</Text> : null}
        </View>
      }
      ListEmptyComponent={null}
      renderItem={({ item }) => (
        <View style={styles.feedbackCard}>
          <Text style={styles.feedbackMeta}>Rating: {item.rating}/5</Text>
          <Text style={styles.feedbackComment}>{item.comment || "(Khong co comment)"}</Text>
          <View style={styles.feedbackFooter}>
            <Text style={styles.feedbackDate}>{new Date(item.createdAt).toLocaleString()}</Text>
            <Pressable style={styles.deleteButton} onPress={() => removeFeedback(item._id)} disabled={saving}>
              <Text style={styles.deleteText}>Delete</Text>
            </Pressable>
          </View>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  content: { padding: 16, gap: 10, paddingBottom: 24 },
  centerBox: { flex: 1, justifyContent: "center", alignItems: "center" },
  headerWrap: { gap: 10 },
  title: { fontSize: 22, fontWeight: "800", color: "#0F172A" },
  subtitle: { color: "#64748B" },
  sectionTitle: { marginTop: 4, fontWeight: "700", color: "#1E293B" },
  optionWrap: { gap: 8 },
  optionButton: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  optionActive: { borderColor: "#2563EB", backgroundColor: "#EFF6FF" },
  optionText: { color: "#334155" },
  optionTextActive: { color: "#1D4ED8", fontWeight: "700" },
  ratingRow: { flexDirection: "row", gap: 8 },
  ratingButton: {
    width: 38,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  ratingActive: { borderColor: "#F59E0B", backgroundColor: "#FFFBEB" },
  ratingText: { color: "#334155", fontWeight: "700" },
  ratingTextActive: { color: "#B45309" },
  commentInput: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    backgroundColor: "#fff",
    color: "#0F172A",
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 90,
    textAlignVertical: "top",
  },
  submitButton: {
    marginTop: 2,
    borderRadius: 10,
    backgroundColor: "#2563EB",
    alignItems: "center",
    paddingVertical: 12,
  },
  submitText: { color: "#fff", fontWeight: "700" },
  feedbackCard: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    backgroundColor: "#fff",
    padding: 12,
    gap: 6,
  },
  feedbackMeta: { fontWeight: "700", color: "#1E293B" },
  feedbackComment: { color: "#334155" },
  feedbackFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  feedbackDate: { color: "#94A3B8", fontSize: 12 },
  deleteButton: {
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: 8,
    backgroundColor: "#FEF2F2",
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  deleteText: { color: "#B91C1C", fontWeight: "600" },
  errorText: { color: "#DC2626" },
  successText: { color: "#059669" },
  emptyText: { color: "#64748B" },
  disabled: { opacity: 0.65 },
});
