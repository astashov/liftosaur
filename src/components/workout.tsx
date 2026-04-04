import { JSX, useEffect, useRef, useState } from "react";
import { IDispatch } from "../ducks/types";
import { IHistoryRecord, IProgram, ISettings, IStats, ISubscription } from "../types";
import { IState, updateProgress, updateState } from "../models/state";
import { Thunk_postevent, Thunk_pushScreen, Thunk_finishProgramDay } from "../ducks/thunks";
import { IconMuscles2 } from "./icons/iconMuscles2";
import {
  IEvaluatedProgram,
  IEvaluatedProgramDay,
  Program_isEmpty,
  Program_getDayData,
  Program_editAction,
} from "../models/program";
import { lb } from "lens-shmens";
import { ButtonIcon } from "./buttonIcon";
import { IconEdit2 } from "./icons/iconEdit2";
import { Tailwind_colors } from "../utils/tailwindConfig";
import { TextareaAutogrow } from "./textareaAutogrow";
import {
  Progress_lbProgress,
  Progress_isCurrent,
  Progress_editNotes,
  Progress_getColorToSupersetGroup,
  Progress_isFullyFinishedSet,
} from "../models/progress";
import { IconPlus2 } from "./icons/iconPlus2";
import { WorkoutExercise } from "./workoutExercise";
import { Scroller } from "./scroller";
import { WorkoutExerciseThumbnail } from "./workoutExerciseThumbnail";
import { IconShare } from "./icons/iconShare";
import { Markdown } from "./markdown";
import { DraggableList } from "./draggableList";
import { LinkButton } from "./linkButton";
import { Button } from "./button";
import { ImagePreloader_preload, ImagePreloader_dynohappy } from "../utils/imagePreloader";
import { navigationRef } from "../navigation/navigationRef";
import { HealthSync_eligibleForAppleHealth, HealthSync_eligibleForGoogleHealth } from "../lib/healthSync";
import { History_calories, History_pauseWorkout } from "../models/history";
import { SendMessage_toIosAndAndroid, SendMessage_isIos } from "../utils/sendMessage";

interface IWorkoutViewProps {
  history: IHistoryRecord[];
  setIsShareShown: (value: boolean) => void;
  progress: IHistoryRecord;
  allPrograms: IProgram[];
  program?: IEvaluatedProgram;
  programDay?: IEvaluatedProgramDay;
  helps: string[];
  stats: IStats;
  isTimerShown: boolean;
  subscription: ISubscription;
  settings: ISettings;
  dispatch: IDispatch;
}

