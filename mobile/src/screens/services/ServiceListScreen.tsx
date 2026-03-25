import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { addToCart } from "../../api/modules/cartApi";
import { getServices } from "../../api/modules/serviceApi";
import type { ServicesStackParamList } from "../../navigation/types";
import type { ServiceItem } from "../../types/service";
import { formatVnd } from "../../utils/currency";

const PAGE_LIMIT = 10;
const PROMO_DOG_IMAGE = "https://images.unsplash.com/photo-1518717758536-85ae29035b6d?auto=format&fit=crop&w=1200&q=80";

type Props = NativeStackScreenProps<ServicesStackParamList, "ServiceList">;

type ListRow =
  | { kind: "featured"; item: ServiceItem }
  | { kind: "service"; item: ServiceItem; index: number }
  | { kind: "promo" };

function toPriceValue(value?: number) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return 0;
  }

  return Math.round(value);
}

function getServiceIcon(name = "") {
  const value = name.toLowerCase();

  if (value.includes("nail") || value.includes("groom") || value.includes("style")) return "scissors";
  if (value.includes("bath") || value.includes("dry") || value.includes("spa")) return "droplet";
  if (value.includes("dye") || value.includes("color")) return "aperture";
  if (value.includes("dental") || value.includes("teeth")) return "activity";
  if (value.includes("paw") || value.includes("pedicure")) return "home";
  return "circle";
}

