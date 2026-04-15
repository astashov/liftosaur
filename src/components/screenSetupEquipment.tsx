import type { JSX } from "react";
import { View, Image, ScrollView, Switch, Pressable, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "./primitives/text";
import { IDispatch } from "../ducks/types";
import { ISettings, IStats } from "../types";
import { INavCommon, IState } from "../models/state";
import { useNavOptions } from "../navigation/useNavOptions";
import { Thunk_pushScreen } from "../ducks/thunks";
import { Button } from "./button";
import { EquipmentSettings, equipmentToIcon } from "./equipmentSettings";
import { Equipment_getCurrentGym, Equipment_getEquipmentData, Equipment_getEquipmentOfGym } from "../models/equipment";
import { equipmentName } from "../models/exercise";
import { lb } from "lens-shmens";
import { ObjectUtils_keys } from "../utils/object";
import { HostConfig_resolveUrl } from "../utils/hostConfig";
import { Tailwind_semantic } from "../utils/tailwindConfig";

interface IScreenSetupEquipmentProps {
  dispatch: IDispatch;
  settings: ISettings;
  selectedGymId?: string;
  stats: IStats;
  navCommon: INavCommon;
}

export function ScreenSetupEquipment(props: IScreenSetupEquipmentProps): JSX.Element {
  const currentGym = Equipment_getCurrentGym(props.settings);
  const allEquipment = Equipment_getEquipmentOfGym(props.settings, props.selectedGymId);
  const insets = useSafeAreaInsets();

  useNavOptions({ navHidden: true });

  return (
    <View className="flex flex-col flex-1 h-screen bg-background-default" style={{ paddingTop: insets.top }}>
      <ScrollView className="flex-1 px-4 pt-8 pb-4">
        <View className="items-center p-4">
          <Image
            source={{ uri: HostConfig_resolveUrl("/images/dinoequipment.png") }}
            className="h-60"
            style={{ width: 240, height: 240 }}
            resizeMode="contain"
          />
        </View>
        <View className="px-2 -mt-1">
          <Text className="mb-2 text-xl font-bold text-center text-text-primary">What equipment do you have?</Text>
          <Text className="mb-4 text-sm text-center text-text-secondary">
            Toggle on the equipment available at your gym. This helps the app round weights to what you can actually
            load.
          </Text>

          <View style={{ gap: 8 }}>
            {ObjectUtils_keys(allEquipment).map((eqid) => {
              const equipmentData = Equipment_getEquipmentData(props.settings, eqid);
              const isEnabled = equipmentData && !equipmentData.isDeleted;
              const name = equipmentName(eqid, allEquipment);
              const icon = equipmentToIcon[eqid] ? equipmentToIcon[eqid]() : null;
              return (
                <Pressable
                  key={eqid}
                  testID={`equipment-toggle-${eqid}`}
                  data-cy={`equipment-toggle-${eqid}`}
                  className={`flex-row items-center px-4 py-3 border rounded-xl ${
                    isEnabled
                      ? "bg-background-subtlecardpurple border-border-cardpurple"
                      : "bg-background-default border-border-neutral"
                  }`}
                  style={{ gap: 12 }}
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
                          .pi(eqid)
                          .p("isDeleted")
                          .record(!isEnabled ? false : true),
                      ],
                      desc: `Toggle equipment ${eqid}`,
                    });
                  }}
                >
                  {icon && <View>{icon}</View>}
                  <Text className="flex-1 text-sm font-semibold">{name}</Text>
                  <Switch
                    value={!!isEnabled}
                    trackColor={{ false: "#d1d5db", true: Tailwind_semantic().icon.purple }}
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
                            .pi(eqid)
                            .p("isDeleted")
                            .record(!isEnabled ? false : true),
                        ],
                        desc: `Toggle equipment ${eqid}`,
                      });
                    }}
                  />
                </Pressable>
              );
            })}
          </View>
        </View>
      </ScrollView>
      <View
        className="bg-background-default"
        style={[
          { paddingBottom: insets.bottom || 8 },
          Platform.select({
            ios: { shadowColor: "#000", shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.1, shadowRadius: 4 },
            android: { elevation: 4 },
            default: { boxShadow: "0 0 4px 0 rgba(0, 0, 0, 0.2)" },
          }),
        ]}
      >
        <View className="flex-row px-4 pt-2 pb-2" style={{ gap: 8 }}>
          <Button
            className="flex-1"
            name="setup-equipment-skip"
            kind="lightgrayv3"
            buttonSize="lg"
            data-cy="setup-equipment-skip"
            onClick={() => props.dispatch(Thunk_pushScreen("programselect"))}
          >
            Skip
          </Button>
          <Button
            className="flex-1"
            name="setup-equipment-continue"
            kind="purple"
            buttonSize="lg"
            data-cy="setup-equipment-continue"
            onClick={() => props.dispatch(Thunk_pushScreen("setupplates"))}
          >
            Set up plates
          </Button>
        </View>
      </View>
    </View>
  );
}

interface IScreenSetupPlatesProps {
  dispatch: IDispatch;
  settings: ISettings;
  stats: IStats;
  navCommon: INavCommon;
}

export function ScreenSetupPlates(props: IScreenSetupPlatesProps): JSX.Element {
  const currentGym = Equipment_getCurrentGym(props.settings);
  const insets = useSafeAreaInsets();

  useNavOptions({ navTitle: "Set Up Plates" });

  return (
    <View className="flex flex-col flex-1 bg-background-default" style={{ paddingTop: insets.top }}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 80 + insets.bottom }}
        automaticallyAdjustKeyboardInsets
        keyboardShouldPersistTaps="never"
        keyboardDismissMode="interactive"
      >
        <View className="items-center p-4">
          <Image
            source={{ uri: HostConfig_resolveUrl("/images/dinoplates.png") }}
            style={{ width: 220, height: 208 }}
            resizeMode="contain"
          />
        </View>
        <View className="px-4 pb-4">
          <Text className="mb-2 text-xl font-bold text-center text-text-primary">Set up your plates</Text>
          <Text className="text-sm text-center text-text-secondary">
            Configure the <Text className="text-sm font-bold text-text-secondary">bar weight</Text> and{" "}
            <Text className="text-sm font-bold text-text-secondary">plates</Text> you have for each equipment type. The
            app uses this to round program weights to what you can actually load.
          </Text>
        </View>
        <EquipmentSettings
          stats={props.stats}
          lensPrefix={lb<IState>()
            .p("storage")
            .p("settings")
            .p("gyms")
            .findBy("id", currentGym.id)
            .p("equipment")
            .get()}
          dispatch={props.dispatch}
          allEquipment={currentGym.equipment}
          settings={props.settings}
        />
      </ScrollView>
      <View
        className="absolute bottom-0 left-0 right-0 px-4 pt-4 bg-background-default"
        style={[
          { paddingBottom: insets.bottom || 16 },
          Platform.select({
            ios: { shadowColor: "#000", shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.1, shadowRadius: 4 },
            android: { elevation: 4 },
            default: { boxShadow: "0 0 4px 0 rgba(0, 0, 0, 0.2)" },
          }),
        ]}
      >
        <Button
          className="w-full"
          name="setup-plates-continue"
          kind="purple"
          buttonSize="lg"
          onClick={() => props.dispatch(Thunk_pushScreen("programselect"))}
          data-cy="setup-plates-continue"
        >
          Continue
        </Button>
      </View>
    </View>
  );
}
