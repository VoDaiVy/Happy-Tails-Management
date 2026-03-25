import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { getBookingById } from "../../api/modules/bookingApi";
import { getMyPetsMedicalRecords, type MedicalRecordItem } from "../../api/modules/medicalRecordApi";
import type { AccountStackParamList } from "../../navigation/types";
import type { Booking, BookingItem } from "../../types/booking";
import { formatVnd } from "../../utils/currency";
import { resolveImageUrl } from "../../utils/image";

type Props = NativeStackScreenProps<AccountStackParamList, "BookingDetail">;

type BookingWithExtras = Booking & {
  isPaid?: boolean;
  customer?: {
    _id?: string;
    name?: string;
    email?: string;
  };
  room?:
    | string
    | {
        _id?: string;
        name?: string;
        roomNumber?: string;
      };
};

const STATUS_META: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  pending: { label: "Pending", bg: "#F9EACE", text: "#A4631F", dot: "#CF8B3D" },
  confirmed: { label: "Confirmed", bg: "#E7ECF1", text: "#51657A", dot: "#7C90A6" },
  "in-progress": { label: "In Progress", bg: "#FCE8D9", text: "#B35B28", dot: "#D77B43" },
  completed: { label: "Completed", bg: "#EAF4E6", text: "#5B7A58", dot: "#86A283" },
  cancelled: { label: "Cancelled", bg: "#F9E2E2", text: "#AB4F4F", dot: "#CB6B6B" },
};

function getStatusMeta(status?: string) {
  const key = String(status || "pending").toLowerCase();
  return STATUS_META[key] || STATUS_META.pending;
}

function formatDateLong(input?: string) {
  if (!input) return "N/A";
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatTimeOnly(input?: string) {
  if (!input) return "--:--";
  const parsed = new Date(input);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
  }

  const direct = input.match(/\b\d{2}:\d{2}\b/);
  return direct?.[0] || "--:--";
}

function getServiceName(item: BookingItem) {
  if (typeof item.service === "string") return "Service";
  return item.service?.name || "Service";
}

function getServiceDuration(item: BookingItem) {
  if (typeof item.service === "string") return undefined;
  const mins = Number(item.service?.duration || 0);
  if (!Number.isFinite(mins) || mins <= 0) return undefined;
  return mins;
}

function getPetInfo(item?: BookingItem) {
  if (!item?.pet || typeof item.pet === "string") {
    return {
      name: "Pet Booking",
      breed: "No pet profile attached",
      type: "",
      ageText: "",
    };
  }

  const petName = item.pet.petName || "Pet Booking";
  const breed = item.pet.breed || "Unknown breed";
  const type = item.pet.petType || "";

  return {
    name: petName,
    breed,
    type,
    ageText: "",
  };
}

function getServiceIcon(name = "") {
  const value = name.toLowerCase();
  if (value.includes("nail") || value.includes("groom") || value.includes("cut")) return "scissors";
  if (value.includes("bath") || value.includes("spa") || value.includes("dry")) return "droplet";
  if (value.includes("dental") || value.includes("teeth")) return "activity";
  if (value.includes("facial") || value.includes("therapy")) return "sparkles";
  return "star";
}

function formatPaymentLabel(booking: BookingWithExtras) {
  if (booking.isPaid) return "Paid in Full";
  if (booking.status === "pending") return "Pending Payment";

  const method = String(booking.paymentMethod || "").toLowerCase();
  if (method === "wallet") return "Paid via Wallet";
  if (method === "cash") return "Cash Payment";
  if (method === "card") return "Card Payment";
  if (method === "online" || method === "bank_transfer") return "Paid Online";

  return "Payment Updated";
}

function buildScheduleText(booking: Booking, services: BookingItem[]) {
  const start =
    formatTimeOnly(services.find((item) => item.startTime)?.startTime) ||
    formatTimeOnly(booking.bookingTime) ||
    "--:--";

  const endByItem = formatTimeOnly(services.find((item) => item.endTime)?.endTime);
  if (endByItem && endByItem !== "--:--") {
    return `${start} - ${endByItem}`;
  }

  return start;
}

