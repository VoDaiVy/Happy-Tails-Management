import { StyleSheet, Text, View } from "react-native";
import { staffTheme } from "../../../../theme/staffTheme";

export function StaffSplash() {
  return (
    <View style={styles.wrap}>
      <View style={styles.logoCircle}><Text style={styles.logo}>HT</Text></View>
      <Text style={styles.title}>Happy Tails Staff</Text>
      <Text style={styles.subtitle}>Preparing dashboard workspace...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: staffTheme.colors.appBg,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: staffTheme.colors.primary,
    shadowColor: staffTheme.colors.shadow,
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
  },
  logo: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 24,
  },
  title: {
    color: staffTheme.colors.text,
    fontSize: 24,
    fontWeight: "800",
  },
  subtitle: {
    color: staffTheme.colors.textSecondary,
    fontSize: 13,
  },
});
