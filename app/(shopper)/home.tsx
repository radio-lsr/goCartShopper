// app/(shopper)/home.tsx
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import { router } from "expo-router";
import { onValue, ref, update } from "firebase/database";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { WebView } from "react-native-webview";
import BatchCard from "../../components/BatchCard";
import Colors from "../../constants/Colors";
import { database } from "../../constants/firebase";

const { width, height } = Dimensions.get("window");
const MAP_HEIGHT = height * 0.35;

// Coordonnées de Kinshasa (fallback)
const KINSHASA_LAT = -4.31538;
const KINSHASA_LNG = 15.29187;

// Extraction des coordonnées des magasins (adapté à votre structure)
const getStoreCoordinates = (
  store: any,
): { lat: number | null; lng: number | null } => {
  let lat = null,
    lng = null;
  if (store.latitude !== undefined && store.longitude !== undefined) {
    lat = parseFloat(store.latitude);
    lng = parseFloat(store.longitude);
  } else if (
    store.coordinates &&
    store.coordinates.lat &&
    store.coordinates.lng
  ) {
    lat = parseFloat(store.coordinates.lat);
    lng = parseFloat(store.coordinates.lng);
  }
  return { lat, lng };
};

// Vérifie si les coordonnées sont plausibles pour Kinshasa / Afrique
const isValidLocation = (lat: number, lng: number): boolean => {
  // Afrique subsaharienne : latitude entre -35° et 5°, longitude entre -20° et 60°
  return lat >= -35 && lat <= 5 && lng >= -20 && lng <= 60;
};

// Génération de la carte Leaflet avec l'icône 🛒
const getMapHtml = (stores: any[], userLat: number, userLng: number) => {
  // Ne garder que les magasins avec coordonnées valides
  const storesWithNumbers = stores
    .map((store) => {
      const { lat, lng } = getStoreCoordinates(store);
      return { ...store, latitude: lat, longitude: lng };
    })
    .filter(
      (s) =>
        s.latitude !== null &&
        s.longitude !== null &&
        isValidLocation(s.latitude, s.longitude),
    );

  return `
<!DOCTYPE html>
<html>
<head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"/>
    <title>Map</title>
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <style>
        body, html, #map { margin: 0; padding: 0; height: 100%; width: 100%; }
        .user-marker { background: none; border: none; font-size: 24px; }
        .cart-marker { background: none; border: none; font-size: 28px; text-align: center; line-height: 1; cursor: pointer; }
    </style>
</head>
<body>
    <div id="map"></div>
    <script>
        var map = L.map('map').setView([${userLat}, ${userLng}], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        }).addTo(map);
        L.marker([${userLat}, ${userLng}], { icon: L.divIcon({ className: 'user-marker', html: '📍', iconSize: [24, 24] }) })
            .addTo(map).bindPopup('Votre position');
        var cartIcon = L.divIcon({ className: 'cart-marker', html: '🛒', iconSize: [28, 28], popupAnchor: [0, -14] });
        const stores = ${JSON.stringify(storesWithNumbers)};
        stores.forEach(store => {
            if (store.latitude && store.longitude) {
                var marker = L.marker([store.latitude, store.longitude], { icon: cartIcon }).addTo(map);
                marker.bindPopup(\`<b>\${store.name}</b><br/>\${store.address || ''}<br/><button onclick="selectStore('\${store.id}')">Sélectionner</button>\`);
                marker.on('click', function() {
                    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'storeSelect', storeId: store.id }));
                });
            }
        });
        function selectStore(storeId) {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'storeSelect', storeId: storeId }));
        }
    </script>
</body>
</html>
`;
};

