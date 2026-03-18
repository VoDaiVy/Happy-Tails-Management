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
  updateFeedback,
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
  const [editingId, setEditingId] = useState("");
  const [editRating, setEditRating] = useState(5);
  const [editComment, setEditComment] = useState("");
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
      await createFeedback({
        booking: selectedBookingId,
        service: selectedServiceId || undefined,
        rating,
        comment: comment.trim() || undefined,
      });
      setMessage("Gui feedback thanh cong");
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

  const beginEdit = (item: FeedbackItem) => {
    setEditingId(item._id);
    setEditRating(item.rating || 5);
    setEditComment(item.comment || "");
  };

  const submitEdit = async () => {
    if (!editingId) return;

    setSaving(true);
    setError("");
    setMessage("");
    try {
      await updateFeedback(editingId, {
        rating: editRating,
        comment: editComment.trim() || undefined,
      });
      setMessage("Da cap nhat feedback");
      setEditingId("");
      await loadData();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Cap nhat feedback that bai");
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
          {editingId === item._id ? (
            <>
              <Text style={styles.feedbackMeta}>Edit Rating</Text>
              <View style={styles.ratingRow}>
                {RATING_OPTIONS.map((value) => (
                  <Pressable
                    key={`edit-${item._id}-${value}`}
                    style={[styles.ratingButton, editRating === value && styles.ratingActive]}
                    onPress={() => setEditRating(value)}
                  >
                    <Text style={[styles.ratingText, editRating === value && styles.ratingTextActive]}>{value}</Text>
                  </Pressable>
                ))}
              </View>
              <TextInput
                style={styles.commentInput}
                value={editComment}
                onChangeText={setEditComment}
                multiline
                numberOfLines={3}
                placeholder="Cap nhat nhan xet"
              />
            </>
          ) : (
            <>
              <Text style={styles.feedbackMeta}>Rating: {item.rating}/5</Text>
              <Text style={styles.feedbackComment}>{item.comment || "(Khong co comment)"}</Text>
            </>
          )}
          <View style={styles.feedbackFooter}>
            <Text style={styles.feedbackDate}>{new Date(item.createdAt).toLocaleString()}</Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {editingId === item._id ? (
                <>
                  <Pressable style={styles.editButton} onPress={submitEdit} disabled={saving}>
                    <Text style={styles.editText}>Save</Text>
                  </Pressable>
                  <Pressable style={styles.cancelButton} onPress={() => setEditingId("")} disabled={saving}>
                    <Text style={styles.cancelText}>Cancel</Text>
                  </Pressable>
                </>
              ) : (
                <Pressable style={styles.editButton} onPress={() => beginEdit(item)} disabled={saving}>
                  <Text style={styles.editText}>Edit</Text>
                </Pressable>
              )}
              <Pressable style={styles.deleteButton} onPress={() => removeFeedback(item._id)} disabled={saving}>
                <Text style={styles.deleteText}>Delete</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4F1EC" },
  content: { padding: 16, gap: 12, paddingBottom: 24 },
  centerBox: { flex: 1, justifyContent: "center", alignItems: "center" },
  headerWrap: { gap: 12 },
  title: { fontSize: 24, fontWeight: "900", color: "#2F3742" },
  subtitle: { color: "#8395B2" },
  sectionTitle: { marginTop: 4, fontWeight: "800", color: "#4D5E78" },
  optionWrap: { gap: 8 },
  optionButton: {
    borderWidth: 1,
    borderColor: "#E3E5E9",
    borderRadius: 12,
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  optionActive: { borderColor: "#D87D4A", backgroundColor: "#FFF4EF" },
  optionText: { color: "#4D5E78" },
  optionTextActive: { color: "#C96F42", fontWeight: "700" },
  ratingRow: { flexDirection: "row", gap: 8 },
  ratingButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E3E5E9",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  ratingActive: { borderColor: "#D87D4A", backgroundColor: "#FFF4EF" },
  ratingText: { color: "#4D5E78", fontWeight: "700" },
  ratingTextActive: { color: "#C96F42" },
  commentInput: {
    borderWidth: 1,
    borderColor: "#E3E5E9",
    borderRadius: 12,
    backgroundColor: "#fff",
    color: "#2F3742",
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 90,
    textAlignVertical: "top",
  },
  submitButton: {
    marginTop: 2,
    borderRadius: 12,
    backgroundColor: "#D87D4A",
    alignItems: "center",
    paddingVertical: 13,
  },
  submitText: { color: "#fff", fontWeight: "800" },
  feedbackCard: {
    borderWidth: 1,
    borderColor: "#E7DED1",
    borderRadius: 16,
    backgroundColor: "#fff",
    padding: 14,
    gap: 8,
  },
  feedbackMeta: { fontWeight: "800", color: "#2F3742" },
  feedbackComment: { color: "#4D5E78" },
  feedbackFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  feedbackDate: { color: "#98A2B3", fontSize: 12 },
  deleteButton: {
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: 8,
    backgroundColor: "#FEF2F2",
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  deleteText: { color: "#B91C1C", fontWeight: "600" },
  editButton: {
    borderWidth: 1,
    borderColor: "#F2C9BC",
    borderRadius: 8,
    backgroundColor: "#FFF4EF",
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  editText: { color: "#C96F42", fontWeight: "700" },
  cancelButton: {
    borderWidth: 1,
    borderColor: "#E3E5E9",
    borderRadius: 8,
    backgroundColor: "#F8F8F7",
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  cancelText: { color: "#4D5E78", fontWeight: "700" },
  errorText: { color: "#DC2626" },
  successText: { color: "#059669" },
  emptyText: { color: "#8395B2" },
  disabled: { opacity: 0.65 },
});
