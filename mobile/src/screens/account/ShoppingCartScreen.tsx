import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { clearCart, getCart, removeCartItem, updateCartItem } from "../../api/modules/cartApi";
import { checkoutBooking, getAvailableSlots } from "../../api/modules/bookingApi";
import { PetPickerModal } from "../../components/PetPickerModal";
import { getMyPets } from "../../api/modules/petApi";
import { formatVoucherPreview, getAvailableVouchers } from "../../api/modules/voucherApi";
import { useAuth } from "../../context/AuthContext";
import type { AccountStackParamList } from "../../navigation/types";
import type { Cart, CartItem } from "../../types/cart";
import type { Pet } from "../../types/pet";
import type { AvailableVoucher } from "../../types/voucher";
import { canUseCustomerFeatures } from "../../utils/role";

type Props = NativeStackScreenProps<AccountStackParamList, "ShoppingCart">;
type SlotPeriodKey = "morning" | "afternoon" | "evening";

const SLOT_PREVIEW_LIMIT = 12;
const SLOT_PERIODS: Array<{ key: SlotPeriodKey; label: string; start: number; end: number }> = [
  { key: "morning", label: "Morning", start: 0, end: 12 * 60 },
  { key: "afternoon", label: "Afternoon", start: 12 * 60, end: 18 * 60 },
  { key: "evening", label: "Evening", start: 18 * 60, end: 24 * 60 },
];

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

function formatMoneyVnd(value: number) {
  return `${Number(value || 0).toLocaleString("vi-VN")}đ`;
}

