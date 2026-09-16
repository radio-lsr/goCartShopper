import { Ionicons } from "@expo/vector-icons";
import { CameraView } from "expo-camera";
import { router, useLocalSearchParams } from "expo-router";
import { get, push, ref } from "firebase/database";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    SafeAreaView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import ProductItem from "../../../components/ProductItem";
import Colors from "../../../constants/Colors";
import { database } from "../../../constants/firebase";

export default function ShoppingScreen() {
  const { batchId } = useLocalSearchParams<{ batchId: string }>();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [replacementModal, setReplacementModal] = useState(false);
  const [replacementText, setReplacementText] = useState("");

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    const batchSnap = await get(ref(database, `batches/${batchId}`));
    const batch = batchSnap.val();
    const orderIds = batch.orderIds || [];
    let allProducts: any[] = [];
    for (const orderId of orderIds) {
      const orderSnap = await get(ref(database, `orders/${orderId}`));
      const order = orderSnap.val();
      if (order?.items) {
        allProducts.push(
          ...order.items.map((item: any) => ({
            ...item,
            orderId,
            found: false,
          })),
        );
      }
    }
    setProducts(allProducts);
    setLoading(false);
  };

  const handleScan = (product: any) => {
    setSelectedProduct(product);
    setScanning(true);
  };

  const onBarcodeScanned = (result: { data: string }) => {
    setScanning(false);
    if (selectedProduct && result.data === selectedProduct.barcode) {
      const updated = products.map((p) =>
        p === selectedProduct ? { ...p, found: true } : p,
      );
      setProducts(updated);
      Alert.alert("Succès", "Produit scanné");
    } else {
      setReplacementModal(true);
    }
  };

  const proposeReplacement = async () => {
    if (!replacementText.trim()) {
      Alert.alert("Erreur", "Veuillez entrer un produit de remplacement");
      return;
    }
    const chatRef = ref(database, `chats/${selectedProduct.orderId}`);
    await push(chatRef, {
      from: "shopper",
      message: `Le produit "${selectedProduct.name}" est indisponible. Proposez-vous "${replacementText}" comme remplacement ?`,
      timestamp: new Date().toISOString(),
      type: "replacement_proposal",
      originalProduct: selectedProduct.name,
      replacementProduct: replacementText,
      status: "pending",
    });
    Alert.alert("Proposition envoyée", "En attente de la réponse du client");
    setReplacementModal(false);
    setReplacementText("");
  };

  const allFound = products.length > 0 && products.every((p) => p.found);

  const proceedToCheckout = () => {
    router.push(`/(shopper)/delivery/${batchId}`);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.black} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Courses</Text>
        <TouchableOpacity
          style={styles.chatButton}
          onPress={() => router.push(`/(shopper)/chat/${products[0]?.orderId}`)}
        >
          <Ionicons
            name="chatbubble-outline"
            size={24}
            color={Colors.primary}
          />
        </TouchableOpacity>
      </View>

      <FlatList
        data={products}
        renderItem={({ item }) => (
          <ProductItem
            product={item}
            onScan={() => handleScan(item)}
            disabled={scanning}
          />
        )}
        keyExtractor={(_, index) => index.toString()}
        contentContainerStyle={styles.listContent}
      />

      <TouchableOpacity
        style={[
          styles.checkoutButton,
          allFound ? styles.active : styles.disabled,
        ]}
        disabled={!allFound}
        onPress={proceedToCheckout}
      >
        <Text style={styles.checkoutText}>Passer à la caisse</Text>
      </TouchableOpacity>

      {/* Modal scan */}
      {scanning && (
        <Modal visible={scanning} animationType="slide">
          <CameraView
            style={styles.camera}
            onBarcodeScanned={onBarcodeScanned}
            barcodeScannerSettings={{
              barcodeTypes: [
                "ean13",
                "ean8",
                "upc_a",
                "upc_e",
                "code128",
                "code39",
              ],
            }}
          >
            <TouchableOpacity
              style={styles.closeCamera}
              onPress={() => setScanning(false)}
            >
              <Text style={styles.closeCameraText}>Fermer</Text>
            </TouchableOpacity>
          </CameraView>
        </Modal>
      )}

      {/* Modal remplacement */}
      <Modal visible={replacementModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Produit indisponible</Text>
            <Text>Proposez un remplacement pour :</Text>
            <Text style={styles.productName}>{selectedProduct?.name}</Text>
            <TextInput
              style={styles.input}
              placeholder="Nom du produit de remplacement"
              value={replacementText}
              onChangeText={setReplacementText}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                onPress={() => setReplacementModal(false)}
                style={styles.cancelButton}
              >
                <Text>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={proposeReplacement}
                style={styles.proposeButton}
              >
                <Text style={styles.proposeButtonText}>Proposer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: Colors.white,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginLeft: 16,
    flex: 1,
  },
  chatButton: {
    marginLeft: "auto",
  },
  listContent: {
    padding: 16,
  },
  checkoutButton: {
    paddingVertical: 14,
    alignItems: "center",
    margin: 16,
    borderRadius: 8,
  },
  active: {
    backgroundColor: Colors.secondary,
  },
  disabled: {
    backgroundColor: Colors.lightGray,
  },
  checkoutText: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: "bold",
  },
  camera: {
    flex: 1,
  },
  closeCamera: {
    position: "absolute",
    top: 40,
    right: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: 10,
    borderRadius: 5,
  },
  closeCameraText: {
    color: Colors.white,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 20,
    width: "80%",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  productName: {
    fontWeight: "bold",
    marginVertical: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.lightGray,
    borderRadius: 8,
    padding: 10,
    marginVertical: 10,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  cancelButton: {
    padding: 10,
  },
  proposeButton: {
    backgroundColor: Colors.primary,
    padding: 10,
    borderRadius: 8,
  },
  proposeButtonText: {
    color: Colors.white,
  },
});
