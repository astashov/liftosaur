import { h, JSX, Fragment } from "preact";
import { IDispatch } from "../ducks/types";
import { IHistoryRecord, IProgram, ISettings, ISubscription } from "../types";
import { IState, updateProgress, updateState } from "../models/state";
import { Thunk } from "../ducks/thunks";
import { IconMuscles2 } from "./icons/iconMuscles2";
import { IEvaluatedProgram, IEvaluatedProgramDay, Program } from "../models/program";
import { lb } from "lens-shmens";
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
import { Markdown } from "./markdown";
import { DraggableList } from "./draggableList";
import { useEffect, useRef, useState } from "preact/hooks";
import { LinkButton } from "./linkButton";
import { Button } from "./button";
import { ModalDayFromAdhoc } from "./modalDayFromAdhoc";
import { ImagePreloader } from "../utils/imagePreloader";

interface IWorkoutViewProps {
  history: IHistoryRecord[];
  setIsShareShown: (value: boolean) => void;
  progress: IHistoryRecord;
  allPrograms: IProgram[];
  program?: IEvaluatedProgram;
  programDay?: IEvaluatedProgramDay;
  helps: string[];
  isTimerShown: boolean;
  subscription: ISubscription;
  settings: ISettings;
  forceUpdateEntryIndex: boolean;
  setForceUpdateEntryIndex: () => void;
  dispatch: IDispatch;
}