export default function ShopperHome() {
  const [role, setRole] = useState<string | null>(null);
  const [batches, setBatches] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [selectedStore, setSelectedStore] = useState<any | null>(null);
  const [mapKey, setMapKey] = useState(0);
  const webViewRef = useRef<WebView>(null);

  useEffect(() => {
    loadRoleAndInit();
  }, []);

  const loadRoleAndInit = async () => {
    const storedRole = await AsyncStorage.getItem("@shopperRole");
    setRole(storedRole);
    if (storedRole === "full_service") {
      await getCurrentLocation();
      loadStores();
    } else {
      setLoading(false);
    }
  };

  const getCurrentLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      // Permission refusée → fallback Kinshasa
      setUserLocation({ latitude: KINSHASA_LAT, longitude: KINSHASA_LNG });
      return;
    }
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        timeout: 15000,
      });
      let lat = location.coords.latitude;
      let lng = location.coords.longitude;
      // Vérifier si la position est plausible (pas dans l'Atlantique ou aux US)
      if (!isValidLocation(lat, lng)) {
        console.warn(
          `Position invalide (${lat}, ${lng}) – utilisation de Kinshasa`,
        );
        lat = KINSHASA_LAT;
        lng = KINSHASA_LNG;
      }
      setUserLocation({ latitude: lat, longitude: lng });
    } catch (error) {
      console.error("Erreur de géolocalisation", error);
      setUserLocation({ latitude: KINSHASA_LAT, longitude: KINSHASA_LNG });
    }
  };

  const loadStores = () => {
    const storesRef = ref(database, "stores");
    onValue(storesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const storesList = Object.keys(data).map((key) => ({
          id: key,
          ...data[key],
        }));
        // Filtrer les magasins avec coordonnées valides
        const validStores = storesList.filter((store) => {
          const { lat, lng } = getStoreCoordinates(store);
          return lat !== null && lng !== null && isValidLocation(lat, lng);
        });
        setStores(validStores);
        loadBatchesFromOrders(validStores);
      } else {
        setStores([]);
        setLoading(false);
      }
    });
  };

  // Récupère les commandes delivery non assignées et les groupe par magasin
  const loadBatchesFromOrders = (storesList: any[]) => {
    const ordersRef = ref(database, "orders");
    onValue(ordersRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        setBatches([]);
        setLoading(false);
        return;
      }

      const ordersList = Object.keys(data).map((key) => ({
        id: key,
        ...data[key],
      }));
      // Filtre : orderType = "delivery", status = "pending", pas encore de shopperId
      const deliveryOrders = ordersList.filter(
        (order) =>
          order.orderType === "delivery" &&
          order.status === "pending" &&
          !order.shopperId,
      );

      // Regroupement par storeId
      const groups: { [storeId: string]: any[] } = {};
      deliveryOrders.forEach((order) => {
        const storeId = order.storeId;
        if (!groups[storeId]) groups[storeId] = [];
        groups[storeId].push(order);
      });

      // Création des lots virtuels (batches)
      const virtualBatches = Object.keys(groups).map((storeId) => {
        const storeOrders = groups[storeId];
        const totalItems = storeOrders.reduce(
          (sum, order) => sum + (order.items?.length || 0),
          0,
        );
        const estimatedEarnings = storeOrders.reduce(
          (sum, order) => sum + (order.total || 0),
          0,
        );
        const store = storesList.find((s) => s.id === storeId);
        return {
          id: `tmp_${storeId}_${Date.now()}_${Math.random()}`,
          storeId,
          storeName: store?.name || "Magasin",
          orderIds: storeOrders.map((o) => o.id),
          totalItems,
          estimatedEarnings,
          distance: 0, // à calculer plus tard si besoin (via géolocalisation)
          status: "available",
        };
      });

      // Filtrer selon le magasin sélectionné sur la carte
      const filtered = virtualBatches.filter((batch) =>
        selectedStore ? batch.storeId === selectedStore.id : true,
      );
      setBatches(filtered);
      setLoading(false);
    });
  };

  // Acceptation d'un lot : assigne toutes les commandes au shopper
  const acceptBatch = async (batch: any) => {
    Alert.alert(
      "Accepter le lot",
      `Gain estimé : ${batch.estimatedEarnings.toFixed(2)} €\nNombre de commandes : ${batch.orderIds.length}\nVoulez-vous accepter ce lot ?`,
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Accepter",
          onPress: async () => {
            const shopperId = await AsyncStorage.getItem("@shopperId");
            const updates: any = {};
            batch.orderIds.forEach((orderId: string) => {
              updates[`orders/${orderId}/shopperId`] = shopperId;
              updates[`orders/${orderId}/status`] = "assigned";
              updates[`orders/${orderId}/assignedAt`] =
                new Date().toISOString();
            });
            await update(ref(database), updates);
            // Rediriger vers l'écran de shopping avec les IDs des commandes
            router.push({
              pathname: "/(shopper)/shopping/[batchId]",
              params: {
                batchId: batch.id,
                orderIds: JSON.stringify(batch.orderIds),
              },
            });
          },
        },
      ],
    );
  };

  const handleMessage = useCallback(
    (event: any) => {
      try {
        const data = JSON.parse(event.nativeEvent.data);
        if (data.type === "storeSelect") {
          const store = stores.find((s) => s.id === data.storeId);
          if (store) setSelectedStore(store);
        }
      } catch (error) {
        console.error(error);
      }
    },
    [stores],
  );

  const refreshMap = () => setMapKey((k) => k + 1);
  useEffect(() => {
    if (userLocation && stores.length) refreshMap();
  }, [userLocation, stores]);

  useEffect(() => {
    if (stores.length) loadBatchesFromOrders(stores);
  }, [selectedStore, stores]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (role !== "full_service") {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Commandes à préparer</Text>
        </View>
        <View style={styles.center}>
          <Text>Fonctionnalité in-store à implémenter</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.mapContainer}>
        {userLocation && stores.length > 0 ? (
          <WebView
            key={mapKey}
            ref={webViewRef}
            source={{
              html: getMapHtml(
                stores,
                userLocation.latitude,
                userLocation.longitude,
              ),
            }}
            style={styles.map}
            onMessage={handleMessage}
            javaScriptEnabled
            domStorageEnabled
          />
        ) : (
          <View style={styles.center}>
            <Text style={{ color: Colors.gray }}>
              {!userLocation
                ? "Position en attente..."
                : "Aucun magasin disponible"}
            </Text>
          </View>
        )}
        {/* Affichage de la position actuelle + bouton recentrage */}
        {userLocation && (
          <View style={styles.locationDebug}>
            <Text style={styles.locationText}>
              📍 {userLocation.latitude.toFixed(4)},{" "}
              {userLocation.longitude.toFixed(4)}
            </Text>
            <TouchableOpacity
              onPress={refreshMap}
              style={styles.recenterButton}
            >
              <Text style={styles.recenterText}>Recentrer la carte</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={styles.header}>
        <Text style={styles.title}>
          {selectedStore
            ? `Batches – ${selectedStore.name}`
            : "Commandes à livrer"}
        </Text>
        {selectedStore && (
          <TouchableOpacity onPress={() => setSelectedStore(null)}>
            <Text style={{ color: Colors.primary }}>🔁 Tous</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={() => router.push("/(shopper)/earnings")}>
          <Text style={{ color: Colors.primary }}>💰 Gains</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={batches}
        renderItem={({ item }) => (
          <BatchCard batch={item} onPress={() => acceptBatch(item)} />
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <Text style={styles.emptyText}>Aucune commande disponible</Text>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  mapContainer: {
    height: MAP_HEIGHT,
    width: "100%",
    backgroundColor: "#f0f0f0",
  },
  map: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: Colors.white,
  },
  title: { fontSize: 18, fontWeight: "bold", color: Colors.black, flex: 1 },
  listContent: { padding: 16 },
  emptyText: { textAlign: "center", marginTop: 50, color: Colors.gray },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  locationDebug: {
    position: "absolute",
    bottom: 8,
    left: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 8,
    padding: 6,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  locationText: { color: "white", fontSize: 12 },
  recenterButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  recenterText: { color: "white", fontSize: 12, fontWeight: "bold" },
});
