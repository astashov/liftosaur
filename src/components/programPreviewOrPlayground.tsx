import { JSX, ReactNode, useState } from "react";
import { View, Platform, Switch } from "react-native";
import { Text } from "./primitives/text";
import { ProgramPreviewPlayground } from "./preview/programPreviewPlayground";
import { IProgram, ISettings, IStats, IUnit } from "../types";
import { IconEditSquare } from "./icons/iconEditSquare";
import { MenuItemValue } from "./menuItemEditable";
import { IScrollableTabsProps } from "./scrollableTabs";

interface IProgramPreviewOrPlaygroundProps {
  program: IProgram;
  settings: ISettings;
  isMobile: boolean;
  hasNavbar?: boolean;
  onChangeUnit?: (unit: IUnit) => void;
  stats: IStats;
  useNavModals?: boolean;
  headerContent?: ReactNode;
  scrollableTabsProps?: Partial<IScrollableTabsProps>;
}

export function ProgramPreviewOrPlayground(props: IProgramPreviewOrPlaygroundProps): JSX.Element {
  const [isPlayground, setIsPlayground] = useState<boolean>(false);
  const isWeb = Platform.OS === "web";

  const playgroundHeader = (
    <View pointerEvents="box-none">
      {props.headerContent}
      {isWeb ? (
        <View className="mx-4 mt-2">
          {props.isMobile ? (
            <View className="flex-row items-center py-3">
              <Text className="flex-1 text-base text-text-primary">Enable Playground</Text>
              <Switch value={isPlayground} onValueChange={setIsPlayground} />
            </View>
          ) : (
            <View className="flex-row items-center">
              <Text className="mr-2">Enable Playground:</Text>
              <MenuItemValue
                type="desktop-select"
                setPatternError={() => undefined}
                name="Enable Playground"
                value={isPlayground ? "true" : "false"}
                values={[
                  ["true", "Yes"],
                  ["false", "No"],
                ]}
                onChange={(newValue) => setIsPlayground(newValue === "true")}
              />
              <View className="flex-row items-center ml-4">
                <Text className="mr-2">Units:</Text>
                <MenuItemValue
                  name="Units"
                  setPatternError={() => undefined}
                  type="desktop-select"
                  value={props.settings.units}
                  values={[
                    ["lb", "lb"],
                    ["kg", "kg"],
                  ]}
                  onChange={(newValue) => {
                    if (props.onChangeUnit) {
                      props.onChangeUnit(newValue as IUnit);
                    }
                  }}
                />
              </View>
            </View>
          )}
        </View>
      ) : (
        <View className="flex-row items-center py-3 mx-4 mt-2" pointerEvents="box-none">
          <Text className="flex-1 text-base text-text-primary" pointerEvents="none">
            Enable Playground
          </Text>
          <Switch value={isPlayground} onValueChange={setIsPlayground} />
        </View>
      )}
      {isPlayground && (
        <Text className="py-2 mx-4" pointerEvents="none">
          <Text className="text-sm">
            Playground mode emulates the workout, you can complete sets by tapping on squares below, and see how the
            program logic works. Some programs may do nothing, some may update the weights, some may switch to different
            set schemes. You can adjust your weights and other variables by clicking on the{" "}
          </Text>
          <IconEditSquare />
          <Text className="text-sm"> icon.</Text>
        </Text>
      )}
    </View>
  );

  return (
    <ProgramPreviewPlayground
      headerContent={playgroundHeader}
      hasNavbar={props.hasNavbar}
      key={isPlayground ? "playground" : "preview"}
      isPlayground={isPlayground}
      program={props.program}
      settings={props.settings}
      stats={props.stats}
      useNavModals={props.useNavModals}
      scrollableTabsProps={props.scrollableTabsProps}
    />
  );
}