export function Workout(props: IWorkoutViewProps): JSX.Element {
  const selectedEntry = props.progress.entries[props.progress.ui?.currentEntryIndex ?? 0];
  const description = props.programDay?.description;
  const screensRef = useRef<HTMLDivElement>();
  const [isConvertToProgramShown, setIsConvertToProgramShown] = useState(false);

  useEffect(() => {
    ImagePreloader.preload(ImagePreloader.dynohappy);
  }, []);

  useEffect(() => {
    screensRef.current?.scrollTo({
      left: (props.progress.ui?.currentEntryIndex ?? 0) * window.innerWidth,
      behavior: "instant",
    });
  }, [props.forceUpdateEntryIndex]);

  return (
    <section className="pb-8">
      <WorkoutHeader
        description={description}
        progress={props.progress}
        allPrograms={props.allPrograms}
        dispatch={props.dispatch}
        program={props.program}
        setIsConvertToProgramShown={setIsConvertToProgramShown}
        setIsShareShown={props.setIsShareShown}
      />
      <WorkoutListOfExercises
        progress={props.progress}
        dispatch={props.dispatch}
        settings={props.settings}
        onClick={(entryIndex) => {
          updateProgress(
            props.dispatch,
            lb<IHistoryRecord>().pi("ui").p("currentEntryIndex").record(entryIndex),
            "click-exercise-tab"
          );
          props.setForceUpdateEntryIndex();
        }}
      />
      {selectedEntry != null && (
        <div className="mt-2">
          <div
            className="flex overflow-x-scroll overflow-y-hidden"
            id="workout-exercise-scroller"
            ref={screensRef}
            onScroll={() => {
              const scrollLeft = screensRef.current?.scrollLeft ?? 0;
              const windowWidth = window.innerWidth;
              const selectedIndex = Math.floor((scrollLeft + windowWidth / 2) / windowWidth);
              if (selectedIndex !== (props.progress.ui?.currentEntryIndex ?? 0)) {
                updateProgress(
                  props.dispatch,
                  lb<IHistoryRecord>().pi("ui").p("currentEntryIndex").record(selectedIndex),
                  "scroll-exercise-tab"
                );
              }
            }}
            style={{
              WebkitOverflowScrolling: "touch",
              scrollSnapType: "x mandatory",
            }}
          >
            {props.progress.entries.map((entry, entryIndex) => {
              return (
                <div style={{ minWidth: "100vw", scrollSnapAlign: "center", scrollSnapStop: "always" }}>
                  <WorkoutExercise
                    day={props.progress.day}
                    key={entry.id}
                    history={props.history}
                    otherStates={props.program?.states}
                    isSelected={entryIndex === (props.progress.ui?.currentEntryIndex ?? 0)}
                    entryIndex={entryIndex}
                    program={props.program}
                    programDay={props.programDay}
                    progress={props.progress}
                    showHelp={true}
                    helps={props.helps}
                    entry={entry}
                    subscription={props.subscription}
                    settings={props.settings}
                    dispatch={props.dispatch}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}
      {isConvertToProgramShown && (
        <ModalDayFromAdhoc
          onClose={() => setIsConvertToProgramShown(false)}
          initialCurrentProgramId={props.progress.programId}
          record={props.progress}
          dispatch={props.dispatch}
          allPrograms={props.allPrograms}
          settings={props.settings}
        />
      )}
    </section>
  );
}

interface IWorkoutHeaderProps {
  progress: IHistoryRecord;
  dispatch: IDispatch;
  setIsShareShown: (value: boolean) => void;
  setIsConvertToProgramShown?: (value: boolean) => void;
  description?: string;
  allPrograms: IProgram[];
  program?: IEvaluatedProgram;
}

function WorkoutHeader(props: IWorkoutHeaderProps): JSX.Element {
  const { program } = props;
  const currentProgram = props.allPrograms.find((p) => p.id === props.program?.id);
  const isEligibleForProgramDay =
    !Progress.isCurrent(props.progress) && props.allPrograms.every((p) => p.id !== props.progress.programId);
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
          {isEligibleForProgramDay && (
            <div>
              <Button
                kind="orange"
                buttonSize="md"
                data-cy="save-to-program"
                name="save-to-program"
                onClick={() => {
                  if (props.setIsConvertToProgramShown != null) {
                    props.setIsConvertToProgramShown(true);
                  }
                }}
              >
                Create Program Day
              </Button>
            </div>
          )}
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
          {program && !Program.isEmpty(program) && (
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
          {program && currentProgram && !Program.isEmpty(currentProgram) && (
            <div>
              <ButtonIcon
                name="workout-edit-day"
                onClick={() => {
                  const dayData = Program.getDayData(program, props.progress.day);
                  Program.editAction(props.dispatch, currentProgram, dayData);
                }}
              >
                <IconEdit2 />
              </ButtonIcon>
            </div>
          )}
        </div>
      </div>
      {props.description && (
        <div className={`mt-1 text-sm ${props.progress.notes ? "border-b border-grayv3-100 mb-1 pb-1" : ""}`}>
          <Markdown value={props.description} />
        </div>
      )}
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
  onClick: (index: number) => void;
  dispatch: IDispatch;
  settings: ISettings;
}

function WorkoutListOfExercises(props: IWorkoutListOfExercisesProps): JSX.Element {
  const [enableReorder, setEnableReorder] = useState(false);
  return (
    <>
      <div className="mr-2 leading-none text-right">
        <LinkButton
          className="px-2 py-1 text-xs"
          name="reorder-workout-exercises"
          onClick={() => setEnableReorder(!enableReorder)}
        >
          {enableReorder ? "Finish Reordering" : "Reorder Exercises"}
        </LinkButton>
      </div>
      <div className="sticky left-0 z-30 py-1 bg-white border-b border-grayv3-100" style={{ top: "56px" }}>
        <Scroller>
          <div className="flex items-center gap-1 px-4">
            <DraggableList
              isDisabled={!enableReorder}
              hideBorders={true}
              mode="horizontal"
              onClick={props.onClick}
              items={props.progress.entries}
              element={(entry, entryIndex, handleTouchStart, onClick) => {
                return (
                  <WorkoutExerciseThumbnail
                    onClick={() => {
                      if (!enableReorder) {
                        props.onClick(entryIndex);
                      }
                    }}
                    handleTouchStart={handleTouchStart}
                    shouldShowProgress={true}
                    selectedIndex={props.progress.ui?.currentEntryIndex ?? 0}
                    key={entryIndex}
                    progress={props.progress}
                    settings={props.settings}
                    entry={entry}
                    entryIndex={entryIndex}
                  />
                );
              }}
              onDragEnd={(startIndex, endIndex) => {
                updateProgress(
                  props.dispatch,
                  [
                    lb<IHistoryRecord>()
                      .p("changes")
                      .recordModify((changes) => {
                        return Array.from(new Set([...(changes || []), "order"]));
                      }),
                    lb<IHistoryRecord>()
                      .p("entries")
                      .recordModify((entries) => {
                        const newEntries = [...entries];
                        const [entriesToMove] = newEntries.splice(startIndex, 1);
                        newEntries.splice(endIndex, 0, entriesToMove);
                        return newEntries;
                      }),
                  ],
                  "drag-exercise-tab"
                );
                setTimeout(() => {
                  props.onClick(endIndex);
                }, 0);
              }}
            />
            <button
              name="add-exercise-to-workout"
              data-cy="add-exercise-button"
              className="p-2 nm-add-exercise-to-workout"
              onClick={() => {
                Progress.showAddExerciseModal(props.dispatch, props.progress.id);
              }}
            >
              <IconPlus2 size={15} color={Tailwind.colors().grayv3.main} />
            </button>
          </div>
        </Scroller>
      </div>
    </>
  );
}
