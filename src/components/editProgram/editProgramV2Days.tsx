/* eslint-disable @typescript-eslint/ban-types */
import { lb, LensBuilder } from "lens-shmens";
import { LinkButton } from "../../components/linkButton";
import { ScrollableTabs } from "../../components/scrollableTabs";
import { IPlannerProgram, ISettings } from "../../types";
import { ILensDispatch } from "../../utils/useLensReducer";
import { EditProgramV2Day } from "./editProgramV2Day";
import { IPlannerState, IPlannerUi } from "../../pages/planner/models/types";
import { DraggableList } from "../draggableList";
import { applyChangesInEditor } from "./editProgramV2Utils";
import { IPlannerEvalResult } from "../../pages/planner/plannerExerciseEvaluator";
import { Button } from "../button";
import { IconMusclesD } from "../icons/iconMusclesD";
import { IconMusclesW } from "../icons/iconMusclesW";
import { IconGraphsE } from "../icons/iconGraphsE";
import { LftModal } from "../modal";
import { PlannerWeekStats } from "../../pages/planner/components/plannerWeekStats";
import { PlannerDayStats } from "../../pages/planner/components/plannerDayStats";
import { PlannerExerciseStats } from "../../pages/planner/components/plannerExerciseStats";
import { IconDoc } from "../icons/iconDoc";
import { PlannerProgram } from "../../pages/planner/models/plannerProgram";
import { IconPreview } from "../icons/iconPreview";
import { IconUndo } from "../icons/iconUndo";
import { undo, canUndo, canRedo, redo } from "../../pages/builder/utils/undoredo";
import { GroupHeader } from "../groupHeader";
import { MarkdownEditor } from "../markdownEditor";
import { LftText } from "../lftText";
import { View, TouchableOpacity } from "react-native";

export interface IEditProgramV2DaysProps {
  state: IPlannerState;
  plannerProgram: IPlannerProgram;
  ui: IPlannerUi;
  settings: ISettings;
  lbProgram: LensBuilder<IPlannerState, IPlannerProgram, {}>;
  exerciseFullNames: string[];
  lbUi: LensBuilder<IPlannerState, IPlannerUi, {}>;
  evaluatedWeeks: IPlannerEvalResult[][];
  onEditDayModal: (args: { weekIndex: number; dayIndex: number }) => void;
  onSave: () => void;
  plannerDispatch: ILensDispatch<IPlannerState>;
}

