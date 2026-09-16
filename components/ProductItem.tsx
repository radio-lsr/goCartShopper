import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Colors from "../constants/Colors";

interface ProductItemProps {
  product: any;
  onScan: () => void;
  disabled?: boolean;
}

export default function ProductItem({
  product,
  onScan,
  disabled,
}: ProductItemProps) {
  return (
    <View style={[styles.container, product.found && styles.found]}>
      <View style={styles.info}>
        <Text style={styles.name}>{product.name}</Text>
        <Text style={styles.quantity}>Qté: {product.quantity}</Text>
      </View>
      {!product.found ? (
        <TouchableOpacity
          style={styles.scanButton}
          onPress={onScan}
          disabled={disabled}
        >
          <Text style={styles.scanText}>Scanner</Text>
        </TouchableOpacity>
      ) : (
        <Ionicons name="checkmark-circle" size={24} color={Colors.success} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: Colors.white,
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  found: { backgroundColor: "#E8F5E9" },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: "500", color: Colors.black },
  quantity: { fontSize: 14, color: Colors.gray, marginTop: 2 },
  scanButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  scanText: { color: Colors.white, fontSize: 12 },
});