export function ServiceListScreen({ navigation }: Props) {
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [expandedServiceId, setExpandedServiceId] = useState<string | null>(null);
  const [addingServiceId, setAddingServiceId] = useState<string | null>(null);

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

        setServices((prev) => (append ? [...prev, ...response.data] : response.data));
        setHasNextPage(Boolean(response.pagination?.hasNextPage));
        setPage(nextPage);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Unable to load services");
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

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchServices(1, false);
  }, [fetchServices]);

  const loadMore = useCallback(() => {
    if (!hasNextPage || loading || loadingMore) return;
    fetchServices(page + 1, true);
  }, [fetchServices, hasNextPage, loading, loadingMore, page]);

  const rows = useMemo<ListRow[]>(() => {
    if (services.length === 0) return [];

    const featured = [{ kind: "featured", item: services[0] } as const];
    const secondary = services.slice(1).map((item, index) => ({ kind: "service", item, index: index + 1 } as const));
    return [...featured, ...secondary, { kind: "promo" } as const];
  }, [services]);

  const onAddToCart = useCallback(async (serviceId: string) => {
    if (!serviceId || addingServiceId) return;

    setAddingServiceId(serviceId);
    try {
      await addToCart({ serviceId, quantity: 1 });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Cannot add service to cart");
    } finally {
      setAddingServiceId(null);
    }
  }, [addingServiceId]);

  if (loading) {
    return (
      <View style={styles.centerBox}>
        <ActivityIndicator size="large" color="#D45714" />
      </View>
    );
  }

  if (errorMessage) {
    return (
      <View style={styles.centerBox}>
        <Text style={styles.errorText}>{errorMessage}</Text>
        <Pressable style={styles.retryButton} onPress={() => fetchServices(1, false)}>
          <Text style={styles.retryText}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={rows}
        keyExtractor={(item) => (item.kind === "promo" ? "promo-card" : `${item.kind}-${item.item._id}`)}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        onEndReached={loadMore}
        onEndReachedThreshold={0.2}
        ListHeaderComponent={
          <View style={styles.headerWrap}>
            <Text style={styles.heroTitle} numberOfLines={1}>
              <Text style={styles.heroTitlePrimary}>Pet Spa </Text>
              <Text style={styles.heroTitleAccent}>Services</Text>
            </Text>
            <Text style={styles.heroSubtitle}>
              Treat your companion to our signature sanctuary treatments, designed for ultimate comfort.
            </Text>
          </View>
        }
        ListEmptyComponent={<Text style={styles.emptyText}>No services available right now.</Text>}
        ListFooterComponent={loadingMore ? <ActivityIndicator style={styles.loadingMore} color="#D45714" /> : null}
        renderItem={({ item }) => {
          if (item.kind === "featured") {
            const featuredPrice = toPriceValue(item.item.price);
            const isExpanded = expandedServiceId === item.item._id;

            return (
              <View style={styles.featuredCard}>
                <View style={styles.featuredCornerGlow} />

                <Pressable
                  style={styles.featuredTopRow}
                  onPress={() => {
                    setExpandedServiceId((prev) => (prev === item.item._id ? null : item.item._id));
                  }}
                >
                  <View style={styles.featuredIconWrap}>
                    <Feather name="scissors" size={29} color="#7A3F00" />
                  </View>

                  <View style={styles.featuredTextWrap}>
                    <Text style={styles.featuredTitle} numberOfLines={1}>{item.item.name || "Full Grooming"}</Text>
                    <Text style={styles.featuredDescription} numberOfLines={3}>
                      {item.item.description || "Complete precision styling, nail care, and sensory ear cleaning."}
                    </Text>
                  </View>

                  <View style={styles.featuredPriceCol}>
                    <Text style={styles.featuredPriceNumber}>{featuredPrice.toLocaleString("vi-VN")}</Text>
                    <Text style={styles.featuredPriceUnit}>VND</Text>
                    <Text style={styles.featuredPriceNote}>STARTING AT</Text>
                  </View>
                </Pressable>

                {isExpanded ? (
                  <View style={styles.featuredButtonStack}>
                    <Pressable style={styles.bookNowButton} onPress={() => navigation.navigate("ServiceDetail", { serviceId: item.item._id })}>
                      <Text style={styles.bookNowButtonText}>BOOK NOW</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.addToCartButton, addingServiceId === item.item._id && styles.buttonDisabled]}
                      onPress={() => onAddToCart(item.item._id)}
                      disabled={addingServiceId === item.item._id}
                    >
                      {addingServiceId === item.item._id ? (
                        <ActivityIndicator size="small" color="#8A4507" />
                      ) : (
                        <Text style={styles.addToCartButtonText}>ADD TO CART</Text>
                      )}
                    </Pressable>
                  </View>
                ) : null}
              </View>
            );
          }

          if (item.kind === "promo") {
            return (
              <View style={styles.promoCard}>
                <Image source={{ uri: PROMO_DOG_IMAGE }} style={styles.promoImage} />
                <View style={styles.promoOverlay} />
                <View style={styles.promoTextWrap}>
                  <Text style={styles.promoTitle}>Join Our VIP Paw Club</Text>
                  <Text style={styles.promoSubtitle}>Save 20% on all monthly grooming sessions.</Text>
                </View>
              </View>
            );
          }

          const price = toPriceValue(item.item.price);
          const iconName = getServiceIcon(item.item.name);
          const isExpanded = expandedServiceId === item.item._id;

          return (
            <View style={[styles.secondaryCard, isExpanded && styles.secondaryCardExpanded]}>
              {isExpanded ? <View style={styles.secondaryCornerGlow} /> : null}

              <Pressable
                style={styles.secondaryTapArea}
                onPress={() => {
                  setExpandedServiceId((prev) => (prev === item.item._id ? null : item.item._id));
                }}
              >
                <View style={styles.secondaryIconWrap}>
                  <Feather name={iconName as any} size={22} color="#8A4507" />
                </View>

                <View style={styles.secondaryTextWrap}>
                  <Text style={styles.secondaryTitle} numberOfLines={1}>{item.item.name}</Text>
                  <Text style={styles.secondaryDesc} numberOfLines={2}>
                    {item.item.description || "Tailored spa treatment for your pet."}
                  </Text>
                </View>

                {isExpanded ? (
                  <View style={styles.secondaryPriceColExpanded}>
                    <Text style={styles.secondaryPriceNumberExpanded}>{price.toLocaleString("vi-VN")}</Text>
                    <Text style={styles.secondaryPriceUnitExpanded}>VND</Text>
                    <Text style={styles.secondaryPriceNoteExpanded}>STARTING AT</Text>
                  </View>
                ) : (
                  <Text style={styles.secondaryPrice}>{formatVnd(price)}</Text>
                )}
              </Pressable>

              {isExpanded ? (
                <View style={styles.secondaryButtonStack}>
                  <Pressable style={styles.bookNowButton} onPress={() => navigation.navigate("ServiceDetail", { serviceId: item.item._id })}>
                    <Text style={styles.bookNowButtonText}>BOOK NOW</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.addToCartButton, addingServiceId === item.item._id && styles.buttonDisabled]}
                    onPress={() => onAddToCart(item.item._id)}
                    disabled={addingServiceId === item.item._id}
                  >
                    {addingServiceId === item.item._id ? (
                      <ActivityIndicator size="small" color="#8A4507" />
                    ) : (
                      <Text style={styles.addToCartButtonText}>ADD TO CART</Text>
                    )}
                  </Pressable>
                </View>
              ) : null}
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF6F0",
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 28,
  },
  headerWrap: {
    paddingTop: 8,
    paddingBottom: 12,
  },
  heroTitle: {
    color: "#3E2723",
    fontSize: 40,
    lineHeight: 46,
    fontWeight: "900",
  },
  heroTitlePrimary: {
    color: "#3E2723",
  },
  heroTitleAccent: {
    color: "#9B4F00",
    fontStyle: "italic",
  },
  heroSubtitle: {
    marginTop: 8,
    color: "#6B3D22",
    fontSize: 17,
    lineHeight: 31,
    maxWidth: "95%",
  },
  featuredCard: {
    marginTop: 10,
    marginBottom: 18,
    borderRadius: 34,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#F0E1D3",
    padding: 16,
    overflow: "hidden",
    shadowColor: "#7E4A23",
    shadowOpacity: 0.09,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 9 },
    elevation: 4,
  },
  featuredCornerGlow: {
    position: "absolute",
    right: -8,
    top: -8,
    width: 120,
    height: 92,
    borderBottomLeftRadius: 64,
    backgroundColor: "#F7E6D8",
  },
  featuredTopRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
  },
  featuredIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: "#F8C89F",
    alignItems: "center",
    justifyContent: "center",
  },
  featuredTextWrap: {
    flex: 1,
  },
  featuredTitle: {
    color: "#3E2723",
    fontSize: 22,
    lineHeight: 27,
    fontWeight: "900",
  },
  featuredDescription: {
    marginTop: 3,
    color: "#6D4123",
    fontSize: 13,
    lineHeight: 21,
  },
  featuredPriceCol: {
    width: 76,
    alignItems: "flex-end",
  },
  featuredPriceNumber: {
    color: "#8A4507",
    fontSize: 34,
    lineHeight: 38,
    fontWeight: "900",
    textAlign: "right",
  },
  featuredPriceUnit: {
    color: "#8A4507",
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "900",
  },
  featuredPriceNote: {
    marginTop: 2,
    color: "#A59284",
    fontSize: 9,
    lineHeight: 12,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  featuredButtonStack: {
    marginTop: 14,
    gap: 10,
  },
  bookNowButton: {
    borderRadius: 999,
    backgroundColor: "#E56516",
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#D45714",
    shadowOpacity: 0.28,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  bookNowButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
  },
  addToCartButton: {
    borderRadius: 999,
    backgroundColor: "#F5DDC8",
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  addToCartButtonText: {
    color: "#8A4507",
    fontSize: 16,
    fontWeight: "900",
  },
  secondaryCard: {
    marginBottom: 14,
    borderRadius: 999,
    backgroundColor: "#F6E8DA",
    borderWidth: 1,
    borderColor: "transparent",
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: "column",
    alignItems: "stretch",
    gap: 12,
    overflow: "hidden",
  },
  secondaryCardExpanded: {
    borderRadius: 34,
    backgroundColor: "#FFFFFF",
    borderColor: "#F0E1D3",
    shadowColor: "#7E4A23",
    shadowOpacity: 0.09,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 9 },
    elevation: 4,
  },
  secondaryCornerGlow: {
    position: "absolute",
    right: -8,
    top: -8,
    width: 120,
    height: 92,
    borderBottomLeftRadius: 64,
    backgroundColor: "#F7E6D8",
  },
  secondaryTapArea: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    width: "100%",
  },
  secondaryIconWrap: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#F8DBC0",
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryTextWrap: {
    flex: 1,
  },
  secondaryTitle: {
    color: "#3E2723",
    fontSize: 18,
    lineHeight: 23,
    fontWeight: "900",
  },
  secondaryDesc: {
    marginTop: 2,
    color: "#6D4123",
    fontSize: 13,
    lineHeight: 18,
  },
  secondaryPrice: {
    color: "#8A4507",
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "900",
    minWidth: 72,
    textAlign: "right",
  },
  secondaryPriceColExpanded: {
    width: 76,
    alignItems: "flex-end",
  },
  secondaryPriceNumberExpanded: {
    color: "#8A4507",
    fontSize: 34,
    lineHeight: 38,
    fontWeight: "900",
    textAlign: "right",
  },
  secondaryPriceUnitExpanded: {
    color: "#8A4507",
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "900",
  },
  secondaryPriceNoteExpanded: {
    marginTop: 2,
    color: "#A59284",
    fontSize: 9,
    lineHeight: 12,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  secondaryButtonStack: {
    marginTop: 10,
    gap: 8,
    width: "100%",
  },
  promoCard: {
    marginTop: 10,
    borderRadius: 30,
    minHeight: 230,
    overflow: "hidden",
    justifyContent: "flex-end",
    marginBottom: 18,
  },
  promoImage: {
    ...StyleSheet.absoluteFillObject,
    width: undefined,
    height: undefined,
  },
  promoOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(25, 15, 10, 0.38)",
  },
  promoTextWrap: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  promoTitle: {
    color: "#FFFFFF",
    fontSize: 37,
    lineHeight: 41,
    fontWeight: "900",
  },
  promoSubtitle: {
    marginTop: 4,
    color: "#F4ECE5",
    fontSize: 16,
    lineHeight: 23,
  },
  centerBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF6F0",
    paddingHorizontal: 20,
  },
  errorText: {
    color: "#B91C1C",
    textAlign: "center",
    marginBottom: 10,
  },
  retryButton: {
    backgroundColor: "#D45714",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  emptyText: {
    color: "#7C6252",
    textAlign: "center",
    marginTop: 18,
  },
  loadingMore: {
    marginVertical: 12,
  },
});
