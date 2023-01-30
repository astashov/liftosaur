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
import { useRef } from "preact/compat";
import { useEffect } from "preact/hooks";
import { HtmlUtils } from "../../../utils/html";

interface IBuilderWeekProps {
  week: IBuilderWeek;
  numberOfWeeks: number;
  index: number;
  settings: IBuilderSettings;
  selectedExercise?: ISelectedExercise;
  dispatch: IBuilderDispatch;
}

export function BuilderWeek(props: IBuilderWeekProps): JSX.Element {
  const week = props.week;
  const sectionRef = useRef<HTMLElement>(null);
  const musclesRef = useRef<HTMLDivElement>(null);
  const isSelected =
    props.selectedExercise != null &&
    props.selectedExercise.weekIndex === props.index &&
    props.selectedExercise.dayIndex == null &&
    props.selectedExercise.exerciseIndex == null;

  useEffect(() => {
    function handleScroll(): void {
      if (musclesRef.current && sectionRef.current) {
        const offsetTop = sectionRef.current.offsetTop;
        const scrollTop = window.pageYOffset;
        if (scrollTop > offsetTop) {
          musclesRef.current.classList.add("sticky");
        } else {
          musclesRef.current.classList.remove("sticky");
        }
      }
    }
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <section
      className="px-2 py-3 rounded selectable"
      onClick={(e) => {
        const hasActionableElement =
          e.target instanceof HTMLElement && HtmlUtils.selectableInParents(e.target, e.currentTarget);
        console.log(hasActionableElement);
        if (!hasActionableElement) {
          props.dispatch([
            lb<IBuilderState>().p("ui").p("selectedExercise").record({
              weekIndex: props.index,
            }),
          ]);
        }
      }}
      ref={sectionRef}
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
                  props.dispatch([lb<IBuilderState>().p("program").p("weeks").i(props.index).p("name").record(value)]);
                }}
              />
            </h3>
            {props.numberOfWeeks > 1 && (
              <div>
                <LinkButton
                  onClick={() => {
                    if (confirm("Are you sure you want to delete this week?")) {
                      props.dispatch([
                        lb<IBuilderState>()
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
              selectedExercise={props.selectedExercise}
              day={day}
              settings={props.settings}
              weekIndex={props.index}
              index={index}
              dispatch={props.dispatch}
            />
          ))}
          <LinkButton
            onClick={() => {
              const lastDay = week.days[week.days.length - 1];
              const day = BuilderDayModel.build(StringUtils.nextName(lastDay.name));
              props.dispatch([
                lb<IBuilderState>()
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
          <div ref={musclesRef}>
            <BuilderWeekMuscles weekIndex={props.index} week={props.week} dispatch={props.dispatch} />
          </div>
        </div>
      </div>
    </section>
  );
}
