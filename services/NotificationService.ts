import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { database } from "../constants/firebase";

export async function registerForPushNotificationsAsync(shopperId: string) {
  let token;
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF1493",
    });
  }
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== "granted") {
    console.log("Permission refusée pour les notifications");
    return;
  }
  token = (await Notifications.getExpoPushTokenAsync()).data;
  await database.ref(`shoppers/${shopperId}/pushToken`).set(token);
  return token;
}

export function listenForNewBatches(onNewBatch: (batch: any) => void) {
  const batchesRef = database.ref("batches");
  const handler = batchesRef.on("child_added", (snapshot) => {
    const batch = snapshot.val();
    if (batch.status === "available") {
      onNewBatch(batch);
    }
  });
  return () => batchesRef.off("child_added", handler);
}
