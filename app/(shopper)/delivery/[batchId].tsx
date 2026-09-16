import * as Location from "expo-location";
import { router, useLocalSearchParams } from "expo-router";
import { get, ref, update } from "firebase/database";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    SafeAreaView,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import Colors from "../../../constants/Colors";
import { database } from "../../../constants/firebase";

export default function DeliveryScreen() {
  const { batchId } = useLocalSearchParams();
  const [destination, setDestination] = useState<any>(null);
  const [currentLocation, setCurrentLocation] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDestination();
    trackLocation();
  }, []);

  const loadDestination = async () => {
    const batchSnap = await get(ref(database, `batches/${batchId}`));
    const batch = batchSnap.val();
    const orderId = batch.orderIds?.[0];
    if (orderId) {
      const orderSnap = await get(ref(database, `orders/${orderId}`));
      const order = orderSnap.val();
      if (order?.deliveryAddress) {
        setDestination({
          latitude: order.deliveryAddress.lat || -4.31538,
          longitude: order.deliveryAddress.lng || 15.29187,
          address: `${order.deliveryAddress.street}, ${order.deliveryAddress.city}`,
        });
      }
    }
    setLoading(false);
  };

  const trackLocation = async () => {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission refusée", "Impossible de suivre votre position");
      return;
    }
    await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 5000,
        distanceInterval: 10,
      },
      (location) => {
        setCurrentLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
      },
    );
  };

  const completeDelivery = async () => {
    try {
      await update(ref(database, `batches/${batchId}`), {
        status: "completed",
        completedAt: new Date().toISOString(),
      });
      Alert.alert("Succès", "Livraison terminée !");
      router.replace("/(shopper)/home");
    } catch (error) {
      Alert.alert("Erreur", "Impossible de valider la livraison");
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!destination) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>Aucune adresse de livraison trouvée</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <MapView
        style={{ flex: 1 }}
        initialRegion={{
          latitude: currentLocation?.latitude || destination.latitude,
          longitude: currentLocation?.longitude || destination.longitude,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        }}
      >
        {currentLocation && (
          <Marker
            coordinate={currentLocation}
            title="Votre position"
            pinColor={Colors.primary}
          />
        )}
        <Marker
          coordinate={destination}
          title="Livraison"
          pinColor={Colors.secondary}
        />
      </MapView>
      <View style={{ padding: 16, backgroundColor: Colors.white }}>
        <Text>📍 {destination.address}</Text>
        <TouchableOpacity
          style={{
            backgroundColor: Colors.secondary,
            paddingVertical: 12,
            borderRadius: 8,
            marginTop: 12,
          }}
          onPress={completeDelivery}
        >
          <Text
            style={{
              color: Colors.white,
              textAlign: "center",
              fontWeight: "bold",
            }}
          >
            Confirmer la livraison
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
