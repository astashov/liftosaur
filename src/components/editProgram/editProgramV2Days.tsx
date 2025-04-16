/* eslint-disable @typescript-eslint/ban-types */
import { lb, LensBuilder } from "lens-shmens";
import { h, JSX } from "preact";
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
import { Modal } from "../modal";
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
    <div>
      <div className="sticky z-20 w-full py-1 pl-4 pr-2 bg-white border-b border-grayv2-100" style={{ top: "3.7rem" }}>
        <div className="flex items-center">
          <div className="mr-2">
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
          </div>
          <div className="ml-auto">
            <button
              style={{ cursor: canUndo(props.state) ? "pointer" : "default" }}
              title="Undo"
              className="p-2 nm-program-undo"
              disabled={!canUndo(props.state)}
              onClick={() => undo(props.plannerDispatch, props.state)}
            >
              <IconUndo width={20} height={20} color={!canUndo(props.state) ? "#BAC4CD" : "#171718"} />
            </button>
            <button
              style={{ cursor: canRedo(props.state) ? "pointer" : "default" }}
              title="Redo"
              className="p-2 nm-program-redo"
              disabled={!canRedo(props.state)}
              onClick={() => redo(props.plannerDispatch, props.state)}
            >
              <IconUndo
                width={20}
                height={20}
                style={{ transform: "scale(-1,  1)" }}
                color={!canRedo(props.state) ? "#BAC4CD" : "#171718"}
              />
            </button>
            <button
              className="p-2 nm-ui-mode-switch"
              data-cy="editor-v2-full-program"
              disabled={isInvalid}
              onClick={() => {
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
            </button>
            <button
              data-cy="editor-v2-week-muscles"
              className="p-2 nm-show-week-muscles"
              onClick={() => {
                props.plannerDispatch(props.lbUi.p("showWeekStats").record(true));
              }}
            >
              <IconMusclesW size={22} />
            </button>
            <button
              disabled={!enabledDayStats}
              className="p-2 nm-show-day-muscles"
              data-cy="editor-v2-day-muscles"
              onClick={() => {
                if (enabledDayStats) {
                  props.plannerDispatch(props.lbUi.p("showDayStats").record(true));
                }
              }}
            >
              <IconMusclesD size={22} color={enabledDayStats ? "#3C5063" : "#D2D8DE"} />
            </button>
            <button
              disabled={!enabledDayStats}
              data-cy="editor-v2-exercise-stats"
              className="p-2 nm-show-exercise-stats"
              onClick={() => {
                if (enabledDayStats) {
                  props.plannerDispatch(props.lbUi.p("showExerciseStats").record(true));
                }
              }}
            >
              <IconGraphsE width={16} height={22} color={enabledDayStats ? "#3C5063" : "#D2D8DE"} />
            </button>
            <button
              disabled={isInvalid}
              data-cy="program-preview"
              className="p-2 nm-show-program-preview"
              onClick={() => {
                if (!isInvalid) {
                  props.plannerDispatch(props.lbUi.p("showPreview").record(true));
                }
              }}
            >
              <IconPreview />
            </button>
          </div>
        </div>
      </div>
      <div className="px-4">
        <ScrollableTabs
          offsetY="6rem"
          defaultIndex={ui.focusedDay?.week ? ui.focusedDay.week - 1 : undefined}
          onChange={(index) => props.plannerDispatch(props.lbUi.p("weekIndex").record(index))}
          tabs={plannerProgram.weeks.map((week, weekIndex) => {
            const showProgramDescription = week.description != null;
            return {
              label: week.name,
              isInvalid: evaluatedWeeks[weekIndex].some((day) => !day.success),
              children: (
                <div key={weekIndex}>
                  {!showProgramDescription ? (
                    <div className="text-sm">
                      <LinkButton
                        name="planner-add-week-description"
                        onClick={() => {
                          props.plannerDispatch(lbProgram.p("weeks").i(weekIndex).p("description").record(""));
                        }}
                      >
                        Add Week Description
                      </LinkButton>
                    </div>
                  ) : (
                    <div className="mb-4">
                      <div className="leading-none">
                        <GroupHeader name="Week Description (Markdown)" />
                      </div>
                      <MarkdownEditor
                        value={week.description ?? ""}
                        onChange={(v) => {
                          props.plannerDispatch(lbProgram.p("weeks").i(weekIndex).p("description").record(v));
                        }}
                      />
                      <div>
                        <LinkButton
                          className="text-xs"
                          name="planner-delete-week-description"
                          onClick={() => {
                            props.plannerDispatch(lbProgram.p("weeks").i(weekIndex).p("description").record(undefined));
                          }}
                        >
                          Delete Week Description
                        </LinkButton>
                      </div>
                    </div>
                  )}
                  <div className="flex flex-col mt-4 md:flex-row">
                    <div className="flex-1">
                      <DraggableList
                        items={week.days}
                        mode="vertical"
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
                            <div key={dayInWeekIndex}>
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
                            </div>
                          );
                        }}
                      />
                      <div className="pb-8">
                        <LinkButton
                          name="planner-add-day"
                          className="text-sm"
                          data-cy="planner-add-day"
                          onClick={() => {
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
                      </div>
                    </div>
                  </div>
                </div>
              ),
            };
          })}
        />
        <div className="mb-8 text-center">
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
        </div>
      </div>
      {props.ui.showExerciseStats && props.ui.focusedExercise && (
        <Modal
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
        </Modal>
      )}
      {props.ui.showDayStats && props.ui.focusedExercise && (
        <Modal
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
        </Modal>
      )}
      {props.ui.showWeekStats && (
        <Modal
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
            <div className="font-bold">Week Stats</div>
          )}
        </Modal>
      )}
    </div>
  );
}
