/* eslint-disable @typescript-eslint/ban-types */
import { lb, LensBuilder } from "lens-shmens";
import { h, JSX } from "preact";
import { useState } from "preact/hooks";
import { Exercise } from "../../models/exercise";
import { IPlannerState } from "../../pages/planner/models/types";
import { IPlannerEvalResult } from "../../pages/planner/plannerExerciseEvaluator";
import { IPlannerProgram, ISettings } from "../../types";
import { CollectionUtils } from "../../utils/collection";
import { ObjectUtils } from "../../utils/object";
import { StringUtils } from "../../utils/string";
import { ILensDispatch } from "../../utils/useLensReducer";
import { Button } from "../button";
import { DraggableList } from "../draggableList";
import { ExerciseImage } from "../exerciseImage";
import { IconArrowDown2 } from "../icons/iconArrowDown2";
import { IconArrowRight } from "../icons/iconArrowRight";
import { IconDuplicate2 } from "../icons/iconDuplicate2";
import { IconEditSquare } from "../icons/iconEditSquare";
import { IconHandle } from "../icons/iconHandle";
import { IconTrash } from "../icons/iconTrash";
import { LinkButton } from "../linkButton";

export interface IPlannerContentWeeksProps {
  plannerProgram: IPlannerProgram;
  evaluatedWeeks: IPlannerEvalResult[][];
  lbProgram: LensBuilder<IPlannerState, IPlannerProgram, {}>;
  settings: ISettings;
  plannerDispatch: ILensDispatch<IPlannerState>;
  onEditWeekDayName: (data: { weekIndex: number; dayIndex?: number }) => void;
}

