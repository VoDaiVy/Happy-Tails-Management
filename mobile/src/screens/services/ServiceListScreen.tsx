import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { addToCart } from "../../api/modules/cartApi";
import { getServices } from "../../api/modules/serviceApi";
import { useAuth } from "../../context/AuthContext";
import { resetServiceHeaderScroll, serviceHeaderScrollY } from "../../navigation/serviceHeaderScroll";
import type { ServicesStackParamList } from "../../navigation/types";
import type { ServiceItem } from "../../types/service";
import { canUseCustomerFeatures } from "../../utils/role";

const PAGE_LIMIT = 10;
type Props = NativeStackScreenProps<ServicesStackParamList, "ServiceList">;
const AnimatedFlatList = Animated.createAnimatedComponent(FlatList<ServiceItem>);

function getServiceIcon(name = "") {
  const value = name.toLowerCase();

  if (value.includes("dye") || value.includes("color")) return "🖌️";
  if (value.includes("dental") || value.includes("teeth")) return "☺";
  if (value.includes("ear") || value.includes("eye")) return "◉";
  if (value.includes("nail") || value.includes("style") || value.includes("groom")) return "✂";
  if (value.includes("bath") || value.includes("spa")) return "◍";
  return "✦";
}

export function ServiceListScreen({ navigation }: Props) {
  const { user } = useAuth();
  const canAddToCart = canUseCustomerFeatures(user?.role);

  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [addingId, setAddingId] = useState<string | null>(null);
  const [activeServiceId, setActiveServiceId] = useState("");

  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);

  const fetchServices = useCallback(
    async (nextPage: number, append: boolean) => {
      if (append) setLoadingMore(true);
      else setLoading(true);

      setErrorMessage("");

      try {
        const response = await getServices({
          page: nextPage,
          limit: PAGE_LIMIT,
          isActive: "true",
          sortBy: "name",
          sortOrder: "asc",
        });

        setServices((prev) => {
          const next = append ? [...prev, ...response.data] : response.data;
          if (!append && next.length > 0) {
            setActiveServiceId((current) => current || next[0]._id);
          }
          return next;
        });
        setHasNextPage(Boolean(response.pagination?.hasNextPage));
        setPage(nextPage);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Khong tai duoc danh sach services");
      } finally {
        setLoading(false);
        setLoadingMore(false);
        setRefreshing(false);
      }
    },
    [],
  );

  useEffect(() => {
    fetchServices(1, false);
  }, [fetchServices]);

  useFocusEffect(
    useCallback(() => {
      resetServiceHeaderScroll();
      return () => {
        resetServiceHeaderScroll();
      };
    }, []),
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchServices(1, false);
  }, [fetchServices]);

  const loadMore = useCallback(() => {
    if (!hasNextPage || loadingMore || loading) return;
    fetchServices(page + 1, true);
  }, [fetchServices, hasNextPage, loading, loadingMore, page]);

  const handleAddToCart = useCallback(async (serviceId: string) => {
    if (!canAddToCart) {
      setActionMessage("Chi tai khoan customer moi co the them vao gio hang");
      return;
    }

    setAddingId(serviceId);
    setActionMessage("");
    try {
      await addToCart({ serviceId, quantity: 1 });
      setActionMessage("Da them service vao gio hang");
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "Khong the them vao gio hang");
    } finally {
      setAddingId(null);
    }
  }, [canAddToCart]);

  const shownServices = useMemo(() => services, [services]);

  return (
    <View style={styles.container}>

      {actionMessage ? <Text style={styles.actionMessage}>{actionMessage}</Text> : null}

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" />
        </View>
      ) : errorMessage ? (
        <View style={styles.centerBox}>
          <Text style={styles.errorText}>{errorMessage}</Text>
          <Pressable style={styles.retryButton} onPress={() => fetchServices(1, false)}>
            <Text style={styles.retryText}>Thu lai</Text>
          </Pressable>
        </View>
      ) : (
        <AnimatedFlatList
          data={shownServices}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.serviceList}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: serviceHeaderScrollY } } }], {
            useNativeDriver: false,
          })}
          scrollEventThrottle={16}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={<Text style={styles.emptyText}>Khong co service phu hop</Text>}
          ListFooterComponent={loadingMore ? <ActivityIndicator style={{ marginVertical: 12 }} /> : null}
          renderItem={({ item }) => {
            const isActive = activeServiceId === item._id;
            return (
              <Pressable
                style={[styles.card, isActive && styles.cardActive]}
                onPress={() => setActiveServiceId(item._id)}
              >
                <View style={styles.cardHeadRow}>
                  <View style={[styles.iconWrap, isActive && styles.iconWrapActive]}>
                    <Text style={[styles.iconText, isActive && styles.iconTextActive]}>{getServiceIcon(item.name)}</Text>
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cardTitle, isActive && styles.cardTitleActive]}>{item.name}</Text>
                    <Text style={[styles.cardDescription, isActive && styles.cardDescriptionActive]} numberOfLines={3}>
                      {item.description || "Professional pet care service."}
                    </Text>
                  </View>

                  <Text style={[styles.priceText, isActive && styles.priceTextActive]}>${item.price}</Text>
                </View>

                {isActive ? (
                  <View style={styles.actionsRow}>
                    <Pressable
                      style={[styles.addButton, (!canAddToCart || addingId === item._id) && styles.addButtonDisabled]}
                      onPress={() => handleAddToCart(item._id)}
                      disabled={!canAddToCart || addingId === item._id}
                    >
                      {addingId === item._id ? (
                        <ActivityIndicator size="small" color="#E07A5F" />
                      ) : (
                        <Text style={styles.addButtonText}>ADD TO CART</Text>
                      )}
                    </Pressable>

                    <Pressable
                      style={styles.bookNowButton}
                      onPress={() => navigation.navigate("ServiceDetail", { serviceId: item._id })}
                    >
                      <Text style={styles.bookNowButtonText}>BOOK NOW</Text>
                    </Pressable>
                  </View>
                ) : null}
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F1EB", paddingTop: 0 },
  title: {
    fontSize: 30,
    lineHeight: 34,
    fontWeight: "900",
    color: "#1F2A37",
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  serviceList: { paddingHorizontal: 16, paddingTop: 6, paddingBottom: 20 },
  card: {
    borderWidth: 1,
    borderColor: "#D8D2C8",
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 14,
    marginBottom: 12,
    shadowColor: "#1F2A37",
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cardActive: {
    backgroundColor: "#1B263B",
    borderColor: "#1B263B",
  },
  cardHeadRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#F4F6FA",
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrapActive: { backgroundColor: "#E07A5F" },
  iconText: { color: "#7FB069", fontWeight: "800", fontSize: 18 },
  iconTextActive: { color: "#fff" },
  cardTitle: { fontSize: 28, lineHeight: 32, fontWeight: "800", color: "#1F2A37" },
  cardTitleActive: { color: "#FFFFFF" },
  cardDescription: { marginTop: 4, color: "#6D6F7A", fontSize: 14, lineHeight: 20 },
  cardDescriptionActive: { color: "#D4D8E2" },
  priceText: { color: "#7FB069", fontWeight: "900", fontSize: 34, lineHeight: 38 },
  priceTextActive: { color: "#E07A5F" },
  actionsRow: { marginTop: 12, flexDirection: "row", gap: 8 },
  addButton: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E7EAF0",
    alignItems: "center",
    paddingVertical: 10,
  },
  addButtonText: { color: "#E07A5F", fontWeight: "800", fontSize: 13 },
  bookNowButton: {
    flex: 1,
    backgroundColor: "#E07A5F",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
  },
  bookNowButtonText: { color: "#fff", fontWeight: "800", fontSize: 13 },
  addButtonDisabled: { opacity: 0.65 },
  actionMessage: {
    marginTop: 2,
    marginHorizontal: 16,
    color: "#065F46",
    fontSize: 13,
  },
  centerBox: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
  errorText: { color: "#B91C1C", textAlign: "center", marginBottom: 10 },
  retryButton: { backgroundColor: "#D87D4A", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8 },
  retryText: { color: "#fff", fontWeight: "700" },
  emptyText: { textAlign: "center", color: "#6B7280", marginTop: 14 },
});
