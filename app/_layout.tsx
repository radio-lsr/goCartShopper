import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack, router, useRootNavigationState } from "expo-router";
import { useEffect } from "react";
import { auth } from "../constants/firebase";

export default function RootLayout() {
  const navigationState = useRootNavigationState();

  useEffect(() => {
    if (!navigationState?.key) return;
    const checkAuth = async () => {
      const user = auth.currentUser;
      const shopperId = await AsyncStorage.getItem("@shopperId");
      if (user && shopperId) {
        router.replace("/(shopper)/home");
      } else {
        router.replace("/(auth)/sign-in");
      }
    };
    checkAuth();
  }, [navigationState]);

  return <Stack screenOptions={{ headerShown: false }} />;
}
