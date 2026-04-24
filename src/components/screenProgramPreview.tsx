import { JSX, useMemo } from "react";
import { View } from "react-native";
import { IDispatch } from "../ducks/types";
import { IProgram, ISettings, ISubscription } from "../types";
import { INavCommon, IState, updateState } from "../models/state";
import { useNavOptions } from "../navigation/useNavOptions";
import { ProgramPreview } from "./programPreview";
import { MenuItemEditable } from "./menuItemEditable";
import { lb } from "lens-shmens";

interface IProps {
  dispatch: IDispatch;
  settings: ISettings;
  programs: IProgram[];
  selectedProgramId: string;
  subscription: ISubscription;
  navCommon: INavCommon;
}

export function ScreenProgramPreview(props: IProps): JSX.Element {
  const program = props.programs.filter((p) => p.id === props.selectedProgramId)[0];

  useNavOptions({ navTitle: "Program Preview" });

  const { dispatch, programs, selectedProgramId } = props;
  const programValues = useMemo(
    () => programs.map((p): [string, string] => [p.id, p.name]),
    [programs]
  );
  const topHeader = useMemo(
    () => (
      <View className="px-4" pointerEvents="box-none">
        <MenuItemEditable
          type="select"
          name="Program"
          value={selectedProgramId}
          values={programValues}
          onChange={(value) => {
            if (value != null) {
              updateState(
                dispatch,
                [lb<IState>().pi("previewProgram").p("id").record(value)],
                "Select preview program"
              );
            }
          }}
        />
      </View>
    ),
    [selectedProgramId, programValues, dispatch]
  );

  return (
    <ProgramPreview
      headerContent={topHeader}
      hasNavbar={false}
      key={props.selectedProgramId}
      isMobile={true}
      dispatch={props.dispatch}
      settings={props.settings}
      program={program}
      subscription={props.subscription}
      stats={props.navCommon.stats}
      useNavModals={true}
    />
  );
}
