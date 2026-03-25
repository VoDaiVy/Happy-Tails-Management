import { useCallback, useEffect, useMemo, useState } from "react";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  ActivityIndicator,
  FlatList,
  ScrollView,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import {
  createFeedback,
  deleteFeedback,
  getEligibleBookingsForFeedback,
  getMyFeedback,
  getMyReceivedFeedback,
  respondToFeedback,
  updateFeedback,
} from "../../api/modules/feedbackApi";
import { useAuth } from "../../context/AuthContext";
import type { AccountStackParamList } from "../../navigation/types";
import type { EligibleFeedbackBooking, FeedbackItem } from "../../types/feedback";
import { canUseCustomerFeatures, isStaffOrAdminRole } from "../../utils/role";

const RATING_OPTIONS = [1, 2, 3, 4, 5];

type Props = NativeStackScreenProps<AccountStackParamList, "Feedback">;

export function FeedbackScreen({ route }: Props) {
  const { user } = useAuth();
  const preselectedBookingId = route.params?.bookingId || "";
  const preselectedServiceId = route.params?.serviceId || "";
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
  const [staffFeedbacks, setStaffFeedbacks] = useState<FeedbackItem[]>([]);
  const [respondingId, setRespondingId] = useState("");
  const [responseDraftById, setResponseDraftById] = useState<Record<string, string>>({});
  const [staffSearch, setStaffSearch] = useState("");
  const [staffRatingFilter, setStaffRatingFilter] = useState(0);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const canAccessCustomer = canUseCustomerFeatures(user?.role);
  const canAccessStaff = isStaffOrAdminRole(user?.role);

  useEffect(() => {
    if (preselectedBookingId) {
      setSelectedBookingId(preselectedBookingId);
    }
  }, [preselectedBookingId]);

  useEffect(() => {
    if (preselectedServiceId) {
      setSelectedServiceId(preselectedServiceId);
    }
  }, [preselectedServiceId]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      if (canAccessStaff) {
        const receivedList = await getMyReceivedFeedback();
        setStaffFeedbacks(receivedList);
        return;
      }

      if (canAccessCustomer) {
        const [myFeedbackList, eligibleList] = await Promise.all([
          getMyFeedback(),
          getEligibleBookingsForFeedback(),
        ]);
        setFeedbacks(myFeedbackList);
        setEligibleBookings(eligibleList);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load feedback data");
    } finally {
      setLoading(false);
    }
  }, [canAccessCustomer, canAccessStaff]);

  useEffect(() => {
    if (!canAccessCustomer && !canAccessStaff) {
      setLoading(false);
      return;
    }
    loadData();
  }, [canAccessCustomer, canAccessStaff, loadData]);

  const selectedBooking = useMemo(
    () => eligibleBookings.find((booking) => booking._id === selectedBookingId),
    [eligibleBookings, selectedBookingId],
  );

  const servicesForSelectedBooking = useMemo(() => {
    if (!selectedBooking) return [];
    return selectedBooking.items.filter((item) => item.service?._id && !item.hasReviewed);
  }, [selectedBooking]);

  if (!canAccessCustomer && !canAccessStaff) {
    return (
      <View style={styles.centerBox}>
        <Text style={styles.errorText}>This feature is only available for customer and staff accounts.</Text>
      </View>
    );
  }

  const submitStaffResponse = async (id: string) => {
    const responseText = String(responseDraftById[id] || "").trim();
    if (!responseText) {
      setError("Please enter a response message.");
      return;
    }

    setSaving(true);
    setRespondingId(id);
    setError("");
    setMessage("");
    try {
      await respondToFeedback(id, responseText);
      setMessage("Response sent successfully.");
      setResponseDraftById((prev) => ({ ...prev, [id]: "" }));
      await loadData();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send response.");
    } finally {
      setRespondingId("");
      setSaving(false);
    }
  };

  const getUserName = (item: FeedbackItem) => {
    if (!item.user) return "Customer";
    if (typeof item.user === "string") return item.user.slice(-8);
    return item.user.name || item.user.email || "Customer";
  };

  const getBookingRef = (item: FeedbackItem) => {
    if (!item.booking) return "No booking";
    if (typeof item.booking === "string") return item.booking.slice(-8);
    return item.booking.bookingNumber || item.booking._id || "No booking";
  };

  const getServiceName = (item: FeedbackItem) => {
    if (!item.service) return "Overall booking";
    if (typeof item.service === "string") return item.service.slice(-8);
    return item.service.name || item.service._id || "Service";
  };

  const filteredStaffFeedbacks = useMemo(() => {
    const query = staffSearch.trim().toLowerCase();
    return staffFeedbacks.filter((item) => {
      const ratingPass = staffRatingFilter === 0 || Number(item.rating || 0) === staffRatingFilter;
      if (!ratingPass) return false;

      if (!query) return true;
      const blob = [
        getUserName(item),
        getBookingRef(item),
        getServiceName(item),
        item.comment || "",
      ]
        .join(" ")
        .toLowerCase();
      return blob.includes(query);
    });
  }, [staffFeedbacks, staffSearch, staffRatingFilter]);

  const staffAvgRating = useMemo(() => {
    if (!staffFeedbacks.length) return 0;
    const total = staffFeedbacks.reduce((sum, item) => sum + Number(item.rating || 0), 0);
    return total / staffFeedbacks.length;
  }, [staffFeedbacks]);

  const renderStars = (rating: number) => {
    const safe = Math.max(0, Math.min(5, Number(rating) || 0));
    return (
      <View style={styles.starRow}>
        {Array.from({ length: 5 }).map((_, index) => (
          <Text key={`star-${rating}-${index}`} style={index < safe ? styles.starOn : styles.starOff}>
            ★
          </Text>
        ))}
      </View>
    );
  };

  if (canAccessStaff) {
    return (
      <FlatList
        style={styles.container}
        contentContainerStyle={styles.content}
        data={filteredStaffFeedbacks}
        keyExtractor={(item, index) => `${item._id}-${index}`}
        onRefresh={loadData}
        refreshing={loading}
        ListHeaderComponent={
          <View style={styles.headerWrap}>
            <Text style={styles.title}>Staff Feedback Inbox</Text>
            <Text style={styles.subtitle}>Review customer feedback assigned to you and send responses</Text>

            <View style={styles.statGrid}>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{staffFeedbacks.length}</Text>
                <Text style={styles.statLabel}>Total Reviews</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{staffAvgRating.toFixed(1)}</Text>
                <Text style={styles.statLabel}>Average Rating</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{filteredStaffFeedbacks.length}</Text>
                <Text style={styles.statLabel}>Filtered</Text>
              </View>
            </View>

            <View style={styles.searchWrap}>
              <Feather name="search" size={16} color="#A2643C" />
              <TextInput
                style={styles.searchInput}
                value={staffSearch}
                onChangeText={setStaffSearch}
                placeholder="Search by customer, booking, service..."
                placeholderTextColor="#A5AFBC"
              />
              {staffSearch ? (
                <Pressable onPress={() => setStaffSearch("")}>
                  <Feather name="x" size={16} color="#9BA7B6" />
                </Pressable>
              ) : null}
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
              {[0, 1, 2, 3, 4, 5].map((value) => {
                const active = staffRatingFilter === value;
                const label = value === 0 ? "All" : `${value}★`;
                return (
                  <Pressable
                    key={`staff-filter-${value}`}
                    style={[styles.filterChip, active && styles.filterChipActive]}
                    onPress={() => setStaffRatingFilter(value)}
                  >
                    <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{label}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            {message ? <Text style={styles.successText}>{message}</Text> : null}
            {filteredStaffFeedbacks.length === 0 ? <Text style={styles.emptyText}>No feedback found with current filter.</Text> : null}
          </View>
        }
        ListEmptyComponent={null}
        renderItem={({ item }) => {
          const currentDraft = responseDraftById[item._id] ?? (item.response?.message || "");
          const hasResponse = Boolean(item.response?.message);

          return (
            <View style={styles.feedbackCard}>
              <View style={styles.staffCardTopRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.feedbackMeta}>Customer: {getUserName(item)}</Text>
                  <Text style={styles.cardSubMeta}>Booking #{getBookingRef(item)}</Text>
                  <Text style={styles.cardSubMeta}>Service: {getServiceName(item)}</Text>
                </View>
                <Text style={styles.feedbackDate}>{new Date(item.createdAt).toLocaleDateString()}</Text>
              </View>

              <View style={styles.staffRatingRow}>
                {renderStars(item.rating)}
                <Text style={styles.staffRatingText}>{Number(item.rating || 0).toFixed(1)}</Text>
              </View>

              <Text style={styles.feedbackComment}>{item.comment || "(No comment)"}</Text>

              <Text style={styles.sectionTitle}>{hasResponse ? "Your Response" : "Add Response"}</Text>
              <TextInput
                style={styles.commentInput}
                value={currentDraft}
                onChangeText={(value) =>
                  setResponseDraftById((prev) => ({
                    ...prev,
                    [item._id]: value,
                  }))
                }
                multiline
                numberOfLines={3}
                placeholder="Write a response to customer"
                placeholderTextColor="#94A3B8"
              />

              <View style={styles.feedbackFooter}>
                <Pressable
                  style={[styles.editButton, saving && styles.disabled]}
                  onPress={() => submitStaffResponse(item._id)}
                  disabled={saving}
                >
                  {respondingId === item._id ? (
                    <ActivityIndicator color="#C96F42" />
                  ) : (
                    <Text style={styles.editText}>{hasResponse ? "Update Response" : "Send Response"}</Text>
                  )}
                </Pressable>
              </View>
            </View>
          );
        }}
      />
    );
  }

  const submitFeedback = async () => {
    if (!selectedBookingId) {
      setError("Please select a booking");
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
      setMessage("Feedback submitted successfully.");
      setComment("");
      setSelectedServiceId("");
      await loadData();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to submit feedback.");
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
      setMessage("Feedback deleted.");
      await loadData();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete feedback.");
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
      setMessage("Feedback updated.");
      setEditingId("");
      await loadData();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update feedback.");
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
          <Text style={styles.subtitle}>Review services from completed bookings</Text>

          <Text style={styles.sectionTitle}>1) Choose Booking</Text>
          <View style={styles.optionWrap}>
            {eligibleBookings.length === 0 ? <Text style={styles.emptyText}>No completed bookings found</Text> : null}
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

          <Text style={styles.sectionTitle}>2) Choose Service (optional)</Text>
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
            placeholder="Enter your feedback"
            placeholderTextColor="#94A3B8"
          />

          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          {message ? <Text style={styles.successText}>{message}</Text> : null}

          <Pressable style={[styles.submitButton, saving && styles.disabled]} onPress={submitFeedback} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Submit Feedback</Text>}
          </Pressable>

          <Text style={styles.sectionTitle}>My Feedback</Text>
          {feedbacks.length === 0 ? <Text style={styles.emptyText}>You have not submitted any feedback yet.</Text> : null}
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
                placeholder="Update feedback"
              />
            </>
          ) : (
            <>
              <Text style={styles.feedbackMeta}>Rating: {item.rating}/5</Text>
              <Text style={styles.feedbackComment}>{item.comment || "(No comment)"}</Text>
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
  statGrid: { flexDirection: "row", gap: 8 },
  statCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E8DED1",
    backgroundColor: "#FFFDF9",
    paddingVertical: 10,
    alignItems: "center",
  },
  statValue: { fontSize: 20, fontWeight: "900", color: "#2F3742" },
  statLabel: { marginTop: 2, fontSize: 10, color: "#8D99AB", fontWeight: "700", textTransform: "uppercase" },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#EDD7C3",
    borderRadius: 14,
    backgroundColor: "#FFF8F2",
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  searchInput: { flex: 1, color: "#2F3742", paddingVertical: 0 },
  filterRow: { gap: 8, paddingVertical: 2, paddingRight: 8 },
  filterChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E3E5E9",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  filterChipActive: {
    borderColor: "#D87D4A",
    backgroundColor: "#FFF4EF",
  },
  filterChipText: { color: "#4D5E78", fontWeight: "700", fontSize: 12 },
  filterChipTextActive: { color: "#C96F42" },
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
  cardSubMeta: { color: "#7F8CA1", fontSize: 12, marginTop: 2 },
  staffCardTopRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 8 },
  staffRatingRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  staffRatingText: { color: "#B56230", fontWeight: "800" },
  starRow: { flexDirection: "row", alignItems: "center", gap: 1 },
  starOn: { color: "#F59E0B", fontSize: 15 },
  starOff: { color: "#D1D5DB", fontSize: 15 },
  feedbackComment: { color: "#4D5E78" },
  feedbackFooter: { flexDirection: "row", justifyContent: "flex-end", alignItems: "center" },
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
