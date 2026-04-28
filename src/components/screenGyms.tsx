import { JSX } from "react";
import { View, Pressable } from "react-native";
import { Text } from "./primitives/text";
import { IDispatch } from "../ducks/types";
import { IEquipment, IGym, ISettings } from "../types";
import { INavCommon, IState, updateState } from "../models/state";
import { useNavOptions } from "../navigation/useNavOptions";
import { MenuItem } from "./menuItem";
import { StringUtils_nextName, StringUtils_dashcase } from "../utils/string";
import { IconDuplicate2 } from "./icons/iconDuplicate2";
import { IconEditSquare } from "./icons/iconEditSquare";
import { IconTrash } from "./icons/iconTrash";
import { lb } from "lens-shmens";
import { CollectionUtils_removeBy } from "../utils/collection";
import { UidFactory_generateUid } from "../utils/generator";
import { ObjectUtils_clone } from "../utils/object";
import { Thunk_pushScreen } from "../ducks/thunks";
import { navigationRef } from "../navigation/navigationRef";
import { LinkButton } from "./linkButton";
import { Dialog_confirm } from "../utils/dialog";

interface IProps {
  dispatch: IDispatch;
  settings: ISettings;
  expandedEquipment?: IEquipment;
  navCommon: INavCommon;
}

export function ScreenGyms(props: IProps): JSX.Element {
  const gyms = props.settings.gyms;
  useNavOptions({ navTitle: "Gyms" });

  return (
    <View className="px-4">
      {gyms.map((gym) => {
        return (
          <MenuItem
            key={gym.id}
            name={gym.name}
            addons={
              gym.id === props.settings.currentGymId ? (
                <View className="pb-1" style={{ marginTop: -8 }}>
                  <Text className="text-xs text-text-secondary">current</Text>
                </View>
              ) : undefined
            }
            value={
              <View className="flex-row">
                <Pressable
                  testID="edit-gym"
                  data-cy="edit-gym" data-testid="edit-gym"
                  className="px-2"
                  onPress={() => {
                    updateState(props.dispatch, [lb<IState>().p("selectedGymId").record(gym.id)], "Select gym to edit");
                    props.dispatch(Thunk_pushScreen("plates"));
                  }}
                >
                  <IconEditSquare />
                </Pressable>
                <Pressable
                  className="px-2"
                  onPress={() => {
                    updateState(
                      props.dispatch,
                      [
                        lb<IState>()
                          .p("storage")
                          .p("settings")
                          .p("gyms")
                          .recordModify((g) => {
                            const newGym: IGym = {
                              ...gym,
                              name: StringUtils_nextName(gym.name),
                              id: UidFactory_generateUid(8),
                              equipment: ObjectUtils_clone(gym.equipment),
                            };
                            return [...g, newGym];
                          }),
                      ],
                      "Duplicate gym"
                    );
                  }}
                >
                  <IconDuplicate2 />
                </Pressable>
                {props.settings.gyms.length > 1 && (
                  <Pressable
                    testID={`menu-item-delete-${StringUtils_dashcase(gym.name)}`}
                    data-cy={`menu-item-delete-${StringUtils_dashcase(gym.name)}`} data-testid={`menu-item-delete-${StringUtils_dashcase(gym.name)}`}
                    className="px-2"
                    onPress={async () => {
                      if (await Dialog_confirm("Are you sure you want to delete this gym?")) {
                        updateState(
                          props.dispatch,
                          [
                            lb<IState>()
                              .p("storage")
                              .p("settings")
                              .recordModify((settings) => {
                                const newGyms = CollectionUtils_removeBy(settings.gyms, "id", gym.id);
                                const currentGym = newGyms.find((aGym) => aGym.id === props.settings.currentGymId);
                                if (currentGym == null) {
                                  settings = { ...settings, currentGymId: newGyms[0].id };
                                }
                                return { ...settings, gyms: newGyms };
                              }),
                            lb<IState>()
                              .p("storage")
                              .p("settings")
                              .p("deletedGyms")
                              .recordModify((dg) => {
                                return Array.from(new Set([...dg, gym.id]));
                              }),
                          ],
                          "Delete gym"
                        );
                      }
                    }}
                  >
                    <IconTrash />
                  </Pressable>
                )}
              </View>
            }
          />
        );
      })}
      <View className="mt-1">
        <LinkButton name="new-gym" onClick={() => navigationRef.navigate("newGymModal")}>
          Add Gym
        </LinkButton>
      </View>
    </View>
  );
}
