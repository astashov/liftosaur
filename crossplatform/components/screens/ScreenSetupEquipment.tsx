import React from "react";
import { View, Text, Pressable, Image, ScrollView, Switch } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { IDispatch } from "@shared/ducks/types";
import type { ISettings } from "@shared/types";
import type { IState } from "@shared/models/state";
import { Thunk_pushScreen } from "@shared/ducks/thunks";
import {
  Equipment_getCurrentGym,
  Equipment_getEquipmentData,
  Equipment_getEquipmentOfGym,
} from "@shared/models/equipment";
import { equipmentName } from "@shared/models/exercise";
import { ObjectUtils_keys } from "@shared/utils/object";
import { lb } from "lens-shmens";
import { Button } from "../Button";
import { IconEquipmentBarbell } from "../icons/IconEquipmentBarbell";
import { IconEquipmentTrapbar } from "../icons/IconEquipmentTrapbar";
import { IconEquipmentLeverageMachine } from "../icons/IconEquipmentLeverageMachine";
import { IconEquipmentSmith } from "../icons/IconEquipmentSmith";
import { IconEquipmentDumbbell } from "../icons/IconEquipmentDumbbell";
import { IconEquipmentEzBar } from "../icons/IconEquipmentEzBar";
import { IconEquipmentCable } from "../icons/IconEquipmentCable";
import { IconEquipmentKettlebell } from "../icons/IconEquipmentKettlebell";
import { Tailwind_semantic } from "@shared/utils/tailwindConfig";

interface IProps {
  dispatch: IDispatch;
  settings: ISettings;
  selectedGymId?: string;
}

declare const __HOST__: string;
const IMAGE_BASE = `${__HOST__}/images`;

const equipmentToIcon: Record<string, () => React.ReactElement> = {
  barbell: () => <IconEquipmentBarbell />,
  trapbar: () => <IconEquipmentTrapbar />,
  leverageMachine: () => <IconEquipmentLeverageMachine />,
  smith: () => <IconEquipmentSmith />,
  dumbbell: () => <IconEquipmentDumbbell />,
  ezbar: () => <IconEquipmentEzBar />,
  cable: () => <IconEquipmentCable />,
  kettlebell: () => <IconEquipmentKettlebell />,
};

export function ScreenSetupEquipment(props: IProps): React.ReactElement {
  const currentGym = Equipment_getCurrentGym(props.settings);
  const allEquipment = Equipment_getEquipmentOfGym(props.settings, props.selectedGymId);

  return (
    <SafeAreaView edges={["bottom"]} className="flex-1 bg-background-default">
      <ScrollView className="flex-1 px-4 pt-8 pb-4">
        <View className="items-center p-4">
          <Image source={{ uri: `${IMAGE_BASE}/dinoequipment.png` }} className="h-60 w-60" resizeMode="contain" />
        </View>
        <View className="px-2 -mt-1">
          <Text className="mb-2 text-xl font-bold text-center text-text-primary">What equipment do you have?</Text>
          <Text className="mb-4 text-sm text-center text-text-secondary">
            Toggle on the equipment available at your gym. This helps the app round weights to what you can actually
            load.
          </Text>

          <View className="gap-2">
            {ObjectUtils_keys(allEquipment)
              .filter((e) => !allEquipment[e]?.isDeleted)
              .map((eqid) => {
                const equipmentData = Equipment_getEquipmentData(props.settings, eqid as string);
                const isEnabled = equipmentData != null && !equipmentData.isDeleted;
                const name = equipmentName(eqid as string, allEquipment);
                const iconFn = equipmentToIcon[eqid as string];
                const icon = iconFn ? iconFn() : null;
                return (
                  <Pressable
                    key={eqid as string}
                    className={`flex-row items-center gap-3 px-4 py-3 border rounded-xl ${
                      isEnabled
                        ? "bg-background-subtlecardpurple border-border-cardpurple"
                        : "bg-background-default border-border-neutral"
                    }`}
                    onPress={() => {
                      props.dispatch({
                        type: "UpdateState",
                        lensRecording: [
                          lb<IState>()
                            .p("storage")
                            .p("settings")
                            .p("gyms")
                            .findBy("id", currentGym.id)
                            .p("equipment")
                            .pi(eqid as string)
                            .p("isDeleted")
                            .record(!isEnabled ? false : true),
                        ],
                        desc: `Toggle equipment ${eqid as string}`,
                      });
                    }}
                  >
                    {icon && <View>{icon}</View>}
                    <Text className="flex-1 text-sm font-medium text-text-primary">{name}</Text>
                    <Switch
                      value={isEnabled}
                      onValueChange={() => {
                        props.dispatch({
                          type: "UpdateState",
                          lensRecording: [
                            lb<IState>()
                              .p("storage")
                              .p("settings")
                              .p("gyms")
                              .findBy("id", currentGym.id)
                              .p("equipment")
                              .pi(eqid as string)
                              .p("isDeleted")
                              .record(!isEnabled ? false : true),
                          ],
                          desc: `Toggle equipment ${eqid as string}`,
                        });
                      }}
                      trackColor={{
                        false: Tailwind_semantic().background.subtle,
                        true: Tailwind_semantic().button.primarybackground,
                      }}
                    />
                  </Pressable>
                );
              })}
          </View>
        </View>
        <View className="h-24" />
      </ScrollView>
      <View
        className="flex-row gap-2 px-4 pt-2 pb-2"
        style={{ shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 2, shadowOffset: { width: 0, height: 0 } }}
      >
        <Button
          className="flex-1"
          name="setup-equipment-skip"
          kind="lightgrayv3"
          buttonSize="lg"
          onPress={() => props.dispatch(Thunk_pushScreen("programselect"))}
        >
          Skip
        </Button>
        <Button
          className="flex-1"
          name="setup-equipment-continue"
          kind="purple"
          buttonSize="lg"
          onPress={() => props.dispatch(Thunk_pushScreen("setupplates"))}
        >
          Set up plates
        </Button>
      </View>
    </SafeAreaView>
  );
}
