import { h, JSX } from "preact";
import { IBuilderWeek, ISelectedExercise } from "../models/types";
import { IBuilderDispatch, IBuilderSettings, IBuilderState } from "../models/builderReducer";
import { BuilderDay } from "./builderDay";
import { BuilderLinkInlineInput } from "./builderInlineInput";
import { lb } from "lens-shmens";
import { LinkButton } from "../../../components/linkButton";
import { BuilderDayModel } from "../models/builderDayModel";
import { StringUtils } from "../../../utils/string";
import { CollectionUtils } from "../../../utils/collection";
import { BuilderWeekMuscles } from "./builderWeekMuscles";
import { HtmlUtils } from "../../../utils/html";

interface IBuilderWeekProps {
  week: IBuilderWeek;
  numberOfWeeks: number;
  index: number;
  settings: IBuilderSettings;
  selectedExercises: ISelectedExercise[];
  dispatch: IBuilderDispatch;
}

export function BuilderWeek(props: IBuilderWeekProps): JSX.Element {
  const week = props.week;
  const isSelected = props.selectedExercises.some((selectedExercise) => {
    return (
      selectedExercise.weekIndex === props.index &&
      selectedExercise.dayIndex == null &&
      selectedExercise.exerciseIndex == null
    );
  });

  return (
    <section
      className="px-2 py-3 rounded selectable"
      onClick={(e) => {
        const hasActionableElement =
          e.target instanceof HTMLElement && HtmlUtils.selectableInParents(e.target, e.currentTarget);
        if (!hasActionableElement) {
          props.dispatch([
            lb<IBuilderState>()
              .p("ui")
              .p("selectedExercises")
              .recordModify((selectedExercises) => {
                const newSelect = {
                  weekIndex: props.index,
                };
                if (window.isPressingShiftCmdCtrl) {
                  if (
                    !selectedExercises.some(
                      (selectedExercise) =>
                        selectedExercise.weekIndex === props.index &&
                        selectedExercise.dayIndex == null &&
                        selectedExercise.exerciseIndex == null
                    )
                  ) {
                    return [
                      ...selectedExercises.filter(
                        (s) => !(s.weekIndex === props.index && (s.dayIndex != null || s.exerciseIndex != null))
                      ),
                      newSelect,
                    ];
                  } else {
                    return selectedExercises.filter((selectedExercise) => selectedExercise.weekIndex !== props.index);
                  }
                } else {
                  return [newSelect];
                }
              }),
          ]);
        }
      }}
      style={{
        marginLeft: "-0.5rem",
        marginRight: "-0.5rem",
        borderBottom: isSelected ? "1px solid #28839F" : "1px solid #BAC4CD",
        borderLeft: isSelected ? "1px solid #28839F" : "1px solid white",
        borderTop: isSelected ? "1px solid #28839F" : "1px solid white",
        borderRight: isSelected ? "1px solid #28839F" : "1px solid white",
      }}
    >
      <div className="flex gap-8">
        <div style={{ flex: 4 }}>
          <div className="flex flex-1 pb-2">
            <h3 className="flex-1 text-lg font-bold">
              <BuilderLinkInlineInput
                value={week.name}
                onInputString={(value) => {
                  props.dispatch([
                    lb<IBuilderState>().p("current").p("program").p("weeks").i(props.index).p("name").record(value),
                  ]);
                }}
              />
            </h3>
            {props.numberOfWeeks > 1 && (
              <div>
                <LinkButton
                  name="builder-delete-week"
                  onClick={() => {
                    if (confirm("Are you sure you want to delete this week?")) {
                      props.dispatch([
                        lb<IBuilderState>()
                          .p("current")
                          .p("program")
                          .p("weeks")
                          .recordModify((weeks) => CollectionUtils.removeAt(weeks, props.index)),
                      ]);
                    }
                  }}
                >
                  Delete Week
                </LinkButton>
              </div>
            )}
          </div>
          {week.days.map((day, index) => (
            <BuilderDay
              week={week}
              numberOfDays={week.days.length}
              selectedExercises={props.selectedExercises}
              day={day}
              settings={props.settings}
              weekIndex={props.index}
              index={index}
              dispatch={props.dispatch}
            />
          ))}
          <LinkButton
            name="builder-add-workout"
            onClick={() => {
              const lastDay = week.days[week.days.length - 1];
              const day = BuilderDayModel.build(StringUtils.nextName(lastDay.name));
              props.dispatch([
                lb<IBuilderState>()
                  .p("current")
                  .p("program")
                  .p("weeks")
                  .i(props.index)
                  .p("days")
                  .recordModify((days) => [...days, day]),
              ]);
            }}
          >
            Add Workout
          </LinkButton>
        </div>
        <div style={{ flex: 2 }}>
          <div
            data-help-id="builder-week-muscles"
            data-help-order={4}
            data-help="See how much weekly total volume you have per muscle group with all exercises"
            data-help-position="top"
            data-help-offset-x="-40"
            data-help-offset-y="-30"
            data-help-height="120"
            className="sticky top-0"
          >
            <BuilderWeekMuscles weekIndex={props.index} week={props.week} dispatch={props.dispatch} />
          </div>
        </div>
      </div>
    </section>
  );
}
