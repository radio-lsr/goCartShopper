import { useLocalSearchParams } from "expo-router";
import { onValue, push, ref } from "firebase/database";
import React, { useCallback, useEffect, useState } from "react";
import { SafeAreaView } from "react-native";
import { Bubble, GiftedChat } from "react-native-gifted-chat";
import Colors from "../../../constants/Colors";
import { database } from "../../../constants/firebase";

export default function ChatScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const [messages, setMessages] = useState<any[]>([]);

  useEffect(() => {
    if (!orderId) return;
    const chatRef = ref(database, `chats/${orderId}`);
    const unsubscribe = onValue(chatRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const msgList = Object.keys(data).map((key) => ({
          _id: key,
          text: data[key].message,
          createdAt: new Date(data[key].timestamp),
          user: {
            _id: data[key].from === "shopper" ? 1 : 2,
            name: data[key].from === "shopper" ? "Shopper" : "Client",
          },
        }));
        setMessages(msgList.reverse());
      } else {
        setMessages([]);
      }
    });
    return () => unsubscribe();
  }, [orderId]);

  const onSend = useCallback(
    async (newMessages: any[] = []) => {
      if (!orderId) return;
      const msg = newMessages[0];
      if (!msg) return;
      const chatRef = ref(database, `chats/${orderId}`);
      await push(chatRef, {
        from: "shopper",
        message: msg.text,
        timestamp: new Date().toISOString(),
        type: "text",
      });
    },
    [orderId],
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.white }}>
      <GiftedChat
        messages={messages}
        onSend={onSend}
        user={{ _id: 1 }}
        renderBubble={(props) => (
          <Bubble
            {...props}
            wrapperStyle={{
              right: { backgroundColor: Colors.primary },
              left: { backgroundColor: Colors.lightGray },
            }}
            textStyle={{
              right: { color: Colors.white },
              left: { color: Colors.black },
            }}
          />
        )}
      />
    </SafeAreaView>
  );
}
