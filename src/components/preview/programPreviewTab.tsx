import { JSX, memo } from "react";
import { View } from "react-native";
import { IProgram, ISettings, IStats } from "../../types";
import { Program_evaluate } from "../../models/program";
import { ILensDispatch } from "../../utils/useLensReducer";
import { Markdown } from "../markdown";
import { IDispatch } from "../../ducks/types";
import { IPlannerState, IPlannerUi } from "../../pages/planner/models/types";
import { ProgramPreviewTabDay } from "./programPreviewTabDay";
import { useProgressiveItems } from "../../utils/useProgressiveItems";
import { usePerfRenderCount } from "../../utils/usePerfRenderCount";
import { IProgramPreviewWeek } from "./programPreviewWeeks";

interface IProgramPreviewWeekContentProps {
  week: IProgramPreviewWeek;
  weekIndex: number;
  program: IProgram;
  programId: string;
  settings: ISettings;
  ui: IPlannerUi;
  stats: IStats;
  dispatch: IDispatch;
  plannerDispatch: ILensDispatch<IPlannerState>;
  totalWeeks: number;
}

export const ProgramPreviewWeekContent = memo(function ProgramPreviewWeekContent(
  props: IProgramPreviewWeekContentProps
): JSX.Element {
  usePerfRenderCount("ProgramPreviewWeekContent");
  const evaluatedProgram = Program_evaluate(props.program, props.settings);
  const { week, totalWeeks } = props;
  const visibleDays = useProgressiveItems(week.days, {
    initialBatch: 1,
    batchSize: 1,
    debugLabel: `Preview/week-${props.weekIndex}`,
    resetKey: props.weekIndex,
  });
  return (
    <View>
      {week.description && (
        <View className="mx-4">
          <Markdown className="text-sm" value={week.description} />
        </View>
      )}
      <View className="flex-row flex-wrap justify-center mt-4" style={{ gap: 24 }}>
        {visibleDays.map((d, i) => (
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
});
