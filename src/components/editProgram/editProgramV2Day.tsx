/* eslint-disable @typescript-eslint/ban-types */

import { LensBuilder, lb } from "lens-shmens";
import { h, JSX } from "preact";
import { useState } from "preact/hooks";
import { PlannerCodeBlock } from "../../pages/planner/components/plannerCodeBlock";
import { PlannerEditorCustomCta } from "../../pages/planner/components/plannerEditorCustomCta";
import { PlannerEditorView } from "../../pages/planner/components/plannerEditorView";
import { PlannerStatsUtils } from "../../pages/planner/models/plannerStatsUtils";
import { IPlannerState, IPlannerUi, IPlannerProgramExercise } from "../../pages/planner/models/types";
import { IPlannerEvalResult } from "../../pages/planner/plannerExerciseEvaluator";
import { IPlannerProgramDay, IPlannerProgram, ISettings } from "../../types";
import { CollectionUtils } from "../../utils/collection";
import { StringUtils } from "../../utils/string";
import { TimeUtils } from "../../utils/time";
import { ILensDispatch } from "../../utils/useLensReducer";
import { IconArrowDown2 } from "../icons/iconArrowDown2";
import { IconArrowRight } from "../icons/iconArrowRight";
import { IconDuplicate2 } from "../icons/iconDuplicate2";
import { IconEditSquare } from "../icons/iconEditSquare";
import { IconHandle } from "../icons/iconHandle";
import { IconTrash } from "../icons/iconTrash";
import { IconWatch } from "../icons/iconWatch";
import { applyChangesInEditor } from "./editProgramV2Utils";

interface IEditProgramV2DayProps {
  weekIndex: number;
  dayIndex: number;
  plannerDay: IPlannerProgramDay;
  repeats: IPlannerProgramExercise[];
  exerciseFullNames: string[];
  showDelete: boolean;
  lbProgram: LensBuilder<IPlannerState, IPlannerProgram, {}>;
  ui: IPlannerUi;
  evaluatedWeeks: IPlannerEvalResult[][];
  settings: ISettings;
  onEditDayName: () => void;
  handleTouchStart: (e: TouchEvent | MouseEvent) => void;
  plannerDispatch: ILensDispatch<IPlannerState>;
}

export function EditProgramV2Day(props: IEditProgramV2DayProps): JSX.Element {
  const { plannerDay, plannerDispatch, lbProgram, weekIndex, dayIndex } = props;
  const { exercises: customExercises, equipment: customEquipment } = props.settings;
  const focusedExercise = props.ui.focusedExercise;
  const evaluatedDay = props.evaluatedWeeks[weekIndex][dayIndex];
  let approxDayTime: string | undefined;
  if (evaluatedDay.success) {
    approxDayTime = TimeUtils.formatHHMM(
      PlannerStatsUtils.dayApproxTimeMs(evaluatedDay.data, props.settings.timers.workout || 0)
    );
  }
  const [isCollapsed, setIsCollapsed] = useState<boolean>(
    !!(props.ui.focusedDay && props.ui.focusedDay.dayInWeek !== dayIndex + 1)
  );

  return (
    <div className="flex flex-col pb-4 md:flex-row">
      <div className="flex-1">
        <div className="flex items-center">
          <div className="p-2 cursor-move" style={{ marginLeft: "-12px", touchAction: "none" }}>
            <span onMouseDown={props.handleTouchStart} onTouchStart={props.handleTouchStart}>
              <IconHandle />
            </span>
          </div>
          <div>
            <button
              className="w-8 p-2 mr-1 text-center nm-web-editor-expand-collapse-day"
              onClick={() => setIsCollapsed(!isCollapsed)}
            >
              {isCollapsed ? <IconArrowRight className="inline-block" /> : <IconArrowDown2 className="inline-block" />}
            </button>
          </div>
          <h3 className="flex-1 mr-2 text-xl font-bold">{plannerDay.name}</h3>
          <div className="">
            <button
              data-cy="edit-day-v2"
              className="px-2 align-middle ls-edit-day-v2 button nm-edit-day-v2"
              onClick={props.onEditDayName}
            >
              <IconEditSquare />
            </button>
            <button
              data-cy="clone-day"
              className="px-2 align-middle ls-clone-day-v2 button nm-clone-day-v2"
              onClick={() => {
                const newName = StringUtils.nextName(plannerDay.name);
                const newDay = { name: newName, exerciseText: plannerDay.exerciseText };
                applyChangesInEditor(plannerDispatch, () => {
                  plannerDispatch(
                    lbProgram
                      .p("weeks")
                      .i(weekIndex)
                      .p("days")
                      .recordModify((days) => {
                        return [...days.slice(0, dayIndex + 1), newDay, ...days.slice(dayIndex + 1)];
                      })
                  );
                });
              }}
            >
              <IconDuplicate2 />
            </button>
            {props.showDelete && (
              <button
                data-cy={`delete-day-v2`}
                className="px-2 align-middle ls-delete-day-v2 button nm-delete-day-v2"
                onClick={() => {
                  if (confirm("Are you sure?")) {
                    applyChangesInEditor(plannerDispatch, () => {
                      plannerDispatch(
                        lbProgram
                          .p("weeks")
                          .i(weekIndex)
                          .p("days")
                          .recordModify((days) => {
                            return CollectionUtils.removeAt(days, dayIndex);
                          })
                      );
                    });
                  }
                }}
              >
                <IconTrash />
              </button>
            )}
          </div>
        </div>
        <div className="flex">
          {!isCollapsed && (
            <div className="flex-1 w-0">
              <PlannerEditorView
                name="Exercises"
                exerciseFullNames={props.exerciseFullNames}
                customExercises={customExercises}
                lineNumbers={true}
                equipment={customEquipment}
                error={evaluatedDay.success ? undefined : evaluatedDay.error}
                value={plannerDay.exerciseText}
                onCustomErrorCta={(err) => (
                  <PlannerEditorCustomCta isInvertedColors={true} dispatch={props.plannerDispatch} err={err} />
                )}
                onChange={(e) => {
                  plannerDispatch(lbProgram.p("weeks").i(weekIndex).p("days").i(dayIndex).p("exerciseText").record(e));
                }}
                onBlur={(e, text) => {}}
                onLineChange={(line) => {
                  const exerciseIndex =
                    dayIndex !== -1 && evaluatedDay.success
                      ? CollectionUtils.findIndexReverse(evaluatedDay.data, (d) => d.line <= line)
                      : -1;
                  const exercise =
                    exerciseIndex !== -1 && evaluatedDay.success ? evaluatedDay.data[exerciseIndex] : undefined;

                  if (
                    !focusedExercise ||
                    focusedExercise.weekIndex !== weekIndex ||
                    focusedExercise.dayIndex !== dayIndex ||
                    focusedExercise.exerciseLine !== exercise?.line
                  ) {
                    plannerDispatch(
                      lb<IPlannerState>()
                        .p("ui")
                        .p("focusedExercise")
                        .record({ weekIndex, dayIndex, exerciseLine: exercise?.line ?? 0 })
                    );
                  }
                }}
              />
              {props.repeats.length > 0 && (
                <ul className="pl-1 ml-8 overflow-x-auto list-disc">
                  {props.repeats.map((e) => (
                    <li>
                      <PlannerCodeBlock script={e.text} />
                    </li>
                  ))}
                </ul>
              )}
              {approxDayTime && (
                <div className="text-xs text-right text-grayv2-main">
                  <IconWatch className="mb-1 align-middle" />
                  <span className="pl-1 align-middle">{approxDayTime}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
