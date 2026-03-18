import { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Formik } from "formik";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
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
import { getMyPets } from "../../api/modules/petApi";
import { useAuth } from "../../context/AuthContext";
import type { BookingStackParamList } from "../../navigation/types";
import type { Pet } from "../../types/pet";
import { canUseCustomerFeatures } from "../../utils/role";

type Props = NativeStackScreenProps<BookingStackParamList, "BookingCheckout">;

const BookingSchema = Yup.object({
  appointmentDate: Yup.date()
    .min(new Date(Date.now() - 60 * 1000), "Khong duoc chon thoi gian trong qua khu")
    .required("Ngay gio hen la bat buoc"),
  petId: Yup.string().required("Vui long chon pet"),
  voucherCode: Yup.string().max(100),
});

export function BookingCheckoutScreen({ navigation }: Props) {
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  const [pets, setPets] = useState<Pet[]>([]);
  const [petsLoading, setPetsLoading] = useState(true);
  const [petsError, setPetsError] = useState("");
  const [showVoucherHint, setShowVoucherHint] = useState(false);
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
        setPetsError(error instanceof Error ? error.message : "Khong tai duoc danh sach pet");
      } finally {
        setPetsLoading(false);
      }
    };

    loadPets();
  }, [canAccess]);

  if (!canAccess) {
    return (
      <View style={[styles.wrapper, { justifyContent: "center", alignItems: "center", padding: 20 }]}>
        <Text style={styles.error}>Tinh nang dat lich chi danh cho tai khoan customer.</Text>
      </View>
    );
  }

  const initialDate = useMemo(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + (15 - (now.getMinutes() % 15 || 15)));
    now.setSeconds(0);
    now.setMilliseconds(0);
    return now;
  }, []);

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
        <Text style={styles.subtitle}>Dat lich voi quy tac backend hien tai (/api/bookings/checkout)</Text>

        <Formik
          initialValues={{ appointmentDate: initialDate, petId: "", voucherCode: "" }}
          validationSchema={BookingSchema}
          onSubmit={async (values, { setSubmitting, setStatus }) => {
            setStatus(undefined);
            try {
              const response = await checkoutBooking({
                appointmentDate: values.appointmentDate.toISOString(),
                petId: values.petId,
                voucherCode: values.voucherCode.trim() || undefined,
                paymentMethod: "cash",
              });

              navigation.navigate("BookingConfirmation", {
                bookingId: response.data.booking._id,
                message: response.message,
                totalAmount: response.data.totalAmount,
              });
            } catch (error) {
              setStatus(error instanceof Error ? error.message : "Dat lich that bai");
            } finally {
              setSubmitting(false);
            }
          }}
        >
          {({ values, errors, touched, setFieldValue, handleSubmit, isSubmitting, status }) => (
            <View style={styles.formCard}>
              <Text style={styles.label}>Ngay gio hen</Text>
              <Pressable
                style={styles.pickerButton}
                onPress={() => {
                  if (Platform.OS === "android") {
                    openAndroidDateTime(values.appointmentDate, (date) => setFieldValue("appointmentDate", date));
                    return;
                  }
                }}
              >
                <Text style={styles.pickerText}>{values.appointmentDate.toLocaleString()}</Text>
              </Pressable>
              {touched.appointmentDate && errors.appointmentDate ? (
                <Text style={styles.error}>{String(errors.appointmentDate)}</Text>
              ) : null}

              <Text style={styles.label}>Chon pet</Text>
              {petsLoading ? (
                <ActivityIndicator />
              ) : petsError ? (
                <Text style={styles.error}>{petsError}</Text>
              ) : pets.length === 0 ? (
                <Text style={styles.emptyText}>Ban chua co pet active</Text>
              ) : (
                <View style={styles.petList}>
                  {pets.map((pet) => {
                    const selected = values.petId === pet._id;
                    return (
                      <Pressable
                        key={pet._id}
                        accessibilityRole="button"
                        onPress={() => setFieldValue("petId", pet._id)}
                        style={[styles.petChip, selected && styles.petChipActive]}
                      >
                        <Text style={[styles.petChipText, selected && styles.petChipTextActive]}>{pet.petName}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}
              {touched.petId && errors.petId ? <Text style={styles.error}>{errors.petId}</Text> : null}

              <Text style={styles.label}>Voucher code (optional)</Text>
              <TextInput
                style={styles.input}
                value={values.voucherCode}
                onChangeText={(value) => setFieldValue("voucherCode", value)}
                placeholder="Nhap voucher code"
                autoCapitalize="characters"
                onBlur={() => setShowVoucherHint(true)}
              />
              {showVoucherHint ? (
                <Text style={styles.hint}>Voucher se duoc backend kiem tra khi ban submit booking.</Text>
              ) : null}

              {status ? <Text style={styles.error}>{String(status)}</Text> : null}

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Xac nhan dat lich"
                disabled={isSubmitting || petsLoading || pets.length === 0}
                onPress={() => handleSubmit()}
                style={[styles.submitButton, (isSubmitting || petsLoading || pets.length === 0) && styles.submitButtonDisabled]}
              >
                {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Xac nhan dat lich</Text>}
              </Pressable>
            </View>
          )}
        </Formik>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: "#F8FAFC" },
  container: { padding: 16, paddingBottom: 28 },
  containerWide: { alignSelf: "center", width: 620 },
  title: { fontSize: 24, fontWeight: "700", color: "#111827" },
  subtitle: { marginTop: 6, marginBottom: 16, color: "#6B7280" },
  formCard: { backgroundColor: "#fff", borderRadius: 12, borderWidth: 1, borderColor: "#E5E7EB", padding: 14 },
  label: { marginTop: 8, marginBottom: 6, color: "#374151", fontWeight: "600" },
  pickerButton: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: "#fff",
  },
  pickerText: { color: "#111827" },
  input: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#fff",
  },
  petList: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  petChip: { backgroundColor: "#E5E7EB", borderRadius: 999, paddingVertical: 8, paddingHorizontal: 12 },
  petChipActive: { backgroundColor: "#0D9488" },
  petChipText: { color: "#111827", fontWeight: "600" },
  petChipTextActive: { color: "#fff" },
  submitButton: {
    marginTop: 18,
    backgroundColor: "#2563EB",
    borderRadius: 10,
    alignItems: "center",
    paddingVertical: 12,
  },
  submitButtonDisabled: { opacity: 0.6 },
  submitText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  error: { marginTop: 6, color: "#DC2626", fontSize: 13 },
  hint: { marginTop: 6, color: "#6B7280", fontSize: 12 },
  emptyText: { color: "#6B7280" },
});
