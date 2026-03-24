import DateTimePicker, { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Formik } from "formik";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import * as Yup from "yup";
import { checkoutBooking } from "../../api/modules/bookingApi";
import { PetPickerModal } from "../../components/PetPickerModal";
import { getMyPets } from "../../api/modules/petApi";
import { formatVoucherPreview, getAvailableVouchers } from "../../api/modules/voucherApi";
import { useAuth } from "../../context/AuthContext";
import type { BookingStackParamList } from "../../navigation/types";
import type { Pet } from "../../types/pet";
import type { AvailableVoucher } from "../../types/voucher";
import { formatVnd } from "../../utils/currency";
import { canUseCustomerFeatures } from "../../utils/role";

type Props = NativeStackScreenProps<BookingStackParamList, "BookingCheckout">;

const BookingSchema = Yup.object({
  appointmentDate: Yup.date()
    .min(new Date(Date.now() - 60 * 1000), "Past time is not allowed")
    .required("Appointment date and time is required"),
  petId: Yup.string().required("Please select a pet"),
  voucherCode: Yup.string().max(100),
});

function alignToNext15Minutes(inputDate: Date) {
  const nextSlot = new Date(inputDate);
  nextSlot.setSeconds(0, 0);
  const remainder = nextSlot.getMinutes() % 15;
  const offset = remainder === 0 ? 0 : 15 - remainder;
  nextSlot.setMinutes(nextSlot.getMinutes() + offset);
  return nextSlot;
}

