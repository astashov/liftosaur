import { h, JSX, RefObject } from "preact";
import { IDispatch } from "../ducks/types";
import { IHistoryRecord, ISettings, ISubscription } from "../types";
import { IState, updateState } from "../models/state";
import { Thunk } from "../ducks/thunks";
import { IconMuscles2 } from "./icons/iconMuscles2";
import { IEvaluatedProgram, IEvaluatedProgramDay, Program } from "../models/program";
import { lb } from "lens-shmens";
import { EditProgram } from "../models/editProgram";
import { ButtonIcon } from "./buttonIcon";
import { IconEdit2 } from "./icons/iconEdit2";
import { Tailwind } from "../utils/tailwindConfig";
import { TextareaAutogrow } from "./textareaAutogrow";
import { Progress } from "../models/progress";
import { IconPlus2 } from "./icons/iconPlus2";
import { WorkoutExercise } from "./workoutExercise";
import { Scroller } from "./scroller";
import { WorkoutExerciseThumbnail } from "./workoutExerciseThumbnail";
import { IconShare } from "./icons/iconShare";

interface IWorkoutViewProps {
  history: IHistoryRecord[];
  surfaceRef: RefObject<HTMLElement>;
  setIsShareShown: (value: boolean) => void;
  progress: IHistoryRecord;
  program?: IEvaluatedProgram;
  programDay?: IEvaluatedProgramDay;
  helps: string[];
  isTimerShown: boolean;
  subscription: ISubscription;
  settings: ISettings;
  dispatch: IDispatch;
}

export function Workout(props: IWorkoutViewProps): JSX.Element {
  const selectedEntry = props.progress.entries[props.progress.ui?.currentEntryIndex ?? 0];
  return (
    <section>
      <WorkoutHeader
        progress={props.progress}
        dispatch={props.dispatch}
        program={props.program}
        setIsShareShown={props.setIsShareShown}
      />
      <div className="sticky left-0 z-30 py-2 bg-white border-b border-grayv3-100" style={{ top: "56px" }}>
        <WorkoutListOfExercises progress={props.progress} dispatch={props.dispatch} settings={props.settings} />
      </div>
      {selectedEntry != null && (
        <div className="mt-2">
          <WorkoutExercise
            day={props.progress.day}
            key={selectedEntry.id}
            surfaceRef={props.surfaceRef}
            history={props.history}
            otherStates={props.program?.states}
            entryIndex={props.progress.ui?.currentEntryIndex ?? 0}
            program={props.program}
            programDay={props.programDay}
            progress={props.progress}
            showHelp={true}
            helps={props.helps}
            entry={selectedEntry}
            subscription={props.subscription}
            settings={props.settings}
            dispatch={props.dispatch}
          />
        </div>
      )}
    </section>
  );
}

interface IWorkoutHeaderProps {
  progress: IHistoryRecord;
  dispatch: IDispatch;
  setIsShareShown: (value: boolean) => void;
  program?: IEvaluatedProgram;
}

function WorkoutHeader(props: IWorkoutHeaderProps): JSX.Element {
  const { program } = props;
  return (
    <div className="px-4">
      <div className="flex gap-4">
        <div className="flex-1 mr-2 align-middle">
          <div className="text-sm font-semibold">{props.progress?.dayName}</div>
          <div data-cy="day-name" className="text-sm text-grayv2-main">
            {props.progress?.programName}
          </div>
        </div>
        <div className="flex gap-2 align-middle">
          {!Progress.isCurrent(props.progress) && (
            <div>
              <ButtonIcon
                name="past-workout-share"
                className="ls-past-workout-share"
                onClick={() => {
                  props.setIsShareShown(true);
                }}
              >
                <IconShare />
              </ButtonIcon>
            </div>
          )}
          {program && (
            <div>
              <ButtonIcon
                onClick={() => {
                  updateState(props.dispatch, [
                    lb<IState>()
                      .p("muscleView")
                      .record({ type: "day", programId: program.id, day: props.progress.day }),
                  ]);
                  props.dispatch(Thunk.pushScreen("muscles"));
                }}
                name="workout-day-muscles"
              >
                <IconMuscles2 color={Tailwind.colors().grayv3[900]} />
              </ButtonIcon>
            </div>
          )}
          {program && (
            <div>
              <ButtonIcon
                name="workout-edit-day"
                onClick={() => {
                  const dayData = Program.getDayData(program, props.progress.day);
                  const plannerState = EditProgram.initPlannerState(program.id, program.planner, dayData);
                  Program.editAction(props.dispatch, program.id, plannerState);
                }}
              >
                <IconEdit2 />
              </ButtonIcon>
            </div>
          )}
        </div>
      </div>
      <div className="">
        <TextareaAutogrow
          data-cy="workout-notes-input"
          id="workout-notes"
          maxLength={4095}
          name="workout-notes"
          placeholder="Add workout notes here..."
          value={props.progress.notes}
          onChangeText={(text) => {
            Progress.editNotes(props.dispatch, props.progress.id, text);
          }}
          className="mt-1"
        />
      </div>
    </div>
  );
}

interface IWorkoutListOfExercisesProps {
  progress: IHistoryRecord;
  dispatch: IDispatch;
  settings: ISettings;
}

function WorkoutListOfExercises(props: IWorkoutListOfExercisesProps): JSX.Element {
  return (
    <Scroller>
      <div className="flex items-center gap-1 px-4">
        {props.progress.entries.map((entry, entryIndex) => {
          return (
            <WorkoutExerciseThumbnail
              key={entryIndex}
              progress={props.progress}
              settings={props.settings}
              dispatch={props.dispatch}
              entry={entry}
              entryIndex={entryIndex}
            />
          );
        })}
        <button
          name="add-exercise-to-workout"
          data-cy="add-exercise-button"
          className="ml-1 nm-add-exercise-to-workout"
          onClick={() => {
            Progress.showAddExerciseModal(props.dispatch, props.progress.id);
          }}
        >
          <IconPlus2 size={15} color={Tailwind.colors().grayv3.main} />
        </button>
      </div>
    </Scroller>
  );
}