export function EditProgramV2Weeks(props: IPlannerContentWeeksProps): JSX.Element {
  const [collapsedWeeks, setCollapsedWeeks] = useState<boolean[]>([]);

  return (
    <div>
      <div className="sticky z-10 w-full px-4 py-4 bg-white border-b border-grayv2-100" style={{ top: "3.7rem" }}>
        <Button
          name="back-to-editor"
          kind="purple"
          buttonSize="sm"
          onClick={() => props.plannerDispatch(lb<IPlannerState>().pi("ui").p("subscreen").record(undefined))}
        >
          Back to editor
        </Button>
      </div>
      <div className="px-4">
        <DraggableList
          items={props.plannerProgram.weeks}
          mode="vertical"
          onDragEnd={(startIndex, endIndex) => {
            props.plannerDispatch([
              props.lbProgram.p("weeks").recordModify((weeks) => {
                const newWeeks = [...weeks];
                const [weekToMove] = newWeeks.splice(startIndex, 1);
                newWeeks.splice(endIndex, 0, weekToMove);
                return newWeeks;
              }),
            ]);
          }}
          element={(week, weekIndex, handleTouchStart) => {
            return (
              <section key={weekIndex} className="flex w-full px-2 py-1 text-left">
                <div className="flex flex-col">
                  <div className="p-2 cursor-move" style={{ marginLeft: "-16px", touchAction: "none" }}>
                    <span onMouseDown={handleTouchStart} onTouchStart={handleTouchStart}>
                      <IconHandle />
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="h-full bg-grayv2-200" style={{ width: "1px" }} />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex">
                    <div>
                      <button
                        title={collapsedWeeks[weekIndex] ? "Expand day" : "Collapse day"}
                        onClick={() => {
                          const newCollapsedWeeks = [...collapsedWeeks];
                          newCollapsedWeeks[weekIndex] = !newCollapsedWeeks[weekIndex];
                          setCollapsedWeeks(newCollapsedWeeks);
                        }}
                        className="w-8 p-2 mr-1 text-center nm-web-editor-expand-collapse-day"
                      >
                        {collapsedWeeks[weekIndex] ? (
                          <IconArrowRight className="inline-block" />
                        ) : (
                          <IconArrowDown2 className="inline-block" />
                        )}
                      </button>
                    </div>
                    <div className="flex items-center flex-1 mr-2 text-lg">{week.name}</div>
                    <div className="flex items-center pr-4">
                      <button
                        data-cy="edit-day-v2"
                        className="p-2 align-middle ls-edit-day-v2 button nm-edit-day-v2"
                        onClick={() => props.onEditWeekDayName({ weekIndex })}
                      >
                        <IconEditSquare />
                      </button>
                      <button
                        data-cy="clone-day"
                        className="p-2 align-middle ls-clone-day-v2 button nm-clone-day-v2"
                        onClick={() => {
                          const newName = StringUtils.nextName(week.name);
                          const newWeek = { ...ObjectUtils.clone(week), name: newName };
                          props.plannerDispatch(
                            props.lbProgram.p("weeks").recordModify((weeks) => {
                              return [...weeks.slice(0, weekIndex + 1), newWeek, ...weeks.slice(weekIndex + 1)];
                            })
                          );
                        }}
                      >
                        <IconDuplicate2 />
                      </button>
                      {props.plannerProgram.weeks.length > 0 && (
                        <button
                          data-cy={`delete-week-v2`}
                          className="p-2 align-middle ls-delete-week-v2 button nm-delete-week-v2"
                          onClick={() => {
                            if (confirm("Are you sure?")) {
                              props.plannerDispatch(
                                props.lbProgram.p("weeks").recordModify((weeks) => {
                                  return CollectionUtils.removeAt(weeks, weekIndex);
                                })
                              );
                            }
                          }}
                        >
                          <IconTrash />
                        </button>
                      )}
                    </div>
                  </div>
                  {!collapsedWeeks[weekIndex] && (
                    <DraggableList
                      items={week.days}
                      mode="vertical"
                      onDragEnd={(startIndex, endIndex) => {
                        props.plannerDispatch([
                          props.lbProgram
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
                      }}
                      element={(day, dayIndex, handleTouchStart2) => {
                        const evalResult = props.evaluatedWeeks[weekIndex][dayIndex];
                        return (
                          <div
                            className="flex items-center px-4 py-1 my-1 border border-white rounded-lg bg-purplev2-100"
                            style={{ boxShadow: "0 0 4px 0 rgba(0, 0, 0, 0.25)" }}
                          >
                            <div className="flex items-center">
                              <div className="p-2 cursor-move" style={{ marginLeft: "-16px", touchAction: "none" }}>
                                <span onMouseDown={handleTouchStart2} onTouchStart={handleTouchStart2}>
                                  <IconHandle />
                                </span>
                              </div>
                            </div>
                            <div className="flex-1">
                              <div>{day.name}</div>
                              <div>
                                {evalResult.success
                                  ? CollectionUtils.compact(
                                      evalResult.data.map((e) => {
                                        const exercise = Exercise.findByName(e.name, props.settings.exercises);
                                        const exerciseType =
                                          exercise != null ? { id: exercise.id, equipment: e.equipment } : undefined;
                                        if (exerciseType) {
                                          return (
                                            <ExerciseImage
                                              settings={props.settings}
                                              exerciseType={exerciseType}
                                              size="small"
                                              className="w-6 mr-1"
                                            />
                                          );
                                        } else {
                                          return undefined;
                                        }
                                      })
                                    )
                                  : []}
                              </div>
                            </div>
                            <div className="flex items-center">
                              <button
                                data-cy="edit-day-v2"
                                className="p-2 align-middle ls-edit-day-v2 button nm-edit-day-v2"
                                onClick={() => props.onEditWeekDayName({ weekIndex, dayIndex })}
                              >
                                <IconEditSquare />
                              </button>
                              <button
                                data-cy="clone-day"
                                className="p-2 align-middle ls-clone-day-v2 button nm-clone-day-v2"
                                onClick={() => {
                                  const newName = StringUtils.nextName(day.name);
                                  const newDay = { ...ObjectUtils.clone(day), name: newName };
                                  props.plannerDispatch(
                                    props.lbProgram
                                      .p("weeks")
                                      .i(weekIndex)
                                      .p("days")
                                      .recordModify((days) => {
                                        return [...days.slice(0, dayIndex + 1), newDay, ...days.slice(dayIndex + 1)];
                                      })
                                  );
                                }}
                              >
                                <IconDuplicate2 />
                              </button>
                              {props.plannerProgram.weeks.length > 0 && (
                                <button
                                  data-cy={`delete-week-v2`}
                                  className="p-2 align-middle ls-delete-week-v2 button nm-delete-week-v2"
                                  onClick={() => {
                                    if (confirm("Are you sure?")) {
                                      props.plannerDispatch(
                                        props.lbProgram
                                          .p("weeks")
                                          .i(weekIndex)
                                          .p("days")
                                          .recordModify((days) => {
                                            return CollectionUtils.removeAt(days, dayIndex);
                                          })
                                      );
                                    }
                                  }}
                                >
                                  <IconTrash />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      }}
                    />
                  )}
                </div>
              </section>
            );
          }}
        />
        <div>
          <LinkButton
            name="planner-add-week"
            onClick={() => {
              props.plannerDispatch(
                props.lbProgram.p("weeks").recordModify((days) => [
                  ...days,
                  {
                    name: `Week ${days.length + 1}`,
                    days: [{ name: "Day 1", exerciseText: "" }],
                  },
                ])
              );
            }}
          >
            Add Week
          </LinkButton>
        </div>
      </div>
    </div>
  );
}
