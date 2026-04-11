import { Alert } from "react-native";

export async function Dialog_confirm(message: string): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert("Confirm", message, [
      { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
      { text: "OK", onPress: () => resolve(true) },
    ]);
  });
}

export async function Dialog_prompt(message: string): Promise<string | undefined> {
  return new Promise((resolve) => {
    Alert.prompt(
      "Confirm",
      message,
      [
        { text: "Cancel", style: "cancel", onPress: () => resolve(undefined) },
        { text: "OK", onPress: (value?: string) => resolve(value) },
      ],
      "plain-text"
    );
  });
}

export function Dialog_alert(message: string): void {
  Alert.alert("", message);
}
