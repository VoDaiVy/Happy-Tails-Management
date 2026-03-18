import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from "react-native";
import { getAdminOverview, getAdminTransactions, getAdminUsersList, getSystemStatistics } from "../../api/modules/adminApi";
import { getAllBookings } from "../../api/modules/bookingApi";
import { getAllCameras } from "../../api/modules/cameraApi";
import { getMyReceivedFeedback } from "../../api/modules/feedbackApi";
import { getAllMedicalRecords } from "../../api/modules/medicalRecordApi";
import { quickCreatePetForWalkIn } from "../../api/modules/petApi";
import { quickRegisterWalkInGuest } from "../../api/modules/userApi";
import { useAuth } from "../../context/AuthContext";
import type { Booking } from "../../types/booking";
import type { CameraItem } from "../../types/camera";
import type { FeedbackItem } from "../../types/feedback";
import type { Pet } from "../../types/pet";
import { isAdminRole, isStaffOrAdminRole } from "../../utils/role";

const VALID_PET_TYPES = ["dog", "cat", "bird", "fish", "rabbit", "hamster", "other"] as const;
const VALID_PET_GENDERS = ["male", "female", "unknown"] as const;

export function ManagementScreen() {
  const { user } = useAuth();
  const canAccess = isStaffOrAdminRole(user?.role);
  const isAdmin = isAdminRole(user?.role);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [feedbackList, setFeedbackList] = useState<FeedbackItem[]>([]);
  const [cameraList, setCameraList] = useState<CameraItem[]>([]);
  const [recordsCount, setRecordsCount] = useState(0);
  const [adminUserCount, setAdminUserCount] = useState(0);
  const [adminTransactionCount, setAdminTransactionCount] = useState(0);
  const [adminOverview, setAdminOverview] = useState<Record<string, unknown> | null>(null);
  const [adminSystemStats, setAdminSystemStats] = useState<Record<string, unknown> | null>(null);

  const [walkInPhone, setWalkInPhone] = useState("");
  const [walkInName, setWalkInName] = useState("");
  const [walkInUserId, setWalkInUserId] = useState("");
  const [petName, setPetName] = useState("");
  const [petType, setPetType] = useState<"dog" | "cat" | "bird" | "fish" | "rabbit" | "hamster" | "other">("dog");
  const [petBreed, setPetBreed] = useState("");
  const [petGender, setPetGender] = useState<"male" | "female" | "unknown">("unknown");
  const [petWeight, setPetWeight] = useState("");

  const pendingBookings = useMemo(() => bookings.filter((item) => item.status === "pending").length, [bookings]);
  const inProgressBookings = useMemo(() => bookings.filter((item) => item.status === "in-progress").length, [bookings]);

  const loadData = useCallback(async () => {
    if (!canAccess) {
      setLoading(false);
      return;
    }

    setError("");
    const baseCalls = [
      getAllBookings(),
      getMyReceivedFeedback(),
      getAllCameras(),
      getAllMedicalRecords({ page: 1, limit: 1 }),
    ] as const;

    try {
      if (isAdmin) {
        const [bookingData, feedbackData, cameraData, recordsData, usersData, txData, overviewData, statsData] = await Promise.all([
          ...baseCalls,
          getAdminUsersList({ page: 1, limit: 1 }),
          getAdminTransactions({ page: 1, limit: 1 }),
          getAdminOverview(),
          getSystemStatistics(),
        ]);

        setBookings(bookingData);
        setFeedbackList(feedbackData);
        setCameraList(cameraData);
        setRecordsCount(Number((recordsData.pagination || {}).total || recordsData.records.length || 0));
        setAdminUserCount(Number((usersData.pagination || {}).total || usersData.users.length || 0));
        setAdminTransactionCount(Number((txData.pagination || {}).total || txData.transactions.length || 0));
        setAdminOverview(overviewData);
        setAdminSystemStats(statsData);
      } else {
        const [bookingData, feedbackData, cameraData, recordsData] = await Promise.all(baseCalls);
        setBookings(bookingData);
        setFeedbackList(feedbackData);
        setCameraList(cameraData);
        setRecordsCount(Number((recordsData.pagination || {}).total || recordsData.records.length || 0));
        setAdminUserCount(0);
        setAdminTransactionCount(0);
        setAdminOverview(null);
        setAdminSystemStats(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Khong tai duoc du lieu management");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [canAccess, isAdmin]);

  useEffect(() => {
    setLoading(true);
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const onQuickRegister = useCallback(async () => {
    const normalizedPhone = walkInPhone.replace(/\D/g, "").trim();
    const normalizedName = walkInName.trim();

    if (!normalizedPhone || !normalizedName) {
      setError("Nhap so dien thoai va ten khach walk-in");
      return;
    }

    if (normalizedPhone.length < 8) {
      setError("So dien thoai khong hop le");
      return;
    }

    setActionLoading(true);
    setError("");
    setMessage("");
    try {
      const result = await quickRegisterWalkInGuest({
        phone: normalizedPhone,
        fullName: normalizedName,
      });
      setWalkInPhone(normalizedPhone);
      setWalkInUserId(result.userID);
      setMessage(result.isNew ? "Tao tai khoan walk-in thanh cong" : "Da tim thay tai khoan walk-in ton tai");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Quick register that bai");
    } finally {
      setActionLoading(false);
    }
  }, [walkInName, walkInPhone]);

  const onQuickCreatePet = useCallback(async () => {
    const parsedWeight = Number(petWeight);
    const normalizedPetType = petType.trim().toLowerCase();
    const normalizedGender = petGender.trim().toLowerCase();

    if (!walkInUserId.trim()) {
      setError("Can co userID tu quick register truoc khi tao pet");
      return;
    }

    if (!petName.trim() || !petBreed.trim() || !Number.isFinite(parsedWeight) || parsedWeight <= 0) {
      setError("Nhap day du pet name, breed, weight hop le");
      return;
    }

    if (!VALID_PET_TYPES.includes(normalizedPetType as (typeof VALID_PET_TYPES)[number])) {
      setError("Pet type khong hop le. Chi ho tro: dog, cat, bird, fish, rabbit, hamster, other");
      return;
    }

    if (!VALID_PET_GENDERS.includes(normalizedGender as (typeof VALID_PET_GENDERS)[number])) {
      setError("Gender khong hop le. Chi ho tro: male, female, unknown");
      return;
    }

    setActionLoading(true);
    setError("");
    setMessage("");
    try {
      const pet = await quickCreatePetForWalkIn({
        userID: walkInUserId.trim(),
        petName: petName.trim(),
        petType: normalizedPetType as (typeof VALID_PET_TYPES)[number],
        breed: petBreed.trim(),
        gender: normalizedGender as (typeof VALID_PET_GENDERS)[number],
        weight: parsedWeight,
      });

      setMessage(`Tao pet walk-in thanh cong: ${(pet as Pet).petName || "Pet"}`);
      setPetName("");
      setPetBreed("");
      setPetWeight("");
      setPetType("dog");
      setPetGender("unknown");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Quick create pet that bai");
    } finally {
      setActionLoading(false);
    }
  }, [petBreed, petGender, petName, petType, petWeight, walkInUserId]);

  if (!canAccess) {
    return (
      <View style={styles.centerBox}>
        <Text style={styles.errorText}>Trang nay chi danh cho staff/admin.</Text>
      </View>
    );
  }

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
      data={[]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      renderItem={null}
      ListHeaderComponent={
        <View style={styles.block}>
          <Text style={styles.title}>Management Center</Text>
          <Text style={styles.subtitle}>Role: {user?.role}</Text>
          {message ? <Text style={styles.successText}>{message}</Text> : null}
          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Bookings ({bookings.length})</Text>
            <Text style={styles.cardBody}>Pending: {pendingBookings} · In-progress: {inProgressBookings}</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Camera ({cameraList.length})</Text>
            <Text style={styles.cardBody}>Staff/Admin co quyen xem camera va xu ly access theo booking.</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Feedback Inbox ({feedbackList.length})</Text>
            <Text style={styles.cardBody}>Danh sach feedback staff/admin can theo doi va phan hoi.</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Medical Records ({recordsCount})</Text>
            <Text style={styles.cardBody}>Tong so medical records staff/admin co the quan ly.</Text>
          </View>

          {isAdmin ? (
            <>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Admin Users ({adminUserCount})</Text>
                <Text style={styles.cardBody}>Tong user de quan ly role/ban/trang thai tai khoan.</Text>
              </View>

              <View style={styles.card}>
                <Text style={styles.cardTitle}>Admin Transactions ({adminTransactionCount})</Text>
                <Text style={styles.cardBody}>Tong giao dich he thong de doi soat.</Text>
              </View>

              <View style={styles.card}>
                <Text style={styles.cardTitle}>Admin Overview Snapshot</Text>
                <Text style={styles.cardBody} numberOfLines={3}>{JSON.stringify(adminOverview || {})}</Text>
              </View>

              <View style={styles.card}>
                <Text style={styles.cardTitle}>System Statistics Snapshot</Text>
                <Text style={styles.cardBody} numberOfLines={3}>{JSON.stringify(adminSystemStats || {})}</Text>
              </View>
            </>
          ) : null}

          <Text style={styles.sectionTitle}>Walk-in Quick Actions</Text>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>1) Quick Register Guest</Text>
            <TextInput
              style={styles.input}
              value={walkInPhone}
              onChangeText={setWalkInPhone}
              placeholder="Phone"
              keyboardType="phone-pad"
            />
            <TextInput
              style={styles.input}
              value={walkInName}
              onChangeText={setWalkInName}
              placeholder="Full name"
            />
            <Pressable style={[styles.actionButton, actionLoading && styles.disabled]} onPress={onQuickRegister} disabled={actionLoading}>
              {actionLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.actionButtonText}>Quick Register</Text>}
            </Pressable>
            {walkInUserId ? <Text style={styles.cardBody}>userID: {walkInUserId}</Text> : null}
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>2) Quick Create Pet</Text>
            <TextInput style={styles.input} value={petName} onChangeText={setPetName} placeholder="Pet name" />
            <TextInput style={styles.input} value={petType} onChangeText={(value) => setPetType((value as typeof petType) || "dog")} placeholder="Pet type (dog/cat/...)" />
            <TextInput style={styles.input} value={petBreed} onChangeText={setPetBreed} placeholder="Breed" />
            <TextInput style={styles.input} value={petGender} onChangeText={(value) => setPetGender((value as typeof petGender) || "unknown")} placeholder="Gender (male/female/unknown)" />
            <TextInput style={styles.input} value={petWeight} onChangeText={setPetWeight} placeholder="Weight" keyboardType="numeric" />
            <Pressable style={[styles.actionButton, actionLoading && styles.disabled]} onPress={onQuickCreatePet} disabled={actionLoading}>
              {actionLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.actionButtonText}>Quick Create Pet</Text>}
            </Pressable>
          </View>

          <Text style={styles.sectionTitle}>Cameras</Text>
          {cameraList.slice(0, 5).map((cam, index) => (
            <View key={`${cam._id || cam.id || "cam"}-${index}`} style={styles.itemRow}>
              <Text style={styles.itemTitle}>{cam.cameraName || cam.name || "Camera"}</Text>
              <Text style={styles.itemMeta}>{cam.isOnline ? "online" : "offline"}</Text>
            </View>
          ))}

          <Text style={styles.sectionTitle}>Latest Feedback</Text>
          {feedbackList.slice(0, 5).map((item, index) => (
            <View key={`${item._id || "fb"}-${index}`} style={styles.itemRow}>
              <Text style={styles.itemTitle} numberOfLines={1}>{item.comment || "No comment"}</Text>
              <Text style={styles.itemMeta}>{item.rating || 0}/5</Text>
            </View>
          ))}
        </View>
      }
      ListEmptyComponent={null}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4F1EC" },
  content: { padding: 16, paddingBottom: 24 },
  centerBox: { flex: 1, justifyContent: "center", alignItems: "center" },
  block: { gap: 10 },
  title: { fontSize: 24, fontWeight: "800", color: "#0F172A" },
  subtitle: { color: "#64748B" },
  card: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    backgroundColor: "#fff",
    padding: 12,
    gap: 2,
  },
  cardTitle: { color: "#0F172A", fontWeight: "700" },
  cardBody: { color: "#475569" },
  sectionTitle: { marginTop: 4, color: "#1E293B", fontWeight: "700" },
  itemRow: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    backgroundColor: "#fff",
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  itemTitle: { color: "#0F172A", flex: 1, paddingRight: 8 },
  itemMeta: { color: "#64748B", fontSize: 12 },
  input: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    backgroundColor: "#fff",
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  actionButton: {
    marginTop: 4,
    borderRadius: 10,
    alignItems: "center",
    paddingVertical: 10,
    backgroundColor: "#D87D4A",
  },
  actionButtonText: { color: "#fff", fontWeight: "700" },
  successText: { color: "#059669" },
  disabled: { opacity: 0.7 },
  errorText: { color: "#DC2626" },
});
