import { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { getMyBookings } from "../api/modules/bookingApi";
import { logout } from "../api/modules/authApi";
import { getServices } from "../api/modules/serviceApi";
import type { Booking } from "../types/booking";
import type { ServiceItem } from "../types/service";
import type { AuthUser } from "../types/auth";

interface CustomerHomeScreenProps {
  user: AuthUser;
  onLoggedOut: () => void;
}

export function CustomerHomeScreen({ user, onLoggedOut }: CustomerHomeScreenProps) {
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [error, setError] = useState("");

  const handleLoadServices = async () => {
    setError("");
    setLoadingServices(true);
    try {
      const response = await getServices({ page: 1, limit: 5, isActive: "true" });
      setServices(response.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Khong tai duoc services");
    } finally {
      setLoadingServices(false);
    }
  };

  const handleLoadBookings = async () => {
    setError("");
    setLoadingBookings(true);
    try {
      const result = await getMyBookings();
      setBookings(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Khong tai duoc bookings");
    } finally {
      setLoadingBookings(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    onLoggedOut();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.welcome}>Xin chao, {user.name}</Text>
      <Text style={styles.role}>Role: {user.role}</Text>

      <View style={styles.buttonRow}>
        <Pressable onPress={handleLoadServices} style={styles.primaryButton}>
          {loadingServices ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Lay Services</Text>
          )}
        </Pressable>

        <Pressable onPress={handleLoadBookings} style={styles.secondaryButton}>
          {loadingBookings ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Lay My Bookings</Text>
          )}
        </Pressable>
      </View>

      <Pressable onPress={handleLogout} style={styles.logoutButton}>
        <Text style={styles.logoutText}>Dang xuat</Text>
      </Pressable>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <Text style={styles.sectionTitle}>Services ({services.length})</Text>
      <FlatList
        data={services}
        keyExtractor={(item) => item._id}
        style={styles.list}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{item.name}</Text>
            <Text style={styles.cardMeta}>Gia: {item.price} | Thoi luong: {item.duration} phut</Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.emptyText}>Chua co du lieu service</Text>}
      />

      <Text style={styles.sectionTitle}>My Bookings ({bookings.length})</Text>
      <FlatList
        data={bookings}
        keyExtractor={(item) => item._id}
        style={styles.list}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{item.bookingNumber || item._id}</Text>
            <Text style={styles.cardMeta}>Status: {item.status} | Tong tien: {item.totalAmount}</Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.emptyText}>Chua co booking</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F1EC",
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  welcome: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
  },
  role: {
    marginTop: 4,
    marginBottom: 14,
    color: "#6B7280",
  },
  buttonRow: {
    flexDirection: "row",
    gap: 10,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: "#D87D4A",
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: "center",
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: "#0D9488",
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: "center",
  },
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  logoutButton: {
    marginTop: 10,
    backgroundColor: "#EF4444",
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  logoutText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  errorText: {
    marginTop: 10,
    color: "#B91C1C",
    fontSize: 13,
  },
  sectionTitle: {
    marginTop: 14,
    marginBottom: 8,
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  list: {
    maxHeight: 150,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  cardMeta: {
    marginTop: 3,
    fontSize: 12,
    color: "#6B7280",
  },
  emptyText: {
    color: "#6B7280",
    fontSize: 12,
    textAlign: "center",
    marginVertical: 8,
  },
});
