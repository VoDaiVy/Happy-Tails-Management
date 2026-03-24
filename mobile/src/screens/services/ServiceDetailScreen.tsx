import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { getAvailableSlots, checkoutBooking } from "../../api/modules/bookingApi";
import { addToCart, clearCart } from "../../api/modules/cartApi";
import { getMyPets } from "../../api/modules/petApi";
import { getServiceById } from "../../api/modules/serviceApi";
import { getWalletInfo } from "../../api/modules/walletApi";
import { useAuth } from "../../context/AuthContext";
import type { ServicesStackParamList } from "../../navigation/types";
import type { Pet } from "../../types/pet";
import type { ServiceItem } from "../../types/service";
import { formatVnd } from "../../utils/currency";
import { canUseCustomerFeatures } from "../../utils/role";

type Props = NativeStackScreenProps<ServicesStackParamList, "ServiceDetail">;
type SlotPeriodKey = "morning" | "afternoon" | "evening";

interface BookingConfirmationInfo {
  bookingId?: string;
  serviceName: string;
  groupName: string;
  roomName: string;
  durationMins: number;
  timeRange: string;
  petName: string;
}

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

function toHourMinute(value?: string) {
  if (!value) return "";

  const direct = value.match(/(\d{2}:\d{2})/);
  if (direct?.[1]) return direct[1];

  const asDate = new Date(value);
  if (Number.isNaN(asDate.getTime())) return "";
  return `${pad(asDate.getHours())}:${pad(asDate.getMinutes())}`;
}

function addMinutesToSlot(slot: string, mins: number) {
  const [h, m] = slot.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return "";

  const total = h * 60 + m + Math.max(0, mins);
  const nextH = Math.floor(total / 60) % 24;
  const nextM = total % 60;
  return `${pad(nextH)}:${pad(nextM)}`;
}

