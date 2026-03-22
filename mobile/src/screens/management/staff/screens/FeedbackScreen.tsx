import { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { getMyReceivedFeedback } from "../../../../api/modules/feedbackApi";
import type { FeedbackItem } from "../../../../types/feedback";
import { staffTheme } from "../../../../theme/staffTheme";
import { EmptyState, FilterChipGroup, KPIStatCard, PrimaryButton, SearchBar, SectionHeader } from "../components";

const STAR_FILTERS = ["All", "5 Stars", "4 Stars", "3 Stars", "2 Stars", "1 Star"];

export function FeedbackScreen() {
  const [starFilter, setStarFilter] = useState("All");
  const [keyword, setKeyword] = useState("");
  const [feedbackList, setFeedbackList] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadFeedback = async () => {
    try {
      setLoading(true);
      setError("");
      const rows = await getMyReceivedFeedback();
      setFeedbackList(rows);
    } catch (fetchError) {
      const err = fetchError as { message?: string };
      setError(err.message || "Failed to load feedback.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    const bootstrap = async () => {
      try {
        setLoading(true);
        setError("");
        const rows = await getMyReceivedFeedback();
        if (mounted) setFeedbackList(rows);
      } catch (fetchError) {
        const err = fetchError as { message?: string };
        if (mounted) setError(err.message || "Failed to load feedback.");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    bootstrap();
    return () => {
      mounted = false;
    };
  }, []);

  const stats = useMemo(() => {
    const totalReviews = feedbackList.length;
    const averageRating = totalReviews > 0
      ? (feedbackList.reduce((sum, item) => sum + Number(item.rating || 0), 0) / totalReviews).toFixed(1)
      : "0.0";

    return {
      totalReviews,
      averageRating,
    };
  }, [feedbackList]);

  const filtered = useMemo(() => {
    const byStar = feedbackList.filter((item) => {
      if (starFilter === "All") return true;
      const expected = Number(starFilter[0]);
      return Math.round(Number(item.rating || 0)) === expected;
    });

    if (!keyword.trim()) return byStar;
    const normalized = keyword.trim().toLowerCase();
    return byStar.filter((item) => (item.comment || "").toLowerCase().includes(normalized));
  }, [feedbackList, keyword, starFilter]);

  const hasFeedback = filtered.length > 0;

  return (
    <View style={styles.wrap}>
      <SectionHeader title="Feedback" subtitle="Track reviews and customer sentiment" action={<PrimaryButton title="Refresh" onPress={loadFeedback} />} />

      <View style={styles.statsRow}>
        <KPIStatCard label="Total reviews" value={String(stats.totalReviews)} icon="★" />
        <KPIStatCard label="Average rating" value={`${stats.averageRating} / 5`} icon="✦" />
        <KPIStatCard label="Filtered result" value={String(filtered.length)} icon="◌" />
      </View>

      <SearchBar placeholder="Search feedback content" value={keyword} onChangeText={setKeyword} />
      <FilterChipGroup options={STAR_FILTERS} selected={starFilter} onSelect={setStarFilter} />

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {loading ? (
        <View style={styles.placeholderList}>
          <Text style={styles.placeholderText}>Loading feedback...</Text>
        </View>
      ) : hasFeedback ? (
        <View style={styles.placeholderList}>
          {filtered.slice(0, 8).map((item) => (
            <View key={item._id} style={styles.feedbackItem}>
              <Text style={styles.feedbackTitle}>Rating {item.rating}/5</Text>
              <Text style={styles.feedbackText}>{item.comment || "No comment"}</Text>
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.emptyWrap}>
          <EmptyState title="No feedback yet" subtitle="Reviews will appear here when customers submit new feedback." />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: staffTheme.spacing.lg,
  },
  statsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  placeholderList: {
    borderWidth: 1,
    borderColor: staffTheme.colors.border,
    borderRadius: staffTheme.radius.lg,
    backgroundColor: staffTheme.colors.surface,
    padding: 18,
  },
  placeholderText: {
    color: staffTheme.colors.textSecondary,
    fontSize: 13,
  },
  feedbackItem: {
    borderBottomWidth: 1,
    borderColor: staffTheme.colors.borderSoft,
    paddingBottom: 8,
    marginBottom: 8,
  },
  feedbackTitle: {
    color: staffTheme.colors.text,
    fontSize: 13,
    fontWeight: "700",
  },
  feedbackText: {
    marginTop: 3,
    color: staffTheme.colors.textSecondary,
    fontSize: 12,
  },
  errorText: {
    color: staffTheme.colors.danger,
    fontSize: 12,
    fontWeight: "600",
  },
  emptyWrap: {
    backgroundColor: staffTheme.colors.surfaceAlt,
    borderRadius: staffTheme.radius.xl,
    padding: staffTheme.spacing.sm,
    borderWidth: 1,
    borderColor: staffTheme.colors.borderSoft,
  },
});
