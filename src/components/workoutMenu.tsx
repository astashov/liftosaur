import { JSX, memo, useMemo } from "react";
import { Pressable } from "react-native";
import { lb } from "lens-shmens";
import { IDispatch } from "../ducks/types";
import { Thunk_pushScreen, Thunk_pushToEditProgramDay } from "../ducks/thunks";
import { IHistoryRecord, IProgram, ISettings } from "../types";
import { IEvaluatedProgram, Program_isEmpty } from "../models/program";
import { Progress_isCurrent } from "../models/progress";
import { IState, updateSettings, updateState } from "../models/state";
import { useTrackClick } from "../utils/clickTracking";
import { IWorkoutMenuAction, WorkoutMenuActions_list } from "../utils/workoutMenuActions";
import { ActionMenu, IActionMenuAction } from "./actionMenu";
import { IconKebab } from "./icons/iconKebab";
import { Tour_start } from "./tour/tourConfigs";
import { workoutTourConfig } from "./tour/workoutTourConfig";

interface IWorkoutMenuProps {
  progress: IHistoryRecord;
  program?: IEvaluatedProgram;
  allPrograms: IProgram[];
  settings: ISettings;
  dispatch: IDispatch;
  onShare: () => void;
  onConvertToProgram: () => void;
  onDelete: () => void;
  onOpenChange?: (isOpen: boolean) => void;
}

const labels: Record<IWorkoutMenuAction, string> = {
  editDay: "Edit Program Day",
  muscles: "Day Muscles",
  notes: "Show Workout Notes",
  share: "Share",
  createProgramDay: "Create Program Day",
  tour: "Show Tour",
  delete: "Delete Workout",
};

function WorkoutMenuInner(props: IWorkoutMenuProps): JSX.Element {
  const { progress, program, allPrograms, dispatch, onShare, onConvertToProgram, onDelete } = props;
  const showWorkoutNotes = !!props.settings.workoutSettings.showWorkoutNotes;
  const trackClick = useTrackClick();
  const currentProgram = allPrograms.find((p) => p.id === program?.id);
  const isCurrent = Progress_isCurrent(progress);
  const actionIds = WorkoutMenuActions_list({
    isCurrent,
    hasNonEmptyProgram: program != null && !Program_isEmpty(program),
    hasNonEmptyCurrentProgram: currentProgram != null && !Program_isEmpty(currentProgram),
    isInAnyProgram: allPrograms.some((p) => p.id === progress.programId),
  });

  const handlers = useMemo<Record<IWorkoutMenuAction, () => void>>(
    () => ({
      editDay: () => {
        trackClick("workout-edit-day");
        if (currentProgram) {
          dispatch(Thunk_pushToEditProgramDay(progress.day, currentProgram.id));
        }
      },
      muscles: () => {
        trackClick("workout-day-muscles");
        if (program) {
          updateState(
            dispatch,
            [lb<IState>().p("muscleView").record({ type: "day", programId: program.id, day: progress.day })],
            "Show muscle view"
          );
          dispatch(Thunk_pushScreen("muscles"));
        }
      },
      notes: () => {
        trackClick(showWorkoutNotes ? "workout-notes-hide" : "workout-notes-show");
        updateSettings(
          dispatch,
          lb<ISettings>().p("workoutSettings").p("showWorkoutNotes").record(!showWorkoutNotes),
          "toggle-workout-notes"
        );
      },
      share: () => {
        trackClick("past-workout-share");
        onShare();
      },
      createProgramDay: () => {
        trackClick("save-to-program");
        onConvertToProgram();
      },
      tour: () => {
        trackClick(`navbar-tour-${workoutTourConfig.id}`);
        Tour_start(dispatch, workoutTourConfig.id);
      },
      delete: () => {
        trackClick("workout-delete");
        onDelete();
      },
    }),
    [
      trackClick,
      currentProgram,
      program,
      progress.day,
      dispatch,
      showWorkoutNotes,
      onShare,
      onConvertToProgram,
      onDelete,
    ]
  );

  const actions = useMemo<IActionMenuAction[]>(
    () =>
      actionIds.map((id) => ({
        label: id === "notes" && showWorkoutNotes ? "Hide Workout Notes" : labels[id],
        onPress: handlers[id],
        destructive: id === "delete",
        testID: `workout-menu-${id}`,
      })),
    [actionIds.join(","), handlers, showWorkoutNotes]
  );

  return (
    <ActionMenu
      renderTrigger={(open) => (
        <Pressable
          data-testid="workout-menu"
          testID="workout-menu"
          className="p-2"
          hitSlop={8}
          onPress={() => {
            trackClick("workout-menu");
            open();
          }}
        >
          <IconKebab />
        </Pressable>
      )}
      actions={actions}
      onOpenChange={props.onOpenChange}
    />
  );
}

export const WorkoutMenu = memo(WorkoutMenuInner);
