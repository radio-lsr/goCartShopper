import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Colors from "../constants/Colors";

interface BatchCardProps {
  batch: any;
  onPress: () => void;
}

export default function BatchCard({ batch, onPress }: BatchCardProps) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.header}>
        <Text style={styles.storeName}>{batch.storeName}</Text>
        <Text style={styles.earnings}>{batch.estimatedEarnings} €</Text>
      </View>
      <Text style={styles.info}>📦 {batch.totalItems} articles</Text>
      <Text style={styles.info}>🚚 {batch.distance} km</Text>
      <Text style={styles.info}>
        🛒 {batch.orderIds?.length || 0} commande(s)
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  storeName: { fontSize: 16, fontWeight: "bold", color: Colors.black },
  earnings: { fontSize: 16, fontWeight: "bold", color: Colors.primary },
  info: { fontSize: 14, color: Colors.gray, marginTop: 4 },
});
