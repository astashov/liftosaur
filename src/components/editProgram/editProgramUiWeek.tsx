import { JSX, h } from "preact";
import { IPlannerState } from "../../pages/planner/models/types";
import { ILensDispatch } from "../../utils/useLensReducer";
import { lb } from "lens-shmens";
import { MarkdownEditorBorderless } from "../markdownEditorBorderless";
import { StringUtils } from "../../utils/string";
import { IconMusclesW } from "../icons/iconMusclesW";
import { IconTrash } from "../icons/iconTrash";
import { CollectionUtils } from "../../utils/collection";
import { EditProgramUiDayView } from "./editProgramUiDay";
import { DraggableList } from "../draggableList";
import { ISettings } from "../../types";
import { LinkButton } from "../linkButton";
import { IPlannerEvalResult } from "../../pages/planner/plannerExerciseEvaluator";
import { Button } from "../button";
import { IconPlus2 } from "../icons/iconPlus2";
import { ContentGrowingTextarea } from "../contentGrowingTextarea";
import { IEvaluatedProgram, Program } from "../../models/program";
import { applyChangesInEditor } from "./editProgramUtils";
import { IDispatch } from "../../ducks/types";
import { EditProgramUiHelpers } from "./editProgramUi/editProgramUiHelpers";

interface IEditProgramViewProps {
  state: IPlannerState;
  settings: ISettings;
  evaluatedWeeks: IPlannerEvalResult[][];
  evaluatedProgram: IEvaluatedProgram;
  exerciseFullNames: string[];
  dispatch: IDispatch;
  plannerDispatch: ILensDispatch<IPlannerState>;
}

