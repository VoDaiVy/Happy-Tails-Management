import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { getAvailableSlots, checkoutBooking } from "../../api/modules/bookingApi";
import { addToCart, clearCart } from "../../api/modules/cartApi";
import { getMyPets } from "../../api/modules/petApi";
import { getServiceById } from "../../api/modules/serviceApi";
import { getWalletInfo } from "../../api/modules/walletApi";
import { useAuth } from "../../context/AuthContext";
import type { ServicesStackParamList } from "../../navigation/types";
import type { Pet } from "../../types/pet";
import type { ServiceItem } from "../../types/service";
import { canUseCustomerFeatures } from "../../utils/role";

type Props = NativeStackScreenProps<ServicesStackParamList, "ServiceDetail">;
type SlotPeriodKey = "morning" | "afternoon" | "evening";

const SLOT_PERIODS: Array<{ key: SlotPeriodKey; label: string; start: number; end: number }> = [
  { key: "morning", label: "Morning", start: 0, end: 12 * 60 },
  { key: "afternoon", label: "Afternoon", start: 12 * 60, end: 18 * 60 },
  { key: "evening", label: "Evening", start: 18 * 60, end: 24 * 60 },
];
const SLOT_PREVIEW_LIMIT = 12;

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function toISODateLocal(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function buildDateOptions(days: number) {
  const options: string[] = [];
  const base = new Date();
  base.setHours(0, 0, 0, 0);

  for (let i = 0; i < days; i += 1) {
    const next = new Date(base);
    next.setDate(base.getDate() + i);
    options.push(toISODateLocal(next));
  }

  return options;
}

function buildTimeSlots(startHour = 8, endHour = 23, interval = 15) {
  const slots: string[] = [];
  for (let h = startHour; h < endHour; h += 1) {
    for (let m = 0; m < 60; m += interval) {
      slots.push(`${pad(h)}:${pad(m)}`);
    }
  }
  return slots;
}

function slotToMinutes(slot: string) {
  const [h, m] = slot.split(":").map(Number);
  return h * 60 + m;
}

function formatMoney(value: number) {
  return `$${Number(value || 0)}`;
}

function formatVnd(value: number) {
  return `${Number(value || 0).toLocaleString("en-US")} VND`;
}

function getServiceHighlights(service: ServiceItem | null) {
  const raw = (service as ServiceItem & { features?: string[] })?.features;
  if (Array.isArray(raw) && raw.length > 0) {
    return raw.filter(Boolean).slice(0, 6);
  }

  const text = String(service?.description || "").trim();
  if (!text) {
    return [
      "Professional pet-safe process",
      "Experienced staff on-site",
      "Post-service quality follow-up",
    ];
  }

  const parts = text
    .split(/[.!?]/)
    .map((item) => item.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    return [text];
  }

  return parts.slice(0, 3);
}

export function ServiceDetailScreen({ route, navigation }: Props) {
  const { user } = useAuth();
  const canBook = canUseCustomerFeatures(user?.role);
  const { serviceId } = route.params;

  const [service, setService] = useState<ServiceItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const [pets, setPets] = useState<Pet[]>([]);
  const [petsLoading, setPetsLoading] = useState(false);
  const [selectedPetId, setSelectedPetId] = useState("");

  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [walletLoading, setWalletLoading] = useState(false);

  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [note, setNote] = useState("");

  const [slotLoading, setSlotLoading] = useState(false);
  const [disabledSlots, setDisabledSlots] = useState<string[]>([]);
  const [slotError, setSlotError] = useState("");
  const [activePeriod, setActivePeriod] = useState<SlotPeriodKey>("morning");
  const [showAllSlots, setShowAllSlots] = useState(false);

  const [busy, setBusy] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const todayStr = useMemo(() => toISODateLocal(new Date()), []);
  const dateOptions = useMemo(() => buildDateOptions(21), []);
  const allSlots = useMemo(() => buildTimeSlots(8, 23, 15), []);
  const highlights = useMemo(() => getServiceHighlights(service), [service]);

  const dateType = useMemo(() => {
    if (!selectedDate) return "none";
    if (selectedDate < todayStr) return "past";
    if (selectedDate === todayStr) return "today";
    return "future";
  }, [selectedDate, todayStr]);

  const visibleSlots = useMemo(() => {
    if (dateType === "none" || dateType === "past") return [] as string[];

    if (dateType === "today") {
      const now = new Date();
      const nowMin = now.getHours() * 60 + now.getMinutes();
      return allSlots.filter((slot) => slotToMinutes(slot) > nowMin);
    }

    return allSlots;
  }, [allSlots, dateType]);

  const bookedSet = useMemo(() => new Set(disabledSlots), [disabledSlots]);

  const groupedSlots = useMemo(() => {
    const groups: Record<SlotPeriodKey, string[]> = {
      morning: [],
      afternoon: [],
      evening: [],
    };

    for (const slot of visibleSlots) {
      const minutes = slotToMinutes(slot);
      const period = SLOT_PERIODS.find((item) => minutes >= item.start && minutes < item.end)?.key;
      if (period) {
        groups[period].push(slot);
      }
    }

    return groups;
  }, [visibleSlots]);

  const availablePeriods = useMemo(
    () => SLOT_PERIODS.filter((period) => groupedSlots[period.key].length > 0),
    [groupedSlots],
  );

  const activeSlots = groupedSlots[activePeriod] || [];
  const renderedSlots = showAllSlots ? activeSlots : activeSlots.slice(0, SLOT_PREVIEW_LIMIT);
  const hasMoreSlots = activeSlots.length > SLOT_PREVIEW_LIMIT;

  const step3Locked = !selectedDate;
  const step4Locked = !selectedPetId || !selectedDate || !selectedTime;

  const appointmentIso = useMemo(() => {
    if (!selectedDate || !selectedTime) return "";
    const appointment = new Date(`${selectedDate}T${selectedTime}:00`);
    if (Number.isNaN(appointment.getTime())) return "";
    return appointment.toISOString();
  }, [selectedDate, selectedTime]);

  const canConfirm =
    canBook &&
    !busy &&
    Boolean(appointmentIso) &&
    Boolean(selectedPetId) &&
    walletBalance !== null &&
    walletBalance >= Number(service?.price || 0);

  const loadService = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const data = await getServiceById(serviceId);
      setService(data);
      setActiveImageIndex(0);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Khong tai duoc service");
    } finally {
      setLoading(false);
    }
  }, [serviceId]);

  const loadPetsAndWallet = useCallback(async () => {
    if (!canBook) return;

    setPetsLoading(true);
    setWalletLoading(true);

    try {
      const petData = await getMyPets("true");
      const activePets = petData.filter((pet) => pet.isActive !== false);
      setPets(activePets);
      if (activePets.length > 0) {
        setSelectedPetId((current) => current || activePets[0]._id);
      }
    } catch {
      setPets([]);
    } finally {
      setPetsLoading(false);
    }

    try {
      const wallet = await getWalletInfo();
      setWalletBalance(wallet.balance);
    } catch {
      setWalletBalance(null);
    } finally {
      setWalletLoading(false);
    }
  }, [canBook]);

  useEffect(() => {
    loadService();
  }, [loadService]);

  useEffect(() => {
    loadPetsAndWallet();
  }, [loadPetsAndWallet]);

  useEffect(() => {
    if (!selectedDate || !service?._id) {
      setDisabledSlots([]);
      setSlotError("");
      return;
    }

    let alive = true;
    setSlotLoading(true);
    setSlotError("");

    getAvailableSlots({
      date: selectedDate,
      serviceId: service._id,
      petId: selectedPetId || undefined,
    })
      .then((data) => {
        if (!alive) return;
        setDisabledSlots(Array.isArray(data.disabledSlots) ? data.disabledSlots : []);
      })
      .catch((e) => {
        if (!alive) return;
        setDisabledSlots([]);
        setSlotError(e instanceof Error ? e.message : "Khong tai duoc slot");
      })
      .finally(() => {
        if (!alive) return;
        setSlotLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [selectedDate, selectedPetId, service?._id]);

  useEffect(() => {
    if (!availablePeriods.length) return;
    if (!availablePeriods.some((period) => period.key === activePeriod)) {
      setActivePeriod(availablePeriods[0].key);
    }
  }, [availablePeriods, activePeriod]);

  useEffect(() => {
    setShowAllSlots(false);
  }, [activePeriod, selectedDate]);

  const onAddToCart = async () => {
    if (!service?._id) return;

    setBusy(true);
    setErrorMessage("");
    setStatusMessage("");

    try {
      await addToCart({ serviceId: service._id, quantity: 1, note: note.trim() || undefined });
      setStatusMessage("Service added to cart.");
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : "Cannot add service to cart");
    } finally {
      setBusy(false);
    }
  };

  const onConfirmBooking = async () => {
    if (!service?._id || !appointmentIso || !selectedPetId) return;

    setBusy(true);
    setErrorMessage("");
    setStatusMessage("");

    try {
      try {
        await clearCart();
      } catch {
        // Continue with direct booking flow even if clear-cart fails.
      }

      await addToCart({ serviceId: service._id, quantity: 1, note: note.trim() || undefined });

      const result = await checkoutBooking({
        appointmentDate: appointmentIso,
        petId: selectedPetId,
        notes: note.trim() || undefined,
        paymentMethod: "wallet",
      });

      const bookingId = result?.data?.booking?._id;
      if (bookingId) {
        navigation.getParent()?.navigate("BookingTab", {
          screen: "BookingDetail",
          params: { bookingId, toastMessage: "Booking completed" },
        });
        return;
      }

      setStatusMessage(result?.message || "Booking completed");
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : "Booking failed");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerBox}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!service) {
    return (
      <View style={styles.centerBox}>
        <Text style={styles.errorText}>{loadError || "Service not found"}</Text>
      </View>
    );
  }

  const images = Array.isArray(service.images) && service.images.length > 0 ? service.images : [""];
  const selectedPet = pets.find((pet) => pet._id === selectedPetId) || null;

  return (
    <View style={styles.screen}>
      <Pressable style={[styles.backButton, styles.backButtonFloating]} onPress={() => navigation.goBack()}>
        <Text style={styles.backButtonText}>Back to Services</Text>
      </Pressable>

      <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

      <View style={styles.heroCard}>
        {images[activeImageIndex] ? (
          <Image source={{ uri: images[activeImageIndex] }} style={styles.heroImage} resizeMode="cover" />
        ) : (
          <View style={[styles.heroImage, styles.heroPlaceholder]}>
            <Text style={styles.heroPlaceholderText}>{service.name}</Text>
          </View>
        )}

        {images.length > 1 ? (
          <Pressable
            style={styles.nextImageButton}
            onPress={() => setActiveImageIndex((prev) => (prev + 1) % images.length)}
          >
            <Text style={styles.nextImageButtonText}>›</Text>
          </Pressable>
        ) : null}
      </View>

      <Text style={styles.serviceTitle}>{service.name}</Text>
      <View style={styles.metaRow}>
        <Text style={styles.metaText}>★ {(service.rating || 0).toFixed(1)} ({service.totalReviews || 0} reviews)</Text>
        <Text style={styles.metaText}>·</Text>
        <Text style={styles.metaText}>◷ {service.duration} minutes</Text>
        <Text style={styles.metaText}>·</Text>
        <Text style={styles.priceText}>{formatMoney(service.price)}</Text>
      </View>

      <View style={styles.tagsRow}>
        <View style={styles.tagChip}><Text style={styles.tagText}>{service.category?.name || "Service"}</Text></View>
        <View style={styles.tagChip}><Text style={styles.tagText}>{service.duration} minutes</Text></View>
        <View style={styles.tagChip}><Text style={styles.tagText}>{service.petTypes?.length ? `For ${service.petTypes.join(", ")}` : "For pet"}</Text></View>
      </View>

      <View style={styles.sectionBlock}>
        <Text style={styles.sectionTitle}>ABOUT THIS SERVICE</Text>
        <Text style={styles.sectionBody}>{service.description || "Professional pet care service."}</Text>
      </View>

      <View style={styles.sectionBlock}>
        <Text style={[styles.sectionTitle, styles.sectionTitleGreen]}>WHAT'S INCLUDED</Text>
        {highlights.map((item, index) => (
          <Text key={`included-${index}`} style={styles.bulletText}>◉ {item}</Text>
        ))}
      </View>

      <View style={styles.sectionBlock}>
        <Text style={styles.sectionTitle}>HIGHLIGHTS</Text>
        {highlights.map((item, index) => (
          <Text key={`highlights-${index}`} style={styles.bulletText}>◉ {item}</Text>
        ))}
      </View>

      <View style={styles.bookingCard}>
        <Text style={styles.bookingTitle}>Book This Service</Text>
        <View style={styles.bookingPriceRow}>
          <Text style={styles.bookingPrice}>{formatMoney(service.price)}</Text>
          <Text style={styles.bookingPriceUnit}>/ session</Text>
        </View>
        <Text style={styles.bookingHint}>Fill each step in order to unlock the next one.</Text>

        <Pressable style={[styles.addServiceButton, busy && styles.disabled]} onPress={onAddToCart} disabled={busy || !canBook}>
          <Text style={styles.addServiceButtonText}>+ Add Service To Cart</Text>
        </Pressable>

        <View style={styles.stepHeaderRow}>
          <Text style={styles.stepNumber}>1</Text>
          <Text style={styles.stepTitle}>Select Your Pet</Text>
        </View>

        {!canBook ? (
          <Text style={styles.helperText}>Only customer account can book this service.</Text>
        ) : petsLoading ? (
          <ActivityIndicator size="small" />
        ) : pets.length === 0 ? (
          <View style={styles.warningBox}>
            <Text style={styles.warningTitle}>No pets found in your account.</Text>
            <Text style={styles.warningText}>Add your pet first to continue booking this service.</Text>
            <Pressable
              style={styles.addPetButton}
              onPress={() => navigation.getParent()?.navigate("AccountTab", { screen: "MyPets" })}
            >
              <Text style={styles.addPetButtonText}>+ Add Pet</Text>
            </Pressable>
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.petListRow}>
            {pets.map((pet) => {
              const selected = pet._id === selectedPetId;
              return (
                <Pressable
                  key={pet._id}
                  style={[styles.petChip, selected && styles.petChipActive]}
                  onPress={() => {
                    setSelectedPetId(pet._id);
                    setSelectedTime("");
                    setErrorMessage("");
                  }}
                >
                  <Text style={[styles.petChipTitle, selected && styles.petChipTitleActive]}>{pet.petName}</Text>
                  <Text style={[styles.petChipMeta, selected && styles.petChipTitleActive]}>{pet.breed || pet.petType || "pet"}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        <TextInput
          style={styles.noteInput}
          value={note}
          onChangeText={setNote}
          placeholder={selectedPet ? "Special notes for this booking..." : "Select a pet first to add notes"}
          editable={Boolean(selectedPet)}
          multiline
          numberOfLines={2}
        />

        <View style={styles.lockedSection}>
          <View style={styles.stepHeaderRow}>
            <Text style={styles.stepNumber}>2</Text>
            <Text style={styles.stepTitle}>Select Date</Text>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateListRow}>
            {dateOptions.map((date) => {
              const selected = date === selectedDate;
              const dateObj = new Date(`${date}T00:00:00`);
              const label = `${dateObj.getDate()}/${dateObj.getMonth() + 1}`;
              return (
                <Pressable
                  key={date}
                  style={[styles.dateChip, selected && styles.dateChipActive]}
                  onPress={() => {
                    setSelectedDate(date);
                    setSelectedTime("");
                    setErrorMessage("");
                    setStatusMessage("");
                  }}
                >
                  <Text style={[styles.dateChipText, selected && styles.dateChipTextActive]}>{label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        <View style={[styles.lockedSection, step3Locked && styles.lockedSectionDisabled]}>
          <View style={styles.stepHeaderRow}>
            <Text style={styles.stepNumber}>3</Text>
            <Text style={styles.stepTitle}>Pick a Time Slot</Text>
            {step3Locked ? <Text style={styles.lockIcon}>🔒</Text> : null}
          </View>

          {dateType === "none" ? (
            <View style={styles.slotSkeletonWrap}>
              {Array.from({ length: 8 }).map((_, index) => (
                <View key={`slot-skeleton-${index}`} style={styles.slotSkeleton} />
              ))}
            </View>
          ) : dateType === "past" ? (
            <Text style={styles.helperText}>This date has already passed.</Text>
          ) : slotLoading ? (
            <View style={styles.slotLoadingWrap}>
              <ActivityIndicator size="small" />
              <Text style={styles.helperText}>Checking slots...</Text>
            </View>
          ) : (
            <>
              {availablePeriods.length > 1 ? (
                <View style={styles.periodTabsWrap}>
                  {availablePeriods.map((period) => {
                    const isActive = period.key === activePeriod;
                    return (
                      <Pressable
                        key={period.key}
                        style={[styles.periodTab, isActive && styles.periodTabActive]}
                        onPress={() => setActivePeriod(period.key)}
                      >
                        <Text style={[styles.periodTabText, isActive && styles.periodTabTextActive]}>{period.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              ) : null}

              <View style={styles.slotGrid}>
                {renderedSlots.map((slot) => {
                  const disabled = bookedSet.has(slot);
                  const selected = selectedTime === slot;
                  return (
                    <Pressable
                      key={slot}
                      style={[styles.slotButton, disabled && styles.slotButtonDisabled, selected && styles.slotButtonSelected]}
                      onPress={() => {
                        if (disabled) return;
                        setSelectedTime(slot);
                        setErrorMessage("");
                      }}
                      disabled={disabled}
                    >
                      <Text
                        style={[
                          styles.slotButtonText,
                          disabled && styles.slotButtonTextDisabled,
                          selected && styles.slotButtonTextSelected,
                        ]}
                      >
                        {slot}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {hasMoreSlots ? (
                <Pressable style={styles.showMoreButton} onPress={() => setShowAllSlots((current) => !current)}>
                  <Text style={styles.showMoreButtonText}>
                    {showAllSlots
                      ? "Show fewer slots"
                      : `Show ${activeSlots.length - SLOT_PREVIEW_LIMIT} more slots`}
                  </Text>
                </Pressable>
              ) : null}
            </>
          )}

          {slotError ? <Text style={styles.errorText}>{slotError}</Text> : null}
        </View>

        <View style={[styles.lockedSection, step4Locked && styles.lockedSectionDisabled]}>
          <View style={styles.stepHeaderRow}>
            <Text style={styles.stepNumber}>4</Text>
            <Text style={styles.stepTitle}>Booking Summary</Text>
            {step4Locked ? <Text style={styles.lockIcon}>🔒</Text> : null}
          </View>

          <View style={styles.summaryPanel}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryKey}>Wallet balance:</Text>
              {walletLoading ? (
                <Text style={styles.summaryValue}>Loading...</Text>
              ) : (
                <Text style={[styles.summaryValue, walletBalance !== null && walletBalance >= service.price ? styles.balanceOk : styles.balanceBad]}>
                  {walletBalance !== null ? formatVnd(walletBalance) : "Unavailable"}
                </Text>
              )}
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryKey}>Service fee:</Text>
              <Text style={styles.summaryPriceValue}>{formatVnd(service.price)}</Text>
            </View>
          </View>
        </View>

        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
        {statusMessage ? <Text style={styles.successText}>{statusMessage}</Text> : null}

        <Pressable
          style={[styles.confirmButton, (!canConfirm || busy) && styles.confirmButtonDisabled]}
          onPress={onConfirmBooking}
          disabled={!canConfirm || busy}
        >
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.confirmButtonText}>Confirm Booking</Text>}
        </Pressable>
      </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F5F1EB" },
  container: { flex: 1, backgroundColor: "#F5F1EB" },
  content: { paddingHorizontal: 16, paddingTop: 72, paddingBottom: 32, gap: 14 },
  centerBox: { flex: 1, justifyContent: "center", alignItems: "center", padding: 16 },
  backButton: {
    borderWidth: 1,
    borderColor: "#E8D7CB",
    borderRadius: 16,
    backgroundColor: "#FFF5EE",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  backButtonFloating: {
    position: "absolute",
    top: 16,
    left: 16,
    zIndex: 20,
  },
  backButtonText: { color: "#2D3436", fontWeight: "700" },
  heroCard: {
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E4DFD5",
    backgroundColor: "#D1D5DB",
  },
  heroImage: { width: "100%", height: 260, backgroundColor: "#D1D5DB" },
  heroPlaceholder: { alignItems: "center", justifyContent: "center" },
  heroPlaceholderText: { color: "#6B7280", fontWeight: "700", fontSize: 18 },
  nextImageButton: {
    position: "absolute",
    right: 14,
    top: "50%",
    marginTop: -20,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(17, 24, 39, 0.35)",
  },
  nextImageButtonText: { color: "#fff", fontSize: 24, lineHeight: 28 },
  serviceTitle: { fontSize: 44, lineHeight: 48, fontWeight: "900", color: "#1F2A37" },
  metaRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6 },
  metaText: { color: "#5D6676", fontSize: 20 },
  priceText: { color: "#E07A5F", fontWeight: "900", fontSize: 36, lineHeight: 40 },
  tagsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tagChip: {
    borderWidth: 1,
    borderColor: "#D5D9E1",
    borderRadius: 16,
    backgroundColor: "#F4F1EC",
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  tagText: { color: "#5C6372", fontSize: 14 },
  sectionBlock: { borderTopWidth: 1, borderTopColor: "#D5D9E1", paddingTop: 12, gap: 8 },
  sectionTitle: {
    color: "#E07A5F",
    fontSize: 22,
    lineHeight: 26,
    fontWeight: "800",
    letterSpacing: 1.2,
  },
  sectionTitleGreen: { color: "#7FB069" },
  sectionBody: { color: "#1F2A37", fontSize: 36, lineHeight: 48 },
  bulletText: { color: "#1F2A37", fontSize: 34, lineHeight: 46 },
  bookingCard: {
    borderWidth: 1,
    borderColor: "#D8D2C8",
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    padding: 18,
    gap: 10,
  },
  bookingTitle: { fontSize: 40, lineHeight: 44, fontWeight: "900", color: "#1F2A37" },
  bookingPriceRow: { flexDirection: "row", alignItems: "flex-end", gap: 6 },
  bookingPrice: { color: "#E07A5F", fontSize: 52, lineHeight: 56, fontWeight: "900" },
  bookingPriceUnit: { color: "#7FB069", fontSize: 20, fontWeight: "700", paddingBottom: 8 },
  bookingHint: { color: "#8B93A5", fontSize: 16 },
  addServiceButton: {
    borderWidth: 1,
    borderColor: "#F2C9BC",
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "#FFF4EF",
  },
  addServiceButtonText: { color: "#E07A5F", fontWeight: "800", fontSize: 22 },
  stepHeaderRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 2 },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    textAlign: "center",
    textAlignVertical: "center",
    backgroundColor: "#FCE7E3",
    color: "#E07A5F",
    fontWeight: "800",
    fontSize: 13,
    lineHeight: 24,
    overflow: "hidden",
  },
  stepTitle: { color: "#1F2A37", fontSize: 18, fontWeight: "800", flex: 1 },
  lockIcon: { color: "#C7CCD6", fontSize: 12 },
  helperText: { color: "#6B7280", fontSize: 13 },
  warningBox: {
    borderWidth: 1,
    borderColor: "#F2D17D",
    borderRadius: 12,
    backgroundColor: "#FFFBEB",
    padding: 12,
  },
  warningTitle: { color: "#C2410C", fontWeight: "700", fontSize: 14 },
  warningText: { color: "#EA580C", marginTop: 4, fontSize: 13 },
  addPetButton: {
    marginTop: 8,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#FACC15",
    borderRadius: 999,
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  addPetButtonText: { color: "#B45309", fontWeight: "700", fontSize: 13 },
  petListRow: { gap: 8, paddingTop: 4, paddingBottom: 2, paddingRight: 8 },
  petChip: {
    borderWidth: 1,
    borderColor: "#D5DAE4",
    borderRadius: 12,
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 10,
    minWidth: 120,
  },
  petChipActive: { borderColor: "#E07A5F", backgroundColor: "#FFF4EF" },
  petChipTitle: { color: "#1F2A37", fontWeight: "800", fontSize: 14 },
  petChipTitleActive: { color: "#E07A5F" },
  petChipMeta: { color: "#7A8293", fontSize: 12, marginTop: 2 },
  noteInput: {
    borderWidth: 1,
    borderColor: "#E3E7EF",
    borderRadius: 12,
    backgroundColor: "#F4F1EC",
    paddingHorizontal: 12,
    paddingVertical: 11,
    minHeight: 58,
    textAlignVertical: "top",
    color: "#1F2A37",
  },
  lockedSection: { gap: 8 },
  lockedSectionDisabled: { opacity: 0.4 },
  dateListRow: { gap: 8, paddingTop: 3, paddingBottom: 1, paddingRight: 8 },
  dateChip: {
    borderWidth: 1,
    borderColor: "#D5DAE4",
    borderRadius: 12,
    backgroundColor: "#fff",
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  dateChipActive: { backgroundColor: "#E07A5F", borderColor: "#E07A5F" },
  dateChipText: { color: "#5C6372", fontWeight: "700", fontSize: 13 },
  dateChipTextActive: { color: "#fff" },
  slotSkeletonWrap: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginTop: 2 },
  slotSkeleton: { width: "31.5%", height: 38, borderRadius: 12, backgroundColor: "#ECEFF4", marginBottom: 8 },
  slotLoadingWrap: { flexDirection: "row", alignItems: "center", gap: 8 },
  periodTabsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 2 },
  periodTab: {
    borderWidth: 1,
    borderColor: "#D3D7DF",
    borderRadius: 12,
    backgroundColor: "#fff",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  periodTabActive: { backgroundColor: "#E07A5F", borderColor: "#E07A5F" },
  periodTabText: { color: "#667085", fontWeight: "700", fontSize: 12 },
  periodTabTextActive: { color: "#fff" },
  slotGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginTop: 2 },
  slotButton: {
    width: "31.5%",
    borderWidth: 1,
    borderColor: "#D3D7DF",
    borderRadius: 12,
    paddingVertical: 9,
    alignItems: "center",
    backgroundColor: "#fff",
    marginBottom: 8,
  },
  slotButtonDisabled: { backgroundColor: "#F2F4F7", borderColor: "#E4E7EC" },
  slotButtonSelected: { backgroundColor: "#E07A5F", borderColor: "#E07A5F" },
  slotButtonText: { color: "#1F2A37", fontWeight: "800", fontSize: 14 },
  slotButtonTextDisabled: { color: "#98A2B3", textDecorationLine: "line-through" },
  slotButtonTextSelected: { color: "#fff" },
  showMoreButton: {
    borderWidth: 1,
    borderColor: "#F2C9BC",
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
    backgroundColor: "#FFF4EF",
  },
  showMoreButtonText: { color: "#E07A5F", fontWeight: "700", fontSize: 13 },
  summaryPanel: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    backgroundColor: "#F4F1EC",
    padding: 11,
    gap: 4,
  },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  summaryKey: { color: "#7A8293", fontSize: 13, fontWeight: "700" },
  summaryValue: { color: "#111827", fontSize: 13, fontWeight: "700" },
  summaryPriceValue: { color: "#E07A5F", fontSize: 13, fontWeight: "800" },
  balanceOk: { color: "#16A34A" },
  balanceBad: { color: "#DC2626" },
  errorText: { color: "#DC2626", fontSize: 13, marginTop: 2 },
  successText: { color: "#047857", fontSize: 13, marginTop: 2 },
  confirmButton: {
    marginTop: 2,
    borderRadius: 14,
    backgroundColor: "#E07A5F",
    alignItems: "center",
    paddingVertical: 12,
  },
  confirmButtonDisabled: { backgroundColor: "#E5E7EB" },
  confirmButtonText: { color: "#fff", fontWeight: "800", fontSize: 16 },
  disabled: { opacity: 0.65 },
});
