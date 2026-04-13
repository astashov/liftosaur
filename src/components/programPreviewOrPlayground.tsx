import { JSX, ReactNode, useState } from "react";
import { View, Platform } from "react-native";
import { Text } from "./primitives/text";
import { ProgramPreviewPlayground } from "./preview/programPreviewPlayground";
import { IProgram, ISettings, IStats, IUnit } from "../types";
import { IconEditSquare } from "./icons/iconEditSquare";
import { MenuItemEditable, MenuItemValue } from "./menuItemEditable";
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
      {isWeb && (
        <View className="mx-4 mt-2">
          {props.isMobile ? (
            <MenuItemEditable
              type="boolean"
              name="Enable Playground"
              value={isPlayground ? "true" : "false"}
              onChange={(newValue) => setIsPlayground(newValue === "true")}
            />
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
      )}
      {isPlayground && (
        <View className="py-2 mx-4">
          <Text className="text-sm">
            Playground mode emulates the workout, you can complete sets by tapping on squares below, and see how the
            program logic works. Some programs may do nothing, some may update the weights, some may switch to different
            set schemes. You can adjust your weights and other variables by clicking on the{" "}
          </Text>
          <IconEditSquare />
          <Text className="text-sm"> icon.</Text>
        </View>
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
