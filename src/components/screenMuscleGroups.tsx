import { h, JSX } from "preact";
import { ISettings } from "../types";
import { IDispatch } from "../ducks/types";
import { Surface } from "./surface";
import { NavbarView } from "./navbar";
import { Footer2View } from "./footer2";
import { INavCommon, updateSettings } from "../models/state";
import { MuscleGroupsContent } from "./muscleGroupsContent";
import { lb } from "lens-shmens";
import {
  Muscle_createMuscleGroup,
  Muscle_deleteMuscleGroup,
  Muscle_updateMuscleGroup,
  Muscle_restoreMuscleGroup,
} from "../models/muscle";

interface IProps {
  dispatch: IDispatch;
  settings: ISettings;
  navCommon: INavCommon;
}

export function ScreenMuscleGroups(props: IProps): JSX.Element {
  return (
    <Surface
      navbar={<NavbarView navCommon={props.navCommon} dispatch={props.dispatch} title="Muscle Groups" />}
      footer={<Footer2View navCommon={props.navCommon} dispatch={props.dispatch} />}
    >
      <div className="px-4">
        <MuscleGroupsContent
          onCreate={(name) => {
            updateSettings(
              props.dispatch,
              lb<ISettings>()
                .p("muscleGroups")
                .recordModify((muscleGroups) => {
                  return Muscle_createMuscleGroup(muscleGroups, name);
                }),
              "Create Muscle Group"
            );
          }}
          onDelete={(muscleGroup) => {
            updateSettings(
              props.dispatch,
              lb<ISettings>()
                .p("muscleGroups")
                .recordModify((muscleGroups) => {
                  return Muscle_deleteMuscleGroup(muscleGroups, muscleGroup);
                }),
              "Toggle Muscle Group"
            );
          }}
          onUpdate={(muscleGroup, muscles) => {
            updateSettings(
              props.dispatch,
              lb<ISettings>()
                .p("muscleGroups")
                .recordModify((muscleGroups) => {
                  return Muscle_updateMuscleGroup(muscleGroups, muscleGroup, muscles);
                }),
              "Update Muscle Group"
            );
          }}
          onRestore={(muscleGroup) => {
            updateSettings(
              props.dispatch,
              lb<ISettings>()
                .p("muscleGroups")
                .recordModify((muscleGroups) => {
                  return Muscle_restoreMuscleGroup(muscleGroups, muscleGroup);
                }),
              "Restore Muscle Group"
            );
          }}
          settings={props.settings}
        />
      </div>
    </Surface>
  );
}
