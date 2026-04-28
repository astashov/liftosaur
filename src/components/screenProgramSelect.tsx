import { JSX, ReactNode } from "react";
import { View, Pressable, Image } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "./primitives/text";
import { Svg, Path } from "./primitives/svg";
import { IDispatch } from "../ducks/types";
import { ISettings } from "../types";
import { useNavOptions } from "../navigation/useNavOptions";
import { Thunk_pushScreen } from "../ducks/thunks";
import { IconDoc } from "./icons/iconDoc";
import { navigationRef } from "../navigation/navigationRef";
import { IconEditSquare } from "./icons/iconEditSquare";
import { IconLink } from "./icons/iconLink";
import { emptyProgramId, Program_selectProgram } from "../models/program";
import { IconEquipmentKettlebell } from "./icons/iconEquipmentKettlebell";
import { Tailwind_semantic } from "../utils/tailwindConfig";
import { HostConfig_resolveUrl } from "../utils/hostConfig";

interface IScreenProgramSelectProps {
  dispatch: IDispatch;
  settings: ISettings;
}

interface IOption {
  key: string;
  icon: ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}

export function ScreenProgramSelect(props: IScreenProgramSelectProps): JSX.Element {
  useNavOptions({ navHidden: true });
  const insets = useSafeAreaInsets();

  const options: IOption[] = [
    {
      key: "builtin",
      icon: <IconDoc width={24} height={24} />,
      title: "Pick a built-in program",
      description: "Choose from popular routines like 5/3/1, GZCLP, and more",
      onClick: () => props.dispatch(Thunk_pushScreen("programs")),
    },
    {
      key: "create",
      icon: <IconEditSquare />,
      title: "Create a program",
      description: "Build your own custom routine from scratch",
      onClick: () => navigationRef.navigate("createProgramModal"),
    },
    {
      key: "import",
      icon: <IconLink size={24} />,
      title: "Import from link",
      description: "Paste a link from the program web editor",
      onClick: () => navigationRef.navigate("importFromLinkModal"),
    },
    {
      key: "adhoc",
      icon: <IconEquipmentKettlebell size={24} />,
      title: "Go without program",
      description: "You can run adhoc workouts, and build the program along the way",
      onClick: () => Program_selectProgram(props.dispatch, emptyProgramId),
    },
  ];

  return (
    <View
      className="flex flex-col flex-1 bg-background-default"
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
    >
      <View className="flex-1 px-4 pt-8 pb-4">
        <View className="items-center p-4">
          <Image
            source={{ uri: HostConfig_resolveUrl("/images/dinoprogramselect.png") }}
            style={{ width: 208, height: 208 }}
            resizeMode="cover"
          />
        </View>
        <View className="px-2 -mt-1">
          <Text className="mb-2 text-xl font-bold text-center text-text-primary">Choose your program</Text>
          <Text className="mb-6 text-sm text-center text-text-secondary">
            How would you like to set up your training?
          </Text>

          <View className="gap-3">
            {options.map((opt) => (
              <Pressable
                key={opt.key}
                className="flex-row items-center w-full gap-3 px-4 py-4 border rounded-xl bg-background-subtlecardpurple border-border-cardpurple nm-program-select"
                data-testid={`program-select-${opt.key}`}
                testID={`program-select-${opt.key}`}
                onPress={opt.onClick}
              >
                <View>{opt.icon}</View>
                <View className="flex-1">
                  <Text className="text-sm font-semibold">{opt.title}</Text>
                  <Text className="text-xs text-text-secondary">{opt.description}</Text>
                </View>
                <View>
                  <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
                    <Path
                      d="M6 4l4 4-4 4"
                      stroke={Tailwind_semantic().icon.neutral}
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </Svg>
                </View>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}
