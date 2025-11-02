import { JSX, h } from "preact";
import { ISettings } from "../types";
import { BottomSheetOrModal } from "./bottomSheetOrModal";
import { Muscle } from "../models/muscle";
import { lf } from "lens-shmens";
import { MuscleGroupsContent } from "./muscleGroupsContent";

interface IBottomSheetOrModalMuscleGroupsContentProps {
  settings: ISettings;
  onNewSettings: (newSettings: ISettings) => void;
  onClose: () => void;
}

export function BottomSheetOrModalMuscleGroupsContent(props: IBottomSheetOrModalMuscleGroupsContentProps): JSX.Element {
  return (
    <BottomSheetOrModal shouldShowClose={true} onClose={props.onClose} isHidden={false} zIndex={50}>
      <div className="px-4 py-2">
        <MuscleGroupsContent
          onCreate={(name) => {
            props.onNewSettings(
              lf(props.settings)
                .p("muscleGroups")
                .modify((muscleGroups) => {
                  return Muscle.createMuscleGroup(muscleGroups, name);
                })
            );
          }}
          onDelete={(muscleGroup) => {
            props.onNewSettings(
              lf(props.settings)
                .p("muscleGroups")
                .modify((muscleGroups) => {
                  return Muscle.deleteMuscleGroup(muscleGroups, muscleGroup);
                })
            );
          }}
          onUpdate={(muscleGroup, muscles) => {
            props.onNewSettings(
              lf(props.settings)
                .p("muscleGroups")
                .modify((muscleGroups) => {
                  return Muscle.updateMuscleGroup(muscleGroups, muscleGroup, muscles);
                })
            );
          }}
          onRestore={(muscleGroup) => {
            props.onNewSettings(
              lf(props.settings)
                .p("muscleGroups")
                .modify((muscleGroups) => {
                  return Muscle.restoreMuscleGroup(muscleGroups, muscleGroup);
                })
            );
          }}
          settings={props.settings}
        />
      </div>
    </BottomSheetOrModal>
  );
}
