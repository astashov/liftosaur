import { JSX, memo } from "react";
import { View } from "react-native";
import { IProgram, ISettings, IStats } from "../../types";
import {
  Program_evaluate,
  Program_nextHistoryRecord,
  Program_getProgramDay,
  Program_getProgramDayUsedExercises,
} from "../../models/program";
import { ILensDispatch } from "../../utils/useLensReducer";
import { ScrollableTabs } from "../scrollableTabs";
import { Markdown } from "../markdown";
import { ObjectUtils_filter } from "../../utils/object";
import { IDispatch } from "../../ducks/types";
import { IPlannerState, IPlannerUi } from "../../pages/planner/models/types";
import { ProgramPreviewTabDay } from "./programPreviewTabDay";

interface IProgramPreviewWeek {
  name: string;
  description?: string;
  days: { day: number; states: Record<string, unknown>; progress: ReturnType<typeof Program_nextHistoryRecord> }[];
}

export function ProgramPreview_buildWeeks(
  program: IProgram,
  settings: ISettings,
  stats: IStats
): IProgramPreviewWeek[] {
  const evaluatedProgram = Program_evaluate(program, settings);
  let dayNumber = 0;
  return evaluatedProgram.weeks.map((week, weekIndex) => ({
    name: week.name,
    description: evaluatedProgram.weeks[weekIndex]?.description,
    days: week.days.map(() => {
      dayNumber += 1;
      const progress = Program_nextHistoryRecord(program, settings, stats, dayNumber);
      const programDay = Program_getProgramDay(evaluatedProgram, dayNumber);
      const dayExercises = programDay ? Program_getProgramDayUsedExercises(programDay) : [];
      const exerciseTags = new Set(dayExercises.map((e) => e.tags).flat());
      const states = ObjectUtils_filter(evaluatedProgram.states, (key) => exerciseTags.has(key));
      return { day: dayNumber, states, progress };
    }),
  }));
}

interface IProgramPreviewWeekContentProps {
  week: IProgramPreviewWeek;
  program: IProgram;
  programId: string;
  settings: ISettings;
  ui: IPlannerUi;
  stats: IStats;
  dispatch: IDispatch;
  plannerDispatch: ILensDispatch<IPlannerState>;
  totalWeeks: number;
}

export function ProgramPreviewWeekContent(props: IProgramPreviewWeekContentProps): JSX.Element {
  const evaluatedProgram = Program_evaluate(props.program, props.settings);
  const { week, totalWeeks } = props;
  return (
    <View>
      {week.description && (
        <View className="mx-4">
          <Markdown className="text-sm" value={week.description} />
        </View>
      )}
      <View className="flex-row flex-wrap justify-center mt-4" style={{ gap: 24 }}>
        {week.days.map((d, i) => (
          <View key={i} style={{ maxWidth: 384, minWidth: 288 }} className="flex-1">
            <ProgramPreviewTabDay
              stats={props.stats}
              dispatch={props.dispatch}
              program={evaluatedProgram}
              programId={props.programId}
              weekName={totalWeeks > 1 ? week.name : undefined}
              day={d.day}
              settings={props.settings}
              progress={d.progress}
              ui={props.ui}
              plannerDispatch={props.plannerDispatch}
            />
          </View>
        ))}
      </View>
    </View>
  );
}

interface IProgramPreviewTabProps {
  program: IProgram;
  programId: string;
  settings: ISettings;
  ui: IPlannerUi;
  stats: IStats;
  dispatch: IDispatch;
  plannerDispatch: ILensDispatch<IPlannerState>;
}

export const ProgramPreviewTab = memo((props: IProgramPreviewTabProps): JSX.Element => {
  const weeks = ProgramPreview_buildWeeks(props.program, props.settings, props.stats);

  return (
    <ScrollableTabs
      shouldNotExpand={true}
      color="purple"
      type="squares"
      topPadding="0.25rem"
      className="gap-2 px-4"
      nonSticky={false}
      tabs={weeks.map((week) => ({
        label: week.name,
        children: () => (
          <ProgramPreviewWeekContent
            week={week}
            program={props.program}
            programId={props.programId}
            settings={props.settings}
            ui={props.ui}
            stats={props.stats}
            dispatch={props.dispatch}
            plannerDispatch={props.plannerDispatch}
            totalWeeks={weeks.length}
          />
        ),
      }))}
    />
  );
});