function formatDisplayDate(iso: string) {
  const date = new Date(`${iso}T00:00:00`);
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function getServiceId(item: CartItem | undefined) {
  if (!item) return "";

  const rawServiceId = (item as unknown as { serviceId?: unknown }).serviceId;
  if (typeof rawServiceId === "string") return rawServiceId;
  if (rawServiceId && typeof rawServiceId === "object" && "_id" in rawServiceId) {
    const maybeId = (rawServiceId as { _id?: unknown })._id;
    return typeof maybeId === "string" ? maybeId : "";
  }
  return "";
}

export function ShoppingCartScreen({ navigation }: Props) {
  const { user } = useAuth();
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [note, setNote] = useState("");
  const [voucherCode, setVoucherCode] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [pets, setPets] = useState<Pet[]>([]);
  const [petsLoading, setPetsLoading] = useState(true);
  const [selectedPetId, setSelectedPetId] = useState("");
  const [petPickerVisible, setPetPickerVisible] = useState(false);
  const [voucherPickerVisible, setVoucherPickerVisible] = useState(false);
  const [vouchers, setVouchers] = useState<AvailableVoucher[]>([]);
  const [voucherLoading, setVoucherLoading] = useState(false);
  const [slotLoading, setSlotLoading] = useState(false);
  const [slotError, setSlotError] = useState("");
  const [disabledSlots, setDisabledSlots] = useState<string[]>([]);
  const [activePeriod, setActivePeriod] = useState<SlotPeriodKey>("morning");
  const [showAllSlots, setShowAllSlots] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const canAccess = canUseCustomerFeatures(user?.role);
  const selectedPet = pets.find((pet) => pet._id === selectedPetId) || null;
  const cartItems = cart?.items || [];
  const firstServiceId = useMemo(() => getServiceId(cartItems[0]), [cartItems]);
  const todayStr = useMemo(() => toISODateLocal(new Date()), []);
  const dateOptions = useMemo(() => buildDateOptions(21), []);
  const allSlots = useMemo(() => buildTimeSlots(8, 23, 15), []);

  const summary = useMemo(() => {
    const serviceDurationTotal = cartItems.reduce(
      (total, item) => total + Number(item.duration || 0) * Number(item.quantity || 1),
      0,
    );

    return {
      serviceSubtotal: Number(cart?.totalPrice || 0),
      serviceDurationTotal,
      staySubtotal: 0,
      stayDurationTotal: 0,
      grandTotal: Number(cart?.totalPrice || 0),
    };
  }, [cart?.totalPrice, cartItems]);

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
  const renderedSlots = showAllSlots
    ? activeSlots
    : activeSlots.slice(0, SLOT_PREVIEW_LIMIT);
  const hasMoreSlots = activeSlots.length > SLOT_PREVIEW_LIMIT;

  const loadCart = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getCart();
      setCart(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Khong tai duoc gio hang");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!canAccess) {
      setLoading(false);
      setPetsLoading(false);
      return;
    }

    const loadInitialData = async () => {
      setPetsLoading(true);
      try {
        await loadCart();
        const petList = await getMyPets("true");
        const activePets = petList.filter((pet) => pet.isActive !== false);
        setPets(activePets);
        if (activePets.length > 0) {
          setSelectedPetId((current) => current || activePets[0]._id);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Khong tai duoc du lieu ban dau");
      } finally {
        setPetsLoading(false);
      }
    };

    loadInitialData();
  }, [canAccess, loadCart]);

  useEffect(() => {
    if (!selectedDate || !firstServiceId) {
      setDisabledSlots([]);
      setSlotError("");
      return;
    }

    let alive = true;
    setSlotLoading(true);
    setSlotError("");

    getAvailableSlots({
      date: selectedDate,
      serviceId: firstServiceId,
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
  }, [selectedDate, selectedPetId, firstServiceId]);

  useEffect(() => {
    if (!availablePeriods.length) return;
    if (!availablePeriods.some((period) => period.key === activePeriod)) {
      setActivePeriod(availablePeriods[0].key);
    }
  }, [availablePeriods, activePeriod]);

  useEffect(() => {
    setShowAllSlots(false);
  }, [activePeriod, selectedDate]);

  const loadAvailableVouchers = useCallback(async () => {
    setVoucherLoading(true);
    try {
      const items = await getAvailableVouchers({ page: 1, limit: 30 });
      setVouchers(items);
    } catch {
      setVouchers([]);
    } finally {
      setVoucherLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!canAccess) return;
    loadAvailableVouchers();
  }, [canAccess, loadAvailableVouchers]);

  if (!canAccess) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Tinh nang nay chi danh cho tai khoan customer.</Text>
      </View>
    );
  }

  const changeQuantity = async (item: CartItem, nextQty: number) => {
    if (nextQty < 1) return;
    setActionLoading(true);
    setError("");
    setMessage("");
    try {
      const updated = await updateCartItem(item._id, nextQty);
      setCart(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Cap nhat so luong that bai");
    } finally {
      setActionLoading(false);
    }
  };

  const onRemove = async (itemId: string) => {
    setActionLoading(true);
    setError("");
    setMessage("");
    try {
      const updated = await removeCartItem(itemId);
      setCart(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Xoa item that bai");
    } finally {
      setActionLoading(false);
    }
  };

  const onClear = async () => {
    setActionLoading(true);
    setError("");
    setMessage("");
    try {
      const updated = await clearCart();
      setCart(updated);
      setMessage("Da xoa toan bo gio hang");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Khong the xoa gio hang");
    } finally {
      setActionLoading(false);
    }
  };

  const onCheckout = async () => {
    if (!selectedPetId) {
      setError("Vui long chon pet truoc khi dat lich");
      return;
    }

    setActionLoading(true);
    setError("");
    setMessage("");

    if (!selectedDate || !selectedTime) {
      setActionLoading(false);
      setError("Vui long chon ngay va gio hen truoc khi dat lich");
      return;
    }

    const appointment = new Date(`${selectedDate}T${selectedTime}:00`);
    if (Number.isNaN(appointment.getTime())) {
      setActionLoading(false);
      setError("Ngay gio hen khong hop le");
      return;
    }

    if (appointment.getTime() < Date.now()) {
      setActionLoading(false);
      setError("Khong the dat lich trong qua khu");
      return;
    }

    try {
      const response = await checkoutBooking({
        appointmentDate: appointment.toISOString(),
        petId: selectedPetId,
        voucherCode: voucherCode.trim() || undefined,
        notes: note.trim() || undefined,
      });

      const bookingId = response?.data?.booking?._id;
      if (bookingId) {
        navigation.navigate("BookingDetail", {
          bookingId,
          toastMessage: "Dat lich thanh cong",
        });
      } else {
        setMessage(response?.message || "Dat lich thanh cong");
      }
      setSelectedTime("");
      await loadCart();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Dat lich that bai");
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
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.pageInner}>
        <View style={styles.headerRow}>
          <View style={styles.headerIconWrap}>
            <Text style={styles.headerIcon}>🛒</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.pageTitle}>Gio hang & Booking</Text>
            <Text style={styles.pageSubtitle}>Chon dich vu, luu tru va xac nhan lich hen</Text>
          </View>
        </View>

        {cartItems.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Gio hang dang trong</Text>
            <Text style={styles.emptyText}>Hay them dich vu truoc khi tao booking.</Text>
          </View>
        ) : (
          <>
            {cartItems.map((item) => (
              <View key={item._id} style={styles.itemCard}>
                <View style={styles.itemTopRow}>
                  <View style={styles.itemBadgeWrap}>
                    <Text style={styles.itemBadgeIcon}>🐾</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    <Text style={styles.itemMeta}>{item.duration} phut x {item.quantity}</Text>
                  </View>
                  <View style={styles.itemPriceCol}>
                    <Text style={styles.itemSubtotal}>{formatMoneyVnd(item.subtotal)}</Text>
                    <Text style={styles.itemUnitPrice}>{formatMoneyVnd(item.price)} / don vi</Text>
                  </View>
                </View>

                <View style={styles.itemBottomRow}>
                  <View style={styles.qtyWrap}>
                    <Pressable
                      style={styles.qtyBtn}
                      onPress={() => changeQuantity(item, item.quantity - 1)}
                      disabled={actionLoading || item.quantity <= 1}
                    >
                      <Text style={styles.qtyBtnText}>-</Text>
                    </Pressable>
                    <Text style={styles.qtyText}>{item.quantity}</Text>
                    <Pressable
                      style={styles.qtyBtn}
                      onPress={() => changeQuantity(item, item.quantity + 1)}
                      disabled={actionLoading}
                    >
                      <Text style={styles.qtyBtnText}>+</Text>
                    </Pressable>
                  </View>

                  <Pressable style={styles.removeLink} onPress={() => onRemove(item._id)} disabled={actionLoading}>
                    <Text style={styles.removeLinkText}>Xoa</Text>
                  </Pressable>
                </View>
              </View>
            ))}

            <Pressable onPress={onClear} disabled={actionLoading}>
              <Text style={styles.clearAllText}>Xoa toan bo gio hang</Text>
            </Pressable>
          </>
        )}

        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Booking Summary</Text>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Phi dich vu</Text>
            <Text style={styles.summaryValue}>{formatMoneyVnd(summary.serviceSubtotal)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Thoi gian dich vu</Text>
            <Text style={styles.summaryValue}>{summary.serviceDurationTotal} phut</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Phi luu tru</Text>
            <Text style={styles.summaryValue}>{formatMoneyVnd(summary.staySubtotal)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Thoi gian luu tru</Text>
            <Text style={styles.summaryValue}>{summary.stayDurationTotal} dem</Text>
          </View>

          <View style={styles.summaryDivider} />

          <View style={styles.summaryRow}>
            <Text style={styles.totalLabel}>Tong thanh toan</Text>
            <Text style={styles.totalValue}>{formatMoneyVnd(summary.grandTotal)}</Text>
          </View>

          <View style={styles.checkoutCard}>
            <Text style={styles.checkoutHint}>CHECKOUT FORM (SERVICE ONLY)</Text>

            <Text style={styles.sectionLabel}>Ngay hen</Text>
            <View style={styles.selectedDateWrap}>
              <Text style={styles.selectedDateText}>
                {selectedDate ? formatDisplayDate(selectedDate) : "Select a date..."}
              </Text>
              {selectedDate ? (
                <Pressable
                  onPress={() => {
                    setSelectedDate("");
                    setSelectedTime("");
                    setDisabledSlots([]);
                  }}
                >
                  <Text style={styles.clearDateText}>X</Text>
                </Pressable>
              ) : null}
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.dateChipsContent}
            >
              {dateOptions.map((date) => {
                const isSelected = date === selectedDate;
                const dateObj = new Date(`${date}T00:00:00`);
                const label = `${dateObj.getDate()}/${dateObj.getMonth() + 1}`;
                return (
                  <Pressable
                    key={date}
                    style={[styles.dateChip, isSelected && styles.dateChipActive]}
                    onPress={() => {
                      setSelectedDate(date);
                      setSelectedTime("");
                      setError("");
                      setMessage("");
                    }}
                  >
                    <Text style={[styles.dateChipText, isSelected && styles.dateChipTextActive]}>{label}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <Text style={styles.sectionLabel}>Gio hen</Text>

            {dateType === "none" ? (
              <View style={styles.slotSkeletonWrap}>
                {Array.from({ length: 8 }).map((_, index) => (
                  <View key={`slot-skeleton-${index}`} style={styles.slotSkeleton} />
                ))}
              </View>
            ) : dateType === "past" ? (
              <View style={styles.slotInfoBox}>
                <Text style={styles.slotInfoText}>Ngay nay da qua. Vui long chon ngay hien tai hoac tuong lai.</Text>
              </View>
            ) : slotLoading ? (
              <View style={styles.slotLoadingWrap}>
                <ActivityIndicator size="small" />
                <Text style={styles.slotLoadingText}>Dang kiem tra slot...</Text>
              </View>
            ) : visibleSlots.length === 0 ? (
              <View style={styles.slotInfoBox}>
                <Text style={styles.slotInfoText}>Khong con slot trong ngay hom nay.</Text>
              </View>
            ) : (
              <>
                <Text style={styles.slotMetaText}>
                  {visibleSlots.filter((slot) => !bookedSet.has(slot)).length}/{visibleSlots.length} slots available
                </Text>

                {availablePeriods.length > 1 ? (
                  <View style={styles.periodTabsWrap}>
                    {availablePeriods.map((period) => {
                      const totalInPeriod = groupedSlots[period.key].length;
                      const availableInPeriod = groupedSlots[period.key].filter(
                        (slot) => !bookedSet.has(slot),
                      ).length;
                      const isActive = period.key === activePeriod;

                      return (
                        <Pressable
                          key={period.key}
                          style={[styles.periodTab, isActive && styles.periodTabActive]}
                          onPress={() => setActivePeriod(period.key)}
                        >
                          <Text style={[styles.periodTabText, isActive && styles.periodTabTextActive]}>
                            {period.label} ({availableInPeriod}/{totalInPeriod})
                          </Text>
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
                        style={[
                          styles.slotButton,
                          disabled && styles.slotButtonDisabled,
                          selected && styles.slotButtonSelected,
                        ]}
                        onPress={() => {
                          if (disabled) return;
                          setSelectedTime(slot);
                          setError("");
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
                  <Pressable
                    style={styles.showMoreButton}
                    onPress={() => setShowAllSlots((current) => !current)}
                  >
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

            <Text style={styles.sectionLabel}>Thu cung</Text>
            {petsLoading ? (
              <ActivityIndicator size="small" />
            ) : pets.length === 0 ? (
              <Text style={styles.emptyText}>Ban chua co pet kha dung.</Text>
            ) : (
              <Pressable style={styles.selectorButton} onPress={() => setPetPickerVisible(true)}>
                <Text style={styles.selectorButtonText}>{selectedPet ? selectedPet.petName : "Chon pet"}</Text>
              </Pressable>
            )}

            <Text style={styles.sectionLabel}>Ghi chu</Text>
            <TextInput
              style={styles.noteInput}
              value={note}
              onChangeText={setNote}
              placeholder="Vi du: thu cung nhay cam voi tieng on"
              multiline
              numberOfLines={3}
            />

            <Text style={styles.sectionLabel}>Voucher (optional)</Text>
            <TextInput
              style={styles.noteInput}
              value={voucherCode}
              onChangeText={setVoucherCode}
              autoCapitalize="characters"
              placeholder="Nhap voucher code"
            />

            <Pressable style={styles.selectorButton} onPress={() => setVoucherPickerVisible((current) => !current)}>
              <Text style={styles.selectorButtonText}>
                {voucherCode ? `Voucher: ${voucherCode}` : "Chon voucher tu danh sach"}
              </Text>
            </Pressable>

            {voucherPickerVisible ? (
              <View style={styles.voucherCard}>
                {voucherLoading ? (
                  <ActivityIndicator size="small" />
                ) : vouchers.length === 0 ? (
                  <Text style={styles.emptyText}>Khong co voucher kha dung</Text>
                ) : (
                  vouchers.map((item) => (
                    <Pressable
                      key={item._id}
                      style={styles.voucherItem}
                      onPress={() => {
                        setVoucherCode(item.code);
                        setVoucherPickerVisible(false);
                      }}
                    >
                      <Text style={styles.voucherCode}>{item.code}</Text>
                      <Text style={styles.voucherMeta}>{formatVoucherPreview(item)}</Text>
                      <Text style={styles.voucherMeta}>Min spend: {(item.minSpend || 0).toLocaleString()} VND</Text>
                    </Pressable>
                  ))
                )}
              </View>
            ) : null}
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          {message ? <Text style={styles.successText}>{message}</Text> : null}

          <Pressable
            style={[styles.primaryBtn, actionLoading && styles.disabled]}
            onPress={onCheckout}
            disabled={
              actionLoading ||
              cartItems.length === 0 ||
              petsLoading ||
              pets.length === 0 ||
              !selectedDate ||
              !selectedTime
            }
          >
            {actionLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryBtnText}>Thanh toan & Tao booking</Text>
            )}
          </Pressable>

          <Text style={styles.footerHint}>Khong chon duoc ngay qua khu, slot het cho se tu khoa.</Text>
          <Text style={styles.footerHint}>Slot dang kiem tra theo dich vu cu the, tranh chan nham toan he thong.</Text>
        </View>
        </View>
      </ScrollView>

      <PetPickerModal
        visible={petPickerVisible}
        pets={pets}
        selectedPetId={selectedPetId}
        title="Chon pet cho booking"
        onClose={() => setPetPickerVisible(false)}
        onSelect={(petId) => {
          setSelectedPetId(petId);
          setSelectedTime("");
          setPetPickerVisible(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F1EB" },
  scrollContent: { paddingHorizontal: 16, paddingTop: 18, paddingBottom: 40 },
  pageInner: {
    width: "100%",
    maxWidth: 760,
    alignSelf: "center",
    gap: 14,
  },
  centerBox: { flex: 1, justifyContent: "center", alignItems: "center" },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 2 },
  headerIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: "#E07A5F",
    alignItems: "center",
    justifyContent: "center",
  },
  headerIcon: { fontSize: 21 },
  pageTitle: { fontSize: 36, lineHeight: 40, fontWeight: "900", color: "#1F2A37" },
  pageSubtitle: { marginTop: 2, color: "#667085", fontSize: 16, lineHeight: 20 },
  emptyCard: {
    borderWidth: 1,
    borderColor: "#E3DCD1",
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    padding: 22,
    shadowColor: "#1F2A37",
    shadowOpacity: 0.07,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  emptyTitle: { fontSize: 20, fontWeight: "800", color: "#1F2A37" },
  summaryCard: {
    borderWidth: 1,
    borderColor: "#D8D2C8",
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    padding: 20,
    gap: 8,
    shadowColor: "#1F2A37",
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  summaryTitle: { fontSize: 36, lineHeight: 40, fontWeight: "900", color: "#1F2A37", marginBottom: 6 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  summaryLabel: { color: "#6D6F7A", fontSize: 24, lineHeight: 30 },
  summaryValue: { color: "#6D6F7A", fontSize: 24, lineHeight: 30 },
  summaryDivider: { borderTopWidth: 1, borderStyle: "dashed", borderColor: "#D7D6D3", marginVertical: 6 },
  totalLabel: { fontSize: 30, lineHeight: 34, fontWeight: "800", color: "#1F2A37" },
  totalValue: { fontSize: 30, lineHeight: 34, fontWeight: "900", color: "#E07A5F" },
  checkoutCard: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#D8D2C8",
    borderRadius: 18,
    backgroundColor: "#F9F6F1",
    padding: 14,
    gap: 8,
  },
  checkoutHint: { fontSize: 20, lineHeight: 24, fontWeight: "800", color: "#7A7F88" },
  emptyText: { color: "#64748B", textAlign: "center", marginTop: 14 },
  itemCard: {
    borderWidth: 1,
    borderColor: "#D8D2C8",
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    padding: 15,
    gap: 10,
    shadowColor: "#1F2A37",
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  itemTopRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  itemBadgeWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#FBE7E1",
    alignItems: "center",
    justifyContent: "center",
  },
  itemBadgeIcon: { fontSize: 19 },
  itemName: { fontWeight: "800", fontSize: 18, color: "#1F2A37" },
  itemMeta: { marginTop: 3, color: "#6D6F7A", fontSize: 15 },
  itemPriceCol: { alignItems: "flex-end", justifyContent: "flex-start" },
  itemSubtotal: { color: "#E07A5F", fontWeight: "800", fontSize: 30, lineHeight: 34 },
  itemUnitPrice: { marginTop: 3, color: "#8A8D94", fontSize: 13 },
  itemBottomRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  qtyWrap: { flexDirection: "row", alignItems: "center", gap: 10 },
  qtyBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#D3D7DF",
    backgroundColor: "#FFFFFF",
  },
  qtyBtnText: { fontWeight: "800", color: "#586174", fontSize: 17 },
  qtyText: { minWidth: 24, textAlign: "center", fontWeight: "800", fontSize: 17, color: "#1F2A37" },
  removeLink: { paddingVertical: 4, paddingHorizontal: 6 },
  removeLinkText: { color: "#F04438", fontWeight: "700", fontSize: 22 },
  clearAllText: { color: "#F04438", fontWeight: "700", fontSize: 30, lineHeight: 34 },
  noteInput: {
    borderWidth: 1,
    borderColor: "#D3D7DF",
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 13,
    textAlignVertical: "top",
    color: "#1F2A37",
    fontSize: 16,
  },
  sectionLabel: { marginTop: 8, marginBottom: 4, color: "#48505D", fontWeight: "700", fontSize: 30, lineHeight: 34 },
  selectedDateWrap: {
    borderWidth: 1,
    borderColor: "#D3D7DF",
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectedDateText: { color: "#1F2A37", fontSize: 17, fontWeight: "700" },
  clearDateText: { color: "#8A8D94", fontSize: 15, fontWeight: "700", paddingHorizontal: 3 },
  dateChipsContent: { paddingTop: 8, paddingBottom: 4, paddingRight: 8, gap: 9 },
  dateChip: {
    borderWidth: 1,
    borderColor: "#D8D2C8",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  dateChipActive: {
    backgroundColor: "#E07A5F",
    borderColor: "#E07A5F",
  },
  dateChipText: { color: "#475467", fontWeight: "700", fontSize: 14 },
  dateChipTextActive: { color: "#FFFFFF" },
  slotSkeletonWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginTop: 4,
  },
  slotSkeleton: {
    width: "31.5%",
    height: 36,
    borderRadius: 12,
    backgroundColor: "#ECEFF4",
    marginBottom: 8,
  },
  slotLoadingWrap: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 8 },
  slotLoadingText: { color: "#6D6F7A", fontSize: 14 },
  slotInfoBox: {
    borderWidth: 1,
    borderColor: "#F6D4C8",
    backgroundColor: "#FFF7F4",
    borderRadius: 10,
    padding: 10,
  },
  slotInfoText: { color: "#B54708", fontWeight: "600", fontSize: 14 },
  slotMetaText: { color: "#98A2B3", fontSize: 14, marginTop: 2 },
  periodTabsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6 },
  periodTab: {
    borderWidth: 1,
    borderColor: "#D3D7DF",
    borderRadius: 13,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  periodTabActive: {
    backgroundColor: "#E07A5F",
    borderColor: "#E07A5F",
  },
  periodTabText: { color: "#667085", fontSize: 13, fontWeight: "700" },
  periodTabTextActive: { color: "#FFFFFF" },
  slotGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginTop: 8,
  },
  slotButton: {
    width: "31.5%",
    borderWidth: 1,
    borderColor: "#D3D7DF",
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    marginBottom: 8,
  },
  slotButtonDisabled: { backgroundColor: "#F2F4F7", borderColor: "#E4E7EC" },
  slotButtonSelected: { backgroundColor: "#E07A5F", borderColor: "#E07A5F" },
  slotButtonText: { color: "#1F2A37", fontWeight: "800", fontSize: 15 },
  slotButtonTextDisabled: { color: "#98A2B3", textDecorationLine: "line-through" },
  slotButtonTextSelected: { color: "#FFFFFF" },
  showMoreButton: {
    borderWidth: 1,
    borderColor: "#F2C9BC",
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: "center",
    backgroundColor: "#FFF4EF",
  },
  showMoreButtonText: { color: "#E07A5F", fontWeight: "700", fontSize: 14 },
  selectorButton: {
    borderWidth: 1,
    borderColor: "#D3D7DF",
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 13,
    marginBottom: 6,
  },
  selectorButtonText: { color: "#1F2A37", fontWeight: "700", fontSize: 16 },
  voucherCard: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#E4E7EC",
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    padding: 11,
    gap: 6,
  },
  voucherItem: {
    borderWidth: 1,
    borderColor: "#F2D7CF",
    borderRadius: 12,
    backgroundColor: "#FFF7F4",
    padding: 11,
    marginBottom: 8,
  },
  voucherCode: { color: "#B42318", fontWeight: "800", fontSize: 15 },
  voucherMeta: { marginTop: 2, color: "#475467", fontSize: 13 },
  errorText: { marginTop: 8, color: "#DC2626", fontSize: 14 },
  successText: { marginTop: 8, color: "#047857", fontSize: 14 },
  primaryBtn: {
    marginTop: 14,
    borderRadius: 16,
    backgroundColor: "#E5B2A6",
    alignItems: "center",
    paddingVertical: 15,
  },
  primaryBtnText: { color: "#FFFFFF", fontWeight: "800", fontSize: 20 },
  footerHint: { marginTop: 6, color: "#8A8D94", fontSize: 13, lineHeight: 18 },
  disabled: { opacity: 0.65 },
});
