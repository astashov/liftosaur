import { View } from "react-native";
import { IconFilter } from "../icons/iconFilter";
import { LftText } from "../lftText";

export function HelpStats(): JSX.Element {
  return (
    <View>
      <LftText className="pb-2 text-xl">Add Measurement</LftText>
      <LftText className="pb-2">
        Here you enter your data points, what is your current bodyweight, calf size, bicep size, etc.
      </LftText>
      <LftText className="pb-2">
        You may track only the measurements you care about. You can setup the available input fields by clicking on the{" "}
        <IconFilter /> icon in the navbar.
      </LftText>
      <LftText className="pb-2">
        All fields are optional, if you skip them, those measurements just won't be added this time.
      </LftText>
    </View>
  );
}
