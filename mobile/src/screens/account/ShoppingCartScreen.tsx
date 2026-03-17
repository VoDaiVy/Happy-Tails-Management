import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { checkoutCart, clearCart, getCart, removeCartItem, updateCartItem } from "../../api/modules/cartApi";
import type { Cart, CartItem } from "../../types/cart";

export function ShoppingCartScreen() {
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [note, setNote] = useState("");
  const [scheduledAtText, setScheduledAtText] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadCart = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getCart();
      setCart(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Khong tai duoc gio hang");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCart();
  }, [loadCart]);

  const changeQuantity = async (item: CartItem, nextQty: number) => {
    if (nextQty < 1) return;
    setActionLoading(true);
    setError("");
    setMessage("");
    try {
      const updated = await updateCartItem(item._id, nextQty);
      setCart(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Cap nhat so luong that bai");
    } finally {
      setActionLoading(false);
    }
  };

  const onRemove = async (itemId: string) => {
    setActionLoading(true);
    setError("");
    setMessage("");
    try {
      const updated = await removeCartItem(itemId);
      setCart(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Xoa item that bai");
    } finally {
      setActionLoading(false);
    }
  };

  const onClear = async () => {
    setActionLoading(true);
    setError("");
    setMessage("");
    try {
      const updated = await clearCart();
      setCart(updated);
      setMessage("Da xoa toan bo gio hang");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Khong the xoa gio hang");
    } finally {
      setActionLoading(false);
    }
  };

  const onCheckout = async () => {
    setActionLoading(true);
    setError("");
    setMessage("");
    try {
      const normalizedSchedule = scheduledAtText.trim();
      let scheduledAtIso: string | null = null;
      if (normalizedSchedule) {
        const parsed = new Date(normalizedSchedule.replace(" ", "T"));
        if (Number.isNaN(parsed.getTime())) {
          setError("Scheduled time khong hop le. Dung dinh dang YYYY-MM-DD HH:mm");
          setActionLoading(false);
          return;
        }
        scheduledAtIso = parsed.toISOString();
      }

      const response = await checkoutCart({
        note: note.trim() || undefined,
        scheduledAt: scheduledAtIso,
      });
      setMessage(response?.message || "Checkout thanh cong");
      await loadCart();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Checkout that bai");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerBox}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Shopping Cart</Text>
        <Text style={styles.summaryMeta}>Items: {cart?.totalItems || 0}</Text>
        <Text style={styles.summaryPrice}>Total: {(cart?.totalPrice || 0).toLocaleString()} VND</Text>
      </View>

      <FlatList
        data={cart?.items || []}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={<Text style={styles.emptyText}>Gio hang dang trong</Text>}
        renderItem={({ item }) => (
          <View style={styles.itemCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemMeta}>{item.duration} phut · {item.price.toLocaleString()} VND</Text>
              {item.note ? <Text style={styles.itemMeta}>Note: {item.note}</Text> : null}
            </View>

            <View style={styles.qtyWrap}>
              <Pressable style={styles.qtyBtn} onPress={() => changeQuantity(item, item.quantity - 1)} disabled={actionLoading}>
                <Text style={styles.qtyBtnText}>-</Text>
              </Pressable>
              <Text style={styles.qtyText}>{item.quantity}</Text>
              <Pressable style={styles.qtyBtn} onPress={() => changeQuantity(item, item.quantity + 1)} disabled={actionLoading}>
                <Text style={styles.qtyBtnText}>+</Text>
              </Pressable>
            </View>

            <Pressable style={styles.removeBtn} onPress={() => onRemove(item._id)} disabled={actionLoading}>
              <Text style={styles.removeBtnText}>Remove</Text>
            </Pressable>
          </View>
        )}
      />

      <TextInput
        style={styles.noteInput}
        value={note}
        onChangeText={setNote}
        placeholder="Checkout note (optional)"
      />

      <TextInput
        style={styles.noteInput}
        value={scheduledAtText}
        onChangeText={setScheduledAtText}
        placeholder="Scheduled At (YYYY-MM-DD HH:mm)"
      />

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      {message ? <Text style={styles.successText}>{message}</Text> : null}

      <View style={styles.bottomRow}>
        <Pressable style={[styles.secondaryBtn, actionLoading && styles.disabled]} onPress={onClear} disabled={actionLoading || !cart?.items?.length}>
          <Text style={styles.secondaryBtnText}>Clear Cart</Text>
        </Pressable>
        <Pressable style={[styles.primaryBtn, actionLoading && styles.disabled]} onPress={onCheckout} disabled={actionLoading || !cart?.items?.length}>
          {actionLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Checkout</Text>}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC", padding: 16 },
  centerBox: { flex: 1, justifyContent: "center", alignItems: "center" },
  summaryCard: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    backgroundColor: "#fff",
    padding: 12,
  },
  summaryTitle: { fontSize: 18, fontWeight: "700", color: "#0F172A" },
  summaryMeta: { marginTop: 4, color: "#64748B" },
  summaryPrice: { marginTop: 2, fontWeight: "700", color: "#1D4ED8" },
  listContent: { gap: 10, paddingVertical: 12 },
  emptyText: { color: "#64748B", textAlign: "center", marginTop: 14 },
  itemCard: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    backgroundColor: "#fff",
    padding: 12,
    gap: 8,
  },
  itemName: { fontWeight: "700", fontSize: 15, color: "#0F172A" },
  itemMeta: { marginTop: 2, color: "#64748B", fontSize: 13 },
  qtyWrap: { flexDirection: "row", alignItems: "center", gap: 8 },
  qtyBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#F8FAFC",
  },
  qtyBtnText: { fontWeight: "700", color: "#0F172A" },
  qtyText: { minWidth: 20, textAlign: "center", fontWeight: "700" },
  removeBtn: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: 8,
    backgroundColor: "#FEF2F2",
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  removeBtnText: { color: "#B91C1C", fontWeight: "600" },
  noteInput: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  errorText: { marginTop: 8, color: "#DC2626" },
  successText: { marginTop: 8, color: "#059669" },
  bottomRow: { flexDirection: "row", gap: 10, marginTop: 10 },
  secondaryBtn: {
    flex: 1,
    borderRadius: 10,
    backgroundColor: "#E2E8F0",
    alignItems: "center",
    paddingVertical: 12,
  },
  secondaryBtnText: { color: "#334155", fontWeight: "700" },
  primaryBtn: {
    flex: 1,
    borderRadius: 10,
    backgroundColor: "#2563EB",
    alignItems: "center",
    paddingVertical: 12,
  },
  primaryBtnText: { color: "#fff", fontWeight: "700" },
  disabled: { opacity: 0.65 },
});
