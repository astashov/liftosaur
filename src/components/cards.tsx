import { h, JSX } from "preact";
import { ExerciseView } from "./exercise";
import { IDispatch } from "../ducks/types";
import { Progress } from "../models/progress";
import { Button } from "./button";
import { memo } from "preact/compat";
import { IHistoryRecord, ISettings, IProgressMode, ISubscription, IExerciseType } from "../types";
import { IState, updateState } from "../models/state";
import { Thunk } from "../ducks/thunks";
import { IconMuscles2 } from "./icons/iconMuscles2";
import { IconEditSquare } from "./icons/iconEditSquare";
import { GroupHeader } from "./groupHeader";
import { inputClassName } from "./input";
import { IconNotebook } from "./icons/iconNotebook";
import { LinkButton } from "./linkButton";
import { IEvaluatedProgram, IEvaluatedProgramDay, Program } from "../models/program";
import { lb } from "lens-shmens";
import { EditProgram } from "../models/editProgram";
import { Exercise } from "../models/exercise";
import { Markdown } from "./markdown";
import { IPlannerProgramExercise } from "../pages/planner/models/types";

interface ICardsViewProps {
  history: IHistoryRecord[];
  progress: IHistoryRecord;
  program?: IEvaluatedProgram;
  programDay?: IEvaluatedProgramDay;
  userId?: string;
  nickname?: string;
  helps: string[];
  isTimerShown: boolean;
  subscription: ISubscription;
  settings: ISettings;
  dispatch: IDispatch;
  onChangeReps: (mode: IProgressMode, entryIndex: number, setIndex: number) => void;
  onStartSetChanging?: (
    isWarmup: boolean,
    entryIndex: number,
    setIndex?: number,
    programExercise?: IPlannerProgramExercise,
    exerciseType?: IExerciseType
  ) => void;
  setIsShareShown: (isShown: boolean) => void;
}

export const CardsView = memo(
  (props: ICardsViewProps): JSX.Element => {
    const { program } = props;
    return (
      <section className="px-4 pb-4">
        <div className="flex pb-2">
          <div className="flex items-center flex-1">
            <div className="flex-1 mr-2 align-middle">
              <div className="text-lg font-semibold">{props.progress?.programName}</div>
              <div data-cy="day-name" className="text-sm text-grayv2-main">
                {props.progress?.dayName}
              </div>
            </div>
            <div className="mr-2 align-middle">
              {program && (
                <button
                  className="px-2 ml-1 align-middle nm-workout-edit-day"
                  onClick={() => {
                    const dayData = Program.getDayData(program, props.progress.day);
                    const plannerState = EditProgram.initPlannerState(program.id, program.planner, dayData);
                    Program.editAction(props.dispatch, program.id, plannerState);
                  }}
                >
                  <IconEditSquare />
                </button>
              )}
              {program && (
                <button
                  onClick={() => {
                    updateState(props.dispatch, [
                      lb<IState>()
                        .p("muscleView")
                        .record({ type: "day", programId: program.id, day: props.progress.day }),
                    ]);
                    props.dispatch(Thunk.pushScreen("muscles"));
                  }}
                  className="px-2 align-middle nm-workout-day-muscles"
                >
                  <IconMuscles2 />
                </button>
              )}
            </div>
          </div>
          {!Progress.isCurrent(props.progress) && (
            <div className="pt-1 pl-2">
              <Button
                name="past-workout-share"
                className="ls-past-workout-share"
                kind="purple"
                onClick={() => {
                  props.setIsShareShown(true);
                }}
              >
                Share
              </Button>
            </div>
          )}
        </div>
        {props.programDay?.description && <Markdown value={props.programDay.description} />}
        {props.progress.entries.map((entry, index) => {
          const programExercise = props.program
            ? Program.getProgramExercise(props.progress.day, program, entry.programExerciseId)
            : undefined;
          const currentGymId = props.settings.currentGymId || props.settings.gyms[0]?.id || "";
          const currentEquipment =
            props.settings.exerciseData[Exercise.toKey(entry.exercise)]?.equipment?.[currentGymId];
          const hidePlatesCalculator = !currentEquipment;

          return (
            <ExerciseView
              history={props.history}
              helps={props.helps}
              showHelp={true}
              showEditButtons={true}
              progress={props.progress}
              settings={props.settings}
              index={index}
              entry={entry}
              hidePlatesCalculator={hidePlatesCalculator}
              programExercise={programExercise}
              program={props.program}
              subscription={props.subscription}
              dayData={Progress.getDayData(props.progress)}
              dispatch={props.dispatch}
              onChangeReps={props.onChangeReps}
              onExerciseInfoClick={() => {
                props.dispatch(Thunk.pushExerciseStatsScreen(entry.exercise));
              }}
              onStartSetChanging={props.onStartSetChanging}
            />
          );
        })}
        <div style={{ marginTop: "-0.25rem" }} className="text-xs">
          <LinkButton
            name="add-exercise-to-workout"
            data-cy="add-exercise-button"
            onClick={() => {
              Progress.showAddExerciseModal(props.dispatch, props.progress.id);
            }}
          >
            Add exercise (only to this workout)
          </LinkButton>
        </div>
        <div>
          <GroupHeader
            name="Notes"
            help={
              <div>
                Notes for the workout. You can also add notes per specific exercise by tapping{" "}
                <IconNotebook className="inline-block" /> for that exercise.
              </div>
            }
          />
          <textarea
            data-cy="workout-notes-input"
            id="workout-notes"
            maxLength={4095}
            name="workout-notes"
            placeholder="The workout went very well..."
            value={props.progress.notes}
            onInput={(e) => {
              const target = e.target;
              if (target instanceof HTMLTextAreaElement) {
                Progress.editNotes(props.dispatch, props.progress.id, target.value);
              }
            }}
            className={`${inputClassName} h-32`}
          />
        </div>
        <div className="pt-1 pb-3 text-center">
          <Button
            name={Progress.isCurrent(props.progress) ? "finish-workout" : "save-history-record"}
            kind="orange"
            data-cy="finish-workout"
            className={Progress.isCurrent(props.progress) ? "ls-finish-workout" : "ls-save-history-record"}
            onClick={() => {
              if (
                (Progress.isCurrent(props.progress) && Progress.isFullyFinishedSet(props.progress)) ||
                confirm("Are you sure?")
              ) {
                props.dispatch({ type: "FinishProgramDayAction" });
              }
            }}
          >
            {Progress.isCurrent(props.progress) ? "Finish the workout" : "Save"}
          </Button>
        </div>
      </section>
    );
  }
);
