import { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { getAllMedicalRecords, type MedicalRecordItem } from "../../../../api/modules/medicalRecordApi";
import { staffTheme } from "../../../../theme/staffTheme";
import { KPIStatCard, MedicalRecordCard, PrimaryButton, SearchBar, SectionHeader } from "../components";
import type { MedicalRecordCardModel } from "../types";

function toMedicalCard(item: MedicalRecordItem): MedicalRecordCardModel {
  const user = item.user as { name?: string } | undefined;
  const pet = item.userPet as { petName?: string } | undefined;
  const workflow = item.workflowStage || "received";

  const status: MedicalRecordCardModel["status"] = workflow === "completed"
    ? "Closed"
    : workflow === "processing"
      ? "In Review"
      : "Open";

  return {
    pet: pet?.petName || "Pet",
    owner: user?.name || "Owner",
    recordId: item._id,
    recordType: item.recordType || "checkup",
    summary: item.diagnosis || item.condition || "No summary",
    visitDate: item.createdAt ? new Date(item.createdAt).toLocaleDateString("en-GB") : "--",
    assignedStaff: "Staff",
    progress: status === "Closed" ? "100%" : status === "In Review" ? "60%" : "20%",
    status,
  };
}

export function MedicalRecordsScreen() {
  const [keyword, setKeyword] = useState("");
  const [records, setRecords] = useState<MedicalRecordItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    const loadRecords = async () => {
      try {
        setLoading(true);
        setError("");
        const result = await getAllMedicalRecords({ page: 1, limit: 100 });
        if (mounted) setRecords(result.records || []);
      } catch (fetchError) {
        const err = fetchError as { message?: string };
        if (mounted) setError(err.message || "Failed to load records.");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadRecords();
    return () => {
      mounted = false;
    };
  }, []);

  const medicalCards = useMemo(() => records.map(toMedicalCard), [records]);

  const filtered = useMemo(() => {
    if (!keyword.trim()) return medicalCards;
    const normalized = keyword.trim().toLowerCase();
    return medicalCards.filter((item) => {
      const line = `${item.pet} ${item.owner} ${item.recordId} ${item.recordType}`.toLowerCase();
      return line.includes(normalized);
    });
  }, [keyword, medicalCards]);

  const stats = useMemo(() => {
    return {
      total: medicalCards.length,
      open: medicalCards.filter((item) => item.status === "Open").length,
      review: medicalCards.filter((item) => item.status === "In Review").length,
      closed: medicalCards.filter((item) => item.status === "Closed").length,
    };
  }, [medicalCards]);

  return (
    <View style={styles.wrap}>
      <SectionHeader
        title="Medical Record Management"
        subtitle="Staff-focused records overview"
        action={<PrimaryButton title="Create Record" />}
      />

      <View style={styles.filterBlock}>
        <SearchBar placeholder="Search pet, owner, record ID" value={keyword} onChangeText={setKeyword} />
      </View>

      <View style={styles.statsGrid}>
        <KPIStatCard label="Total records" value={String(stats.total)} icon="✚" />
        <KPIStatCard label="Open" value={String(stats.open)} icon="◌" />
        <KPIStatCard label="In review" value={String(stats.review)} icon="↺" />
        <KPIStatCard label="Closed" value={String(stats.closed)} icon="✓" />
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {loading ? <Text style={styles.loadingText}>Loading records...</Text> : null}

      {filtered.map((item) => (
        <MedicalRecordCard key={item.recordId} item={item} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: staffTheme.spacing.lg,
  },
  filterBlock: {
    gap: 8,
    padding: staffTheme.spacing.sm,
    borderRadius: staffTheme.radius.xl,
    borderWidth: 1,
    borderColor: staffTheme.colors.borderSoft,
    backgroundColor: staffTheme.colors.surfaceAlt,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  loadingText: {
    color: staffTheme.colors.textSecondary,
    fontSize: 12,
  },
  errorText: {
    color: staffTheme.colors.danger,
    fontSize: 12,
    fontWeight: "600",
  },
});
