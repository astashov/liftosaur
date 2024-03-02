/* eslint-disable @typescript-eslint/ban-types */
import { lb, LensBuilder } from "lens-shmens";
import { h, JSX } from "preact";
import { LinkButton } from "../../components/linkButton";
import { ScrollableTabs } from "../../components/scrollableTabs";
import { IPlannerProgram, ISettings } from "../../types";
import { ILensDispatch } from "../../utils/useLensReducer";
import { EditProgramV2Day } from "./editProgramV2Day";
import { IPlannerState, IPlannerUi, IPlannerProgramExercise } from "../../pages/planner/models/types";
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
import { IconCog2 } from "../icons/iconCog2";

export interface IEditProgramV2DaysProps {
  plannerProgram: IPlannerProgram;
  ui: IPlannerUi;
  settings: ISettings;
  lbProgram: LensBuilder<IPlannerState, IPlannerProgram, {}>;
  lbUi: LensBuilder<IPlannerState, IPlannerUi, {}>;
  evaluatedWeeks: IPlannerEvalResult[][];
  repeats: IPlannerProgramExercise[][][];
  onEditDayModal: (args: { weekIndex: number; dayIndex: number }) => void;
  onSave: () => void;
  plannerDispatch: ILensDispatch<IPlannerState>;
}

export function EditProgramV2Days(props: IEditProgramV2DaysProps): JSX.Element {
  const { plannerProgram, settings, ui, plannerDispatch, lbProgram, evaluatedWeeks } = props;
  const evaluatedWeek = evaluatedWeeks[ui.weekIndex];
  const repeats = props.repeats[ui.weekIndex] || [];
  const isInvalid = evaluatedWeeks.some((week) => week.some((day) => !day.success));

  const enabledDayStats = props.ui.focusedExercise && evaluatedWeek[props.ui.focusedExercise?.dayIndex].success;

  return (
    <div>
      <div className="sticky z-20 w-full px-4 py-1 bg-white border-b border-grayv2-100" style={{ top: "3.7rem" }}>
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
              className="p-2"
              data-cy="editor-v2-full-program"
              disabled={isInvalid}
              onClick={() => {
                if (!isInvalid) {
                  props.plannerDispatch(
                    lb<IPlannerState>()
                      .p("fulltext")
                      .record({ text: PlannerProgram.generateFullText(plannerProgram.weeks) })
                  );
                }
              }}
            >
              <IconDoc style={{ display: "block" }} color={isInvalid ? "#BAC4CD" : "#3C5063"} />
            </button>
            <button
              data-cy="editor-v2-week-muscles"
              className="p-2"
              onClick={() => {
                props.plannerDispatch(props.lbUi.p("showWeekStats").record(true));
              }}
            >
              <IconMusclesW size={22} />
            </button>
            <button
              disabled={!enabledDayStats}
              className="p-2"
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
              className="p-2"
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
              className="p-2"
              onClick={() => {
                if (!isInvalid) {
                  props.plannerDispatch(props.lbUi.p("showPreview").record(true));
                }
              }}
            >
              <IconPreview />
            </button>
            <button
              title="Settings"
              onClick={() => props.plannerDispatch(lb<IPlannerState>().p("ui").p("showSettingsModal").record(true))}
              className="p-2 nm-planner-settings"
            >
              <IconCog2 style={{ display: "block" }} />
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
            return {
              label: week.name,
              isInvalid: evaluatedWeeks[weekIndex].some((day) => !day.success),
              children: (
                <div key={weekIndex} className="flex flex-col mt-4 md:flex-row">
                  <div className="flex-1">
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
                      element={(plannerDay, dayIndex, handleTouchStart) => {
                        return (
                          <div key={dayIndex}>
                            <EditProgramV2Day
                              evaluatedWeeks={evaluatedWeeks}
                              settings={settings}
                              showDelete={week.days.length > 1}
                              repeats={repeats[dayIndex] || []}
                              onEditDayName={() => {
                                props.onEditDayModal({ weekIndex, dayIndex });
                              }}
                              plannerDispatch={plannerDispatch}
                              handleTouchStart={handleTouchStart}
                              plannerDay={plannerDay}
                              weekIndex={weekIndex}
                              dayIndex={dayIndex}
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