function extractLocationLabel(booking: BookingWithExtras, services: BookingItem[]) {
  const room = booking.room;
  if (room && typeof room === "object") {
    const roomLabel = String(room.name || room.roomNumber || "").trim();
    if (roomLabel) return roomLabel;
  }

  const assignedRoom = services.find((item) => item.assignedRoom)?.assignedRoom;
  if (assignedRoom) return `Room ${assignedRoom}`;

  return "";
}

function getMedicalStageLabel(stage?: MedicalRecordItem["workflowStage"]) {
  if (stage === "completed") return "Completed";
  if (stage === "processing") return "Processing";
  return "Received";
}

function getMedicalStageTone(stage?: MedicalRecordItem["workflowStage"]) {
  if (stage === "completed") {
    return { bg: "#EAF4E6", text: "#5B7A58", dot: "#86A283" };
  }
  if (stage === "processing") {
    return { bg: "#FCE8D9", text: "#B35B28", dot: "#D77B43" };
  }
  return { bg: "#E7ECF1", text: "#51657A", dot: "#7C90A6" };
}

function getMedicalRecordDate(record: MedicalRecordItem) {
  const candidates = [
    record.updatedAt,
    record.createdAt,
    ...(record.stageHistory || []).map((item) => item.updatedAt).filter(Boolean),
  ];

  for (const value of candidates) {
    if (!value) continue;
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toLocaleString();
    }
  }

  return "Recently updated";
}

function parseTaggedMedicalNotes(note: string) {
  const checkIn: string[] = [];
  const checkOut: string[] = [];
  const taggedPattern = /\[(check-?\s*in|check-?\s*out)\]\s*([\s\S]*?)(?=\[(?:check-?\s*in|check-?\s*out)\]|$)/gi;

  let matched = false;
  for (const match of note.matchAll(taggedPattern)) {
    matched = true;
    const label = (match[1] || "").toLowerCase().replace(/\s+/g, "");
    const text = String(match[2] || "").trim();
    if (!text) continue;

    if (label.includes("in")) {
      checkIn.push(text);
    } else {
      checkOut.push(text);
    }
  }

  return { checkIn, checkOut, matched };
}

function extractMedicalSections(record: MedicalRecordItem) {
  const checkIn: string[] = [];
  const checkOut: string[] = [];

  const pushUnique = (bucket: string[], value: string) => {
    const text = String(value || "").trim();
    if (!text || bucket.includes(text)) return;
    bucket.push(text);
  };

  for (const entry of record.stageHistory || []) {
    const note = String(entry.notes || "").trim();
    if (!note) continue;

    const parsed = parseTaggedMedicalNotes(note);
    if (parsed.matched) {
      parsed.checkIn.forEach((text) => pushUnique(checkIn, text));
      parsed.checkOut.forEach((text) => pushUnique(checkOut, text));
      continue;
    }

    if (entry.stage === "received") {
      pushUnique(checkIn, note);
      continue;
    }

    if (entry.stage === "completed") {
      pushUnique(checkOut, note);
    }
  }

  const plainNotes = String(record.notes || "").trim();
  if (plainNotes) {
    const parsed = parseTaggedMedicalNotes(plainNotes);
    if (parsed.matched) {
      parsed.checkIn.forEach((text) => pushUnique(checkIn, text));
      parsed.checkOut.forEach((text) => pushUnique(checkOut, text));
    } else {
      pushUnique(checkOut, plainNotes);
    }
  }

  return {
    checkIn: checkIn.slice(0, 4),
    checkOut: checkOut.slice(0, 4),
  };
}

function resolveMedicalPhotoBucket(source: string[]) {
  return Array.from(new Set(source.map((item) => resolveImageUrl(item)).filter(Boolean) as string[]));
}

