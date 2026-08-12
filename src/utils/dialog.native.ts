import { Alert, Platform } from "react-native";
import { Prompt_show } from "./prompt.native";

export async function Dialog_confirm(message: string): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert("Confirm", message, [
      { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
      { text: "OK", onPress: () => resolve(true) },
    ]);
  });
}

// A pick between named branches, with dismissal ("Cancel") as a distinct answer — unlike
// Dialog_confirm, where declining and dismissing are the same thing.
export async function Dialog_choice(title: string, message: string, options: string[]): Promise<number | undefined> {
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      ...options.map((option, index) => ({ text: option, onPress: () => resolve(index) })),
      { text: "Cancel", style: "cancel" as const, onPress: () => resolve(undefined) },
    ]);
  });
}

export async function Dialog_prompt(message: string): Promise<string | undefined> {
  // Alert.prompt is iOS-only; on Android we render a custom prompt via PromptHost.
  if (Platform.OS === "android") {
    return new Promise((resolve) => {
      Prompt_show(message, resolve);
    });
  }
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
