import { StyleSheet, Text, View } from "react-native";
import { useAuth } from "../../context/AuthContext";
import { isStaffOrAdminRole } from "../../utils/role";
import { staffTheme } from "../../theme/staffTheme";
import { StaffAppShell } from "./staff/components/StaffAppShell";

export function ManagementScreen() {
  const { user } = useAuth();
  const canAccess = isStaffOrAdminRole(user?.role);

  if (!canAccess) {
    return (
      <View style={styles.centerBox}>
        <Text style={styles.errorText}>Trang nay chi danh cho staff/admin.</Text>
      </View>
    );
  }

  return <StaffAppShell />;
}

const styles = StyleSheet.create({
  centerBox: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: staffTheme.colors.appBg,
  },
  errorText: {
    color: staffTheme.colors.danger,
    fontWeight: "700",
  },
});
