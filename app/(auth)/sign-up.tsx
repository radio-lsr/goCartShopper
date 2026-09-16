import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import LottieView from "lottie-react-native";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_UPLOAD_PRESET,
} from "../../constants/cloudinary";
import { auth, database } from "../../constants/firebase";

const { width, height } = Dimensions.get("window");
const rw = (s: number) => (s * width) / 375;
const rh = (s: number) => (s * height) / 812;
const rf = (s: number) => Math.min(rw(s), rh(s) * 1.2);

export default function ShopperSignUp() {
  // === Informations personnelles ===
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState(""); // vérification âge
  const [address, setAddress] = useState(""); // adresse résidentielle
  const [gender, setGender] = useState<"male" | "female">("male"); // ✅ Genre

  // === Rôle du shopper ===
  const [role, setRole] = useState<"full_service" | "in_store">("full_service");

  // === Documents (selon le rôle) ===
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [idCardFront, setIdCardFront] = useState<string | null>(null);
  const [idCardBack, setIdCardBack] = useState<string | null>(null);
  const [driversLicense, setDriversLicense] = useState<string | null>(null);
  const [vehicleInsurance, setVehicleInsurance] = useState<string | null>(null); // assurance auto (Full-Service)

  // === Wallet Rapyd (remplace le compte bancaire) ===
  const [rapydWalletId, setRapydWalletId] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Sélection d’image
  const pickImage = async (setter: (uri: string) => void) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission", "Veuillez autoriser l'accès à la galerie.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled) setter(result.assets[0].uri);
  };

  const uploadToCloudinary = async (uri: string): Promise<string> => {
    const data = new FormData();
    data.append("file", {
      uri: uri,
      type: "image/jpeg",
      name: "upload.jpg",
    } as any);
    data.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
      {
        method: "POST",
        body: data,
      },
    );
    const result = await response.json();
    if (!response.ok) throw new Error(result.error?.message || "Upload failed");
    return result.secure_url;
  };

  const handleSignUp = async () => {
    // Vérifications générales
    if (
      !displayName ||
      !email ||
      !password ||
      !confirmPassword ||
      !dateOfBirth ||
      !address
    ) {
      Alert.alert(
        "Erreur",
        "Veuillez remplir tous les champs obligatoires (*)",
      );
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert("Erreur", "Les mots de passe ne correspondent pas");
      return;
    }
    // Vérification âge (au moins 18 ans, format JJ/MM/AAAA)
    const parts = dateOfBirth.split("/");
    if (parts.length !== 3) {
      Alert.alert("Erreur", "Format de date invalide (JJ/MM/AAAA)");
      return;
    }
    const birthYear = parseInt(parts[2]);
    if (!birthYear || new Date().getFullYear() - birthYear < 18) {
      Alert.alert(
        "Erreur",
        "Vous devez avoir au moins 18 ans pour devenir shopper",
      );
      return;
    }
    if (!profilePhoto || !idCardFront || !idCardBack) {
      Alert.alert(
        "Erreur",
        "Veuillez fournir la photo de profil, le recto et le verso de votre carte d'identité",
      );
      return;
    }

    // Vérifications selon le rôle
    if (role === "full_service") {
      if (!driversLicense) {
        Alert.alert(
          "Erreur",
          "Le permis de conduire est obligatoire pour les Full‑Service Shoppers",
        );
        return;
      }
      if (!vehicleInsurance) {
        Alert.alert(
          "Erreur",
          "L'attestation d'assurance automobile est obligatoire pour les Full‑Service Shoppers",
        );
        return;
      }
    }

    // Vérification du wallet Rapyd
    if (!rapydWalletId) {
      Alert.alert(
        "Wallet Rapyd",
        "Veuillez renseigner votre identifiant de portefeuille Rapyd (ewallet) pour recevoir vos gains.",
      );
      return;
    }

    if (!termsAccepted) {
      Alert.alert(
        "Conditions",
        "Vous devez accepter les conditions générales et la vérification d'identité",
      );
      return;
    }

    setLoading(true);
    setUploading(true);
    try {
      const userCredential = await auth.createUserWithEmailAndPassword(
        email,
        password,
      );
      const user = userCredential.user;
      if (!user) throw new Error("Erreur création compte");
      const uid = user.uid;

      // Upload des documents
      const [profileUrl, frontUrl, backUrl, licenseUrl, insuranceUrl] =
        await Promise.all([
          uploadToCloudinary(profilePhoto),
          uploadToCloudinary(idCardFront),
          uploadToCloudinary(idCardBack),
          driversLicense
            ? uploadToCloudinary(driversLicense)
            : Promise.resolve(null),
          vehicleInsurance
            ? uploadToCloudinary(vehicleInsurance)
            : Promise.resolve(null),
        ]);

      await database.ref(`shoppers/${uid}`).set({
        email,
        displayName,
        phoneNumber: phoneNumber || null,
        dateOfBirth,
        address,
        gender, // ✅ Stocker le genre
        role,
        isAvailable: false,
        status: "pending",
        documentsVerified: false,
        profilePhotoUrl: profileUrl,
        idFrontUrl: frontUrl,
        idBackUrl: backUrl,
        driversLicenseUrl: licenseUrl,
        vehicleInsuranceUrl: insuranceUrl,
        rapydWalletId,
        termsAccepted: true,
        createdAt: new Date().toISOString(),
      });

      Alert.alert(
        "Inscription enregistrée",
        "Votre dossier est en cours de vérification. Une fois approuvé, vous pourrez recevoir vos gains sur votre portefeuille Rapyd.",
        [{ text: "OK", onPress: () => router.replace("/(auth)/sign-in") }],
      );
    } catch (error: any) {
      Alert.alert("Erreur", error.message);
    } finally {
      setLoading(false);
      setUploading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.keyboardView}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.container}>
          <View style={styles.contentContainer}>
            <LottieView
              style={styles.cartAni}
              source={require("../../assets/41819-shopping-cart-icon.json")}
              autoPlay
              loop
            />
            <View style={styles.formSection}>
              {/* === Informations personnelles === */}
              <TextInput
                style={styles.input}
                placeholder="Nom complet *"
                value={displayName}
                onChangeText={setDisplayName}
              />
              <TextInput
                style={styles.input}
                placeholder="Email *"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
              />
              <TextInput
                style={styles.input}
                placeholder="Téléphone *"
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                keyboardType="phone-pad"
              />
              <TextInput
                style={styles.input}
                placeholder="Date de naissance (JJ/MM/AAAA) *"
                value={dateOfBirth}
                onChangeText={setDateOfBirth}
              />
              <TextInput
                style={styles.input}
                placeholder="Adresse résidentielle *"
                value={address}
                onChangeText={setAddress}
              />
              <TextInput
                style={styles.input}
                placeholder="Mot de passe *"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
              <TextInput
                style={styles.input}
                placeholder="Confirmer le mot de passe *"
                secureTextEntry
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />

              {/* === Genre === */}
              <Text style={styles.sectionTitle}>Genre *</Text>
              <View style={styles.roleContainer}>
                <TouchableOpacity
                  style={[
                    styles.roleButton,
                    gender === "male" && styles.roleActive,
                  ]}
                  onPress={() => setGender("male")}
                >
                  <Text
                    style={[
                      styles.roleText,
                      gender === "male" && styles.roleTextActive,
                    ]}
                  >
                    👨 Masculin
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.roleButton,
                    gender === "female" && styles.roleActive,
                  ]}
                  onPress={() => setGender("female")}
                >
                  <Text
                    style={[
                      styles.roleText,
                      gender === "female" && styles.roleTextActive,
                    ]}
                  >
                    👩 Féminin
                  </Text>
                </TouchableOpacity>
              </View>

              {/* === Choix du rôle === */}
              <Text style={styles.sectionTitle}>Type de shopper *</Text>
              <View style={styles.roleContainer}>
                <TouchableOpacity
                  style={[
                    styles.roleButton,
                    role === "full_service" && styles.roleActive,
                  ]}
                  onPress={() => setRole("full_service")}
                >
                  <Text
                    style={[
                      styles.roleText,
                      role === "full_service" && styles.roleTextActive,
                    ]}
                  >
                    🚚 Full‑Service
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.roleButton,
                    role === "in_store" && styles.roleActive,
                  ]}
                  onPress={() => setRole("in_store")}
                >
                  <Text
                    style={[
                      styles.roleText,
                      role === "in_store" && styles.roleTextActive,
                    ]}
                  >
                    🏬 In‑Store
                  </Text>
                </TouchableOpacity>
              </View>

              {/* === Documents généraux === */}
              <Text style={styles.sectionTitle}>
                Photo de profil (obligatoire)
              </Text>
              <TouchableOpacity
                style={styles.uploadBtn}
                onPress={() => pickImage(setProfilePhoto)}
              >
                <Text>
                  {profilePhoto
                    ? "✅ Photo téléchargée"
                    : "📸 Télécharger photo"}
                </Text>
              </TouchableOpacity>

              <Text style={styles.sectionTitle}>
                Carte d'identité (recto/verso)
              </Text>
              <TouchableOpacity
                style={styles.uploadBtn}
                onPress={() => pickImage(setIdCardFront)}
              >
                <Text>{idCardFront ? "✅ Recto téléchargé" : "📸 Recto"}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.uploadBtn}
                onPress={() => pickImage(setIdCardBack)}
              >
                <Text>{idCardBack ? "✅ Verso téléchargé" : "📸 Verso"}</Text>
              </TouchableOpacity>

              {/* === Documents spécifiques au rôle === */}
              {role === "full_service" && (
                <>
                  <Text style={styles.sectionTitle}>
                    Permis de conduire (obligatoire)
                  </Text>
                  <TouchableOpacity
                    style={styles.uploadBtn}
                    onPress={() => pickImage(setDriversLicense)}
                  >
                    <Text>
                      {driversLicense
                        ? "✅ Permis téléchargé"
                        : "🚗 Télécharger le permis"}
                    </Text>
                  </TouchableOpacity>
                  <Text style={styles.sectionTitle}>
                    Attestation d'assurance auto (obligatoire)
                  </Text>
                  <TouchableOpacity
                    style={styles.uploadBtn}
                    onPress={() => pickImage(setVehicleInsurance)}
                  >
                    <Text>
                      {vehicleInsurance
                        ? "✅ Assurance téléchargée"
                        : "📄 Télécharger l'attestation"}
                    </Text>
                  </TouchableOpacity>
                </>
              )}

              {/* === Wallet Rapyd === */}
              <Text style={styles.sectionTitle}>
                Portefeuille Rapyd (recevoir vos gains)
              </Text>
              <TextInput
                style={styles.input}
                placeholder="Identifiant du wallet Rapyd (ewallet) *"
                value={rapydWalletId}
                onChangeText={setRapydWalletId}
                autoCapitalize="none"
              />

              {/* === Acceptation des conditions === */}
              <View style={styles.checkboxContainer}>
                <Switch
                  value={termsAccepted}
                  onValueChange={setTermsAccepted}
                  trackColor={{ false: "#ccc", true: "#FF1493" }}
                  thumbColor={termsAccepted ? "#fff" : "#f4f3f4"}
                />
                <Text style={styles.checkboxLabel}>
                  J'accepte la vérification d'identité, l'extrait de casier
                  judiciaire et les conditions générales
                </Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.signupBtn,
                  (loading || uploading) && styles.disabledBtn,
                ]}
                onPress={handleSignUp}
                disabled={loading || uploading}
              >
                {loading || uploading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.signupText}>Postuler</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => router.back()}
                style={styles.loginContainer}
              >
                <Text style={styles.loginLink}>
                  Déjà un compte ?{" "}
                  <Text style={styles.loginLinkBold}>Se connecter</Text>
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardView: { flex: 1 },
  scrollContainer: { flexGrow: 1, justifyContent: "center", minHeight: height },
  container: { flex: 1, backgroundColor: "#fff" },
  contentContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: rh(20),
    paddingHorizontal: rw(20),
  },
  cartAni: { width: "100%", height: rh(200), maxWidth: 400 },
  formSection: { width: "100%", alignItems: "center", maxWidth: 400 },
  input: {
    backgroundColor: "#ADD8E6",
    borderRadius: 30,
    width: "100%",
    height: rh(45),
    paddingHorizontal: rw(15),
    marginBottom: rh(15),
    fontSize: rf(16),
    textAlign: "center",
  },
  sectionTitle: {
    fontSize: rf(16),
    fontWeight: "bold",
    marginVertical: rh(10),
    color: "#003f5c",
  },
  uploadBtn: {
    backgroundColor: "#E0E0E0",
    borderRadius: 30,
    width: "100%",
    paddingVertical: rh(12),
    alignItems: "center",
    marginBottom: rh(10),
  },
  roleContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: rh(15),
  },
  roleButton: {
    flex: 1,
    backgroundColor: "#E0E0E0",
    borderRadius: 30,
    paddingVertical: rh(12),
    alignItems: "center",
    marginHorizontal: 5,
  },
  roleActive: {
    backgroundColor: "#FF1493",
  },
  roleText: {
    fontSize: rf(12),
    color: "#333",
  },
  roleTextActive: {
    color: "white",
  },
  signupBtn: {
    width: "100%",
    borderRadius: 25,
    height: rh(50),
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FF1493",
    marginTop: rh(10),
  },
  signupText: { color: "white", fontSize: rf(18), fontWeight: "bold" },
  disabledBtn: { backgroundColor: "#ccc" },
  loginContainer: { marginTop: rh(20), padding: rw(10) },
  loginLink: { color: "#003f5c", fontSize: rf(16), textAlign: "center" },
  loginLinkBold: { fontWeight: "bold", color: "#FF1493" },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: rh(10),
    paddingHorizontal: rw(10),
  },
  checkboxLabel: {
    flex: 1,
    marginLeft: 10,
    fontSize: rf(12),
    color: "#333",
  },
});
