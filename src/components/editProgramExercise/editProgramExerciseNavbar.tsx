import { JSX, h } from "preact";
import { IPlannerExerciseState, IPlannerProgramExercise, IPlannerState } from "../../pages/planner/models/types";
import { IconUndo } from "../icons/iconUndo";
import { ILensDispatch } from "../../utils/useLensReducer";
import { canRedo, canUndo, redo, undo } from "../../pages/builder/utils/undoredo";
import { Button } from "../button";
import { IDispatch } from "../../ducks/types";
import { buildPlannerDispatch } from "../../utils/plannerDispatch";
import { lb, LensBuilder } from "lens-shmens";
import { Thunk } from "../../ducks/thunks";
import { IState, updateState } from "../../models/state";
import { CollectionUtils } from "../../utils/collection";
import { ExerciseImage } from "../exerciseImage";
import { equipmentName, Exercise } from "../../models/exercise";
import { ISettings } from "../../types";

interface IEditProgramExerciseNavbarProps {
  state: IPlannerExerciseState;
  editProgramState: IPlannerState | undefined;
  dispatch: IDispatch;
  plannerDispatch: ILensDispatch<IPlannerExerciseState>;
  plannerExercise: IPlannerProgramExercise;
  settings: ISettings;
}

export function EditProgramExerciseNavbar(props: IEditProgramExerciseNavbarProps): JSX.Element {
  const exerciseType = props.plannerExercise.exerciseType;
  const exercise = exerciseType ? Exercise.get(exerciseType, props.settings.exercises) : undefined;

  return (
    <div
      className="sticky left-0 flex flex-row items-center justify-between gap-2 py-1 pl-2 pr-4 bg-white border-b border-grayv3-50"
      style={{
        zIndex: 25,
        top: "3.75rem",
      }}
    >
      <div className="flex items-center">
        <button
          style={{ cursor: canUndo(props.state) ? "pointer" : "default" }}
          title="Undo"
          className="p-2 nm-program-undo"
          disabled={!canUndo(props.state)}
          onClick={() => undo(props.plannerDispatch, props.state)}
        >
          <IconUndo width={20} height={20} color={!canUndo(props.state) ? "#BAC4CD" : "#171718"} />
        </button>
        <button
          style={{ cursor: canRedo(props.state) ? "pointer" : "default" }}
          title="Redo"
          className="p-2 nm-program-redo"
          disabled={!canRedo(props.state)}
          onClick={() => redo(props.plannerDispatch, props.state)}
        >
          <IconUndo
            width={20}
            height={20}
            style={{ transform: "scale(-1,  1)" }}
            color={!canRedo(props.state) ? "#BAC4CD" : "#171718"}
          />
        </button>
      </div>
      <div className="flex items-center flex-1 gap-2">
        {exerciseType && (
          <div>
            <ExerciseImage settings={props.settings} className="w-6" exerciseType={exerciseType} size="small" />
          </div>
        )}
        <div className="flex-1 text-xs">
          {props.plannerExercise.label ? `${props.plannerExercise.label}: ` : ""}
          {props.plannerExercise.name}
          {props.plannerExercise.equipment != null &&
            props.plannerExercise.equipment !== exercise?.defaultEquipment && (
              <div className="">, {equipmentName(props.plannerExercise.equipment)}</div>
            )}
        </div>
      </div>
      <div className="flex items-center">
        <Button
          name="save-program-exercise"
          kind="purple"
          buttonSize="md"
          data-cy="save-program-exercise"
          onClick={() => {
            if (confirm("Are you sure?")) {
              if (props.editProgramState) {
                const plannerDispatch = buildPlannerDispatch(
                  props.dispatch,
                  (
                    lb<IState>().p("screenStack").findBy("name", "editProgram").p("params") as LensBuilder<
                      IState,
                      { plannerState: IPlannerState },
                      {}
                    >
                  ).pi("plannerState"),
                  props.editProgramState
                );
                plannerDispatch(lb<IPlannerState>().p("current").p("program").record(props.state.current.program));
              } else {
                updateState(props.dispatch, [
                  lb<IState>()
                    .p("storage")
                    .p("programs")
                    .recordModify((programs) => {
                      return CollectionUtils.setBy(
                        programs,
                        "id",
                        props.state.current.program.id,
                        props.state.current.program
                      );
                    }),
                ]);
              }
              props.dispatch(Thunk.pullScreen());
            }
          }}
        >
          Save
        </Button>
      </div>
    </div>
  );
}