export function BookingCheckoutScreen({ navigation }: Props) {
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  const [pets, setPets] = useState<Pet[]>([]);
  const [petsLoading, setPetsLoading] = useState(true);
  const [petsError, setPetsError] = useState("");
  const [showVoucherHint, setShowVoucherHint] = useState(false);
  const [petPickerVisible, setPetPickerVisible] = useState(false);
  const [showIosDateTimePicker, setShowIosDateTimePicker] = useState(false);
  const [voucherPickerVisible, setVoucherPickerVisible] = useState(false);
  const [vouchers, setVouchers] = useState<AvailableVoucher[]>([]);
  const [voucherLoading, setVoucherLoading] = useState(false);
  const canAccess = canUseCustomerFeatures(user?.role);

  useEffect(() => {
    if (!canAccess) {
      setPetsLoading(false);
      return;
    }

    const loadPets = async () => {
      setPetsLoading(true);
      setPetsError("");
      try {
        const petList = await getMyPets("true");
        setPets(petList.filter((pet) => pet.isActive !== false));
      } catch (error) {
        setPetsError(error instanceof Error ? error.message : "Unable to load pet list");
      } finally {
        setPetsLoading(false);
      }
    };

    loadPets();
  }, [canAccess]);

  useEffect(() => {
    if (!canAccess) return;

    const loadVouchers = async () => {
      setVoucherLoading(true);
      try {
        const items = await getAvailableVouchers({ page: 1, limit: 30 });
        setVouchers(items);
      } catch {
        setVouchers([]);
      } finally {
        setVoucherLoading(false);
      }
    };

    loadVouchers();
  }, [canAccess]);

  const initialDate = useMemo(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + (15 - (now.getMinutes() % 15 || 15)));
    now.setSeconds(0);
    now.setMilliseconds(0);
    return now;
  }, []);

  if (!canAccess) {
    return (
      <View style={[styles.wrapper, { justifyContent: "center", alignItems: "center", padding: 20 }]}>
        <Text style={styles.error}>Booking is only available for customer accounts.</Text>
      </View>
    );
  }

  const openAndroidDateTime = (currentValue: Date, onSelected: (date: Date) => void) => {
    DateTimePickerAndroid.open({
      value: currentValue,
      mode: "date",
      minimumDate: new Date(),
      is24Hour: true,
      onChange: (dateEvent, selectedDate) => {
        if (dateEvent.type !== "set" || !selectedDate) {
          return;
        }

        const merged = new Date(selectedDate);
        merged.setHours(currentValue.getHours(), currentValue.getMinutes(), 0, 0);

        DateTimePickerAndroid.open({
          value: merged,
          mode: "time",
          is24Hour: true,
          onChange: (timeEvent, selectedTime) => {
            if (timeEvent.type !== "set" || !selectedTime) {
              return;
            }

            const finalDate = new Date(merged);
            finalDate.setHours(selectedTime.getHours(), selectedTime.getMinutes(), 0, 0);
            onSelected(finalDate);
          },
        });
      },
    });
  };

  return (
    <KeyboardAvoidingView style={styles.wrapper} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={[styles.container, width > 700 && styles.containerWide]} keyboardShouldPersistTaps="handled">
        <Text accessibilityRole="header" style={styles.title}>Booking Checkout</Text>
        <Text style={styles.subtitle}>Book with current backend rules (/api/bookings/checkout)</Text>

        <Formik
          initialValues={{ appointmentDate: initialDate, petId: "", voucherCode: "", notes: "" }}
          validationSchema={BookingSchema}
          onSubmit={async (values, { setSubmitting, setStatus }) => {
            setStatus(undefined);
            try {
              const normalizedDate = alignToNext15Minutes(values.appointmentDate);
              if (normalizedDate.getTime() < Date.now() - 60 * 1000) {
                setStatus("Invalid appointment date or time");
                setSubmitting(false);
                return;
              }

              const response = await checkoutBooking({
                appointmentDate: normalizedDate.toISOString(),
                petId: values.petId,
                voucherCode: values.voucherCode.trim() || undefined,
                notes: values.notes.trim() || undefined,
              });

              navigation.navigate("BookingConfirmation", {
                bookingId: response.data.booking._id,
                message: response.message,
                totalAmount: response.data.totalAmount,
              });
            } catch (error) {
              setStatus(error instanceof Error ? error.message : "Booking failed");
            } finally {
              setSubmitting(false);
            }
          }}
        >
          {({ values, errors, touched, setFieldValue, handleSubmit, isSubmitting, status }) => (
            <View style={styles.formCard}>
              <Text style={styles.label}>Appointment date and time</Text>
              <Pressable
                style={styles.pickerButton}
                onPress={() => {
                  if (Platform.OS === "android") {
                    openAndroidDateTime(values.appointmentDate, (date) => setFieldValue("appointmentDate", date));
                    return;
                  }

                  setShowIosDateTimePicker((current) => !current);
                }}
              >
                <Text style={styles.pickerText}>{values.appointmentDate.toLocaleString()}</Text>
              </Pressable>
              {Platform.OS === "ios" && showIosDateTimePicker ? (
                <View style={styles.iosPickerWrap}>
                  <DateTimePicker
                    value={values.appointmentDate}
                    mode="datetime"
                    minimumDate={new Date()}
                    onChange={(_, selectedDate) => {
                      if (!selectedDate) return;
                      setFieldValue("appointmentDate", selectedDate);
                    }}
                  />
                  <Pressable style={styles.iosDoneButton} onPress={() => setShowIosDateTimePicker(false)}>
                    <Text style={styles.iosDoneButtonText}>Done</Text>
                  </Pressable>
                </View>
              ) : null}
              {touched.appointmentDate && errors.appointmentDate ? (
                <Text style={styles.error}>{String(errors.appointmentDate)}</Text>
              ) : null}

              <Text style={styles.label}>Choose Pet</Text>
              {petsLoading ? (
                <ActivityIndicator />
              ) : petsError ? (
                <Text style={styles.error}>{petsError}</Text>
              ) : pets.length === 0 ? (
                <Text style={styles.emptyText}>You do not have any active pets.</Text>
              ) : (
                <Pressable style={styles.petSelectorButton} onPress={() => setPetPickerVisible(true)}>
                  <Text style={styles.petSelectorButtonText}>
                    {pets.find((pet) => pet._id === values.petId)?.petName || "Choose pet"}
                  </Text>
                </Pressable>
              )}
              {touched.petId && errors.petId ? <Text style={styles.error}>{errors.petId}</Text> : null}

              <PetPickerModal
                visible={petPickerVisible}
                pets={pets}
                selectedPetId={values.petId}
                title="Choose a pet for booking"
                onAddNewPet={() => {
                  setPetPickerVisible(false);
                  navigation.getParent()?.navigate("AccountTab", { screen: "MyPets" });
                }}
                onManagePets={() => {
                  setPetPickerVisible(false);
                  navigation.getParent()?.navigate("AccountTab", { screen: "MyPets" });
                }}
                onClose={() => setPetPickerVisible(false)}
                onSelect={(petId) => {
                  setFieldValue("petId", petId);
                  setPetPickerVisible(false);
                }}
              />

              <Text style={styles.label}>Voucher code (optional)</Text>
              <TextInput
                style={styles.input}
                value={values.voucherCode}
                onChangeText={(value) => setFieldValue("voucherCode", value)}
                placeholder="Enter voucher code"
                autoCapitalize="characters"
                onBlur={() => setShowVoucherHint(true)}
              />
              <Pressable style={styles.petSelectorButton} onPress={() => setVoucherPickerVisible((prev) => !prev)}>
                <Text style={styles.petSelectorButtonText}>
                  {values.voucherCode ? `Voucher: ${values.voucherCode}` : "Choose a voucher from the list"}
                </Text>
              </Pressable>

              {voucherPickerVisible ? (
                <View style={styles.voucherCard}>
                  {voucherLoading ? (
                    <ActivityIndicator />
                  ) : vouchers.length === 0 ? (
                    <Text style={styles.emptyText}>No available vouchers</Text>
                  ) : (
                    <FlatList
                      data={vouchers}
                      keyExtractor={(item, index) => `${item._id}-${index}`}
                      style={styles.voucherList}
                      renderItem={({ item }) => (
                        <Pressable
                          style={styles.voucherItem}
                          onPress={() => {
                            setFieldValue("voucherCode", item.code);
                            setVoucherPickerVisible(false);
                          }}
                        >
                          <Text style={styles.voucherCode}>{item.code}</Text>
                          <Text style={styles.voucherMeta}>{formatVoucherPreview(item)}</Text>
                          <Text style={styles.voucherMeta}>Min spend: {formatVnd(item.minSpend || 0)}</Text>
                          <Text style={styles.voucherMeta}>Expires: {new Date(item.validUntil).toLocaleDateString()}</Text>
                        </Pressable>
                      )}
                    />
                  )}
                </View>
              ) : null}
              {showVoucherHint ? (
                <Text style={styles.hint}>The voucher will be validated by the backend when you submit the booking.</Text>
              ) : null}

              <Text style={styles.label}>Notes (optional)</Text>
              <TextInput
                style={[styles.input, styles.multilineInput]}
                value={values.notes}
                onChangeText={(value) => setFieldValue("notes", value)}
                placeholder="Enter booking notes"
                multiline
                numberOfLines={3}
              />

              {status ? <Text style={styles.error}>{String(status)}</Text> : null}

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Confirm booking"
                disabled={isSubmitting || petsLoading || pets.length === 0}
                onPress={() => handleSubmit()}
                style={[styles.submitButton, (isSubmitting || petsLoading || pets.length === 0) && styles.submitButtonDisabled]}
              >
                {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Confirm booking</Text>}
              </Pressable>
            </View>
          )}
        </Formik>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: "#F4F1EC" },
  container: { padding: 16, paddingBottom: 28 },
  containerWide: { alignSelf: "center", width: 620 },
  title: { fontSize: 26, fontWeight: "800", color: "#2F3742" },
  subtitle: { marginTop: 6, marginBottom: 16, color: "#8395B2" },
  formCard: { backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: "#E7DED1", padding: 16 },
  label: { marginTop: 8, marginBottom: 6, color: "#4D5E78", fontWeight: "700" },
  pickerButton: {
    borderWidth: 1,
    borderColor: "#E3E5E9",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: "#fff",
  },
  pickerText: { color: "#2F3742" },
  input: {
    borderWidth: 1,
    borderColor: "#E3E5E9",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#fff",
  },
  multilineInput: { minHeight: 84, textAlignVertical: "top" },
  petSelectorButton: {
    borderWidth: 1,
    borderColor: "#E3E5E9",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: "#fff",
  },
  petSelectorButtonText: { color: "#2F3742", fontWeight: "700" },
  voucherCard: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#E7DED1",
    borderRadius: 12,
    backgroundColor: "#fff",
    padding: 8,
  },
  voucherList: { maxHeight: 220 },
  voucherItem: {
    borderWidth: 1,
    borderColor: "#F2C9BC",
    borderRadius: 12,
    backgroundColor: "#FFF4EF",
    padding: 10,
    marginBottom: 8,
  },
  voucherCode: { color: "#C96F42", fontWeight: "800" },
  voucherMeta: { marginTop: 2, color: "#4D5E78", fontSize: 12 },
  iosPickerWrap: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#E7DED1",
    borderRadius: 12,
    backgroundColor: "#fff",
    padding: 8,
  },
  iosDoneButton: {
    alignSelf: "flex-end",
    marginTop: 4,
    borderRadius: 10,
    backgroundColor: "#F8F8F7",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  iosDoneButtonText: { color: "#4D5E78", fontWeight: "700" },
  submitButton: {
    marginTop: 18,
    backgroundColor: "#D87D4A",
    borderRadius: 14,
    alignItems: "center",
    paddingVertical: 13,
  },
  submitButtonDisabled: { opacity: 0.6 },
  submitText: { color: "#fff", fontSize: 16, fontWeight: "800" },
  error: { marginTop: 6, color: "#DC2626", fontSize: 13 },
  hint: { marginTop: 6, color: "#8395B2", fontSize: 12 },
  emptyText: { color: "#8395B2" },
});
