import { JSX, ReactNode, useContext, useEffect, useMemo, useRef, useState } from "react";
import { View, ScrollView, findNodeHandle, LayoutAnimation } from "react-native";
import { Text } from "./primitives/text";
import { IDispatch } from "../ducks/types";
import { ISettings, IEquipment, IAllEquipment, IStats } from "../types";
import { INavCommon, IState, updateState } from "../models/state";
import { EquipmentRowHeader, EquipmentRowBody } from "./equipmentSettings";
import { ILensDispatch } from "../utils/useLensReducer";
import { ILensRecordingPayload, lb } from "lens-shmens";
import { ObjectUtils_keys } from "../utils/object";
import { equipmentName } from "../models/exercise";
import { useNavOptions } from "../navigation/useNavOptions";
import { HelpPlates } from "./help/helpPlates";
import { MenuItemEditable } from "./menuItemEditable";
import { LinkButton } from "./linkButton";
import { Thunk_pushScreen } from "../ducks/thunks";
import { navigationRef } from "../navigation/navigationRef";
import { NavScreenContent, NavScreenScrollContext } from "../navigation/NavScreenContent";

interface IProps {
  dispatch: IDispatch;
  settings: ISettings;
  expandedEquipment?: IEquipment;
  stats: IStats;
  allEquipment: IAllEquipment;
  selectedGymId?: string;
  navCommon: INavCommon;
}

function buildLensDispatch(originalDispatch: IDispatch): ILensDispatch<IState> {
  return (lensRecording: ILensRecordingPayload<IState>[] | ILensRecordingPayload<IState>, desc: string) => {
    originalDispatch({
      type: "UpdateState",
      lensRecording: Array.isArray(lensRecording) ? lensRecording : [lensRecording],
      desc,
    });
  };
}

export function ScreenEquipment(props: IProps): JSX.Element {
  const scrollCtx = useContext(NavScreenScrollContext);
  const scrollRef = scrollCtx?.scrollRef;
  const expandedItemRef = useRef<View>(null);

  const [expandedMap, setExpandedMap] = useState<Record<string, boolean>>(() =>
    props.expandedEquipment ? { [props.expandedEquipment]: true } : {}
  );

  useEffect(() => {
    if (!props.expandedEquipment) {
      return;
    }
    const scrollNode = scrollRef?.current as ScrollView | null;
    const itemNode = expandedItemRef.current;
    if (scrollNode && itemNode) {
      const handle = findNodeHandle(scrollNode);
      if (handle != null) {
        itemNode.measureLayout(
          handle,
          (_x, y) => scrollNode.scrollTo({ y: Math.max(0, y - 70), animated: false }),
          () => undefined
        );
      }
    }
    updateState(
      props.dispatch,
      [lb<IState>().p("defaultEquipmentExpanded").record(undefined)],
      "Clear expanded equipment"
    );
  }, []);

  useNavOptions({ navTitle: "Equipment Settings", navHelpContent: <HelpPlates /> });

  const selectedGym = props.settings.gyms.find((g) => g.id === props.selectedGymId) ?? props.settings.gyms[0];
  const lensDispatch = useMemo(() => buildLensDispatch(props.dispatch), [props.dispatch]);
  const lensPrefix = useMemo(
    () => lb<IState>().p("storage").p("settings").p("gyms").findBy("id", selectedGym.id).p("equipment").get(),
    [selectedGym.id]
  );

  const toggleExpanded = (key: string): void => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedMap((m) => ({ ...m, [key]: !m[key] }));
  };

  const visibleKeys = ObjectUtils_keys(props.allEquipment).filter((e) => !props.allEquipment[e]?.isDeleted);
  const hiddenEquipment = ObjectUtils_keys(props.allEquipment).filter((e) => {
    const eq = props.allEquipment[e];
    return !eq?.name && eq?.isDeleted;
  });

  const children: ReactNode[] = [];
  const stickyIndices: number[] = [];

  if (props.settings.gyms.length > 1) {
    children.push(
      <View key="gym-name" className="px-4 pb-2">
        <MenuItemEditable
          type="text"
          name="Gym Name"
          value={selectedGym.name}
          onChange={(name) => {
            if (name?.trim()) {
              updateState(
                props.dispatch,
                [
                  lb<IState>()
                    .p("storage")
                    .p("settings")
                    .p("gyms")
                    .findBy("id", selectedGym.id)
                    .p("name")
                    .record(name.trim()),
                ],
                "Update gym name"
              );
            }
          }}
        />
      </View>
    );
  } else {
    children.push(
      <View key="manage-gyms" className="px-2 mb-2 items-end">
        <LinkButton className="text-sm" name="add-new-gym" onClick={() => props.dispatch(Thunk_pushScreen("gyms"))}>
          Manage Gyms
        </LinkButton>
      </View>
    );
  }

  visibleKeys.forEach((key) => {
    const equipmentData = props.allEquipment[key];
    if (!equipmentData) {
      return;
    }
    const isExpanded = !!expandedMap[key];
    const headerIndex = children.length;
    const assignRef = props.expandedEquipment === key;

    stickyIndices.push(headerIndex);
    children.push(
      <View key={`${key}-header`} className={`mx-2 ${isExpanded ? "" : "mb-6"}`}>
        <EquipmentRowHeader
          headerRef={assignRef ? expandedItemRef : undefined}
          lensPrefix={lensPrefix}
          lensDispatch={lensDispatch}
          equipment={key}
          equipmentData={equipmentData}
          allEquipment={props.allEquipment}
          settings={props.settings}
          isExpanded={isExpanded}
          onToggle={() => toggleExpanded(key)}
        />
      </View>
    );

    if (isExpanded) {
      children.push(
        <View key={`${key}-body`} className="mx-2 mb-6">
          <EquipmentRowBody
            lensPrefix={lensPrefix}
            lensDispatch={lensDispatch}
            dispatch={props.dispatch}
            equipment={key}
            equipmentData={equipmentData}
            allEquipment={props.allEquipment}
            settings={props.settings}
            stats={props.stats}
          />
        </View>
      );
    }
  });

  return (
    <NavScreenContent stickyHeaderIndices={stickyIndices}>
      {children}
      {hiddenEquipment.length > 0 && (
        <View className="flex-row flex-wrap mx-4 my-2">
          <Text className="text-xs">Hidden Equipment: </Text>
          {hiddenEquipment.map((e, i) => (
            <View key={e} className="flex-row">
              {i !== 0 && <Text className="text-xs">, </Text>}
              <LinkButton
                className="text-xs"
                name={`show-equipment-${e}`}
                onClick={() => {
                  const lensRecording = lensPrefix.then(lb<IAllEquipment>().pi(e).p("isDeleted").get()).record(false);
                  lensDispatch(lensRecording, `Show equipment ${e}`);
                }}
              >
                {equipmentName(e, props.allEquipment)}
              </LinkButton>
            </View>
          ))}
        </View>
      )}
      <View className="m-4">
        <LinkButton
          className="text-sm"
          name="add-new-equipment"
          onClick={() => navigationRef.navigate("newEquipmentModal")}
        >
          Add New Equipment Type
        </LinkButton>
      </View>
    </NavScreenContent>
  );
}