export function EditProgramUiWeekView(props: IEditProgramViewProps): JSX.Element {
  const ui = props.state.ui;
  const currentWeekIndex = ui.weekIndex;

  const program = props.state.current.program;
  const planner = program.planner!;

  const currentWeek = planner.weeks[currentWeekIndex];
  const lbPlanner = lb<IPlannerState>().p("current").p("program").pi("planner");
  const lbUi = lb<IPlannerState>().p("ui");
  const lbPlannerWeek = lbPlanner.p("weeks").i(currentWeekIndex);

  const isValidProgram = props.evaluatedWeeks.every((week) => week.every((day) => day.success));
  const evaluatedCurrentWeek = props.evaluatedWeeks[currentWeekIndex];
  const dayIndexOffset = Program.getDayNumber(planner, currentWeekIndex + 1, 1);
  const allDaysCollapsed = Array.from(currentWeek.days).every((d, i) => {
    return ui.dayUi.collapsed.has(`${currentWeekIndex}-${i}`);
  });

  return (
    <div>
      <div className="flex items-center px-4 pt-2 text-base font-bold">
        <div className="mr-auto">
          <ContentGrowingTextarea
            value={currentWeek.name}
            onInput={(newValue) => {
              if (newValue) {
                props.plannerDispatch(lbPlannerWeek.p("name").record(newValue), "Update week name");
              }
            }}
          />
        </div>
        <div className="flex items-center">
          <div>
            <button
              data-cy="editor-v2-week-muscles"
              className="px-2"
              onClick={() => {
                props.plannerDispatch(
                  lb<IPlannerState>().pi("ui").p("showWeekStats").record(currentWeekIndex),
                  "Show week stats"
                );
              }}
            >
              <IconMusclesW size={20} />
            </button>
          </div>
          {props.evaluatedWeeks.length > 1 && (
            <div>
              <button
                className="px-2"
                onClick={() => {
                  props.plannerDispatch(
                    [
                      lbPlanner.p("weeks").recordModify((weeks) => {
                        return CollectionUtils.removeAt(weeks, currentWeekIndex);
                      }),
                      lbUi.p("weekIndex").recordModify((wi) => {
                        return wi > 0 ? wi - 1 : 0;
                      }),
                    ],
                    "Delete week"
                  );
                }}
              >
                <IconTrash />
              </button>
            </div>
          )}
        </div>
      </div>
      <div className="px-3 py-1">
        <MarkdownEditorBorderless
          value={currentWeek.description}
          debounceMs={500}
          placeholder={`Week description in Markdown...`}
          onChange={(v) => {
            props.plannerDispatch(
              lbPlanner.p("weeks").i(currentWeekIndex).p("description").record(v),
              "Update week description"
            );
          }}
        />
      </div>
      <div className="flex items-center px-4">
        <div className="mr-auto text-xs">
          {currentWeek.days.length} {StringUtils.pluralize("day", currentWeek.days.length)}
        </div>
        <div>
          <LinkButton
            name="collapse-all-days"
            className="text-xs font-normal"
            onClick={() => {
              props.plannerDispatch(
                lb<IPlannerState>()
                  .p("ui")
                  .p("dayUi")
                  .p("collapsed")
                  .recordModify((collapsed) => {
                    const newCollapsed = new Set<string>(collapsed);
                    for (
                      let dayInWeekIndex = 0;
                      dayInWeekIndex < planner.weeks[currentWeekIndex].days.length;
                      dayInWeekIndex += 1
                    ) {
                      const key = `${currentWeekIndex}-${dayInWeekIndex}`;
                      if (allDaysCollapsed) {
                        newCollapsed.delete(key);
                      } else {
                        newCollapsed.add(key);
                      }
                    }
                    return newCollapsed;
                  }),
                "Toggle all days collapse"
              );
            }}
          >
            {allDaysCollapsed ? "Expand" : "Collapse"} all days
          </LinkButton>
        </div>
      </div>
      <DraggableList
        items={currentWeek.days}
        mode="vertical"
        onDragEnd={(startIndex, endIndex) => {
          applyChangesInEditor(props.plannerDispatch, () => {
            EditProgramUiHelpers.onDaysChange(
              props.plannerDispatch,
              props.state.ui,
              currentWeekIndex,
              currentWeek.days,
              (order) => {
                props.plannerDispatch(
                  [
                    lbPlanner
                      .p("weeks")
                      .i(currentWeekIndex)
                      .p("days")
                      .recordModify((days) => {
                        const newDays = [...days];
                        const [daysToMove] = newDays.splice(startIndex, 1);
                        newDays.splice(endIndex, 0, daysToMove);
                        return newDays;
                      }),
                  ],
                  "Reorder days"
                );
                const [daysToMove] = order.splice(startIndex, 1);
                order.splice(endIndex, 0, daysToMove);
              }
            );
          });
        }}
        element={(plannerDay, dayInWeekIndex, handleTouchStart) => {
          const evaluatedDay = evaluatedCurrentWeek[dayInWeekIndex];
          const dayData = {
            week: currentWeekIndex + 1,
            dayInWeek: dayInWeekIndex + 1,
            day: dayInWeekIndex + dayIndexOffset,
          };
          return (
            <EditProgramUiDayView
              key={plannerDay.id}
              settings={props.settings}
              dispatch={props.dispatch}
              evaluatedProgram={props.evaluatedProgram}
              isValidProgram={isValidProgram}
              evaluatedDay={evaluatedDay}
              exerciseFullNames={props.exerciseFullNames}
              dayData={dayData}
              lbPlannerWeek={lbPlannerWeek}
              showDelete={currentWeek.days.length > 1}
              day={plannerDay}
              weekIndex={currentWeekIndex}
              dayInWeekIndex={dayInWeekIndex}
              plannerDispatch={props.plannerDispatch}
              state={props.state}
              handleTouchStart={handleTouchStart}
            />
          );
        }}
      />
      <div className="py-1 mx-2">
        <Button
          kind="lightgrayv3"
          buttonSize="md"
          name="add-day"
          data-cy="add-day"
          className="flex items-center justify-center w-full text-sm text-center"
          onClick={() => {
            props.plannerDispatch(
              lbPlanner
                .p("weeks")
                .i(currentWeekIndex)
                .p("days")
                .recordModify((days) => [
                  ...days,
                  {
                    name: `Day ${days.length + 1}`,
                    exerciseText: "",
                  },
                ]),
              "Add new day"
            );
          }}
        >
          <IconPlus2 size={12} />
          <span className="ml-2">Add Day</span>
        </Button>
      </div>
    </div>
  );
}
