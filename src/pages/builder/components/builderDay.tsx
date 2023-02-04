import { h, JSX } from "preact";
import { IBuilderDay, IBuilderWeek, ISelectedExercise } from "../models/types";
import { IconWatch } from "../../../components/icons/iconWatch";
import { BuilderExercise } from "./builderExercise";
import { IBuilderDispatch, IBuilderSettings, IBuilderState } from "../models/builderReducer";
import { LinkButton } from "../../../components/linkButton";
import { lb } from "lens-shmens";
import { ObjectUtils } from "../../../utils/object";
import { CollectionUtils } from "../../../utils/collection";
import { IconTrash } from "../../../components/icons/iconTrash";
import { BuilderLinkInlineInput } from "./builderInlineInput";
import { TimeUtils } from "../../../utils/time";
import { BuilderDayModel } from "../models/builderDayModel";
import { HtmlUtils } from "../../../utils/html";

interface IBuilderDayProps {
  day: IBuilderDay;
  week: IBuilderWeek;
  index: number;
  numberOfDays: number;
  weekIndex: number;
  settings: IBuilderSettings;
  selectedExercise?: ISelectedExercise;
  dispatch: IBuilderDispatch;
}

export function BuilderDay(props: IBuilderDayProps): JSX.Element {
  const day = props.day;
  const lbe = lb<IBuilderState>().p("program").p("weeks").i(props.weekIndex).p("days").i(props.index);
  const lastExercise = day.exercises[day.exercises.length - 1];
  const time = BuilderDayModel.approxTimeMs(day);
  const duration = TimeUtils.formatHHMM(time);
  const calories = BuilderDayModel.calories(time);
  const isSelected =
    props.selectedExercise != null &&
    props.selectedExercise.weekIndex === props.weekIndex &&
    props.selectedExercise.dayIndex === props.index &&
    props.selectedExercise.exerciseIndex == null;

  return (
    <section
      style={{
        marginLeft: "-0.5rem",
        marginRight: "-0.5rem",
        borderBottom: isSelected ? "1px solid #28839F" : "1px solid white",
        borderLeft: isSelected ? "1px solid #28839F" : "1px solid white",
        borderTop: isSelected ? "1px solid #28839F" : "1px solid white",
        borderRight: isSelected ? "1px solid #28839F" : "1px solid white",
      }}
      className="px-2 pt-2 pb-6 rounded selectable"
      onClick={(e) => {
        const hasActionableElement =
          e.target instanceof HTMLElement && HtmlUtils.selectableInParents(e.target, e.currentTarget);
        if (!hasActionableElement) {
          props.dispatch([
            lb<IBuilderState>().p("ui").p("selectedExercise").record({
              weekIndex: props.weekIndex,
              dayIndex: props.index,
            }),
          ]);
        }
      }}
    >
      <div className="sticky top-0 z-10 flex py-2 bg-white">
        <div className="flex-1">
          <h3 className="inline-block text-base font-bold align-middle">
            <BuilderLinkInlineInput
              value={day.name}
              onInputString={(value) => {
                props.dispatch([lbe.p("name").record(value)]);
              }}
            />
          </h3>
          <div
            className="inline-block ml-2 align-middle"
            data-help-id="builder-day-time"
            data-help-order={3}
            data-help="See approximately how much time (HH:MM) the workout will take."
            data-help-position="bottom"
          >
            <IconWatch className="mr-1 align-middle" style={{ marginBottom: "2px" }} />
            <span className="font-bold align-middle">{duration}</span>
          </div>
          <div className="inline-block ml-4 align-middle">
            <span>Burn: </span>
            <span className="font-bold">
              {calories[0]}-{calories[1]}
            </span>
            <span> kcal</span>
          </div>
        </div>
        {props.numberOfDays > 1 && (
          <div>
            <LinkButton
              onClick={() => {
                if (confirm("Are you sure you want to delete this workout?")) {
                  props.dispatch([
                    lb<IBuilderState>()
                      .p("program")
                      .p("weeks")
                      .i(props.weekIndex)
                      .p("days")
                      .recordModify((days) => CollectionUtils.removeAt(days, props.index)),
                  ]);
                }
              }}
            >
              Delete Workout
            </LinkButton>
          </div>
        )}
      </div>
      <div>
        {day.exercises.map((exercise, index) => (
          <div className="relative">
            <BuilderExercise
              selectedExercise={props.selectedExercise}
              week={props.week}
              weekIndex={props.weekIndex}
              dayIndex={props.index}
              index={index}
              settings={props.settings}
              exercise={exercise}
              dispatch={props.dispatch}
            />
            {day.exercises.length > 1 && (
              <div className="absolute top-0 right-0">
                <button
                  className="p-1"
                  onClick={() =>
                    props.dispatch([
                      lb<IBuilderState>()
                        .p("program")
                        .p("weeks")
                        .i(props.weekIndex)
                        .p("days")
                        .i(props.index)
                        .p("exercises")
                        .recordModify((excercises) => {
                          return CollectionUtils.removeAt(excercises, index);
                        }),
                    ])
                  }
                >
                  <IconTrash />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
      <LinkButton
        onClick={() =>
          props.dispatch([
            lbe.p("exercises").recordModify((exercises) => [...exercises, ObjectUtils.clone(lastExercise)]),
          ])
        }
      >
        Add Exercise
      </LinkButton>
    </section>
  );
}
