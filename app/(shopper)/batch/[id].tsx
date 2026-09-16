import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { onValue, ref } from "firebase/database";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    SafeAreaView,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import Colors from "../../../constants/Colors";
import { database } from "../../../constants/firebase";

export default function BatchDetails() {
  const { id } = useLocalSearchParams();
  const [batch, setBatch] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const batchRef = ref(database, `batches/${id}`);
    const unsubscribe = onValue(batchRef, (snapshot) => {
      setBatch(snapshot.val());
      setLoading(false);
    });
    return () => unsubscribe();
  }, [id]);

  const startShopping = () => {
    router.push(`/(shopper)/shopping/${id}`);
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!batch) return null;

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
          Détails du lot
        </Text>
      </View>
      <View style={{ padding: 16 }}>
        <Text style={{ fontSize: 20, fontWeight: "bold" }}>
          {batch.storeName}
        </Text>
        <Text style={{ marginTop: 8 }}>📦 {batch.totalItems} articles</Text>
        <Text>🚚 {batch.distance} km</Text>
        <Text>💰 Gain estimé: {batch.estimatedEarnings} €</Text>
        <Text>🛒 Nombre de commandes: {batch.orderIds?.length || 0}</Text>
        <TouchableOpacity
          style={{
            backgroundColor: Colors.primary,
            paddingVertical: 14,
            borderRadius: 8,
            alignItems: "center",
            marginTop: 30,
          }}
          onPress={startShopping}
        >
          <Text
            style={{ color: Colors.white, fontSize: 18, fontWeight: "bold" }}
          >
            Commencer les courses
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