export function Workout(props: IWorkoutViewProps): JSX.Element {
  const selectedEntry = props.progress.entries[props.progress.ui?.currentEntryIndex ?? 0];
  const description = props.programDay?.description;
  const screensRef = useRef<HTMLDivElement>(null);
  const forceUpdateEntryIndex = !!props.progress.ui?.forceUpdateEntryIndex;

  useEffect(() => {
    ImagePreloader_preload(ImagePreloader_dynohappy);
    if (props.program && Program_isEmpty(props.program) && props.progress.entries.length === 0) {
      updateState(
        props.dispatch,
        [Progress_lbProgress(props.progress.id).pi("ui").p("exercisePicker").record({})],
        "Open exercise picker on empty program"
      );
    }
  }, []);

  useEffect(() => {
    screensRef.current?.scrollTo({
      left: (props.progress.ui?.currentEntryIndex ?? 0) * window.innerWidth,
      behavior: "instant",
    });
  }, [forceUpdateEntryIndex]);

  return (
    <section className="pb-8">
      <WorkoutHeader
        description={description}
        progress={props.progress}
        settings={props.settings}
        allPrograms={props.allPrograms}
        dispatch={props.dispatch}
        program={props.program}
        onConvertToProgram={() => {
          navigationRef.navigate("dayFromAdhocModal", { progressId: props.progress.id });
        }}
        setIsShareShown={props.setIsShareShown}
      />
      <WorkoutListOfExercises
        progress={props.progress}
        dispatch={props.dispatch}
        settings={props.settings}
        onClick={(entryIndex) => {
          updateProgress(
            props.dispatch,
            [
              lb<IHistoryRecord>().pi("ui").p("currentEntryIndex").record(entryIndex),
              lb<IHistoryRecord>()
                .pi("ui")
                .p("forceUpdateEntryIndex")
                .recordModify((v) => !v),
            ],
            "click-exercise-tab"
          );
        }}
      />
      {selectedEntry != null && (
        <div className="mt-2">
          <div
            className="flex overflow-x-scroll overflow-y-hidden parent-scroller"
            ref={screensRef}
            onScroll={() => {
              const scrollLeft = screensRef.current?.scrollLeft ?? 0;
              const windowWidth = window.innerWidth;
              const selectedIndex = Math.floor((scrollLeft + windowWidth / 2) / windowWidth);
              if (selectedIndex !== (props.progress.ui?.currentEntryIndex ?? 0)) {
                if (!props.progress.ui?.isExternal) {
                  updateProgress(
                    props.dispatch,
                    lb<IHistoryRecord>().pi("ui").p("currentEntryIndex").record(selectedIndex),
                    "scroll-exercise-tab"
                  );
                } else {
                  updateProgress(
                    props.dispatch,
                    [
                      lb<IHistoryRecord>().pi("ui").p("isExternal").record(false),
                      lb<IHistoryRecord>()
                        .pi("ui")
                        .p("forceUpdateEntryIndex")
                        .recordModify((v) => !v),
                    ],
                    "scroll-exercise-tab-external"
                  );
                }
              }
            }}
            style={{
              WebkitOverflowScrolling: "touch",
              scrollSnapType: "x mandatory",
            }}
          >
            {props.progress.entries.map((entry, entryIndex) => {
              return (
                <div
                  key={entryIndex}
                  style={{ minWidth: "100vw", scrollSnapAlign: "center", scrollSnapStop: "always" }}
                >
                  <WorkoutExercise
                    day={props.progress.day}
                    key={entry.id}
                    stats={props.stats}
                    history={props.history}
                    otherStates={props.program?.states}
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
    </section>
  );
}

interface IWorkoutHeaderProps {
  progress: IHistoryRecord;
  settings: ISettings;
  dispatch: IDispatch;
  setIsShareShown: (value: boolean) => void;
  onConvertToProgram?: () => void;
  description?: string;
  allPrograms: IProgram[];
  program?: IEvaluatedProgram;
}

function WorkoutHeader(props: IWorkoutHeaderProps): JSX.Element {
  const { program } = props;
  const currentProgram = props.allPrograms.find((p) => p.id === props.program?.id);
  const isEligibleForProgramDay =
    !Progress_isCurrent(props.progress) && props.allPrograms.every((p) => p.id !== props.progress.programId);
  return (
    <div className="px-4">
      <div className="flex gap-4">
        <div className="flex-1 mr-2 align-middle">
          <div className="text-sm font-semibold">{props.progress?.dayName}</div>
          <div data-cy="day-name" className="text-sm text-text-secondary">
            {props.progress?.programName}
          </div>
        </div>
        <div className="flex gap-2 align-middle">
          {isEligibleForProgramDay && (
            <div>
              <Button
                kind="purple"
                buttonSize="md"
                data-cy="save-to-program"
                name="save-to-program"
                onClick={() => {
                  if (props.onConvertToProgram != null) {
                    props.onConvertToProgram();
                  }
                }}
              >
                Create Program Day
              </Button>
            </div>
          )}
          {!Progress_isCurrent(props.progress) && (
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
          {program && !Program_isEmpty(program) && (
            <div>
              <ButtonIcon
                onClick={() => {
                  updateState(
                    props.dispatch,
                    [
                      lb<IState>()
                        .p("muscleView")
                        .record({ type: "day", programId: program.id, day: props.progress.day }),
                    ],
                    "Show muscle view"
                  );
                  props.dispatch(Thunk_pushScreen("muscles"));
                }}
                name="workout-day-muscles"
              >
                <IconMuscles2 />
              </ButtonIcon>
            </div>
          )}
          {program && currentProgram && !Program_isEmpty(currentProgram) && (
            <div>
              <ButtonIcon
                name="workout-edit-day"
                onClick={() => {
                  const dayData = Program_getDayData(program, props.progress.day);
                  Program_editAction(props.dispatch, currentProgram, dayData, undefined, { tab: "program" });
                }}
              >
                <IconEdit2 />
              </ButtonIcon>
            </div>
          )}
          <div>
            <Button
              name={Progress_isCurrent(props.progress) ? "finish-workout" : "save-history-record"}
              kind="purple"
              buttonSize="md"
              data-cy="finish-workout"
              className={Progress_isCurrent(props.progress) ? "ls-finish-workout" : "ls-save-history-record"}
              onClick={() => {
                if (
                  (Progress_isCurrent(props.progress) && Progress_isFullyFinishedSet(props.progress)) ||
                  confirm(
                    Progress_isCurrent(props.progress)
                      ? "Are you sure you want to FINISH this workout? Some sets are not marked as completed."
                      : "Are you sure you want to SAVE this PAST workout?"
                  )
                ) {
                  SendMessage_toIosAndAndroid({ type: "pauseWorkout" });
                  props.dispatch(Thunk_finishProgramDay());
                  if (Progress_isCurrent(props.progress)) {
                    props.dispatch(Thunk_postevent("finish-workout", { workout: JSON.stringify(props.progress) }));
                    const healthName = SendMessage_isIos() ? "Apple Health" : "Google Health";
                    const shouldSyncToHealth =
                      ((HealthSync_eligibleForAppleHealth() && props.settings.appleHealthSyncWorkout) ||
                        (HealthSync_eligibleForGoogleHealth() && props.settings.googleHealthSyncWorkout)) &&
                      (!props.settings.healthConfirmation ||
                        confirm(`Do you want to sync this workout to ${healthName}?`));
                    SendMessage_toIosAndAndroid({
                      type: "finishWorkout",
                      healthSync: shouldSyncToHealth ? "true" : "false",
                      calories: `${History_calories(props.progress)}`,
                      intervals: JSON.stringify(History_pauseWorkout(props.progress.intervals)),
                    });
                  }
                }
              }}
            >
              {Progress_isCurrent(props.progress) ? "Finish" : "Save"}
            </Button>
          </div>
        </div>
      </div>
      {props.description && (
        <div className={`mt-1 text-sm ${props.progress.notes ? "border-b border-background-subtle mb-1 pb-1" : ""}`}>
          <Markdown value={props.description} />
        </div>
      )}
      <div className="">
        <TextareaAutogrow
          data-cy="workout-notes-input"
          id="workout-notes"
          debounceMs={1000}
          maxLength={4095}
          name="workout-notes"
          placeholder="Add workout notes here..."
          value={props.progress.notes}
          onChangeText={(text) => {
            Progress_editNotes(props.dispatch, props.progress.id, text);
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
  const colorToSupersetGroup = Progress_getColorToSupersetGroup(props.progress);
  return (
    <>
      <div className="mr-2 leading-none text-right safe-area-inset-top-compensate">
        <LinkButton
          className="px-2 py-1 text-xs"
          name="reorder-workout-exercises"
          onClick={() => setEnableReorder(!enableReorder)}
        >
          {enableReorder ? "Finish Reordering" : "Reorder Exercises"}
        </LinkButton>
      </div>
      <div className="sticky top-0 left-0 z-30 safe-area-inset-top ">
        <div className="py-1 border-b bg-background-default border-background-subtle">
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
                      colorToSupersetGroup={colorToSupersetGroup}
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
                          return newEntries.map((e, i) => ({ ...e, index: i }));
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
                  updateState(
                    props.dispatch,
                    [
                      Progress_lbProgress(props.progress.id)
                        .pi("ui")
                        .p("exercisePicker")
                        .record({
                          state: {
                            mode: "workout",
                            screenStack: ["exercisePicker"],
                            sort: "name_asc",
                            filters: {},
                            selectedExercises: [],
                          },
                        }),
                    ],
                    "Open exercise picker"
                  );
                }}
              >
                <IconPlus2 size={15} color={Tailwind_colors().lightgray[600]} />
              </button>
            </div>
          </Scroller>
        </div>
      </div>
    </>
  );
}