function getServiceHighlights(service: ServiceItem | null) {
  const raw = service?.features;
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
  const [showBookingConfirmed, setShowBookingConfirmed] = useState(false);
  const [bookingConfirmation, setBookingConfirmation] = useState<BookingConfirmationInfo | null>(null);

  const todayStr = useMemo(() => toISODateLocal(new Date()), []);
  const dateOptions = useMemo(() => buildDateOptions(21), []);
  const allSlots = useMemo(() => buildTimeSlots(8, 23, 15), []);
  const highlights = useMemo(() => getServiceHighlights(service), [service]);
  const includedItems = useMemo(
    () => {
      const defaults = [
        { icon: "droplet" as const, label: "Hypoallergenic shampoo" },
        { icon: "wind" as const, label: "Blow dry" },
        { icon: "scissors" as const, label: "Brush-out" },
        { icon: "feather" as const, label: "Paw balm" },
      ];

      if (!highlights.length) return defaults;
      return defaults.map((item, index) => ({
        ...item,
        label: highlights[index] || item.label,
      }));
    },
    [highlights],
  );

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
      setLoadError(e instanceof Error ? e.message : "Unable to load service");
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
        setSlotError(e instanceof Error ? e.message : "Unable to load time slots");
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

      const schedule = Array.isArray(result?.data?.schedule) ? result.data.schedule[0] : undefined;
      const bookingId = result?.data?.booking?._id;

      const startTime = toHourMinute(schedule?.startTime) || selectedTime;
      const durationMins = Number(schedule?.durationMins || service.duration || 0);
      const endTime = toHourMinute(schedule?.endTime) || addMinutesToSlot(startTime, durationMins);
      const timeRange = startTime && endTime ? `${startTime} -> ${endTime}` : startTime || "N/A";

      setBookingConfirmation({
        bookingId,
        serviceName: schedule?.service || service.name,
        groupName: schedule?.group || service.group || "General Service",
        roomName: schedule?.room || "Auto Assignment",
        durationMins: durationMins || 0,
        timeRange,
        petName: selectedPet?.petName || "Your Pet",
      });
      setShowBookingConfirmed(true);

      setStatusMessage(result?.message || "Booking completed");
      setSelectedTime("");
      setNote("");
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
      <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.topBar}>
        <Pressable style={styles.topBarIconButton} onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={20} color="#A54F1B" />
        </Pressable>
        <Text style={styles.topBarTitle}>HappyTails</Text>
        <Pressable style={styles.topBarIconButton}>
          <Feather name="more-vertical" size={20} color="#A54F1B" />
        </Pressable>
      </View>

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

        <View style={styles.heroOverlay} />
        <View style={styles.heroBadge}>
          <Text style={styles.heroBadgeText}>GROOMING SERVICES</Text>
        </View>
      </View>

      <View style={styles.mainCard}>
        <View style={styles.serviceHeaderRow}>
          <View style={styles.serviceTitleWrap}>
            <Text style={styles.serviceTitle}>{service.name}</Text>
            <View style={styles.ratingRow}>
              <Feather name="star" size={14} color="#CF7A43" />
              <Text style={styles.ratingText}>{(service.rating || 0).toFixed(1)} ({service.totalReviews || 0} reviews)</Text>
            </View>
          </View>

          <View style={styles.priceWrap}>
            <Text style={styles.priceText}>{formatVnd(service.price)}</Text>
            <Text style={styles.priceCaption}>PER SESSION</Text>
          </View>
        </View>

        <View style={styles.quickChipsColumn}>
          <View style={styles.quickChip}>
            <Feather name="clock" size={15} color="#8E4D27" />
            <Text style={styles.quickChipText}>{service.duration} minutes</Text>
          </View>
          <View style={styles.quickChip}>
            <Feather name="target" size={15} color="#8E4D27" />
            <Text style={styles.quickChipText}>{service.petTypes?.length ? `For ${service.petTypes.join(", ")}` : "For pet"}</Text>
          </View>
        </View>

        <View style={styles.sectionBlock}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>About This Service</Text>
            <View style={styles.sectionDivider} />
          </View>
          <Text style={styles.sectionBody}>{service.description || "Professional pet care service."}</Text>
        </View>

        <View style={styles.sectionBlockNoBorder}>
          <Text style={styles.sectionTitle}>What&apos;s Included</Text>
          <View style={styles.includedList}>
            {includedItems.map((item, index) => (
              <View key={`included-item-${index}`} style={styles.includedCard}>
                <View style={styles.includedIconWrap}>
                  <Feather name={item.icon} size={16} color="#5A321A" />
                </View>
                <Text style={styles.includedText}>{item.label}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      <View style={styles.ctaWrap}>
        <Pressable style={styles.topCtaButton} onPress={() => undefined}>
          <Text style={styles.topCtaButtonText}>Book This Service</Text>
          <Feather name="arrow-right" size={18} color="#FFFFFF" />
        </Pressable>
        <Text style={styles.topCtaNote}>No payment required until the service is completed.</Text>
      </View>

      <View style={styles.bookingCard}>
        <Text style={styles.bookingTitle}>Book This Service</Text>
        <View style={styles.bookingPriceRow}>
          <Text style={styles.bookingPrice}>{formatVnd(service.price)}</Text>
          <Text style={styles.bookingPriceUnit}>/ lan</Text>
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

      <Modal
        visible={showBookingConfirmed && Boolean(bookingConfirmation)}
        transparent
        animationType="fade"
        onRequestClose={() => setShowBookingConfirmed(false)}
      >
        <View style={styles.bookingModalOverlay}>
          <View style={styles.bookingModalCard}>
            <View style={styles.bookingModalIconWrap}>
              <View style={styles.bookingModalIconCircle}>
                <Feather name="check" size={18} color="#D97A5F" />
              </View>
            </View>

            <Text style={styles.bookingModalTitle}>Booking Confirmed</Text>

            <View style={styles.bookingModalDetailBox}>
              <View style={styles.bookingModalRow}>
                <Text style={styles.bookingModalLabel}>Service:</Text>
                <Text style={styles.bookingModalValue}>{bookingConfirmation?.serviceName || "-"}</Text>
              </View>
              <View style={styles.bookingModalDivider} />

              <View style={styles.bookingModalRow}>
                <Text style={styles.bookingModalLabel}>Group:</Text>
                <Text style={styles.bookingModalValue}>{bookingConfirmation?.groupName || "-"}</Text>
              </View>
              <View style={styles.bookingModalDivider} />

              <View style={styles.bookingModalRow}>
                <Text style={styles.bookingModalLabel}>Room:</Text>
                <Text style={styles.bookingModalValue}>{bookingConfirmation?.roomName || "-"}</Text>
              </View>
              <View style={styles.bookingModalDivider} />

              <View style={styles.bookingModalRow}>
                <Text style={styles.bookingModalLabel}>Duration:</Text>
                <Text style={styles.bookingModalValue}>{bookingConfirmation?.durationMins || 0} minutes</Text>
              </View>
              <View style={styles.bookingModalDivider} />

              <View style={styles.bookingModalRow}>
                <Text style={styles.bookingModalLabel}>Time:</Text>
                <Text style={styles.bookingModalTimeValue}>{bookingConfirmation?.timeRange || "-"}</Text>
              </View>
              <View style={styles.bookingModalDivider} />

              <View style={styles.bookingModalRow}>
                <Text style={styles.bookingModalLabel}>Pet:</Text>
                <Text style={styles.bookingModalValue}>{bookingConfirmation?.petName || "-"}</Text>
              </View>
            </View>

            <Pressable
              style={styles.bookingModalActionButton}
              onPress={() => {
                setShowBookingConfirmed(false);
                setStatusMessage("");
              }}
            >
              <Text style={styles.bookingModalActionText}>Book Another Session</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F8F4EF" },
  container: { flex: 1, backgroundColor: "#F8F4EF" },
  content: { paddingBottom: 32, gap: 14 },
  centerBox: { flex: 1, justifyContent: "center", alignItems: "center", padding: 16 },
  topBar: {
    minHeight: 72,
    paddingTop: 12,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F8F4EF",
  },
  topBarIconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  topBarTitle: {
    color: "#2D1207",
    fontSize: 38,
    lineHeight: 40,
    fontWeight: "800",
  },
  heroCard: {
    marginHorizontal: 0,
    overflow: "hidden",
    backgroundColor: "#D1D5DB",
    borderBottomLeftRadius: 66,
  },
  heroImage: { width: "100%", height: 336, backgroundColor: "#D1D5DB" },
  heroPlaceholder: { alignItems: "center", justifyContent: "center" },
  heroPlaceholderText: { color: "#6B7280", fontWeight: "700", fontSize: 18 },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15, 20, 30, 0.20)",
  },
  heroBadge: {
    position: "absolute",
    top: 30,
    left: 26,
    borderRadius: 999,
    backgroundColor: "#A9551A",
    paddingHorizontal: 16,
    paddingVertical: 7,
  },
  heroBadgeText: {
    color: "#FFFFFF",
    fontSize: 15,
    lineHeight: 18,
    letterSpacing: 1.2,
    fontWeight: "800",
  },
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
  mainCard: {
    marginHorizontal: 16,
    marginTop: -62,
    borderRadius: 44,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 18,
    paddingTop: 24,
    paddingBottom: 22,
    borderWidth: 1,
    borderColor: "#EFE4D7",
    shadowColor: "#7E5A3A",
    shadowOpacity: 0.10,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
    gap: 14,
  },
  serviceHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10,
  },
  serviceTitleWrap: { flex: 1 },
  serviceTitle: {
    color: "#2A1208",
    fontSize: 52,
    lineHeight: 56,
    fontWeight: "800",
  },
  ratingRow: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  ratingText: { color: "#5D3A24", fontSize: 18, lineHeight: 24 },
  priceWrap: { alignItems: "flex-end", marginTop: 4 },
  priceText: { color: "#A34C18", fontWeight: "900", fontSize: 48, lineHeight: 50 },
  priceCaption: { color: "#8D5A3B", fontSize: 16, lineHeight: 20, letterSpacing: 0.5 },
  quickChipsColumn: { gap: 10 },
  quickChip: {
    alignSelf: "flex-start",
    borderRadius: 999,
    backgroundColor: "#F7EADF",
    borderWidth: 1,
    borderColor: "#F0DFCF",
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  quickChipText: { color: "#4C2712", fontSize: 33, lineHeight: 38, fontWeight: "700" },
  sectionBlock: { borderTopWidth: 1, borderTopColor: "#EBDCCF", paddingTop: 12, gap: 8 },
  sectionBlockNoBorder: { paddingTop: 4, gap: 12 },
  sectionHeaderRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  sectionTitle: {
    color: "#2A1208",
    fontSize: 40,
    lineHeight: 44,
    fontWeight: "800",
  },
  sectionDivider: {
    flex: 1,
    height: 1,
    backgroundColor: "#E7D6C8",
    marginTop: 4,
  },
  sectionBody: { color: "#5C3924", fontSize: 26, lineHeight: 38 },
  includedList: { gap: 12 },
  includedCard: {
    borderRadius: 999,
    backgroundColor: "#F5E8DD",
    paddingHorizontal: 14,
    paddingVertical: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  includedIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F2B37E",
  },
  includedText: { color: "#2E160C", fontSize: 21, lineHeight: 26, fontWeight: "700", flex: 1 },
  ctaWrap: {
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 8,
    gap: 9,
  },
  topCtaButton: {
    minHeight: 64,
    borderRadius: 999,
    backgroundColor: "#E26616",
    paddingHorizontal: 26,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    shadowColor: "#DE6B1D",
    shadowOpacity: 0.28,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 9 },
    elevation: 5,
  },
  topCtaButtonText: {
    color: "#FFFFFF",
    fontSize: 20,
    lineHeight: 24,
    fontWeight: "800",
  },
  topCtaNote: {
    color: "#A08167",
    fontSize: 14,
    lineHeight: 18,
    fontStyle: "italic",
    textAlign: "center",
  },
  bookingCard: {
    marginHorizontal: 16,
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
  bookingModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(28, 20, 15, 0.20)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  bookingModalCard: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 18,
    backgroundColor: "#F2F3F5",
    borderWidth: 1,
    borderColor: "#D6D7DA",
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 16,
    alignItems: "center",
  },
  bookingModalIconWrap: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: "#EFE4E0",
    alignItems: "center",
    justifyContent: "center",
  },
  bookingModalIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#D97A5F",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  bookingModalTitle: {
    marginTop: 12,
    color: "#0F2744",
    fontSize: 36,
    lineHeight: 40,
    fontWeight: "900",
  },
  bookingModalDetailBox: {
    width: "100%",
    marginTop: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#D6D8DD",
    backgroundColor: "#ECEEF1",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  bookingModalRow: {
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  bookingModalDivider: {
    height: 1,
    backgroundColor: "#D0D3D8",
  },
  bookingModalLabel: {
    color: "#52607A",
    fontSize: 14,
    fontWeight: "500",
  },
  bookingModalValue: {
    color: "#0F2744",
    fontSize: 14,
    fontWeight: "700",
    flexShrink: 1,
    textAlign: "right",
  },
  bookingModalTimeValue: {
    color: "#E07254",
    fontSize: 14,
    fontWeight: "700",
    flexShrink: 1,
    textAlign: "right",
  },
  bookingModalActionButton: {
    marginTop: 16,
    width: "100%",
    minHeight: 44,
    borderRadius: 13,
    backgroundColor: "#D8795C",
    alignItems: "center",
    justifyContent: "center",
  },
  bookingModalActionText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
  },
});
