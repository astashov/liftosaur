/* eslint-disable @typescript-eslint/ban-types */

import { LensBuilder } from "lens-shmens";
import { h, JSX, Fragment } from "preact";
import { useState } from "preact/hooks";
import { IPlannerState, IPlannerUi } from "../../pages/planner/models/types";
import { IPlannerEvalResult } from "../../pages/planner/plannerExerciseEvaluator";
import { IPlannerProgramDay, IPlannerProgram, ISettings, IDayData } from "../../types";
import { CollectionUtils } from "../../utils/collection";
import { StringUtils } from "../../utils/string";
import { ILensDispatch } from "../../utils/useLensReducer";
import { IconArrowDown2 } from "../icons/iconArrowDown2";
import { IconArrowRight } from "../icons/iconArrowRight";
import { IconDuplicate2 } from "../icons/iconDuplicate2";
import { IconEditSquare } from "../icons/iconEditSquare";
import { IconHandle } from "../icons/iconHandle";
import { IconTrash } from "../icons/iconTrash";
import { EditProgramV2TextExercises } from "./editProgramV2TextExercises";
import { EditProgramV2UiExercises } from "./editProgramV2UiExercises";
import { applyChangesInEditor } from "./editProgramV2Utils";
import { GroupHeader } from "../groupHeader";
import { LinkButton } from "../linkButton";
import { MarkdownEditor } from "../markdownEditor";

interface IEditProgramV2DayProps {
  dayData: Required<IDayData>;
  plannerDay: IPlannerProgramDay;
  exerciseFullNames: string[];
  showDelete: boolean;
  lbProgram: LensBuilder<IPlannerState, IPlannerProgram, {}>;
  ui: IPlannerUi;
  evaluatedWeeks: IPlannerEvalResult[][];
  settings: ISettings;
  onEditDayName: () => void;
  handleTouchStart?: (e: TouchEvent | MouseEvent) => void;
  plannerDispatch: ILensDispatch<IPlannerState>;
}

export function EditProgramV2Day(props: IEditProgramV2DayProps): JSX.Element {
  const { plannerDay, plannerDispatch, lbProgram } = props;
  const weekIndex = props.dayData.week - 1;
  const dayIndex = props.dayData.dayInWeek - 1;
  const [isCollapsed, setIsCollapsed] = useState<boolean>(
    !!(props.ui.focusedDay && props.ui.focusedDay.dayInWeek !== dayIndex + 1)
  );
  const evaluatedDay = props.evaluatedWeeks[weekIndex][dayIndex];
  const isValidProgram = props.evaluatedWeeks.every((week) => week.every((day) => day.success));
  const showProgramDescription = plannerDay.description != null;

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
        {showProgramDescription ? (
          <>
            <div className="leading-none">
              <GroupHeader name="Day Description (Markdown)" />
            </div>
            <MarkdownEditor
              value={plannerDay.description ?? ""}
              onChange={(v) => {
                props.plannerDispatch(
                  lbProgram.p("weeks").i(weekIndex).p("days").i(dayIndex).p("description").record(v)
                );
              }}
            />
            <div>
              <LinkButton
                className="text-xs"
                name="planner-add-day-description"
                onClick={() => {
                  props.plannerDispatch(
                    lbProgram.p("weeks").i(weekIndex).p("days").i(dayIndex).p("description").record(undefined)
                  );
                }}
              >
                Delete Day Description
              </LinkButton>
            </div>
          </>
        ) : (
          <div>
            <LinkButton
              className="text-xs"
              name="planner-add-day-description"
              onClick={() => {
                props.plannerDispatch(
                  lbProgram.p("weeks").i(weekIndex).p("days").i(dayIndex).p("description").record("")
                );
              }}
            >
              Add Day Description
            </LinkButton>
          </div>
        )}
        <div className="flex">
          {!isCollapsed &&
            (props.ui.isUiMode && isValidProgram ? (
              <EditProgramV2UiExercises
                ui={props.ui}
                exerciseFullNames={props.exerciseFullNames}
                evaluatedWeeks={props.evaluatedWeeks}
                settings={props.settings}
                dayData={props.dayData}
                plannerDispatch={plannerDispatch}
              />
            ) : (
              <EditProgramV2TextExercises
                weekIndex={weekIndex}
                dayIndex={dayIndex}
                plannerDay={plannerDay}
                exerciseFullNames={props.exerciseFullNames}
                plannerDispatch={plannerDispatch}
                lbProgram={lbProgram}
                evaluatedDay={evaluatedDay}
                settings={props.settings}
                ui={props.ui}
              />
            ))}
        </div>
      </div>
    </div>
  );
}
