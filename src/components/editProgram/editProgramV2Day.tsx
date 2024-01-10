/* eslint-disable @typescript-eslint/ban-types */

import { LensBuilder, lb } from "lens-shmens";
import { h, JSX } from "preact";
import { PlannerEditorView } from "../../pages/planner/components/plannerEditorView";
import { PlannerStatsUtils } from "../../pages/planner/models/plannerStatsUtils";
import { IPlannerState, IPlannerUi } from "../../pages/planner/models/types";
import { IPlannerEvalResult } from "../../pages/planner/plannerExerciseEvaluator";
import { IPlannerProgramDay, IPlannerProgram, ISettings } from "../../types";
import { CollectionUtils } from "../../utils/collection";
import { HtmlUtils } from "../../utils/html";
import { StringUtils } from "../../utils/string";
import { TimeUtils } from "../../utils/time";
import { ILensDispatch } from "../../utils/useLensReducer";
import { IconDuplicate2 } from "../icons/iconDuplicate2";
import { IconEditSquare } from "../icons/iconEditSquare";
import { IconHandle } from "../icons/iconHandle";
import { IconTrash } from "../icons/iconTrash";
import { IconWatch } from "../icons/iconWatch";
import { applyChangesInEditor } from "./editProgramV2Utils";

interface IEditProgramV2DayProps {
  weekIndex: number;
  dayIndex: number;
  day: IPlannerProgramDay;
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
  const { day, plannerDispatch, lbProgram, weekIndex, dayIndex } = props;
  const { exercises: customExercises, equipment: customEquipment } = props.settings;
  const focusedExercise = props.ui.focusedExercise;
  const evaluatedDay = props.evaluatedWeeks[weekIndex][dayIndex];
  let approxDayTime: string | undefined;
  if (evaluatedDay.success) {
    approxDayTime = TimeUtils.formatHHMM(
      PlannerStatsUtils.dayApproxTimeMs(evaluatedDay.data, props.settings.timers.workout || 0)
    );
  }

  return (
    <div className="flex flex-col pb-4 md:flex-row">
      <div className="flex-1">
        <div className="flex items-center">
          <div className="p-2 cursor-move" style={{ marginLeft: "-12px", touchAction: "none" }}>
            <span onMouseDown={props.handleTouchStart} onTouchStart={props.handleTouchStart}>
              <IconHandle />
            </span>
          </div>
          <h3 className="flex-1 mr-2 text-xl font-bold">{day.name}</h3>
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
                const newName = StringUtils.nextName(day.name);
                const newDay = { name: newName, exerciseText: day.exerciseText };
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
          <div className="flex-1 w-0">
            <PlannerEditorView
              name="Exercises"
              customExercises={customExercises}
              lineNumbers={true}
              equipment={customEquipment}
              error={evaluatedDay.success ? undefined : evaluatedDay.error}
              value={day.exerciseText}
              onCustomErrorCta={(err) => undefined}
              onChange={(e) => {
                console.log("On Change", e);
                plannerDispatch(lbProgram.p("weeks").i(weekIndex).p("days").i(dayIndex).p("exerciseText").record(e));
              }}
              onBlur={(e, text) => {
                const relatedTarget = e.relatedTarget as HTMLElement;
                if (!relatedTarget || !HtmlUtils.someInParents(relatedTarget, (el) => el.tagName === "BUTTON")) {
                  plannerDispatch(lb<IPlannerState>().p("ui").p("focusedExercise").record(undefined));
                }
              }}
              onLineChange={(line) => {
                if (
                  !focusedExercise ||
                  focusedExercise.weekIndex !== weekIndex ||
                  focusedExercise.dayIndex !== dayIndex ||
                  focusedExercise.exerciseLine !== line
                ) {
                  plannerDispatch(
                    lb<IPlannerState>().p("ui").p("focusedExercise").record({ weekIndex, dayIndex, exerciseLine: line })
                  );
                }
              }}
            />
            {approxDayTime && (
              <div className="text-xs text-right text-grayv2-main">
                <IconWatch className="mb-1 align-middle" />
                <span className="pl-1 align-middle">{approxDayTime}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