export function EditProgramV2Days(props: IEditProgramV2DaysProps): JSX.Element {
  const { plannerProgram, settings, ui, plannerDispatch, lbProgram, evaluatedWeeks } = props;
  const evaluatedWeek = evaluatedWeeks[ui.weekIndex];
  const isInvalid = evaluatedWeeks.some((week) => week.some((day) => !day.success));

  const enabledDayStats = props.ui.focusedExercise && evaluatedWeek[props.ui.focusedExercise?.dayIndex]?.success;
  let dayIndex = 0;

  return (
    <View>
      <View className="sticky z-20 w-full py-1 pl-4 pr-2 bg-white border-b border-grayv2-100" style={{ top: 59.2 }}>
        <View className="flex flex-row items-center">
          <View className="mr-2">
            <Button
              name="editor-save-v2-top"
              data-cy="editor-save-v2-top"
              kind="orange"
              buttonSize="sm"
              disabled={isInvalid}
              onClick={() => {
                if (!isInvalid) {
                  props.onSave();
                }
              }}
            >
              Save
            </Button>
          </View>
          <View className="flex flex-row ml-auto">
            <TouchableOpacity
              className="p-2 nm-program-undo"
              disabled={!canUndo(props.state)}
              onPress={() => undo(props.plannerDispatch, props.state)}
            >
              <IconUndo width={20} height={20} color={!canUndo(props.state) ? "#BAC4CD" : "#171718"} />
            </TouchableOpacity>
            <TouchableOpacity
              className="p-2 nm-program-redo"
              disabled={!canRedo(props.state)}
              onPress={() => redo(props.plannerDispatch, props.state)}
            >
              <IconUndo width={20} height={20} color={!canRedo(props.state) ? "#BAC4CD" : "#171718"} />
            </TouchableOpacity>
            <TouchableOpacity
              className="p-2 nm-ui-mode-switch"
              data-cy="editor-v2-full-program"
              disabled={isInvalid}
              onPress={() => {
                if (!isInvalid) {
                  if (ui.isUiMode) {
                    props.plannerDispatch(props.lbUi.p("isUiMode").record(false));
                  } else {
                    props.plannerDispatch(
                      lb<IPlannerState>()
                        .p("fulltext")
                        .record({ text: PlannerProgram.generateFullText(plannerProgram.weeks) })
                    );
                  }
                }
              }}
            >
              <IconDoc style={{ display: "block" }} color={isInvalid ? "#BAC4CD" : "#3C5063"} />
            </TouchableOpacity>
            <TouchableOpacity
              data-cy="editor-v2-week-muscles"
              className="p-2 nm-show-week-muscles"
              onPress={() => {
                props.plannerDispatch(props.lbUi.p("showWeekStats").record(true));
              }}
            >
              <IconMusclesW size={22} />
            </TouchableOpacity>
            <TouchableOpacity
              disabled={!enabledDayStats}
              className="p-2 nm-show-day-muscles"
              data-cy="editor-v2-day-muscles"
              onPress={() => {
                if (enabledDayStats) {
                  props.plannerDispatch(props.lbUi.p("showDayStats").record(true));
                }
              }}
            >
              <IconMusclesD size={22} color={enabledDayStats ? "#3C5063" : "#D2D8DE"} />
            </TouchableOpacity>
            <TouchableOpacity
              disabled={!enabledDayStats}
              data-cy="editor-v2-exercise-stats"
              className="p-2 nm-show-exercise-stats"
              onPress={() => {
                if (enabledDayStats) {
                  props.plannerDispatch(props.lbUi.p("showExerciseStats").record(true));
                }
              }}
            >
              <IconGraphsE width={16} height={22} color={enabledDayStats ? "#3C5063" : "#D2D8DE"} />
            </TouchableOpacity>
            <TouchableOpacity
              disabled={isInvalid}
              data-cy="program-preview"
              className="p-2 nm-show-program-preview"
              onPress={() => {
                if (!isInvalid) {
                  props.plannerDispatch(props.lbUi.p("showPreview").record(true));
                }
              }}
            >
              <IconPreview />
            </TouchableOpacity>
          </View>
        </View>
      </View>
      <View className="px-4">
        <ScrollableTabs
          offsetY="96"
          defaultIndex={ui.focusedDay?.week ? ui.focusedDay.week - 1 : undefined}
          onChange={(index) => props.plannerDispatch(props.lbUi.p("weekIndex").record(index))}
          tabs={plannerProgram.weeks.map((week, weekIndex) => {
            const showProgramDescription = week.description != null;
            return {
              label: week.name,
              isInvalid: evaluatedWeeks[weekIndex].some((day) => !day.success),
              children: (
                <View key={weekIndex}>
                  {!showProgramDescription ? (
                    <View>
                      <LinkButton
                        name="planner-add-week-description"
                        onPress={() => {
                          props.plannerDispatch(lbProgram.p("weeks").i(weekIndex).p("description").record(""));
                        }}
                      >
                        Add Week Description
                      </LinkButton>
                    </View>
                  ) : (
                    <View className="mb-4">
                      <View className="leading-none">
                        <GroupHeader name="Week Description (Markdown)" />
                      </View>
                      <MarkdownEditor
                        value={week.description ?? ""}
                        onChange={(v) => {
                          props.plannerDispatch(lbProgram.p("weeks").i(weekIndex).p("description").record(v));
                        }}
                      />
                      <View>
                        <LinkButton
                          className="text-xs"
                          name="planner-delete-week-description"
                          onPress={() => {
                            props.plannerDispatch(lbProgram.p("weeks").i(weekIndex).p("description").record(undefined));
                          }}
                        >
                          Delete Week Description
                        </LinkButton>
                      </View>
                    </View>
                  )}
                  <View className="flex flex-col mt-4 md:flex-row">
                    <View className="flex-1">
                      <DraggableList
                        items={week.days}
                        onDragEnd={(startIndex, endIndex) => {
                          applyChangesInEditor(plannerDispatch, () => {
                            plannerDispatch([
                              lbProgram
                                .p("weeks")
                                .i(weekIndex)
                                .p("days")
                                .recordModify((days) => {
                                  const newDays = [...days];
                                  const [daysToMove] = newDays.splice(startIndex, 1);
                                  newDays.splice(endIndex, 0, daysToMove);
                                  return newDays;
                                }),
                            ]);
                          });
                        }}
                        element={(plannerDay, dayInWeekIndex, handleTouchStart) => {
                          const dayData = { week: weekIndex + 1, dayInWeek: dayInWeekIndex + 1, day: dayIndex + 1 };
                          dayIndex += 1;
                          return (
                            <View key={dayInWeekIndex}>
                              <EditProgramV2Day
                                exerciseFullNames={props.exerciseFullNames}
                                evaluatedWeeks={evaluatedWeeks}
                                settings={settings}
                                showDelete={week.days.length > 1}
                                onEditDayName={() => {
                                  props.onEditDayModal({ weekIndex, dayIndex: dayInWeekIndex });
                                }}
                                plannerDispatch={plannerDispatch}
                                handleTouchStart={handleTouchStart}
                                plannerDay={plannerDay}
                                dayData={dayData}
                                ui={ui}
                                lbProgram={lbProgram}
                              />
                            </View>
                          );
                        }}
                      />
                      <View className="pb-8">
                        <LinkButton
                          name="planner-add-day"
                          data-cy="planner-add-day"
                          onPress={() => {
                            plannerDispatch(
                              lbProgram
                                .p("weeks")
                                .i(weekIndex)
                                .p("days")
                                .recordModify((days) => [
                                  ...days,
                                  {
                                    name: `Day ${days.length + 1}`,
                                    exerciseText: "",
                                  },
                                ])
                            );
                          }}
                        >
                          Add Day
                        </LinkButton>
                      </View>
                    </View>
                  </View>
                </View>
              ),
            };
          })}
        />
        <View className="mb-8 text-center">
          <Button
            name="save-editor-v2"
            kind="orange"
            disabled={isInvalid}
            onClick={() => {
              if (!isInvalid) {
                props.onSave();
              }
            }}
          >
            Save
          </Button>
        </View>
      </View>
      {props.ui.showExerciseStats && props.ui.focusedExercise && (
        <LftModal
          shouldShowClose={true}
          isFullWidth={true}
          onClose={() => props.plannerDispatch(props.lbUi.p("showExerciseStats").record(false))}
        >
          <PlannerExerciseStats
            dispatch={props.plannerDispatch}
            settings={props.settings}
            evaluatedWeeks={evaluatedWeeks}
            weekIndex={props.ui.focusedExercise.weekIndex}
            dayIndex={props.ui.focusedExercise.dayIndex}
            exerciseLine={props.ui.focusedExercise.exerciseLine}
          />
        </LftModal>
      )}
      {props.ui.showDayStats && props.ui.focusedExercise && (
        <LftModal
          shouldShowClose={true}
          isFullWidth={true}
          onClose={() => props.plannerDispatch(props.lbUi.p("showDayStats").record(false))}
        >
          <PlannerDayStats
            dispatch={props.plannerDispatch}
            focusedExercise={props.ui.focusedExercise}
            settings={props.settings}
            evaluatedDay={evaluatedWeeks[props.ui.weekIndex][props.ui.focusedExercise.dayIndex]}
          />
        </LftModal>
      )}
      {props.ui.showWeekStats && (
        <LftModal
          shouldShowClose={true}
          isFullWidth={true}
          onClose={() => props.plannerDispatch(props.lbUi.p("showWeekStats").record(false))}
        >
          {props.ui.weekIndex != null ? (
            <PlannerWeekStats
              dispatch={props.plannerDispatch}
              evaluatedDays={evaluatedWeeks[props.ui.weekIndex]}
              settings={props.settings}
            />
          ) : (
            <LftText className="font-bold">Week Stats</LftText>
          )}
        </LftModal>
      )}
    </View>
  );
}
