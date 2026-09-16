import { Stack } from "expo-router";

export default function ShopperLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="home" />
      <Stack.Screen name="batch/[id]" />
      <Stack.Screen name="shopping/[batchId]" />
      <Stack.Screen name="delivery/[batchId]" />
      <Stack.Screen name="chat/[orderId]" />
      <Stack.Screen name="earnings" />
      <Stack.Screen name="preparation/[orderId]" />
    </Stack>
  );
}
