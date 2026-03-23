import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { createGuestBooking, getAvailableSlots } from "../../api/modules/bookingApi";
import { getServices } from "../../api/modules/serviceApi";
import type { ServiceItem } from "../../types/service";

function buildSlotOptions() {
  const slots: string[] = [];
  for (let h = 8; h <= 17; h += 1) {
    for (const m of [0, 15, 30, 45]) {
      if (h === 17 && m > 30) continue;
      slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
  }
  return slots;
}

function toDateKey(date: Date) {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDateValue(date: Date) {
  return date.toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

function formatMoney(value: number) {
  return `${value.toLocaleString()} đ`;
}

function normalizeSlotKey(slot: string) {
  const raw = String(slot || "").trim();
  if (/^\d{1,2}:\d{2}/.test(raw)) {
    const [h, m] = raw.split(":");
    return `${String(Number(h)).padStart(2, "0")}:${m.slice(0, 2)}`;
  }
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
}

function prettifyOfflineError(message: string) {
  const raw = String(message || "");
  const match = raw.match(/at\s(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)/i);
  if (match) {
    const d = new Date(match[1]);
    const local = Number.isNaN(d.getTime())
      ? match[1]
      : d.toLocaleString([], { hour12: false, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
    return raw.replace(match[0], `at ${local}`);
  }
  return raw;
}

function isSameDay(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function getCalendarCells(monthDate: Date) {
  const firstDay = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const startWeekDay = firstDay.getDay();
  const gridStart = new Date(firstDay);
  gridStart.setDate(firstDay.getDate() - startWeekDay);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    return {
      date,
      inMonth: date.getMonth() === monthDate.getMonth(),
    };
  });
}

export function StaffOfflineOrderScreen() {
  const navigation = useNavigation<any>();
  const dateAnchorRef = useRef<View>(null);
  const { height: viewportHeight, width: viewportWidth } = useWindowDimensions();

  const slotOptions = useMemo(() => buildSlotOptions(), []);

  const [services, setServices] = useState<ServiceItem[]>([]);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [servicesError, setServicesError] = useState("");

  const [pickerVisible, setPickerVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [anchorFrame, setAnchorFrame] = useState<{ x: number; y: number; width: number; height: number } | null>(null);

  const [selectedTime, setSelectedTime] = useState("");
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [busySlots, setBusySlots] = useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState("");

  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [petName, setPetName] = useState("");
  const [petType, setPetType] = useState("Dog");
  const [notes, setNotes] = useState("");

  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState("");

  const calendarCells = useMemo(() => getCalendarCells(calendarMonth), [calendarMonth]);
  const useBottomSheetPicker = viewportHeight < 680 || !anchorFrame;
  const busySlotSet = useMemo(() => new Set(busySlots), [busySlots]);

  const serviceOptions = useMemo(
    () => services.filter((item) => item?._id).map((item) => ({
      id: item._id,
      name: item.name,
      price: Number(item.price || 0),
      isActive: item.isActive !== false,
    })),
    [services],
  );

  const selectedServices = useMemo(
    () => serviceOptions.filter((item) => selectedServiceIds.includes(item.id)),
    [serviceOptions, selectedServiceIds],
  );

  const summaryTotal = useMemo(
    () => selectedServices.reduce((sum, item) => sum + item.price, 0),
    [selectedServices],
  );

  const canCreate = Boolean(
    selectedDate &&
      selectedTime &&
      selectedServices.length > 0 &&
      guestName.trim() &&
      guestEmail.trim() &&
      guestPhone.trim() &&
      petName.trim() &&
      petType.trim() &&
      !submitLoading,
  );

  const calendarPopoverMetrics = useMemo(() => {
    const baseWidth = 286;

    if (!anchorFrame) {
      return {
        width: baseWidth,
        left: 16,
        top: 86,
      };
    }

    const width = Math.max(264, Math.min(304, Math.floor(anchorFrame.width + 34)));
    const left = Math.max(12, Math.min(anchorFrame.x, viewportWidth - width - 12));
    const belowTop = anchorFrame.y + anchorFrame.height + 6;
    const estimatedHeight = 318;
    const top = belowTop + estimatedHeight < viewportHeight - 16
      ? belowTop
      : Math.max(82, anchorFrame.y - estimatedHeight - 8);

    return { width, left, top };
  }, [anchorFrame, viewportHeight, viewportWidth]);

  const loadServices = useCallback(async () => {
    setServicesLoading(true);
    setServicesError("");

    try {
      const result = await getServices({ sortBy: "name", sortOrder: "asc", isActive: "true" });
      setServices(result.data || []);
    } catch (error) {
      setServicesError(error instanceof Error ? error.message : "Unable to load services");
    } finally {
      setServicesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadServices();
  }, [loadServices]);

  const loadBusySlots = useCallback(async () => {
    if (!selectedDate || selectedServiceIds.length === 0) {
      setBusySlots([]);
      setSlotsError("");
      return;
    }

    setSlotsLoading(true);
    setSlotsError("");

    try {
      const date = toDateKey(selectedDate);
      const results = await Promise.all(
        selectedServiceIds.map((serviceId) => getAvailableSlots({ date, serviceId })),
      );

      const disabled = new Set<string>();
      results.forEach((item) => {
        [...(item.disabledSlots || []), ...(item.serviceDisabledSlots || []), ...(item.petConflictSlots || [])]
          .map(normalizeSlotKey)
          .forEach((slot) => {
            if (slot) disabled.add(slot);
          });
      });

      setBusySlots(Array.from(disabled));
    } catch (error) {
      setSlotsError(error instanceof Error ? error.message : "Unable to check available slots");
    } finally {
      setSlotsLoading(false);
    }
  }, [selectedDate, selectedServiceIds]);

  useEffect(() => {
    loadBusySlots();
  }, [loadBusySlots]);

  useEffect(() => {
    if (selectedTime && busySlotSet.has(selectedTime)) {
      setSelectedTime("");
    }
  }, [busySlotSet, selectedTime]);

  const openPicker = useCallback(() => {
    setCalendarMonth(selectedDate || new Date());
    setPickerVisible(true);
    dateAnchorRef.current?.measureInWindow((x, y, width, height) => {
      setAnchorFrame({ x, y, width, height });
    });
  }, [selectedDate]);

  const closePicker = useCallback(() => {
    setPickerVisible(false);
  }, []);

  const jumpCalendarMonth = useCallback((offset: number) => {
    setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
  }, []);

  const selectDate = useCallback((date: Date) => {
    setSelectedDate(date);
    setSelectedTime("");
    setPickerVisible(false);
  }, []);

  const toggleService = useCallback((id: string) => {
    setSelectedServiceIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id);
      }
      return [...prev, id];
    });
  }, []);

  const submitOrder = useCallback(async () => {
    if (!canCreate || !selectedDate) return;

    setSubmitError("");
    setSubmitSuccess("");
    setSubmitLoading(true);

    try {
      await createGuestBooking({
        guestInfo: {
          name: guestName.trim(),
          email: guestEmail.trim(),
          phone: guestPhone.trim(),
        },
        guestPet: {
          petName: petName.trim(),
          petType: petType.trim(),
        },
        items: selectedServiceIds.map((serviceId) => ({
          serviceId,
          quantity: 1,
        })),
        bookingDate: toDateKey(selectedDate),
        bookingTime: selectedTime,
        notes: notes.trim(),
        paymentMethod: "cash",
      });

      setSubmitSuccess("Offline order created successfully.");
      navigation.navigate("StaffBookings", {
        refreshAt: Date.now(),
        toastMessage: "Offline order created successfully.",
      });
    } catch (error) {
      const raw = error instanceof Error ? error.message : "Unable to create offline order";
      setSubmitError(prettifyOfflineError(raw));
      if (/full|conflict|slot/i.test(raw)) {
        setSelectedTime("");
      }
      loadBusySlots();
    } finally {
      setSubmitLoading(false);
    }
  }, [
    canCreate,
    guestEmail,
    guestName,
    guestPhone,
    navigation,
    notes,
    petName,
    petType,
    selectedDate,
    selectedServiceIds,
    selectedTime,
    loadBusySlots,
  ]);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
            <Feather name="chevron-left" size={20} color="#314761" />
          </Pressable>
          <View style={styles.headerTexts}>
            <Text style={styles.title}>Create Offline Order</Text>
            <Text style={styles.subtitle}>Register walk-in bookings and sync instantly with bookings board.</Text>
          </View>
        </View>

        {submitError ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{submitError}</Text>
          </View>
        ) : null}

        {submitSuccess ? (
          <View style={styles.successBanner}>
            <Text style={styles.successBannerText}>{submitSuccess}</Text>
          </View>
        ) : null}

        <View style={styles.sectionCard}>
          <Text style={styles.sectionLabel}>Select Date</Text>
          <View ref={dateAnchorRef} collapsable={false}>
            <Pressable
              style={[styles.dateField, selectedDate && styles.dateFieldSelected]}
              onPress={() => (pickerVisible ? closePicker() : openPicker())}
            >
              <View style={styles.dateFieldLeft}>
                <Feather name="calendar" size={17} color={selectedDate ? "#C06835" : "#8D99A9"} />
                <Text style={[styles.dateFieldText, selectedDate && styles.dateFieldTextSelected]}>
                  {selectedDate ? formatDateValue(selectedDate) : "Select booking date"}
                </Text>
              </View>
              <Feather name="chevron-down" size={17} color="#8D99A9" />
            </Pressable>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderInline}>
            <Text style={styles.sectionLabel}>Select Time</Text>
            <Text style={styles.sectionHint}>Every 15 minutes</Text>
          </View>

          {selectedDate ? (
            <View style={styles.timeGrid}>
              {slotOptions.map((slot) => {
                const active = selectedTime === slot;
                const disabled = busySlotSet.has(slot);
                return (
                  <Pressable
                    key={slot}
                    style={[styles.timeChip, active && styles.timeChipActive, disabled && styles.timeChipDisabled]}
                    onPress={() => {
                      if (disabled) return;
                      setSelectedTime(slot);
                    }}
                    disabled={disabled}
                  >
                    <Text style={[styles.timeChipText, active && styles.timeChipTextActive, disabled && styles.timeChipTextDisabled]}>{slot}</Text>
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Feather name="clock" size={15} color="#A7B2C2" />
              <Text style={styles.emptyStateText}>Pick a date first to load available time slots.</Text>
            </View>
          )}

          {slotsLoading ? (
            <View style={styles.loadingRowCompact}>
              <ActivityIndicator size="small" color="#D77D46" />
              <Text style={styles.loadingCompactText}>Checking slot availability...</Text>
            </View>
          ) : null}

          {slotsError ? (
            <Text style={styles.slotErrorText}>{prettifyOfflineError(slotsError)}</Text>
          ) : null}
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionLabel}>Customer Information</Text>
          <View style={styles.inputGrid}>
            <TextInput
              style={styles.inputField}
              placeholder="Customer name"
              placeholderTextColor="#97A4B5"
              value={guestName}
              onChangeText={setGuestName}
            />
            <TextInput
              style={styles.inputField}
              placeholder="Customer email"
              placeholderTextColor="#97A4B5"
              keyboardType="email-address"
              autoCapitalize="none"
              value={guestEmail}
              onChangeText={setGuestEmail}
            />
            <TextInput
              style={styles.inputField}
              placeholder="Customer phone"
              placeholderTextColor="#97A4B5"
              keyboardType="phone-pad"
              value={guestPhone}
              onChangeText={setGuestPhone}
            />
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionLabel}>Pet Information</Text>
          <View style={styles.inputGrid}>
            <TextInput
              style={styles.inputField}
              placeholder="Pet name"
              placeholderTextColor="#97A4B5"
              value={petName}
              onChangeText={setPetName}
            />
            <TextInput
              style={styles.inputField}
              placeholder="Pet type (Dog, Cat...)"
              placeholderTextColor="#97A4B5"
              value={petType}
              onChangeText={setPetType}
            />
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionLabel}>Select Services</Text>

          {servicesLoading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color="#D77D46" />
              <Text style={styles.loadingText}>Loading services...</Text>
            </View>
          ) : null}

          {servicesError ? (
            <View style={styles.errorInline}>
              <Text style={styles.errorInlineText}>{servicesError}</Text>
              <Pressable style={styles.retryBtn} onPress={loadServices}>
                <Text style={styles.retryBtnText}>Retry</Text>
              </Pressable>
            </View>
          ) : null}

          <View style={styles.servicesWrap}>
            {serviceOptions.map((service) => {
              const active = selectedServiceIds.includes(service.id);
              return (
                <Pressable
                  key={service.id}
                  style={[styles.serviceChip, active && styles.serviceChipActive]}
                  onPress={() => toggleService(service.id)}
                >
                  <Text style={[styles.serviceChipLabel, active && styles.serviceChipLabelActive]} numberOfLines={1}>
                    {service.name}
                  </Text>
                  <Text style={[styles.serviceChipPrice, active && styles.serviceChipPriceActive]}>{formatMoney(service.price)}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionLabel}>Notes</Text>
          <TextInput
            style={styles.notesInput}
            placeholder="Add booking notes for staff handling..."
            placeholderTextColor="#97A4B5"
            multiline
            value={notes}
            onChangeText={setNotes}
          />
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Order Summary</Text>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Date</Text>
            <Text style={styles.summaryValue}>{selectedDate ? formatDateValue(selectedDate) : "Not selected"}</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Time</Text>
            <Text style={styles.summaryValue}>{selectedTime || "Not selected"}</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Services</Text>
            <Text style={styles.summaryValue}>{selectedServices.length} selected</Text>
          </View>

          <View style={styles.summaryTotalRow}>
            <Text style={styles.summaryTotalLabel}>Estimated Total</Text>
            <Text style={styles.summaryTotalValue}>{formatMoney(summaryTotal)}</Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footerBar}>
        <Pressable style={[styles.createButton, !canCreate && styles.createButtonDisabled]} disabled={!canCreate} onPress={submitOrder}>
          {submitLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Feather name="check-circle" size={16} color="#FFFFFF" />
              <Text style={styles.createButtonText}>Create Order</Text>
            </>
          )}
        </Pressable>
      </View>

      <Modal visible={pickerVisible} transparent animationType="fade" onRequestClose={closePicker}>
        {useBottomSheetPicker ? (
          <View style={styles.pickerOverlayBottom}>
            <Pressable style={StyleSheet.absoluteFillObject} onPress={closePicker} />

            <View style={styles.pickerBottomSheet}>
              <View style={styles.pickerHandle} />
              <View style={styles.calendarPanel}>
                <View style={styles.calendarHeaderRow}>
                  <Text style={styles.calendarMonthTitle}>
                    {calendarMonth.toLocaleDateString([], { month: "long", year: "numeric" })}
                  </Text>

                  <View style={styles.calendarNavWrap}>
                    <Pressable style={styles.calendarNavBtn} onPress={() => jumpCalendarMonth(-1)}>
                      <Feather name="chevron-left" size={15} color="#7C889A" />
                    </Pressable>
                    <Pressable style={styles.calendarNavBtn} onPress={() => jumpCalendarMonth(1)}>
                      <Feather name="chevron-right" size={15} color="#7C889A" />
                    </Pressable>
                  </View>
                </View>

                <View style={styles.calendarWeekRow}>
                  {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => (
                    <Text key={`${day}-${index}`} style={styles.calendarWeekText}>{day}</Text>
                  ))}
                </View>

                <View style={styles.calendarGrid}>
                  {calendarCells.map((cell) => {
                    const active = selectedDate ? isSameDay(cell.date, selectedDate) : false;
                    const isToday = isSameDay(cell.date, new Date());

                    return (
                      <Pressable
                        key={cell.date.toISOString()}
                        style={[
                          styles.calendarDayCell,
                          active && styles.calendarDayCellActive,
                          isToday && !active && styles.calendarDayCellToday,
                        ]}
                        onPress={() => selectDate(cell.date)}
                      >
                        <Text
                          style={[
                            styles.calendarDayText,
                            !cell.inMonth && styles.calendarDayTextMuted,
                            active && styles.calendarDayTextActive,
                            isToday && !active && styles.calendarDayTextToday,
                          ]}
                        >
                          {cell.date.getDate()}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <View style={styles.calendarFooterRow}>
                  {selectedDate ? (
                    <Pressable
                      style={styles.calendarTextBtn}
                      onPress={() => {
                        setSelectedDate(null);
                        setSelectedTime("");
                        setPickerVisible(false);
                      }}
                    >
                      <Text style={styles.calendarTextBtnLabel}>Clear</Text>
                    </Pressable>
                  ) : <View />}

                  <Pressable style={styles.calendarTextBtn} onPress={closePicker}>
                    <Text style={styles.calendarTextBtnLabel}>Done</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.pickerOverlayPopover}>
            <Pressable style={StyleSheet.absoluteFillObject} onPress={closePicker} />

            <View
              style={[
                styles.pickerPopover,
                {
                  top: calendarPopoverMetrics.top,
                  left: calendarPopoverMetrics.left,
                  width: calendarPopoverMetrics.width,
                },
              ]}
            >
              <View style={styles.calendarPanel}>
                <View style={styles.calendarHeaderRow}>
                  <Text style={styles.calendarMonthTitle}>
                    {calendarMonth.toLocaleDateString([], { month: "long", year: "numeric" })}
                  </Text>

                  <View style={styles.calendarNavWrap}>
                    <Pressable style={styles.calendarNavBtn} onPress={() => jumpCalendarMonth(-1)}>
                      <Feather name="chevron-left" size={15} color="#7C889A" />
                    </Pressable>
                    <Pressable style={styles.calendarNavBtn} onPress={() => jumpCalendarMonth(1)}>
                      <Feather name="chevron-right" size={15} color="#7C889A" />
                    </Pressable>
                  </View>
                </View>

                <View style={styles.calendarWeekRow}>
                  {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => (
                    <Text key={`${day}-${index}`} style={styles.calendarWeekText}>{day}</Text>
                  ))}
                </View>

                <View style={styles.calendarGrid}>
                  {calendarCells.map((cell) => {
                    const active = selectedDate ? isSameDay(cell.date, selectedDate) : false;
                    const isToday = isSameDay(cell.date, new Date());

                    return (
                      <Pressable
                        key={cell.date.toISOString()}
                        style={[
                          styles.calendarDayCell,
                          active && styles.calendarDayCellActive,
                          isToday && !active && styles.calendarDayCellToday,
                        ]}
                        onPress={() => selectDate(cell.date)}
                      >
                        <Text
                          style={[
                            styles.calendarDayText,
                            !cell.inMonth && styles.calendarDayTextMuted,
                            active && styles.calendarDayTextActive,
                            isToday && !active && styles.calendarDayTextToday,
                          ]}
                        >
                          {cell.date.getDate()}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <View style={styles.calendarFooterRow}>
                  {selectedDate ? (
                    <Pressable
                      style={styles.calendarTextBtn}
                      onPress={() => {
                        setSelectedDate(null);
                        setSelectedTime("");
                        setPickerVisible(false);
                      }}
                    >
                      <Text style={styles.calendarTextBtnLabel}>Clear</Text>
                    </Pressable>
                  ) : <View />}

                  <Pressable style={styles.calendarTextBtn} onPress={closePicker}>
                    <Text style={styles.calendarTextBtnLabel}>Close</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </View>
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FCF8F2",
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 92,
    gap: 12,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9,
  },
  backButton: {
    width: 34,
    height: 34,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: "#EFE2D4",
    backgroundColor: "#FFFCF7",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTexts: {
    flex: 1,
  },
  title: {
    color: "#24374D",
    fontSize: 35,
    lineHeight: 39,
    fontWeight: "900",
  },
  subtitle: {
    marginTop: 3,
    color: "#74869C",
    fontSize: 13,
    lineHeight: 18,
  },
  errorBanner: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#F4C8CF",
    backgroundColor: "#FDF0F3",
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  errorBannerText: {
    color: "#B43B4A",
    fontSize: 13,
    fontWeight: "700",
  },
  successBanner: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#CFE8D7",
    backgroundColor: "#EEF8F1",
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  successBannerText: {
    color: "#2C7F4A",
    fontSize: 13,
    fontWeight: "700",
  },
  sectionCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#EEE1D2",
    backgroundColor: "#FFFEFB",
    padding: 12,
    gap: 8,
  },
  sectionLabel: {
    color: "#24374D",
    fontSize: 15,
    fontWeight: "800",
  },
  sectionHeaderInline: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionHint: {
    color: "#9AA6B5",
    fontSize: 12,
    fontWeight: "600",
  },
  dateField: {
    minHeight: 46,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#E8DDCF",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dateFieldSelected: {
    borderColor: "#EACCB4",
    backgroundColor: "#FFF5EA",
  },
  dateFieldLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    flex: 1,
  },
  dateFieldText: {
    color: "#8A96A7",
    fontSize: 14,
    fontWeight: "600",
  },
  dateFieldTextSelected: {
    color: "#C06935",
    fontWeight: "700",
  },
  timeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  timeChip: {
    width: "23%",
    minHeight: 34,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E8DECF",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  timeChipActive: {
    borderColor: "#E7B58E",
    backgroundColor: "#E48A4E",
  },
  timeChipDisabled: {
    backgroundColor: "#F2F0EC",
    borderColor: "#E7E2DB",
  },
  timeChipText: {
    color: "#67788F",
    fontSize: 13,
    fontWeight: "700",
  },
  timeChipTextActive: {
    color: "#FFFFFF",
  },
  timeChipTextDisabled: {
    color: "#A8B1BC",
  },
  emptyState: {
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#EFE3D6",
    backgroundColor: "#FFF9F2",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 10,
  },
  emptyStateText: {
    color: "#7F8EA2",
    fontSize: 12,
    flex: 1,
  },
  inputGrid: {
    gap: 8,
  },
  inputField: {
    minHeight: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E8DECF",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 10,
    color: "#2F435A",
    fontSize: 14,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  loadingRowCompact: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  loadingText: {
    color: "#75859A",
    fontSize: 13,
  },
  loadingCompactText: {
    color: "#76879C",
    fontSize: 12,
  },
  slotErrorText: {
    marginTop: 7,
    color: "#B14856",
    fontSize: 12,
    lineHeight: 16,
  },
  errorInline: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  errorInlineText: {
    color: "#B14856",
    fontSize: 12,
    flex: 1,
  },
  retryBtn: {
    minHeight: 28,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "#E7D8C9",
    backgroundColor: "#FFF5EA",
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  retryBtnText: {
    color: "#BA6735",
    fontSize: 12,
    fontWeight: "700",
  },
  servicesWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  serviceChip: {
    minWidth: "48%",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E8DECF",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 2,
  },
  serviceChipActive: {
    borderColor: "#E5C3A7",
    backgroundColor: "#FFF3E7",
  },
  serviceChipLabel: {
    color: "#435974",
    fontSize: 13,
    fontWeight: "700",
  },
  serviceChipLabelActive: {
    color: "#B66532",
  },
  serviceChipPrice: {
    color: "#8B97A8",
    fontSize: 12,
    fontWeight: "600",
  },
  serviceChipPriceActive: {
    color: "#C26A35",
  },
  notesInput: {
    minHeight: 80,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E8DECF",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 10,
    paddingVertical: 10,
    color: "#2F435A",
    fontSize: 14,
    textAlignVertical: "top",
  },
  summaryCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#EDDCCB",
    backgroundColor: "#FFF7EE",
    padding: 12,
    gap: 8,
  },
  summaryTitle: {
    color: "#24374D",
    fontSize: 15,
    fontWeight: "800",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  summaryLabel: {
    color: "#7B8797",
    fontSize: 13,
    fontWeight: "600",
  },
  summaryValue: {
    color: "#30465D",
    fontSize: 13,
    fontWeight: "700",
  },
  summaryTotalRow: {
    borderTopWidth: 1,
    borderTopColor: "#F0DFCF",
    paddingTop: 8,
    marginTop: 2,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryTotalLabel: {
    color: "#7B8797",
    fontSize: 13,
    fontWeight: "700",
  },
  summaryTotalValue: {
    color: "#C26B35",
    fontSize: 21,
    fontWeight: "900",
  },
  footerBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#EFE1D2",
    backgroundColor: "#FFFCF8",
  },
  createButton: {
    minHeight: 46,
    borderRadius: 14,
    backgroundColor: "#D77D46",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  createButtonDisabled: {
    backgroundColor: "#CFB7A3",
  },
  createButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  pickerOverlayBottom: {
    flex: 1,
    backgroundColor: "rgba(20, 31, 49, 0.14)",
    justifyContent: "flex-end",
  },
  pickerBottomSheet: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: "#E8DACA",
    backgroundColor: "#FFFDF9",
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 12,
  },
  pickerHandle: {
    width: 42,
    height: 4,
    borderRadius: 999,
    backgroundColor: "#E8DCCD",
    alignSelf: "center",
    marginBottom: 8,
  },
  pickerOverlayPopover: {
    flex: 1,
    backgroundColor: "rgba(20, 31, 49, 0.08)",
  },
  pickerPopover: {
    position: "absolute",
    borderRadius: 13,
    overflow: "hidden",
  },
  calendarPanel: {
    width: "100%",
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#ECDFD2",
    backgroundColor: "#FFFEFB",
    paddingHorizontal: 9,
    paddingTop: 8,
    paddingBottom: 7,
    shadowColor: "#5E4A39",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  calendarHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  calendarMonthTitle: {
    color: "#3D536E",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "capitalize",
  },
  calendarNavWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  calendarNavBtn: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: "#ECE0D4",
    backgroundColor: "#FFF9F2",
    alignItems: "center",
    justifyContent: "center",
  },
  calendarWeekRow: {
    flexDirection: "row",
    marginBottom: 3,
  },
  calendarWeekText: {
    width: `${100 / 7}%`,
    textAlign: "center",
    color: "#9AA6B5",
    fontSize: 10,
    fontWeight: "700",
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  calendarDayCell: {
    width: `${100 / 7}%`,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
  },
  calendarDayCellToday: {
    borderWidth: 1,
    borderColor: "#E7D3C2",
    backgroundColor: "#FFF6EC",
  },
  calendarDayCellActive: {
    borderWidth: 1,
    borderColor: "#E2BFA3",
    backgroundColor: "#F4D9C3",
  },
  calendarDayText: {
    color: "#415773",
    fontSize: 12,
    fontWeight: "700",
  },
  calendarDayTextMuted: {
    color: "#C7CED8",
    opacity: 0.42,
  },
  calendarDayTextToday: {
    color: "#C16936",
  },
  calendarDayTextActive: {
    color: "#8E4E2A",
  },
  calendarFooterRow: {
    marginTop: 4,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  calendarTextBtn: {
    minHeight: 26,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#EEE2D6",
    paddingHorizontal: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFAF4",
  },
  calendarTextBtnLabel: {
    color: "#6F8094",
    fontSize: 10,
    fontWeight: "700",
  },
});
