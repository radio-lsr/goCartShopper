// app/(auth)/sign-in.tsx (version complète adaptée)
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import LottieView from "lottie-react-native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { auth, database } from "../../constants/firebase";
import { createCorporateWallet } from "../../services/RapydService";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const responsiveWidth = (size: number) => (size * SCREEN_WIDTH) / 375;
const responsiveHeight = (size: number) => (size * SCREEN_HEIGHT) / 812;
const responsiveFont = (size: number) =>
  Math.min(responsiveWidth(size), responsiveHeight(size) * 1.2);

export default function ShopperSignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [authMode, setAuthMode] = useState<"email" | "phone">("email");
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [confirmingCode, setConfirmingCode] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", () =>
      setKeyboardVisible(true),
    );
    const hide = Keyboard.addListener("keyboardDidHide", () =>
      setKeyboardVisible(false),
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  useEffect(() => {
    try {
      const authAny = auth as any;
      if (authAny.recaptchaVerifier) return;
      const verifier = new authAny.RecaptchaVerifier("signInButton", {
        size: "invisible",
      });
      authAny.recaptchaVerifier = verifier;
    } catch (error) {
      console.log("reCAPTCHA déjà initialisé", error);
    }
  }, []);

  // Fonction commune post-connexion
  const handlePostSignIn = async (user: firebase.User) => {
    const snapshot = await database.ref(`shoppers/${user.uid}`).once("value");
    const shopperData = snapshot.val();
    if (!shopperData) throw new Error("Compte shopper non trouvé");

    if (shopperData.status !== "approved") {
      let message = "Accès refusé. ";
      switch (shopperData.status) {
        case "pending":
          message +=
            "Votre inscription est en attente de validation par l'administrateur.";
          break;
        case "rejected":
          message += "Votre inscription a été rejetée. Contactez le support.";
          break;
        case "blocked":
          message += "Votre compte a été bloqué. Contactez le support.";
          break;
        default:
          message += "Statut de compte invalide.";
      }
      throw new Error(message);
    }

    // ✅ Vérifier et créer la carte virtuelle d'entreprise (corporate)
    let corporateCardId = shopperData.corporateCardId;
    if (!corporateCardId) {
      try {
        const { walletId, cardId } = await createCorporateWallet(user.uid);
        corporateCardId = cardId;
        await database.ref(`shoppers/${user.uid}`).update({
          corporateWalletId: walletId,
          corporateCardId: cardId,
        });
        console.log("Carte virtuelle créée pour le shopper");
      } catch (error) {
        console.error("Erreur création carte virtuelle:", error);
        Alert.alert(
          "Attention",
          "Impossible de créer votre carte virtuelle. Contactez le support.",
        );
      }
    }

    await AsyncStorage.setItem("@shopperId", user.uid);
    await AsyncStorage.setItem("@shopperRole", shopperData.role);
    await AsyncStorage.setItem("@corporateCardId", corporateCardId || "");
    router.replace("/(shopper)/home");
  };

  const handleEmailSignIn = async () => {
    if (!email || !password) {
      Alert.alert("Erreur", "Veuillez remplir tous les champs");
      return;
    }
    setLoading(true);
    try {
      const userCredential = await auth.signInWithEmailAndPassword(
        email,
        password,
      );
      const user = userCredential.user;
      if (!user) throw new Error("Utilisateur non trouvé");
      await handlePostSignIn(user);
    } catch (error: any) {
      Alert.alert("Erreur", error.message);
    } finally {
      setLoading(false);
    }
  };

  const sendVerificationCode = async () => {
    if (!phoneNumber) {
      Alert.alert("Erreur", "Veuillez entrer votre numéro de téléphone");
      return;
    }
    setLoading(true);
    try {
      let formattedPhone = phoneNumber;
      if (!phoneNumber.startsWith("+")) formattedPhone = "+243" + phoneNumber;
      const authAny = auth as any;
      const provider = new authAny.PhoneAuthProvider();
      const verificationId = await provider.verifyPhoneNumber(
        formattedPhone,
        authAny.recaptchaVerifier,
      );
      setVerificationId(verificationId);
      setConfirmingCode(true);
      Alert.alert("Succès", "Code de vérification envoyé par SMS");
    } catch (error: any) {
      Alert.alert("Erreur", error.message);
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async () => {
    if (!verificationCode) {
      Alert.alert("Erreur", "Veuillez entrer le code de vérification");
      return;
    }
    setLoading(true);
    try {
      const authAny = auth as any;
      const credential = authAny.PhoneAuthProvider.credential(
        verificationId!,
        verificationCode,
      );
      const userCredential = await auth.signInWithCredential(credential);
      const user = userCredential.user;
      if (!user) throw new Error("Utilisateur non trouvé");
      await handlePostSignIn(user);
    } catch (error: any) {
      Alert.alert("Erreur", error.message);
    } finally {
      setLoading(false);
    }
  };

  const resetAuth = () => {
    setConfirmingCode(false);
    setVerificationId(null);
    setVerificationCode("");
    setPhoneNumber("");
  };

  const availableHeight = SCREEN_HEIGHT - responsiveHeight(300);
  const dynamicMargin = Math.max(responsiveHeight(10), availableHeight * 0.05);

  if (confirmingCode) {
    return (
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.container}>
            <View style={styles.contentContainer}>
              <Text style={styles.verificationTitle}>Vérification du code</Text>
              <Text style={styles.verificationSubtitle}>
                Entrez le code à 6 chiffres envoyé au {phoneNumber}
              </Text>
              <View style={[styles.inputView, { marginBottom: dynamicMargin }]}>
                <TextInput
                  style={styles.TextInput}
                  placeholder="Code de vérification"
                  placeholderTextColor="#003f5c"
                  onChangeText={setVerificationCode}
                  value={verificationCode}
                  keyboardType="number-pad"
                  maxLength={6}
                  autoComplete="sms-otp"
                />
              </View>
              <TouchableOpacity
                style={[styles.loginBtn, loading && styles.disabledBtn]}
                onPress={verifyCode}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.loginText}>Vérifier le code</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity onPress={resetAuth}>
                <Text style={styles.forgot_button}>Changer de numéro</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.keyboardView}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContainer,
          keyboardVisible && styles.scrollContainerKeyboard,
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          <View style={styles.contentContainer}>
            <LottieView
              style={styles.cartAni}
              source={require("../../assets/41819-shopping-cart-icon.json")}
              autoPlay
              loop
            />
            <View
              style={[styles.authModeSelector, { width: responsiveWidth(300) }]}
            >
              <TouchableOpacity
                style={[
                  styles.modeButton,
                  authMode === "email" && styles.activeModeButton,
                ]}
                onPress={() => setAuthMode("email")}
              >
                <Text
                  style={[
                    styles.modeButtonText,
                    authMode === "email" && styles.activeModeButtonText,
                  ]}
                >
                  Email
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modeButton,
                  authMode === "phone" && styles.activeModeButton,
                ]}
                onPress={() => setAuthMode("phone")}
              >
                <Text
                  style={[
                    styles.modeButtonText,
                    authMode === "phone" && styles.activeModeButtonText,
                  ]}
                >
                  Téléphone
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.formSection}>
              {authMode === "email" && (
                <>
                  <View
                    style={[styles.inputView, { marginBottom: dynamicMargin }]}
                  >
                    <TextInput
                      style={styles.TextInput}
                      placeholder="Email"
                      placeholderTextColor="#003f5c"
                      onChangeText={setEmail}
                      value={email}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  </View>
                  <View
                    style={[
                      styles.inputView,
                      { marginBottom: dynamicMargin * 0.8 },
                    ]}
                  >
                    <TextInput
                      style={styles.TextInput}
                      placeholder="Mot de passe"
                      placeholderTextColor="#003f5c"
                      secureTextEntry
                      onChangeText={setPassword}
                      value={password}
                    />
                  </View>
                  <TouchableOpacity
                    onPress={() =>
                      Alert.alert("Info", "Fonctionnalité à venir")
                    }
                  >
                    <Text style={styles.forgot_button}>
                      Mot de passe oublié ?
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.loginBtn, loading && styles.disabledBtn]}
                    onPress={handleEmailSignIn}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <Text style={styles.loginText}>Se connecter</Text>
                    )}
                  </TouchableOpacity>
                </>
              )}
              {authMode === "phone" && (
                <>
                  <View
                    style={[styles.inputView, { marginBottom: dynamicMargin }]}
                  >
                    <TextInput
                      style={styles.TextInput}
                      placeholder="ex: 840724925 ou +243840724925"
                      placeholderTextColor="#003f5c"
                      onChangeText={setPhoneNumber}
                      value={phoneNumber}
                      keyboardType="phone-pad"
                    />
                  </View>
                  <TouchableOpacity
                    style={[styles.loginBtn, loading && styles.disabledBtn]}
                    onPress={sendVerificationCode}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <Text style={styles.loginText}>Envoyer le code</Text>
                    )}
                  </TouchableOpacity>
                </>
              )}
              <TouchableOpacity
                onPress={() => router.push("/(auth)/sign-up")}
                style={styles.signupContainer}
              >
                <Text style={styles.signupLink}>
                  Pas de compte ?{" "}
                  <Text style={styles.signupLinkBold}>S'inscrire</Text>
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
      <View id="signInButton" style={{ height: 0, width: 0 }} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardView: { flex: 1 },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    minHeight: SCREEN_HEIGHT,
  },
  scrollContainerKeyboard: {
    paddingTop: responsiveHeight(20),
    justifyContent: "flex-start",
  },
  container: { flex: 1, backgroundColor: "#fff" },
  contentContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: responsiveHeight(20),
    paddingHorizontal: responsiveWidth(20),
  },
  cartAni: { width: "100%", height: responsiveHeight(200), maxWidth: 400 },
  formSection: { width: "100%", alignItems: "center", maxWidth: 400 },
  inputView: {
    backgroundColor: "#ADD8E6",
    borderRadius: 30,
    width: "100%",
    maxWidth: 400,
    height: responsiveHeight(45),
    alignItems: "center",
    justifyContent: "center",
  },
  TextInput: {
    height: responsiveHeight(45),
    flex: 1,
    padding: responsiveWidth(10),
    textAlign: "center",
    width: "100%",
    fontSize: responsiveFont(16),
  },
  forgot_button: {
    height: responsiveHeight(30),
    paddingTop: responsiveHeight(10),
    color: "#003f5c",
    fontSize: responsiveFont(14),
    textAlign: "center",
  },
  loginBtn: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 25,
    height: responsiveHeight(50),
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FF1493",
  },
  loginText: {
    color: "white",
    fontSize: responsiveFont(18),
    fontWeight: "bold",
  },
  disabledBtn: { backgroundColor: "#cccccc" },
  signupContainer: {
    marginTop: responsiveHeight(10),
    padding: responsiveWidth(10),
  },
  signupLink: {
    color: "#003f5c",
    fontSize: responsiveFont(16),
    textAlign: "center",
  },
  signupLinkBold: { fontWeight: "bold", color: "#FF1493" },
  authModeSelector: {
    flexDirection: "row",
    marginBottom: responsiveHeight(25),
    backgroundColor: "#f0f0f0",
    borderRadius: 25,
    padding: responsiveWidth(5),
    height: responsiveHeight(50),
  },
  modeButton: {
    flex: 1,
    paddingVertical: responsiveHeight(10),
    paddingHorizontal: responsiveWidth(20),
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  activeModeButton: { backgroundColor: "#FF1493" },
  modeButtonText: {
    color: "#003f5c",
    fontWeight: "600",
    fontSize: responsiveFont(16),
  },
  activeModeButtonText: { color: "white" },
  verificationTitle: {
    fontSize: responsiveFont(22),
    fontWeight: "bold",
    color: "#003f5c",
    marginBottom: responsiveHeight(10),
    textAlign: "center",
  },
  verificationSubtitle: {
    fontSize: responsiveFont(16),
    color: "#666",
    textAlign: "center",
    marginBottom: responsiveHeight(25),
    paddingHorizontal: responsiveWidth(20),
    lineHeight: responsiveHeight(20),
  },
});
