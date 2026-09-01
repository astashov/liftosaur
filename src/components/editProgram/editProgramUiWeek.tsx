import { JSX, memo } from "react";
import { View, Pressable } from "react-native";
import { Text } from "../primitives/text";
import { IPlannerState } from "../../pages/planner/models/types";
import { ILensDispatch } from "../../utils/useLensReducer";
import { lb } from "lens-shmens";
import { MarkdownEditorBorderless } from "../markdownEditorBorderless";
import { StringUtils_pluralize } from "../../utils/string";
import { IconMusclesW } from "../icons/iconMusclesW";
import { EditProgramUiDayView } from "./editProgramUiDay";
import { ISettings } from "../../types";
import { LinkButton } from "../linkButton";
import { IPlannerEvalResult } from "../../pages/planner/plannerExerciseEvaluator";
import { ContentGrowingTextarea } from "../contentGrowingTextarea";
import { IEvaluatedProgram, Program_getDayNumber } from "../../models/program";
import { IDispatch } from "../../ducks/types";
import { navigateToModal } from "../../navigation/navigationService";
import { useProgressiveItems } from "../../utils/useProgressiveItems";

interface IEditProgramViewProps {
  state: IPlannerState;
  settings: ISettings;
  evaluatedWeeks: IPlannerEvalResult[][];
  evaluatedProgram: IEvaluatedProgram;
  exerciseFullNames: string[];
  programId: string;
  dispatch: IDispatch;
  plannerDispatch: ILensDispatch<IPlannerState>;
}

export const EditProgramUiWeekView = memo(function EditProgramUiWeekView(props: IEditProgramViewProps): JSX.Element {
  const ui = props.state.ui;
  const program = props.state.current.program;
  const planner = program.planner!;

  // Deleting a week doesn't move `ui.weekIndex`, so it can point past the end until something else
  // moves it.
  const currentWeekIndex = Math.min(ui.weekIndex, Math.max(0, planner.weeks.length - 1));
  const currentWeek = planner.weeks[currentWeekIndex];
  const visibleDays = useProgressiveItems(currentWeek?.days ?? [], {
    initialBatch: 1,
    batchSize: 1,
    debugLabel: `Edit/week-${currentWeekIndex}-days`,
    resetKey: currentWeekIndex,
  });
  if (!currentWeek) {
    return <View />;
  }

  const lbPlanner = lb<IPlannerState>().p("current").p("program").pi("planner");
  const lbPlannerWeek = lbPlanner.p("weeks").i(currentWeekIndex);

  const isValidProgram = props.evaluatedWeeks.every((week) => week.every((day) => day.success));
  const evaluatedCurrentWeek = props.evaluatedWeeks[currentWeekIndex];
  const dayIndexOffset = Program_getDayNumber(planner, currentWeekIndex + 1, 1);
  const allDaysCollapsed = Array.from(currentWeek.days).every((d, i) => {
    return ui.dayUi.collapsed.has(`${currentWeekIndex}-${i}`);
  });

  return (
    <View>
      <View className="flex-row items-center px-4 pt-2">
        <View className="mr-auto">
          <ContentGrowingTextarea
            className="text-base font-bold"
            value={currentWeek.name}
            onInput={(newValue) => {
              if (newValue) {
                props.plannerDispatch(lbPlannerWeek.p("name").record(newValue), "Update week name");
              }
            }}
          />
        </View>
        <View className="flex-row items-center">
          <View>
            <Pressable
              data-testid="editor-v2-week-muscles"
              testID="editor-v2-week-muscles"
              className="px-2"
              onPress={() => {
                props.plannerDispatch(
                  lb<IPlannerState>().pi("ui").p("showWeekStats").record(currentWeekIndex),
                  "Show week stats"
                );
                navigateToModal("weekStatsModal", { programId: props.programId });
              }}
            >
              <IconMusclesW size={20} />
            </Pressable>
          </View>
        </View>
      </View>
      <View className="px-3 py-1">
        <MarkdownEditorBorderless
          value={currentWeek.description}
          debounceMs={500}
          placeholder={`Week description in Markdown...`}
          onChange={(v) => {
            props.plannerDispatch(
              lbPlanner.p("weeks").i(currentWeekIndex).p("description").record(v),
              "Update week description"
            );
          }}
        />
      </View>
      <View className="flex-row items-center px-4">
        <View className="mr-auto">
          <Text className="text-xs">
            {currentWeek.days.length} {StringUtils_pluralize("day", currentWeek.days.length)}
          </Text>
        </View>
        <View>
          <LinkButton
            name="collapse-all-days"
            className="text-xs font-normal"
            onClick={() => {
              props.plannerDispatch(
                lb<IPlannerState>()
                  .p("ui")
                  .p("dayUi")
                  .p("collapsed")
                  .recordModify((collapsed) => {
                    const newCollapsed = new Set<string>(collapsed);
                    for (
                      let dayInWeekIndex = 0;
                      dayInWeekIndex < planner.weeks[currentWeekIndex].days.length;
                      dayInWeekIndex += 1
                    ) {
                      const key = `${currentWeekIndex}-${dayInWeekIndex}`;
                      if (allDaysCollapsed) {
                        newCollapsed.delete(key);
                      } else {
                        newCollapsed.add(key);
                      }
                    }
                    return newCollapsed;
                  }),
                "Toggle all days collapse"
              );
            }}
          >
            {allDaysCollapsed ? "Expand" : "Collapse"} all days
          </LinkButton>
        </View>
      </View>
      {visibleDays.map((plannerDay, dayInWeekIndex) => {
        const evaluatedDay = evaluatedCurrentWeek[dayInWeekIndex];
        const dayData = {
          week: currentWeekIndex + 1,
          dayInWeek: dayInWeekIndex + 1,
          day: dayInWeekIndex + dayIndexOffset,
        };
        return (
          <EditProgramUiDayView
            key={plannerDay.id ?? dayInWeekIndex}
            settings={props.settings}
            dispatch={props.dispatch}
            programId={props.programId}
            evaluatedProgram={props.evaluatedProgram}
            isValidProgram={isValidProgram}
            evaluatedDay={evaluatedDay}
            exerciseFullNames={props.exerciseFullNames}
            dayData={dayData}
            lbPlannerWeek={lbPlannerWeek}
            day={plannerDay}
            weekIndex={currentWeekIndex}
            dayInWeekIndex={dayInWeekIndex}
            plannerDispatch={props.plannerDispatch}
            state={props.state}
          />
        );
      })}
    </View>
  );
});