function getMedicalSectionTime(record: MedicalRecordItem, section: "checkIn" | "checkOut") {
  const history = record.stageHistory || [];

  const stageCandidates =
    section === "checkIn"
      ? history.filter((item) => item.stage === "received")
      : history.filter((item) => item.stage === "completed" || item.stage === "processing");

  for (let i = stageCandidates.length - 1; i >= 0; i -= 1) {
    const value = stageCandidates[i]?.updatedAt;
    if (!value) continue;
    const time = formatTimeOnly(value);
    if (time !== "--:--") return time;
  }

  if (section === "checkIn") {
    return formatTimeOnly(record.createdAt);
  }

  if (record.workflowStage === "processing" || record.workflowStage === "completed") {
    return formatTimeOnly(record.updatedAt);
  }

  return "--:--";
}

export function BookingDetailScreen({ route, navigation }: Props) {
  const { bookingId, toastMessage } = route.params;
  const [booking, setBooking] = useState<BookingWithExtras | null>(null);
  const [medicalRecords, setMedicalRecords] = useState<MedicalRecordItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [bannerMessage, setBannerMessage] = useState("");
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [viewerImages, setViewerImages] = useState<Array<{ uri: string }>>([]);
  const [viewerIndex, setViewerIndex] = useState(0);

  const loadDetail = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [data, records] = await Promise.all([
        getBookingById(bookingId),
        getMyPetsMedicalRecords({ bookingId }),
      ]);
      setBooking(data);
      setMedicalRecords(records);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load booking detail.");
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadDetail();
    setRefreshing(false);
  }, [loadDetail]);

  useEffect(() => {
    if (!toastMessage) return;

    setBannerMessage(toastMessage);
    const timer = setTimeout(() => setBannerMessage(""), 2200);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  const services = useMemo(() => booking?.items || [], [booking]);
  const primaryPet = useMemo(() => getPetInfo(services[0]), [services]);
  const statusMeta = useMemo(() => getStatusMeta(booking?.status), [booking?.status]);
  const scheduleDate = useMemo(() => formatDateLong(booking?.bookingDate), [booking?.bookingDate]);
  const scheduleTime = useMemo(() => buildScheduleText(booking || ({} as Booking), services), [booking, services]);
  const locationLabel = useMemo(() => extractLocationLabel(booking || ({} as BookingWithExtras), services), [booking, services]);
  const paymentLabel = useMemo(() => formatPaymentLabel(booking || ({} as BookingWithExtras)), [booking]);

  const medicalNotes = useMemo(() => {
    if (medicalRecords.length > 0) {
      return [] as string[];
    }

    const itemNotes = services
      .map((item) => item.notes)
      .filter((note): note is string => Boolean(note && note.trim()))
      .map((note) => note.trim());

    if (booking?.notes && booking.notes.trim()) {
      itemNotes.push(booking.notes.trim());
    }

    return Array.from(new Set(itemNotes));
  }, [booking?.notes, medicalRecords.length, services]);

  const medicalRecordCards = useMemo(
    () =>
      medicalRecords.map((record) => {
        const tone = getMedicalStageTone(record.workflowStage);
        const sections = extractMedicalSections(record);
        const checkInPhotos = resolveMedicalPhotoBucket(record.receivedPhotos || []);
        const checkOutPhotos = resolveMedicalPhotoBucket([
          ...(record.processingPhotos || []),
          ...(record.completedPhotos || []),
        ]);

        const legacyPhotos = resolveMedicalPhotoBucket(record.images || []);
        if (!checkInPhotos.length && !checkOutPhotos.length && legacyPhotos.length) {
          if (record.workflowStage === "completed") {
            checkOutPhotos.push(...legacyPhotos);
          } else {
            checkInPhotos.push(...legacyPhotos);
          }
        }

        const allPhotos = Array.from(new Set([...checkInPhotos, ...checkOutPhotos]));

        return {
          key: record._id,
          stageLabel: getMedicalStageLabel(record.workflowStage),
          stageTone: tone,
          dateText: getMedicalRecordDate(record),
          checkInNotes: sections.checkIn,
          checkOutNotes: sections.checkOut,
          checkInTime: getMedicalSectionTime(record, "checkIn"),
          checkOutTime: getMedicalSectionTime(record, "checkOut"),
          checkInPhotos,
          checkOutPhotos,
          photoCount: allPhotos.length,
          recordType: String(record.recordType || "grooming").toUpperCase(),
        };
      }),
    [medicalRecords],
  );

  const onOpenMedicalPhotos = useCallback((photos: string[], index: number) => {
    if (!photos.length) return;
    setViewerImages(photos.map((uri) => ({ uri })));
    setViewerIndex(index);
    setImageViewerVisible(true);
  }, []);

  const serviceRows = useMemo(
    () =>
      services.map((item, index) => {
        const name = getServiceName(item);
        const duration = getServiceDuration(item);
        const notes = String(item.notes || "").trim();
        const subtitleParts = [duration ? `${duration} mins` : "", notes].filter(Boolean);

        const linePrice = Number(item.price || 0) * Math.max(1, Number(item.quantity || 1));

        return {
          key: `${item._id || "service"}-${index}`,
          icon: getServiceIcon(name),
          name,
          subtitle: subtitleParts.join(" • ") || "Professional care service",
          priceText: formatVnd(linePrice),
        };
      }),
    [services],
  );

  if (loading) {
    return (
      <View style={styles.centerBox}>
        <ActivityIndicator size="large" color="#C56C37" />
      </View>
    );
  }

  if (!booking) {
    return (
      <View style={styles.centerBox}>
        <Text style={styles.errorText}>{error || "No booking data found."}</Text>
      </View>
    );
  }

  return (
    <View style={styles.screenRoot}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#C56C37" />}
        showsVerticalScrollIndicator={false}
      >
      <View style={styles.headerWrap}>
        <Pressable style={styles.headerIconBtn} onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={19} color="#9D4F20" />
        </Pressable>

        <View style={styles.headerTextWrap}>
          <Text style={styles.title}>Booking Detail</Text>
          <Text style={styles.subtitle}>#{booking.bookingNumber || booking._id}</Text>
        </View>

        <Pressable style={styles.headerIconBtn}>
          <Feather name="more-vertical" size={18} color="#9D4F20" />
        </Pressable>
      </View>

      {bannerMessage ? (
        <View style={styles.toastBox}>
          <Text style={styles.toastText}>{bannerMessage}</Text>
        </View>
      ) : null}

      <View style={styles.referenceCard}>
        <Text style={styles.referenceLabel}>TRANSACTION REFERENCE</Text>
        <Text style={styles.referenceValue}>#{booking.bookingNumber || booking._id}</Text>

        <View style={[styles.statusBadge, { backgroundColor: statusMeta.bg }]}> 
          <View style={[styles.statusDot, { backgroundColor: statusMeta.dot }]} />
          <Text style={[styles.statusText, { color: statusMeta.text }]}>{statusMeta.label}</Text>
        </View>
      </View>

      <View style={styles.overviewCard}>
        <View style={styles.overviewRow}>
          <View style={styles.sectionHeadRow}>
            <Feather name="calendar" size={14} color="#9A5A2D" />
            <Text style={styles.sectionMiniLabel}>SCHEDULE</Text>
          </View>
          <Text style={styles.scheduleDate}>{scheduleDate}</Text>
          <Text style={styles.scheduleTime}>{scheduleTime}</Text>
        </View>

        <View style={styles.overviewDivider} />

        <View style={styles.overviewPetRow}>
          <View style={styles.petAvatar}>
            <Text style={styles.petAvatarText}>{primaryPet.name.slice(0, 1).toUpperCase()}</Text>
          </View>

          <View style={styles.petTextWrap}>
            <Text style={styles.sectionMiniLabel}>GUEST OF HONOR</Text>
            <Text style={styles.petName}>{primaryPet.name}</Text>
            <Text style={styles.petMeta}>
              {primaryPet.breed}
              {primaryPet.type ? ` • ${primaryPet.type}` : ""}
              {primaryPet.ageText ? ` • ${primaryPet.ageText}` : ""}
            </Text>
          </View>
        </View>

        {locationLabel ? (
          <>
            <View style={styles.overviewDivider} />
            <View style={styles.overviewLocationRow}>
              <Feather name="map-pin" size={14} color="#8D4A1E" />
              <Text style={styles.locationTitle}>Service Location</Text>
              <Text style={styles.locationValue} numberOfLines={1}>{locationLabel}</Text>
            </View>
          </>
        ) : null}
      </View>

      <View style={styles.servicesSectionCard}>
        <View style={styles.sectionHeadRow}>
          <Feather name="star" size={15} color="#9A5A2D" />
          <Text style={styles.sectionMiniLabel}>SERVICES BOOKED</Text>
        </View>

        <View style={styles.servicesListWrap}>
          {serviceRows.length ? (
            serviceRows.map((item) => (
              <View key={item.key} style={styles.serviceItemCard}>
                <View style={styles.serviceIconWrap}>
                  <Feather name={item.icon as any} size={17} color="#8D4A1E" />
                </View>

                <View style={styles.serviceTextWrap}>
                  <Text style={styles.serviceName}>{item.name}</Text>
                  <Text style={styles.serviceSubText}>{item.subtitle}</Text>
                </View>

                <Text style={styles.servicePrice}>{item.priceText}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.emptyServicesText}>No service items found.</Text>
          )}
        </View>
      </View>

      <View style={styles.totalCard}>
        <View>
          <Text style={styles.totalLabel}>TOTAL INVESTMENT</Text>
          <Text style={styles.totalAmount}>{formatVnd(booking.totalAmount)}</Text>
        </View>

        <View style={styles.paymentPill}>
          <Feather name="check-circle" size={13} color="#FFFFFF" />
          <Text style={styles.paymentPillText}>{paymentLabel}</Text>
        </View>
      </View>

      <Text style={styles.medicalSectionTitle}>Medical Records</Text>
      <View style={styles.medicalCard}>
        {medicalRecordCards.length ? (
          <View style={styles.medicalRecordCardsWrap}>
            {medicalRecordCards.map((item) => (
              <View key={item.key} style={styles.medicalRecordItemCard}>
                <View style={styles.medicalRecordTopRow}>
                  <View style={[styles.medicalStageBadge, { backgroundColor: item.stageTone.bg }]}> 
                    <View style={[styles.medicalStageDot, { backgroundColor: item.stageTone.dot }]} />
                    <Text style={[styles.medicalStageText, { color: item.stageTone.text }]}>{item.stageLabel}</Text>
                  </View>
                  <Text style={styles.medicalRecordDate}>{item.dateText}</Text>
                </View>

                <View style={styles.medicalRecordMetaRow}>
                  <Text style={styles.medicalRecordType}>{item.recordType}</Text>
                  <Text style={styles.medicalRecordMeta}>Photos: {item.photoCount}</Text>
                </View>

                {item.checkInNotes.length || item.checkOutNotes.length ? (
                  <View style={styles.medicalNotesWrap}>
                    <View style={styles.medicalNoteSectionCard}>
                      <View style={styles.medicalNoteSectionHeadRow}>
                        <Text style={styles.medicalNoteSectionTitle}>Check-in</Text>
                        <Text style={styles.medicalNoteSectionTime}>{item.checkInTime}</Text>
                      </View>
                      {item.checkInNotes.length ? (
                        item.checkInNotes.map((note, index) => (
                          <Text key={`${item.key}-checkin-${index}`} style={styles.medicalNoteText}>• {note}</Text>
                        ))
                      ) : (
                        <Text style={styles.medicalNoteEmptyText}>No check-in note.</Text>
                      )}

                      {item.checkInPhotos.length ? (
                        <ScrollView
                          horizontal
                          showsHorizontalScrollIndicator={false}
                          contentContainerStyle={styles.medicalSectionPhotoStrip}
                        >
                          {item.checkInPhotos.map((uri, index) => (
                            <Pressable
                              key={`${item.key}-checkin-photo-${index}`}
                              style={styles.medicalPhotoThumbWrap}
                              onPress={() => onOpenMedicalPhotos(item.checkInPhotos, index)}
                            >
                              <Image source={{ uri }} style={styles.medicalPhotoThumb} />
                            </Pressable>
                          ))}
                        </ScrollView>
                      ) : null}
                    </View>

                    <View style={styles.medicalNoteSectionCard}>
                      <View style={styles.medicalNoteSectionHeadRow}>
                        <Text style={styles.medicalNoteSectionTitle}>Check-out</Text>
                        <Text style={styles.medicalNoteSectionTime}>{item.checkOutTime}</Text>
                      </View>
                      {item.checkOutNotes.length ? (
                        item.checkOutNotes.map((note, index) => (
                          <Text key={`${item.key}-checkout-${index}`} style={styles.medicalNoteText}>• {note}</Text>
                        ))
                      ) : (
                        <Text style={styles.medicalNoteEmptyText}>No check-out note.</Text>
                      )}

                      {item.checkOutPhotos.length ? (
                        <ScrollView
                          horizontal
                          showsHorizontalScrollIndicator={false}
                          contentContainerStyle={styles.medicalSectionPhotoStrip}
                        >
                          {item.checkOutPhotos.map((uri, index) => (
                            <Pressable
                              key={`${item.key}-checkout-photo-${index}`}
                              style={styles.medicalPhotoThumbWrap}
                              onPress={() => onOpenMedicalPhotos(item.checkOutPhotos, index)}
                            >
                              <Image source={{ uri }} style={styles.medicalPhotoThumb} />
                            </Pressable>
                          ))}
                        </ScrollView>
                      ) : null}
                    </View>
                  </View>
                ) : (
                  <Text style={styles.medicalNoteText}>• Staff updated this stage without additional notes.</Text>
                )}
              </View>
            ))}
          </View>
        ) : medicalNotes.length ? (
          <View style={styles.medicalNotesWrap}>
            {medicalNotes.map((note, index) => (
              <Text key={`medical-${index}`} style={styles.medicalNoteText}>• {note}</Text>
            ))}
          </View>
        ) : (
          <View style={styles.medicalEmptyWrap}>
            <View style={styles.medicalEmptyIconWrap}>
              <Feather name="plus-square" size={20} color="#A66B40" />
            </View>
            <Text style={styles.medicalEmptyText}>No medical records linked to this booking yet.</Text>
          </View>
        )}
      </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </ScrollView>

      <Modal visible={imageViewerVisible} transparent animationType="fade" onRequestClose={() => setImageViewerVisible(false)}>
        <View style={styles.viewerOverlay}>
          <Pressable style={styles.viewerCloseButton} onPress={() => setImageViewerVisible(false)}>
            <Feather name="x" size={20} color="#F8FAFC" />
          </Pressable>

          <View style={styles.viewerImageWrap}>
            {viewerImages[viewerIndex]?.uri ? (
              <Image source={{ uri: viewerImages[viewerIndex].uri }} style={styles.viewerImage} resizeMode="contain" />
            ) : null}
          </View>

          <View style={styles.viewerBottomRow}>
            <Pressable
              style={[styles.viewerNavButton, viewerIndex <= 0 && styles.viewerNavButtonDisabled]}
              disabled={viewerIndex <= 0}
              onPress={() => setViewerIndex((current) => Math.max(0, current - 1))}
            >
              <Feather name="chevron-left" size={18} color="#0F172A" />
            </Pressable>

            <Text style={styles.viewerIndexText}>
              {viewerImages.length > 0 ? `${viewerIndex + 1}/${viewerImages.length}` : "0/0"}
            </Text>

            <Pressable
              style={[styles.viewerNavButton, viewerIndex >= viewerImages.length - 1 && styles.viewerNavButtonDisabled]}
              disabled={viewerIndex >= viewerImages.length - 1}
              onPress={() => setViewerIndex((current) => Math.min(viewerImages.length - 1, current + 1))}
            >
              <Feather name="chevron-right" size={18} color="#0F172A" />
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screenRoot: { flex: 1, backgroundColor: "#FBF5EF" },
  container: { flex: 1, backgroundColor: "#FBF5EF" },
  content: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 28, gap: 10 },
  centerBox: { flex: 1, justifyContent: "center", alignItems: "center", padding: 16 },

  headerWrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  headerIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTextWrap: { flex: 1 },
  title: { color: "#8F3E14", fontSize: 24, lineHeight: 28, fontWeight: "800" },
  subtitle: { marginTop: 2, color: "#A9856D", fontSize: 11, lineHeight: 14, fontWeight: "600" },

  toastBox: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#DCE9CE",
    backgroundColor: "#ECF5E5",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  toastText: { color: "#557A42", fontWeight: "700", fontSize: 13 },

  referenceCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#EFE2D5",
    backgroundColor: "#FFFCF8",
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
  },
  referenceLabel: {
    color: "#B69780",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.6,
  },
  referenceValue: {
    color: "#351A0D",
    fontSize: 21,
    lineHeight: 27,
    fontWeight: "800",
  },
  statusBadge: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontWeight: "700", fontSize: 11, lineHeight: 14 },

  overviewCard: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#EEDFD2",
    backgroundColor: "#F5E8DC",
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
  },
  overviewRow: { gap: 4 },
  overviewDivider: { height: 1, backgroundColor: "#E8D8CB" },
  overviewPetRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  overviewLocationRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  sectionHeadRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  sectionMiniLabel: {
    color: "#89512D",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.1,
  },
  scheduleDate: { color: "#2F180D", fontSize: 16, lineHeight: 20, fontWeight: "700" },
  scheduleTime: { color: "#775740", fontSize: 13, lineHeight: 17, fontWeight: "500" },
  petAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F4DFC9",
    borderWidth: 1,
    borderColor: "#E8CDB6",
    alignItems: "center",
    justifyContent: "center",
  },
  petAvatarText: { color: "#8A4A22", fontSize: 16, fontWeight: "800" },
  petTextWrap: { flex: 1 },
  petName: { color: "#261409", fontSize: 16, lineHeight: 20, fontWeight: "700", marginTop: 1 },
  petMeta: { color: "#7A5840", fontSize: 12, lineHeight: 16, marginTop: 1 },

  servicesSectionCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#EEDFD2",
    backgroundColor: "#F5E8DC",
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  servicesListWrap: { gap: 8 },
  serviceItemCard: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#ECE5DE",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  serviceIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F9D3AE",
    alignItems: "center",
    justifyContent: "center",
  },
  serviceTextWrap: { flex: 1 },
  serviceName: { color: "#22120A", fontSize: 13, lineHeight: 17, fontWeight: "700" },
  serviceSubText: { color: "#7B5E49", fontSize: 11, lineHeight: 14, marginTop: 1 },
  servicePrice: { color: "#A44B1A", fontSize: 15, lineHeight: 19, fontWeight: "800" },
  emptyServicesText: { color: "#7C6758", fontSize: 14 },

  totalCard: {
    borderRadius: 20,
    backgroundColor: "#C86D34",
    borderWidth: 1,
    borderColor: "#B95D25",
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  totalLabel: {
    color: "#FBE7D6",
    fontSize: 10,
    lineHeight: 16,
    fontWeight: "700",
    letterSpacing: 1.8,
  },
  totalAmount: { color: "#FFFFFF", fontSize: 22, lineHeight: 26, fontWeight: "800", marginTop: 2 },
  paymentPill: {
    borderRadius: 999,
    backgroundColor: "rgba(255, 224, 194, 0.35)",
    borderWidth: 1,
    borderColor: "rgba(255, 237, 220, 0.45)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    maxWidth: 122,
  },
  paymentPillText: { color: "#FFFFFF", fontSize: 10, lineHeight: 13, fontWeight: "700" },

  medicalSectionTitle: { color: "#331A0D", fontSize: 18, lineHeight: 22, fontWeight: "700" },
  medicalCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#EEDFD2",
    backgroundColor: "#FFFCF8",
    padding: 14,
  },
  medicalRecordCardsWrap: { gap: 10 },
  medicalRecordItemCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#EEDFD2",
    backgroundColor: "#FFF8F1",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 7,
  },
  medicalRecordTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  medicalStageBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  medicalStageDot: { width: 7, height: 7, borderRadius: 4 },
  medicalStageText: { fontWeight: "800", fontSize: 12, lineHeight: 15 },
  medicalRecordDate: { color: "#8A6951", fontSize: 12, lineHeight: 15, fontWeight: "600" },
  medicalRecordMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  medicalRecordType: {
    color: "#8A5B39",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.1,
  },
  medicalRecordMeta: { color: "#8D6A51", fontSize: 12, fontWeight: "600" },
  medicalPhotoStrip: { gap: 8, paddingTop: 2, paddingBottom: 1 },
  medicalPhotoThumbWrap: {
    width: 70,
    height: 70,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E9D5C2",
    backgroundColor: "#F5E8DB",
  },
  medicalPhotoThumb: { width: "100%", height: "100%" },
  medicalNotesWrap: { gap: 8 },
  medicalNoteSectionCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E9DCCF",
    backgroundColor: "#FFFCF8",
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 5,
  },
  medicalNoteSectionHeadRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  medicalNoteSectionTitle: {
    color: "#8A5B39",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  medicalNoteSectionTime: {
    color: "#8D6A51",
    fontSize: 12,
    lineHeight: 15,
    fontWeight: "700",
  },
  medicalSectionPhotoStrip: { gap: 8, paddingTop: 4, paddingBottom: 1 },
  medicalNoteText: { color: "#6B4B34", fontSize: 12, lineHeight: 16 },
  medicalNoteEmptyText: {
    color: "#9C7D64",
    fontSize: 13,
    lineHeight: 18,
    fontStyle: "italic",
  },
  medicalEmptyWrap: {
    borderRadius: 20,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#EBD6C5",
    backgroundColor: "#FFF9F2",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    paddingHorizontal: 14,
    gap: 9,
  },
  medicalEmptyIconWrap: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#F7E3D2",
    alignItems: "center",
    justifyContent: "center",
  },
  medicalEmptyText: {
    color: "#825D43",
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
  },
  attachRecordsBtn: {
    borderRadius: 999,
    backgroundColor: "#F6E2D1",
    borderWidth: 1,
    borderColor: "#ECD0BA",
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  attachRecordsBtnText: {
    color: "#9F4E21",
    fontSize: 25,
    lineHeight: 30,
    fontWeight: "800",
  },

  locationTitle: { color: "#8A5B39", fontSize: 11, fontWeight: "600" },
  locationValue: { color: "#342012", fontSize: 12, lineHeight: 16, fontWeight: "600", flex: 1 },

  viewerOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.94)",
    paddingTop: 52,
    paddingHorizontal: 14,
    paddingBottom: 24,
  },
  viewerCloseButton: {
    alignSelf: "flex-end",
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(148, 163, 184, 0.32)",
    alignItems: "center",
    justifyContent: "center",
  },
  viewerImageWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  viewerImage: {
    width: "100%",
    height: "100%",
  },
  viewerBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    marginTop: 8,
  },
  viewerNavButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  viewerNavButtonDisabled: {
    opacity: 0.45,
  },
  viewerIndexText: {
    color: "#F8FAFC",
    fontWeight: "700",
    minWidth: 52,
    textAlign: "center",
  },

  errorText: { color: "#B74C4C", fontWeight: "600", textAlign: "center" },
});
