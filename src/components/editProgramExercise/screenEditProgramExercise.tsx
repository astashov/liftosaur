import { h, JSX } from "preact";
import { IPlannerExerciseState, IPlannerState } from "../../pages/planner/models/types";
import { IDispatch } from "../../ducks/types";
import { IDayData, IExerciseType, ISettings } from "../../types";
import { INavCommon, IState, updateState } from "../../models/state";
import { lb } from "lens-shmens";
import { useCallback } from "preact/hooks";
import { useUndoRedo } from "../../pages/builder/utils/undoredo";
import { ILensDispatch } from "../../utils/useLensReducer";
import { Footer2View } from "../footer2";
import { NavbarView } from "../navbar";
import { Surface } from "../surface";
import { Program } from "../../models/program";
import { equipmentName, Exercise } from "../../models/exercise";
import { ExerciseImage } from "../exerciseImage";
import { PlannerProgramExercise } from "../../pages/planner/models/plannerProgramExercise";
import { EditProgramExerciseWarmups } from "./editProgramExerciseWarmups";
import { Button } from "../button";
import { CollectionUtils } from "../../utils/collection";
import { Thunk } from "../../ducks/thunks";
import { buildPlannerDispatch } from "../../utils/plannerDispatch";

interface IProps {
  plannerState: IPlannerExerciseState;
  exerciseType: IExerciseType;
  dayData: Required<IDayData>;
  editProgramState?: IPlannerState;
  dispatch: IDispatch;
  settings: ISettings;
  navCommon: INavCommon;
}

export function ScreenEditProgramExercise(props: IProps): JSX.Element {
  const { plannerState, exerciseType } = props;

  const plannerDispatch: ILensDispatch<IPlannerExerciseState> = useCallback(
    buildPlannerDispatch(props.dispatch, lb<IState>().pi("editProgramExercise"), plannerState),
    [plannerState]
  );
  useUndoRedo(plannerState, plannerDispatch);

  const evaluatedProgram = Program.evaluate(plannerState.current.program, props.settings);
  const plannerExercise = evaluatedProgram.weeks[props.dayData.week - 1]?.days[
    props.dayData.dayInWeek - 1
  ].exercises.find((e) => Exercise.eq(e.exerciseType!, props.exerciseType))!;
  const exercise = Exercise.get(props.exerciseType, props.settings.exercises);

  const repeatStr = PlannerProgramExercise.repeatToRangeStr(plannerExercise);
  const order = plannerExercise.order !== 0 ? plannerExercise.order : undefined;
  const orderAndRepeat = [order, repeatStr].filter((s) => s).join(", ");

  return (
    <Surface
      navbar={
        <NavbarView
          navCommon={props.navCommon}
          dispatch={props.dispatch}
          title="Edit Program Exercise"
          rightButtons={[
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
                      lb<IState>().pi("editProgramV2"),
                      props.editProgramState
                    );
                    plannerDispatch(lb<IPlannerState>().p("current").p("program").record(plannerState.current.program));
                  } else {
                    updateState(props.dispatch, [
                      lb<IState>()
                        .p("storage")
                        .p("programs")
                        .recordModify((programs) => {
                          return CollectionUtils.setBy(
                            programs,
                            "id",
                            plannerState.current.program.id,
                            plannerState.current.program
                          );
                        }),
                      lb<IState>().p("editProgramV2").record(undefined),
                    ]);
                  }
                  props.dispatch(Thunk.pullScreen());
                  updateState(props.dispatch, [lb<IState>().p("editProgramExercise").record(undefined)]);
                }
              }}
            >
              Save
            </Button>,
          ]}
        />
      }
      footer={<Footer2View navCommon={props.navCommon} dispatch={props.dispatch} />}
    >
      <div className="flex items-center gap-4 px-4">
        <div>
          <ExerciseImage settings={props.settings} className="w-10" exerciseType={exerciseType} size="small" />
        </div>
        <div className="flex-1 text-base font-bold">
          {plannerExercise.label ? `${plannerExercise.label}: ` : ""}
          {plannerExercise.name}
          {plannerExercise.equipment != null && plannerExercise.equipment !== exercise?.defaultEquipment && (
            <div className="">, {equipmentName(plannerExercise.equipment)}</div>
          )}
          {orderAndRepeat ? <span className="text-sm font-normal text-blackv2"> [{orderAndRepeat}]</span> : ""}
          {plannerExercise.notused && (
            <div className="px-1 ml-3 text-xs font-bold text-white rounded bg-grayv2-main">UNUSED</div>
          )}
        </div>
      </div>
      <EditProgramExerciseWarmups
        plannerExercise={plannerExercise}
        settings={props.settings}
        plannerDispatch={plannerDispatch}
      />
    </Surface>
  );
}
