import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Colors from "../constants/Colors";

interface ChatBubbleProps {
  message: any;
  isOwn: boolean;
}

export default function ChatBubble({ message, isOwn }: ChatBubbleProps) {
  return (
    <View style={[styles.container, isOwn ? styles.own : styles.other]}>
      <Text style={[styles.text, isOwn ? styles.ownText : styles.otherText]}>
        {message.text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    maxWidth: "80%",
    padding: 10,
    borderRadius: 10,
    marginVertical: 4,
  },
  own: { alignSelf: "flex-end", backgroundColor: Colors.primary },
  other: { alignSelf: "flex-start", backgroundColor: Colors.lightGray },
  text: { fontSize: 14 },
  ownText: { color: Colors.white },
  otherText: { color: Colors.black },
});
