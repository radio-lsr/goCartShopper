import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { get, ref } from "firebase/database";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    SafeAreaView,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import Colors from "../../constants/Colors";
import { database } from "../../constants/firebase";

export default function EarningsScreen() {
  const [earnings, setEarnings] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEarnings();
  }, []);

  const loadEarnings = async () => {
    const shopperId = await AsyncStorage.getItem("@shopperId");
    const batchesRef = ref(database, "batches");
    const snapshot = await get(batchesRef);
    const data = snapshot.val();
    if (data) {
      const myBatches = Object.keys(data)
        .map((key) => ({ id: key, ...data[key] }))
        .filter((b) => b.shopperId === shopperId && b.status === "completed");
      let sum = 0;
      const list = myBatches.map((b) => {
        sum += b.estimatedEarnings;
        return {
          id: b.id,
          date: new Date(b.completedAt).toLocaleDateString(),
          amount: b.estimatedEarnings,
          store: b.storeName,
        };
      });
      setEarnings(list);
      setTotal(sum);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          padding: 16,
          backgroundColor: Colors.white,
        }}
      >
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.black} />
        </TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: "bold", marginLeft: 16 }}>
          Mes gains
        </Text>
      </View>
      <View
        style={{
          backgroundColor: Colors.primary,
          margin: 16,
          borderRadius: 12,
          padding: 20,
          alignItems: "center",
        }}
      >
        <Text style={{ color: Colors.white, fontSize: 16 }}>Gain total</Text>
        <Text style={{ color: Colors.white, fontSize: 32, fontWeight: "bold" }}>
          {total.toFixed(2)} €
        </Text>
      </View>
      <FlatList
        data={earnings}
        renderItem={({ item }) => (
          <View
            style={{
              backgroundColor: Colors.white,
              padding: 12,
              marginBottom: 8,
              borderRadius: 8,
              marginHorizontal: 16,
            }}
          >
            <Text style={{ fontWeight: "bold" }}>{item.store}</Text>
            <Text>{item.date}</Text>
            <Text
              style={{
                color: Colors.primary,
                fontWeight: "bold",
                marginTop: 4,
              }}
            >
              {item.amount.toFixed(2)} €
            </Text>
          </View>
        )}
        keyExtractor={(item) => item.id}
      />
    </SafeAreaView>
  );
}
