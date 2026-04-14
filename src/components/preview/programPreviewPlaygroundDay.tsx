import { JSX, memo, useCallback } from "react";
import { View } from "react-native";
import { Text } from "../primitives/text";
import { buildCardsReducer, ICardsAction } from "../../ducks/reducer";
import { IHistoryRecord, ISettings, IStats } from "../../types";
import { IDispatch } from "../../ducks/types";
import { ProgramPreviewPlaygroundExercise } from "./programPreviewPlaygroundExercise";
import { lb } from "lens-shmens";
import { Button } from "../button";
import { IEvaluatedProgram, Program_getProgramDay, Program_getProgramDayUsedExercises } from "../../models/program";
import { StringUtils_dashcase } from "../../utils/string";
import { SimpleMarkdown } from "../simpleMarkdown";
import { Scroller } from "../scroller";
import { WorkoutExerciseThumbnail } from "../workoutExerciseThumbnail";
import { updateProgress } from "../../models/state";
import { Progress_getColorToSupersetGroup } from "../../models/progress";

interface IProgramPreviewPlaygroundDayProps {
  program: IEvaluatedProgram;
  weekName?: string;
  day: number;
  isPlayground: boolean;
  settings: ISettings;
  progress: IHistoryRecord;
  onProgressChange: (newProgress: IHistoryRecord) => void;
  stats: IStats;
  onFinish: () => void;
}

export const ProgramPreviewPlaygroundDay = memo((props: IProgramPreviewPlaygroundDayProps): JSX.Element => {
  const dispatch: IDispatch = useCallback(
    async (action) => {
      const newProgress = buildCardsReducer(
        props.settings,
        props.stats,
        undefined
      )(props.progress, action as ICardsAction);
      props.onProgressChange(newProgress);
    },
    [props.settings, props.progress]
  );

  const programDay = Program_getProgramDay(props.program, props.day)!;
  const index = props.progress.ui?.currentEntryIndex ?? 0;
  const entry = props.progress.entries[index];
  const dayExercises = programDay ? Program_getProgramDayUsedExercises(programDay) : [];
  const programExercises = props.isPlayground
    ? dayExercises.filter((e) => e.key === entry.programExerciseId)
    : dayExercises;

  return (
    <View
      data-cy={`preview-day-${StringUtils_dashcase(programDay.name)}`}
      testID={`preview-day-${StringUtils_dashcase(programDay.name)}`}
    >
      <Text className="mx-4 mb-1 text-lg font-bold" data-cy="preview-day-name" testID="preview-day-name">
        {props.weekName ? `${props.weekName} - ` : ""}
        {programDay.name}
      </Text>
      {programDay.description && (
        <View className="mx-4">
          <SimpleMarkdown value={programDay.description} className="text-sm" />
        </View>
      )}
      {props.isPlayground && (
        <View className="mb-2">
          <PreviewListOfExercises
            isPlayground={props.isPlayground}
            progress={props.progress}
            settings={props.settings}
            dispatch={dispatch}
          />
        </View>
      )}
      {(programExercises ?? []).map((programExercise, i) => {
        const anEntry = props.progress.entries.find((e) => e.programExerciseId === programExercise.key);
        if (!anEntry) {
          return null;
        }
        return (
          <ProgramPreviewPlaygroundExercise
            key={programExercise.key}
            entry={anEntry}
            dayIndex={props.day}
            progress={props.progress}
            isPlayground={props.isPlayground}
            programExercise={programExercise}
            program={props.program}
            index={props.isPlayground ? index : i}
            settings={props.settings}
            stats={props.stats}
            dispatch={dispatch}
          />
        );
      })}
      {props.isPlayground && (
        <View className="items-center">
          <Button
            name="finish-day-details-playground"
            kind="purple"
            onClick={props.onFinish}
            data-cy="finish-day-details-playground"
          >
            Finish this day
          </Button>
        </View>
      )}
    </View>
  );
});

interface IPreviewListOfExercisesProps {
  isPlayground: boolean;
  progress: IHistoryRecord;
  settings: ISettings;
  dispatch: IDispatch;
}

function PreviewListOfExercises(props: IPreviewListOfExercisesProps): JSX.Element {
  const colorToSupersetGroup = Progress_getColorToSupersetGroup(props.progress);
  return (
    <Scroller>
      <View className="flex-row items-center gap-1 px-4">
        {props.progress.entries.map((entry, entryIndex) => {
          const currentIdx = props.progress.ui?.currentEntryIndex ?? 0;
          return (
            <WorkoutExerciseThumbnail
              colorToSupersetGroup={colorToSupersetGroup}
              onClick={() => {
                updateProgress(
                  props.dispatch,
                  [lb<IHistoryRecord>().pi("ui", {}).p("currentEntryIndex").record(entryIndex)],
                  "click-exercise-tab"
                );
              }}
              shouldShowProgress={props.isPlayground}
              selectedIndex={currentIdx}
              isCurrent={entryIndex === currentIdx}
              currentSuperset={props.progress.entries[currentIdx]?.superset}
              key={entryIndex}
              settings={props.settings}
              entry={entry}
              entryIndex={entryIndex}
            />
          );
        })}
      </View>
    </Scroller>
  );
}
