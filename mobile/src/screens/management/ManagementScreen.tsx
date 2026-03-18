import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from "react-native";
import { getAllCameras } from "../../api/modules/cameraApi";
import { getNews } from "../../api/modules/newsApi";
import { getPolicies } from "../../api/modules/policyApi";
import { useAuth } from "../../context/AuthContext";
import type { CameraItem } from "../../types/camera";
import type { NewsItem } from "../../types/news";
import type { PolicyItem } from "../../types/policy";
import { isAdminRole, isStaffOrAdminRole } from "../../utils/role";

export function ManagementScreen() {
  const { user } = useAuth();
  const canAccess = isStaffOrAdminRole(user?.role);
  const isAdmin = isAdminRole(user?.role);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newsList, setNewsList] = useState<NewsItem[]>([]);
  const [policyList, setPolicyList] = useState<PolicyItem[]>([]);
  const [cameraList, setCameraList] = useState<CameraItem[]>([]);

  useEffect(() => {
    const loadData = async () => {
      if (!canAccess) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");
      try {
        const [news, policies, cameras] = await Promise.all([
          getNews(),
          getPolicies(),
          getAllCameras(),
        ]);
        setNewsList(news);
        setPolicyList(policies);
        setCameraList(cameras);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Khong tai duoc du lieu management");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [canAccess]);

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
      renderItem={null}
      ListHeaderComponent={
        <View style={styles.block}>
          <Text style={styles.title}>Management Center</Text>
          <Text style={styles.subtitle}>Role: {user?.role}</Text>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <View style={styles.card}>
            <Text style={styles.cardTitle}>News ({newsList.length})</Text>
            <Text style={styles.cardBody}>Staff/Admin co quyen tao va cap nhat news.</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Camera ({cameraList.length})</Text>
            <Text style={styles.cardBody}>Staff/Admin co quyen xem danh sach camera.</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Policy ({policyList.length})</Text>
            <Text style={styles.cardBody}>{isAdmin ? "Admin co quyen tao/sua/xoa policy." : "Staff chi duoc xem policy dang active."}</Text>
          </View>

          <Text style={styles.sectionTitle}>Latest News</Text>
          {newsList.slice(0, 5).map((item) => (
            <View key={item._id} style={styles.itemRow}>
              <Text style={styles.itemTitle}>{item.title}</Text>
              <Text style={styles.itemMeta}>{item.isPublished ? "published" : "draft"}</Text>
            </View>
          ))}

          <Text style={styles.sectionTitle}>Cameras</Text>
          {cameraList.slice(0, 5).map((cam, index) => (
            <View key={`${cam._id || cam.id || "cam"}-${index}`} style={styles.itemRow}>
              <Text style={styles.itemTitle}>{cam.cameraName || cam.name || "Camera"}</Text>
              <Text style={styles.itemMeta}>{cam.isOnline ? "online" : "offline"}</Text>
            </View>
          ))}
        </View>
      }
      ListEmptyComponent={null}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
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
  errorText: { color: "#DC2626" },
});
