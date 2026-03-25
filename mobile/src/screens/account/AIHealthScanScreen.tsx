import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as ImagePicker from "expo-image-picker";
import { Feather } from "@expo/vector-icons";
import { diagnoseImageWithAI } from "../../api/modules/aiApi";
import { getMyPets } from "../../api/modules/petApi";
import { PetPickerModal } from "../../components/PetPickerModal";
import { useAuth } from "../../context/AuthContext";
import type { AccountStackParamList } from "../../navigation/types";
import type { AIHealthDiagnosis } from "../../types/ai";
import type { Pet } from "../../types/pet";
import { canUseCustomerFeatures } from "../../utils/role";

type Props = NativeStackScreenProps<AccountStackParamList, "AIHealthScan">;

const severityMeta: Record<string, { label: string; color: string; bg: string }> = {
  low: { label: "Severity: Low", color: "#166534", bg: "#DCFCE7" },
  medium: { label: "Severity: Medium", color: "#92400E", bg: "#FEF3C7" },
  high: { label: "Severity: High", color: "#991B1B", bg: "#FEE2E2" },
};

export function AIHealthScanScreen({ navigation }: Props) {
  const { user } = useAuth();
  const canAccess = canUseCustomerFeatures(user?.role);

  const [pets, setPets] = useState<Pet[]>([]);
  const [petsLoading, setPetsLoading] = useState(false);
  const [petModalVisible, setPetModalVisible] = useState(false);
  const [selectedPetId, setSelectedPetId] = useState<string | undefined>();

  const [symptoms, setSymptoms] = useState("");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageType, setImageType] = useState<string | undefined>();
  const [imageFileName, setImageFileName] = useState<string | undefined>();

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [result, setResult] = useState<AIHealthDiagnosis | null>(null);

  const selectedPet = useMemo(
    () => pets.find((pet) => pet._id === selectedPetId),
    [pets, selectedPetId],
  );

  const loadPets = useCallback(async () => {
    setPetsLoading(true);
    try {
      const data = await getMyPets("true");
      setPets(data || []);
    } catch {
      setPets([]);
    } finally {
      setPetsLoading(false);
    }
  }, []);

  const setImageFromAsset = useCallback((asset: ImagePicker.ImagePickerAsset) => {
    setImageUri(asset.uri);
    setImageType(asset.mimeType || "image/jpeg");
    setImageFileName(asset.fileName || `scan-${Date.now()}.jpg`);
  }, []);

  const handlePickImageFromLibrary = useCallback(async () => {
    setErrorMessage("");

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setErrorMessage("Please allow photo library access to select pet images.");
      return;
    }

    const pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.85,
    });

    if (pickerResult.canceled || !pickerResult.assets?.[0]) {
      return;
    }

    setImageFromAsset(pickerResult.assets[0]);
  }, [setImageFromAsset]);

  const handleTakePhoto = useCallback(async () => {
    setErrorMessage("");

    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setErrorMessage("Please allow camera access to capture pet images.");
      return;
    }

    const cameraResult = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.85,
    });

    if (cameraResult.canceled || !cameraResult.assets?.[0]) {
      return;
    }

    setImageFromAsset(cameraResult.assets[0]);
  }, [setImageFromAsset]);

  const handleChooseImageSource = useCallback(() => {
    Alert.alert("Upload Pet Image", "Choose image source", [
      { text: "Take Photo", onPress: handleTakePhoto },
      { text: "Choose from Library", onPress: handlePickImageFromLibrary },
      { text: "Cancel", style: "cancel" },
    ]);
  }, [handlePickImageFromLibrary, handleTakePhoto]);

  const handleScan = useCallback(async () => {
    if (!imageUri) {
      setErrorMessage("Please upload or capture a pet image before analyzing.");
      return;
    }

    setSubmitting(true);
    setErrorMessage("");
    setResult(null);

    try {
      const response = await diagnoseImageWithAI({
        imageUri,
        imageType,
        fileName: imageFileName,
        symptoms,
        petId: selectedPetId,
      });
      setResult(response.diagnosis);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to analyze image right now.");
    } finally {
      setSubmitting(false);
    }
  }, [imageFileName, imageType, imageUri, selectedPetId, symptoms]);

  const severityStyle = result ? severityMeta[result.severity] || severityMeta.medium : null;

  if (!canAccess) {
    return (
      <View style={styles.centerBox}>
        <Text style={styles.errorText}>AI Health Scan is available for customer accounts only.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.heroIconWrap}>
        <View style={styles.heroGlow} />
        <View style={styles.heroIconCircle}>
          <Feather name="camera" size={32} color="#FFFFFF" />
        </View>
      </View>

      <Text style={styles.title}>
        <Text style={styles.titlePrimary}>AI Health </Text>
        <Text style={styles.titleAccent}>Diagnosis</Text>
      </Text>
      <Text style={styles.subtitle}>Upload your pet&apos;s image for AI health analysis and professional consultation</Text>

      <View style={styles.card}>
        <View style={styles.uploadTitleRow}>
          <Feather name="upload" size={18} color="#F26A00" />
          <Text style={styles.uploadTitle}>Upload Pet Image</Text>
        </View>

        <Pressable style={styles.uploadDropzone} onPress={handleChooseImageSource}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.previewImage} />
          ) : (
            <View style={styles.uploadPlaceholderWrap}>
              <Feather name="image" size={38} color="#F08A40" />
              <Text style={styles.uploadPlaceholderText}>Click to select image</Text>
              <Text style={styles.uploadPlaceholderHint}>PNG, JPG, JPEG (Max 10MB)</Text>
            </View>
          )}
        </Pressable>

        <View style={styles.uploadActionRow}>
          <Pressable style={styles.secondaryPillButton} onPress={handleTakePhoto}>
            <Feather name="camera" size={15} color="#193056" />
            <Text style={styles.secondaryPillButtonText}>Take Photo</Text>
          </Pressable>
          <Pressable style={styles.secondaryPillButton} onPress={handlePickImageFromLibrary}>
            <Feather name="image" size={15} color="#193056" />
            <Text style={styles.secondaryPillButtonText}>Choose from Library</Text>
          </Pressable>
        </View>

        {imageUri ? (
          <Pressable
            style={styles.clearImageButton}
            onPress={() => {
              setImageUri(null);
              setImageType(undefined);
              setImageFileName(undefined);
            }}
          >
            <Text style={styles.clearImageText}>Remove selected image</Text>
          </Pressable>
        ) : null}

        <Text style={styles.fieldLabel}>Symptoms (optional)</Text>
        <TextInput
          style={styles.input}
          multiline
          numberOfLines={4}
          value={symptoms}
          onChangeText={setSymptoms}
          placeholder="Describe any symptoms or unusual behaviors of your pet..."
          placeholderTextColor="#98A2B3"
        />

        <View style={styles.petRow}>
          <Pressable
            style={styles.petButton}
            onPress={async () => {
              if (pets.length === 0) {
                await loadPets();
              }
              setPetModalVisible(true);
            }}
          >
            <Text style={styles.petButtonText}>{petsLoading ? "Loading pets..." : "Select pet (optional)"}</Text>
          </Pressable>
          {selectedPet ? (
            <Pressable style={styles.petClearButton} onPress={() => setSelectedPetId(undefined)}>
              <Text style={styles.petClearButtonText}>Clear</Text>
            </Pressable>
          ) : null}
        </View>
        <Text style={styles.petValue}>{selectedPet ? `${selectedPet.petName} (${selectedPet.petType || "pet"})` : "No pet selected"}</Text>
      </View>

      <View style={styles.guestCard}>
        <Feather name="star" size={16} color="#2D68C4" />
        <Text style={styles.guestCardText}>Customer accounts can use AI Health Scan without guest usage limits.</Text>
      </View>

      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

      <Pressable style={[styles.primaryButton, submitting && styles.disabledButton]} onPress={handleScan} disabled={submitting}>
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <View style={styles.primaryButtonContent}>
            <Feather name="camera" size={16} color="#FFFFFF" />
            <Text style={styles.primaryButtonText}>Analyze Now</Text>
          </View>
        )}
      </Pressable>

      <View style={styles.resultCard}>
        <View style={styles.resultHeaderRow}>
          <Feather name="alert-circle" size={18} color="#F26A00" />
          <Text style={styles.resultTitle}>Diagnosis Result</Text>
        </View>

        {!result ? (
          <View style={styles.resultEmptyWrap}>
            <View style={styles.resultEmptyIconCircle}>
              <Feather name="camera" size={32} color="#F26A00" />
            </View>
            <Text style={styles.resultEmptyText}>Upload a pet image and click &apos;Analyze Now&apos; to get results</Text>
          </View>
        ) : (
          <View style={styles.resultBody}>
            {severityStyle ? (
              <View style={[styles.badge, { backgroundColor: severityStyle.bg }]}> 
                <Text style={[styles.badgeText, { color: severityStyle.color }]}>{severityStyle.label}</Text>
              </View>
            ) : null}

            <Text style={styles.blockTitle}>Observed Symptoms</Text>
            <Text style={styles.blockValue}>{result.symptoms || "No data"}</Text>

            <Text style={styles.blockTitle}>Possible Conditions</Text>
            {result.possibleConditions?.length ? (
              result.possibleConditions.map((item, index) => (
                <Text key={`${item}-${index}`} style={styles.listItem}>- {item}</Text>
              ))
            ) : (
              <Text style={styles.blockValue}>No data</Text>
            )}

            <Text style={styles.blockTitle}>Advice</Text>
            <Text style={styles.blockValue}>{result.advice || "No data"}</Text>

            <Text style={styles.blockTitle}>Urgency</Text>
            <Text style={styles.blockValue}>{result.urgency === "yes" ? "Vet visit recommended soon" : "Can continue monitoring"}</Text>

            <Text style={styles.blockTitle}>Recommended Services</Text>
            {result.recommendedServices?.length ? (
              result.recommendedServices.map((item, index) => (
                <Text key={`${item}-${index}`} style={styles.listItem}>- {item}</Text>
              ))
            ) : (
              <Text style={styles.blockValue}>No specific service suggestions yet</Text>
            )}
          </View>
        )}
      </View>

      <View style={styles.guideCard}>
        <View style={styles.guideIconCircle}>
          <Feather name="camera" size={20} color="#F26A00" />
        </View>
        <Text style={styles.guideTitle}>Capture Clear Photos</Text>
        <Text style={styles.guideDescription}>Take photos in good lighting and focus on the area that needs to be checked.</Text>
      </View>

      <View style={styles.guideCard}>
        <View style={styles.guideIconCircle}>
          <Feather name="alert-circle" size={20} color="#F26A00" />
        </View>
        <Text style={styles.guideTitle}>Describe In Detail</Text>
        <Text style={styles.guideDescription}>Provide symptom details so the AI can analyze more accurately.</Text>
      </View>

      <View style={styles.guideCard}>
        <View style={styles.guideIconCircle}>
          <Feather name="check-circle" size={20} color="#F26A00" />
        </View>
        <Text style={styles.guideTitle}>Get Fast Results</Text>
        <Text style={styles.guideDescription}>Receive AI-powered analysis results in just a few seconds.</Text>
      </View>

      <PetPickerModal
        visible={petModalVisible}
        pets={pets}
        selectedPetId={selectedPetId}
        onAddNewPet={() => {
          setPetModalVisible(false);
          navigation.navigate("MyPets");
        }}
        onManagePets={() => {
          setPetModalVisible(false);
          navigation.navigate("MyPets");
        }}
        onClose={() => setPetModalVisible(false)}
        onSelect={(petId) => {
          setSelectedPetId(petId);
          setPetModalVisible(false);
        }}
        title="Choose a pet for AI context"
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F2EC" },
  centerBox: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  content: { paddingHorizontal: 16, paddingTop: 18, gap: 14, paddingBottom: 110 },
  heroIconWrap: { alignItems: "center", justifyContent: "center", marginTop: 2, marginBottom: 2 },
  heroGlow: {
    position: "absolute",
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "rgba(242, 106, 0, 0.22)",
  },
  heroIconCircle: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: "#F26A00",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#F26A00",
    shadowOpacity: 0.42,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 7,
  },
  title: { textAlign: "center", fontSize: 34, fontWeight: "900", lineHeight: 42, color: "#142742" },
  titlePrimary: { color: "#10284A" },
  titleAccent: { color: "#F26A00" },
  subtitle: { color: "#314761", fontSize: 16, lineHeight: 24, textAlign: "center", paddingHorizontal: 10 },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#E9EEF5",
    padding: 14,
    gap: 12,
    shadowColor: "#102244",
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  uploadTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  uploadTitle: { fontSize: 16, fontWeight: "800", color: "#112A4A" },
  uploadDropzone: {
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#F5A14F",
    borderStyle: "dashed",
    minHeight: 190,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF8EF",
  },
  uploadPlaceholderWrap: { alignItems: "center", justifyContent: "center", gap: 4 },
  uploadPlaceholderText: { color: "#17345A", fontSize: 15, fontWeight: "700" },
  uploadPlaceholderHint: { color: "#5A6D86", fontSize: 13, fontWeight: "500" },
  uploadActionRow: { flexDirection: "row", gap: 8 },
  secondaryPillButton: {
    flex: 1,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#D8E2EF",
    backgroundColor: "#F8FBFF",
    paddingVertical: 9,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  secondaryPillButtonText: { color: "#193056", fontWeight: "700", fontSize: 13 },
  clearImageButton: { alignSelf: "flex-start", paddingVertical: 2 },
  clearImageText: { color: "#C33B2E", fontWeight: "700", fontSize: 12 },
  fieldLabel: { color: "#17345A", fontSize: 15, fontWeight: "700" },
  input: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 80,
    textAlignVertical: "top",
    color: "#2E3F57",
    fontSize: 14,
  },
  petRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  petButton: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D7DEE7",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  petButtonText: { color: "#344054", fontWeight: "700", textAlign: "center" },
  petClearButton: {
    alignSelf: "flex-start",
    backgroundColor: "#FFF3EE",
    borderWidth: 1,
    borderColor: "#FFD7C2",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  petClearButtonText: { color: "#B54708", fontWeight: "700", fontSize: 12 },
  petValue: { fontSize: 13, color: "#64748B" },
  previewImage: {
    width: "100%",
    height: 210,
    borderRadius: 12,
  },
  guestCard: {
    backgroundColor: "#EAF3FF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#D6E9FF",
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  guestCardText: { flex: 1, color: "#234A84", fontWeight: "600", lineHeight: 19 },
  errorText: { color: "#B42318", fontSize: 13, marginTop: -2 },
  primaryButton: {
    backgroundColor: "#F28B4A",
    borderRadius: 12,
    alignItems: "center",
    paddingVertical: 13,
    shadowColor: "#F26A00",
    shadowOpacity: 0.3,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
    elevation: 4,
  },
  primaryButtonContent: { flexDirection: "row", alignItems: "center", gap: 8 },
  disabledButton: { opacity: 0.7 },
  primaryButtonText: { color: "#FFFFFF", fontWeight: "800", fontSize: 19 },
  resultCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E7EDF5",
    borderRadius: 20,
    padding: 14,
    minHeight: 292,
    shadowColor: "#102244",
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  resultHeaderRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  resultTitle: { fontSize: 22, fontWeight: "800", color: "#10284A" },
  resultEmptyWrap: {
    flex: 1,
    minHeight: 220,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  resultEmptyIconCircle: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: "#F6E8C5",
    alignItems: "center",
    justifyContent: "center",
  },
  resultEmptyText: { textAlign: "center", color: "#425A79", fontSize: 15, lineHeight: 24, paddingHorizontal: 10 },
  resultBody: { marginTop: 12, gap: 8 },
  badge: { alignSelf: "flex-start", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  badgeText: { fontWeight: "800", fontSize: 12 },
  blockTitle: { marginTop: 2, color: "#344054", fontWeight: "700" },
  blockValue: { color: "#475467", lineHeight: 20 },
  listItem: { color: "#475467", lineHeight: 20 },
  guideCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E9EEF5",
    paddingHorizontal: 14,
    paddingVertical: 16,
    shadowColor: "#102244",
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  guideIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#F7E6CE",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  guideTitle: { color: "#10284A", fontSize: 33, fontWeight: "800", marginBottom: 4 },
  guideDescription: { color: "#1F3B60", fontSize: 15, lineHeight: 24 },
});
