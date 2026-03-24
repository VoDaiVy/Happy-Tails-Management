import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  Image,
  Modal,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import type { Pet } from "../types/pet";
import { resolveImageUrl } from "../utils/image";

interface PetPickerModalProps {
  visible: boolean;
  pets: Pet[];
  selectedPetId?: string;
  title?: string;
  searchPlaceholder?: string;
  onAddNewPet?: () => void;
  onManagePets?: () => void;
  onClose: () => void;
  onSelect: (petId: string) => void;
}

const normalizeValue = (value: string) => value.toLowerCase().trim();

const compareByName = (a: Pet, b: Pet) => {
  const left = (a.petName || "").toLowerCase();
  const right = (b.petName || "").toLowerCase();
  return left.localeCompare(right);
};

function renderHighlightedText(content: string, keyword: string, baseStyle: object, highlightStyle: object) {
  const source = content || "";
  const query = normalizeValue(keyword);

  if (!query) {
    return <Text style={baseStyle}>{source}</Text>;
  }

  const lowerSource = source.toLowerCase();
  const chunks: { text: string; match: boolean }[] = [];
  let cursor = 0;

  while (cursor < source.length) {
    const index = lowerSource.indexOf(query, cursor);
    if (index < 0) {
      chunks.push({ text: source.slice(cursor), match: false });
      break;
    }

    if (index > cursor) {
      chunks.push({ text: source.slice(cursor, index), match: false });
    }

    chunks.push({ text: source.slice(index, index + query.length), match: true });
    cursor = index + query.length;
  }

  if (chunks.length === 0) {
    return <Text style={baseStyle}>{source}</Text>;
  }

  return (
    <Text style={baseStyle}>
      {chunks.map((chunk, index) => (
        <Text key={`${chunk.text}-${index}`} style={chunk.match ? highlightStyle : undefined}>
          {chunk.text}
        </Text>
      ))}
    </Text>
  );
}

