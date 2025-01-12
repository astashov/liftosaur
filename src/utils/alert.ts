import { Alert } from "react-native";

export class AlertUtils {
  public static confirm(question: string, args: { onYes?: () => void; onNo?: () => void }): void {
    Alert.alert(question, "", [
      {
        text: "No",
        style: "cancel",
        onPress: () => args.onNo?.(),
      },
      {
        text: "Yes",
        style: "default",
        onPress: () => args.onYes?.(),
      },
    ]);
  }
}
