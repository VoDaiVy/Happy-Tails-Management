import { useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import type { Pet } from "../types/pet";

interface PetPickerModalProps {
  visible: boolean;
  pets: Pet[];
  selectedPetId?: string;
  title?: string;
  searchPlaceholder?: string;
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
  title = "Chon pet",
  searchPlaceholder = "Tim pet theo ten, loai, giong...",
  onClose,
  onSelect,
}: PetPickerModalProps) {
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

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>

          <View style={styles.searchRow}>
            <TextInput
              style={styles.searchInput}
              value={query}
              onChangeText={setQuery}
              placeholder={searchPlaceholder}
            />
            {query ? (
              <Pressable style={styles.clearButton} onPress={() => setQuery("")}>
                <Text style={styles.clearButtonText}>Xoa</Text>
              </Pressable>
            ) : null}
          </View>

          <Text style={styles.resultText}>Ket qua: {filteredPets.length}</Text>

          <FlatList
            data={filteredPets}
            keyExtractor={(item, index) => `${item._id}-${index}`}
            contentContainerStyle={styles.list}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={<Text style={styles.emptyText}>Khong tim thay pet phu hop</Text>}
            renderItem={({ item }) => {
              const selected = selectedPetId === item._id;
              return (
                <Pressable
                  style={[styles.option, selected && styles.optionActive]}
                  onPress={() => onSelect(item._id)}
                >
                  {renderHighlightedText(
                    item.petName,
                    normalizedQuery,
                    [styles.optionText, selected && styles.optionTextActive],
                    styles.highlightText,
                  )}
                  {renderHighlightedText(
                    `${item.petType || "pet"} - ${item.breed || "N/A"}`,
                    normalizedQuery,
                    [styles.optionMeta, selected && styles.optionTextActive],
                    styles.highlightText,
                  )}
                </Pressable>
              );
            }}
          />

          <Pressable style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Dong</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    justifyContent: "center",
    padding: 18,
  },
  card: {
    maxHeight: "75%",
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 12,
  },
  title: { fontSize: 16, fontWeight: "700", color: "#0F172A", marginBottom: 10 },
  searchRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  clearButton: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 8,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  clearButtonText: { color: "#334155", fontWeight: "700" },
  resultText: { marginTop: 8, marginBottom: 10, color: "#64748B", fontSize: 12 },
  list: { gap: 8 },
  option: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  optionActive: { backgroundColor: "#DBEAFE", borderColor: "#93C5FD" },
  optionText: { color: "#0F172A", fontWeight: "700" },
  optionMeta: { color: "#64748B", fontSize: 12, marginTop: 2 },
  optionTextActive: { color: "#1E3A8A" },
  highlightText: { backgroundColor: "#FDE68A", color: "#111827" },
  emptyText: { color: "#64748B", textAlign: "center", marginTop: 8, marginBottom: 4 },
  closeButton: {
    marginTop: 12,
    alignSelf: "flex-end",
    borderRadius: 8,
    backgroundColor: "#E2E8F0",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  closeButtonText: { color: "#334155", fontWeight: "700" },
});
