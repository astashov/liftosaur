import { h, JSX } from "preact";
import { IPlannerExerciseState, IPlannerState } from "../../pages/planner/models/types";
import { IDispatch } from "../../ducks/types";
import { IDayData, IExerciseType, ISettings } from "../../types";
import { INavCommon, IState, updateState } from "../../models/state";
import { lb, LensBuilder } from "lens-shmens";
import { useCallback, useState } from "preact/hooks";
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
import { IconKebab } from "../icons/iconKebab";
import { DropdownMenu, DropdownMenuItem } from "../editProgram/editProgramUi/editProgramUiDropdownMenu";
import { EditProgramExerciseProgress } from "./editProgramExerciseProgress";

interface IProps {
  plannerState: IPlannerExerciseState;
  exerciseType: IExerciseType;
  dayData: Required<IDayData>;
  dispatch: IDispatch;
  settings: ISettings;
  navCommon: INavCommon;
}

export function ScreenEditProgramExercise(props: IProps): JSX.Element {
  const { plannerState, exerciseType } = props;

  const plannerDispatch: ILensDispatch<IPlannerExerciseState> = useCallback(
    buildPlannerDispatch(
      props.dispatch,
      (
        lb<IState>().p("screenStack").findBy("name", "editProgramExercise").p("params") as LensBuilder<
          IState,
          { plannerState: IPlannerExerciseState },
          {}
        >
      ).pi("plannerState"),
      plannerState
    ),
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
  const editProgramScreen = props.navCommon.screenStack.find((s) => s.name === "editProgram");
  const editProgramState = editProgramScreen?.params?.plannerState;
  const ui = plannerState.ui;
  const [isKebabMenuOpen, setIsKebabMenuOpen] = useState(false);

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
                  if (editProgramState) {
                    const plannerDispatch = buildPlannerDispatch(
                      props.dispatch,
                      (
                        lb<IState>().p("screenStack").findBy("name", "editProgram").p("params") as LensBuilder<
                          IState,
                          { plannerState: IPlannerState },
                          {}
                        >
                      ).pi("plannerState"),
                      editProgramState
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
                    ]);
                  }
                  props.dispatch(Thunk.pullScreen());
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
        <div className="relative">
          <button
            className="p-2"
            onClick={() => {
              setIsKebabMenuOpen(!isKebabMenuOpen);
            }}
          >
            <IconKebab />
          </button>
          {isKebabMenuOpen && (
            <DropdownMenu rightOffset="3rem" onClose={() => setIsKebabMenuOpen(false)}>
              <DropdownMenuItem
                isTop={true}
                data-cy="program-exercise-toggle-progress"
                onClick={() => {
                  setIsKebabMenuOpen(false);
                  plannerDispatch(
                    lb<IPlannerExerciseState>()
                      .p("ui")
                      .p("isProgressEnabled")
                      .record(!plannerState.ui.isProgressEnabled)
                  );
                }}
              >
                <div className="flex items-center gap-2">
                  <div>{ui.isProgressEnabled ? "Disable" : "Enable"} Progress</div>
                </div>
              </DropdownMenuItem>
            </DropdownMenu>
          )}
        </div>
      </div>
      <div className="mb-4">
        <EditProgramExerciseWarmups
          plannerExercise={plannerExercise}
          settings={props.settings}
          plannerDispatch={plannerDispatch}
        />
      </div>
      <div className="mb-4">
        {ui.isProgressEnabled && (
          <EditProgramExerciseProgress
            ui={plannerState.ui}
            program={plannerState.current.program}
            plannerExercise={plannerExercise}
            settings={props.settings}
            plannerDispatch={plannerDispatch}
          />
        )}
      </div>
    </Surface>
  );
}
