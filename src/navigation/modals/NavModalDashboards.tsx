import { JSX, useRef } from "react";
import { Pressable, ScrollView, useWindowDimensions, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { lb } from "lens-shmens";
import { useAppState } from "../StateContext";
import { useModal } from "../ModalStateContext";
import { navigateTo } from "../navigationService";
import { SheetScreenContainer } from "../SheetScreenContainer";
import { TransparentModal } from "../TransparentModal";
import { Text } from "../../components/primitives/text";
import { Button } from "../../components/button";
import { IconCheckCircle } from "../../components/icons/iconCheckCircle";
import { IconEdit2 } from "../../components/icons/iconEdit2";
import { IconDuplicate2 } from "../../components/icons/iconDuplicate2";
import { IconTrash } from "../../components/icons/iconTrash";
import { IState, updateState } from "../../models/state";
import { Dashboard_add, Dashboard_current, Dashboard_rename } from "../../models/dashboard";
import {
  DashboardWebSave_blank,
  DashboardWebSave_copy,
  DashboardWebSave_delete,
  DashboardWebSave_select,
  IDashboardWebSaveResult,
} from "../../models/dashboardWebSave";
import { IDashboard } from "../../types";
import { Dialog_alert, Dialog_confirm } from "../../utils/dialog";
import { UidFactory_generateUid } from "../../utils/generator";

const OPEN_EDITOR_DELAY_MS = 50;
const LIST_MAX_SCREEN_SHARE = 0.6;

export function NavModalDashboards(): JSX.Element {
  const navigation = useNavigation();
  const { state, dispatch } = useAppState();
  const stateRef = useRef(state);
  stateRef.current = state;
  const renameIdRef = useRef<string | undefined>(undefined);
  const windowHeight = useWindowDimensions().height;
  const dashboards = state.storage.dashboards ?? [];
  const current = Dashboard_current(state.storage);

  const onClose = (): void => {
    navigation.goBack();
  };

  const apply = (result: IDashboardWebSaveResult): boolean => {
    if (result.kind === "error") {
      Dialog_alert(result.message);
      return false;
    }
    updateState(
      dispatch,
      [
        lb<IState>().p("storage").p("dashboards").record(result.dashboards),
        lb<IState>().p("storage").p("currentDashboardId").record(result.currentDashboardId),
      ],
      "Change dashboards"
    );
    return true;
  };

  const openRename = useModal("textInputModal", (name) => {
    const id = renameIdRef.current;
    renameIdRef.current = undefined;
    if (id != null) {
      apply(Dashboard_rename(stateRef.current.storage, id, name));
    }
  });

  const onRename = (dashboard: IDashboard): void => {
    renameIdRef.current = dashboard.id;
    openRename({
      title: "Rename dashboard",
      inputLabel: "Name",
      placeholder: dashboard.name,
      submitLabel: "Rename",
      dataCyPrefix: "rename-dashboard",
    });
  };

  const onDelete = async (dashboard: IDashboard): Promise<void> => {
    if (await Dialog_confirm(`Delete dashboard '${dashboard.name}'?`)) {
      apply(DashboardWebSave_delete(stateRef.current.storage, dashboard.id));
    }
  };

  const onNew = (): void => {
    if (apply(Dashboard_add(stateRef.current.storage, DashboardWebSave_blank(UidFactory_generateUid(8))))) {
      onClose();
      setTimeout(() => navigateTo("dashboardEdit"), OPEN_EDITOR_DELAY_MS);
    }
  };

  return (
    <SheetScreenContainer onClose={onClose} shouldShowClose={true}>
      <TransparentModal onClose={onClose} fitContent={true}>
        <View className="px-4 pb-4">
          <Text className="pb-3 text-lg font-semibold text-center">Dashboards</Text>
          <ScrollView style={{ maxHeight: windowHeight * LIST_MAX_SCREEN_SHARE }}>
            {dashboards.map((dashboard) => (
              <View key={dashboard.id} className="flex-row items-center border-b border-border-neutral">
                <Pressable
                  testID={`dashboards-select-${dashboard.id}`}
                  className="flex-row items-center flex-1 py-3"
                  onPress={() => {
                    if (apply(DashboardWebSave_select(stateRef.current.storage, dashboard.id))) {
                      onClose();
                    }
                  }}
                >
                  <View className="w-7">
                    {dashboard.id === current?.id ? <IconCheckCircle isChecked={true} size={20} /> : null}
                  </View>
                  <Text className="flex-1 text-base" numberOfLines={1}>
                    {dashboard.name}
                  </Text>
                </Pressable>
                <Pressable
                  testID={`dashboards-rename-${dashboard.id}`}
                  className="p-2"
                  onPress={() => onRename(dashboard)}
                >
                  <IconEdit2 size={20} />
                </Pressable>
                <Pressable
                  testID={`dashboards-duplicate-${dashboard.id}`}
                  className="p-2"
                  onPress={() =>
                    apply(
                      Dashboard_add(
                        stateRef.current.storage,
                        DashboardWebSave_copy(dashboard, UidFactory_generateUid(8))
                      )
                    )
                  }
                >
                  <IconDuplicate2 />
                </Pressable>
                <Pressable
                  testID={`dashboards-delete-${dashboard.id}`}
                  className="p-2"
                  onPress={() => onDelete(dashboard)}
                >
                  <IconTrash />
                </Pressable>
              </View>
            ))}
          </ScrollView>
          <View className="mt-4">
            <Button name="dashboards-new" testID="dashboards-new" kind="purple" buttonSize="md" onPress={onNew}>
              New dashboard
            </Button>
          </View>
        </View>
      </TransparentModal>
    </SheetScreenContainer>
  );
}