export function PetPickerModal({
  visible,
  pets,
  selectedPetId,
  title = "Select Pet",
  searchPlaceholder = "Search pets by name, type, breed...",
  onAddNewPet,
  onManagePets,
  onClose,
  onSelect,
}: PetPickerModalProps) {
  const searchInputRef = useRef<TextInput | null>(null);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    if (!visible) {
      setQuery("");
      setDebouncedQuery("");
    }
  }, [visible]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedQuery(query);
    }, 220);

    return () => clearTimeout(timeout);
  }, [query]);

  const filteredPets = useMemo(() => {
    const keyword = normalizeValue(debouncedQuery);

    const rawResults = !keyword
      ? [...pets]
      : pets.filter((pet) => {
          const bucket = `${pet.petName || ""} ${pet.petType || ""} ${pet.breed || ""}`.toLowerCase();
          return bucket.includes(keyword);
        });

    // Guard against accidental duplicate pets returned by API/cache merges.
    const idSet = new Set<string>();
    const results = rawResults.filter((pet) => {
      const key = String(pet._id || "");
      if (!key || idSet.has(key)) return false;
      idSet.add(key);
      return true;
    });

    results.sort((left, right) => {
      if (selectedPetId && left._id === selectedPetId) return -1;
      if (selectedPetId && right._id === selectedPetId) return 1;
      return compareByName(left, right);
    });

    return results;
  }, [pets, debouncedQuery, selectedPetId]);

  const normalizedQuery = normalizeValue(debouncedQuery);
  const totalPets = pets.length;

  const renderAvatar = (item: Pet) => {
    const imageUrl = resolveImageUrl(item.avatar);

    if (imageUrl) {
      return <Image source={{ uri: imageUrl }} style={styles.petAvatarImage} />;
    }

    return (
      <View style={styles.petAvatarFallback}>
        <Text style={styles.petAvatarFallbackText}>{(item.petName || "P").trim().charAt(0).toUpperCase()}</Text>
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <Pressable style={styles.backdrop} onPress={onClose}>
          <BlurView intensity={80} tint="dark" style={styles.backdropBlur} />
        </Pressable>

        <SafeAreaView style={styles.screen}>
          <View style={styles.header}>
          <Pressable style={styles.headerIconButton} onPress={onClose}>
            <Feather name="x" size={24} color="#A63B00" />
          </Pressable>

          <Text style={styles.headerTitle}>{title}</Text>

          <Pressable style={styles.headerIconButton} onPress={() => searchInputRef.current?.focus()}>
            <Feather name="search" size={20} color="#A98A6F" />
          </Pressable>
          </View>

          <View style={styles.body}>
          <View style={styles.searchWrap}>
            <Feather name="search" size={22} color="#B39A82" />
            <TextInput
              ref={searchInputRef}
              style={styles.searchInput}
              value={query}
              onChangeText={setQuery}
              placeholder={searchPlaceholder}
              placeholderTextColor="#B9A58F"
            />
            {query ? (
              <Pressable style={styles.inlineClearButton} onPress={() => setQuery("")}>
                <Feather name="x-circle" size={18} color="#B39A82" />
              </Pressable>
            ) : null}
          </View>

          <View style={styles.sectionHeadRow}>
            <Text style={styles.sectionTitle}>Your Pets</Text>
            <Text style={styles.sectionMeta}>{totalPets} TOTAL</Text>
          </View>

            <FlatList
              data={filteredPets}
              keyExtractor={(item) => item._id}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={<Text style={styles.emptyText}>No matching pets found.</Text>}
              renderItem={({ item }) => {
                const selected = selectedPetId === item._id;
                return (
                  <Pressable style={[styles.petRow, selected && styles.petRowActive]} onPress={() => onSelect(item._id)}>
                    <View style={styles.petAvatarWrap}>{renderAvatar(item)}</View>

                    <View style={styles.petTextWrap}>
                      {renderHighlightedText(
                        item.petName,
                        normalizedQuery,
                        [styles.petName, selected && styles.petNameActive],
                        styles.highlightText,
                      )}

                      <View style={styles.petMetaRow}>
                        <Text style={styles.petMetaIcon}>🐾</Text>
                        {renderHighlightedText(
                          `${(item.petType || "Pet").replace(/^./, (str) => str.toUpperCase())} • ${item.breed || "Unknown"}`,
                          normalizedQuery,
                          [styles.petMeta, selected && styles.petMetaActive],
                          styles.highlightText,
                        )}
                      </View>
                    </View>
                    <Feather name="chevron-right" size={20} color={selected ? "#A63B00" : "#D5C3AF"} />
                  </Pressable>
                );
              }}
              ListFooterComponent={
                <View style={styles.quickActionsRow}>
                  <Pressable style={[styles.quickCard, styles.quickCardPrimary]} onPress={onAddNewPet || onClose}>
                    <View style={styles.quickIconWrap}>
                      <Feather name="plus" size={24} color="#A85A20" />
                    </View>
                    <Text style={styles.quickTitle}>Add New Pet</Text>
                    <Text style={styles.quickSubtitle}>JOIN THE FAMILY</Text>
                  </Pressable>

                  <Pressable style={styles.quickCard} onPress={onManagePets || onClose}>
                    <View style={styles.quickIconWrap}>
                      <Feather name="help-circle" size={24} color="#8A5C2D" />
                    </View>
                    <Text style={styles.quickTitle}>Manage Pets</Text>
                    <Text style={styles.quickSubtitle}>PROFILES & HEALTH</Text>
                  </Pressable>
                </View>
              }
            />
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(34, 24, 16, 0.18)",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  backdropBlur: {
    flex: 1,
  },
  screen: {
    height: "58%",
    backgroundColor: "#F2EDEA",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
  },
  header: {
    backgroundColor: "#FFFDFB",
    borderBottomWidth: 1,
    borderBottomColor: "#EFE3D9",
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 34,
    lineHeight: 40,
    color: "#3D200C",
    fontWeight: "800",
  },
  body: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 999,
    backgroundColor: "#F5E9DF",
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    color: "#6B4424",
    fontSize: 19,
    lineHeight: 24,
    paddingVertical: 0,
  },
  inlineClearButton: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionHeadRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 24,
    lineHeight: 30,
    color: "#4A2C14",
    fontWeight: "800",
  },
  sectionMeta: {
    fontSize: 13,
    lineHeight: 16,
    color: "#B58A66",
    fontWeight: "700",
    letterSpacing: 0.6,
  },
  listContent: {
    paddingBottom: 22,
    gap: 8,
  },
  petRow: {
    borderRadius: 24,
    backgroundColor: "#FCFAF8",
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  petRowActive: {
    backgroundColor: "#FDF0E6",
  },
  petAvatarWrap: {
    width: 62,
    height: 62,
    borderRadius: 31,
    overflow: "hidden",
    backgroundColor: "#F0DFCF",
    alignItems: "center",
    justifyContent: "center",
  },
  petAvatarImage: {
    width: "100%",
    height: "100%",
  },
  petAvatarFallback: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  petAvatarFallbackText: {
    fontSize: 24,
    lineHeight: 28,
    fontWeight: "800",
    color: "#8B4E22",
  },
  petTextWrap: {
    flex: 1,
  },
  petName: {
    color: "#3D200C",
    fontSize: 21,
    lineHeight: 26,
    fontWeight: "800",
  },
  petNameActive: {
    color: "#A63B00",
  },
  petMetaRow: {
    marginTop: 2,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  petMetaIcon: {
    fontSize: 14,
    color: "#8B5E37",
  },
  petMeta: {
    color: "#7B5A3F",
    fontSize: 15,
    lineHeight: 20,
  },
  petMetaActive: {
    color: "#9A5A2C",
  },
  highlightText: {
    backgroundColor: "#FDE7C7",
    color: "#5E2D0D",
  },
  emptyText: {
    color: "#8A7766",
    textAlign: "center",
    marginTop: 18,
    fontSize: 15,
  },
  quickActionsRow: {
    marginTop: 12,
    flexDirection: "row",
    gap: 10,
  },
  quickCard: {
    flex: 1,
    borderRadius: 24,
    backgroundColor: "#F0E5DC",
    paddingVertical: 18,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  quickCardPrimary: {
    backgroundColor: "#F3DDC9",
  },
  quickIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(255, 248, 240, 0.55)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  quickTitle: {
    color: "#4A2B15",
    fontWeight: "800",
    fontSize: 18,
    lineHeight: 22,
    textAlign: "center",
  },
  quickSubtitle: {
    marginTop: 4,
    color: "#B58A66",
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "700",
    letterSpacing: 0.7,
    textAlign: "center",
  },
});
