import * as Location from "expo-location";
import { database } from "../constants/firebase";

export async function startLocationTracking(shopperId: string) {
  let { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== "granted") {
    console.log("Permission de localisation refusée");
    return;
  }
  await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.High,
      timeInterval: 10000,
      distanceInterval: 10,
    },
    async (location) => {
      const { latitude, longitude } = location.coords;
      await database.ref(`shoppers/${shopperId}/currentLocation`).set({
        lat: latitude,
        lng: longitude,
        updatedAt: new Date().toISOString(),
      });
    },
  );
}
