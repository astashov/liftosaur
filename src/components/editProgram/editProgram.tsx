import { JSX, h } from "preact";
import { IconUndo } from "../icons/iconUndo";
import { undo, canUndo, canRedo, redo } from "../../pages/builder/utils/undoredo";
import { IPlannerState } from "../../pages/planner/models/types";
import { ILensDispatch } from "../../utils/useLensReducer";
import { IconUiMode } from "../icons/iconUiMode";
import { Tailwind } from "../../utils/tailwindConfig";
import { IconDayTextMode } from "../icons/iconDayTextMode";
import { IconFullTextMode } from "../icons/iconFullTextMode";
import { Button } from "../button";
import { EditProgramUiWeekView } from "./editProgramUiWeek";
import { IProgram, ISettings } from "../../types";
import { lb } from "lens-shmens";
import { IconReorder } from "../icons/iconReorder";
import { EditProgramV2Weeks } from "./editProgramV2Weeks";
import { EditProgramV2Full } from "./editProgramV2Full";
import { PlannerProgram } from "../../pages/planner/models/plannerProgram";
import { ScrollableTabs } from "../scrollableTabs";
import { Program } from "../../models/program";
import { Thunk } from "../../ducks/thunks";
import { updateState, IState } from "../../models/state";
import { CollectionUtils } from "../../utils/collection";
import { IDispatch } from "../../ducks/types";
import { IPlannerEvalFullResult, IPlannerEvalResult } from "../../pages/planner/plannerExerciseEvaluator";
import { ObjectUtils } from "../../utils/object";

interface IEditProgramViewProps {
  evaluatedWeeks: IPlannerEvalResult[][];
  exerciseFullNames: string[];
  state: IPlannerState;
  originalProgram: IProgram;
  dispatch: IDispatch;
  plannerDispatch: ILensDispatch<IPlannerState>;
  settings: ISettings;
}

export function EditProgramView(props: IEditProgramViewProps): JSX.Element {
  const ui = props.state.ui;
  const program = props.state.current.program;
  const planner = program.planner!;
  const { evaluatedWeeks, exerciseFullNames } = props;

  return (
    <div className="pb-6">
      <EditProgramNavbar
        dispatch={props.dispatch}
        originalProgram={props.originalProgram}
        settings={props.settings}
        state={props.state}
        plannerDispatch={props.plannerDispatch}
      />
      {ui.mode === "reorder" ? (
        <EditProgramV2Weeks state={props.state} settings={props.settings} plannerDispatch={props.plannerDispatch} />
      ) : ui.mode === "full" ? (
        <EditProgramV2Full
          plannerProgram={planner}
          ui={ui}
          lbUi={lb<IPlannerState>().pi("ui")}
          settings={props.settings}
          plannerDispatch={props.plannerDispatch}
        />
      ) : (
        <ScrollableTabs
          topPadding="0.5rem"
          className="gap-2 px-4"
          nonSticky={true}
          shouldNotExpand={true}
          type="squares"
          onChange={(weekIndex) => props.plannerDispatch(lb<IPlannerState>().p("ui").p("weekIndex").record(weekIndex))}
          tabs={planner.weeks.map((week, weekIndex) => {
            return {
              label: week.name,
              isInvalid: evaluatedWeeks[weekIndex].some((day) => !day.success),
              children: () => (
                <EditProgramUiWeekView
                  dispatch={props.dispatch}
                  state={props.state}
                  exerciseFullNames={exerciseFullNames}
                  evaluatedWeeks={evaluatedWeeks}
                  plannerDispatch={props.plannerDispatch}
                  settings={props.settings}
                />
              ),
            };
          })}
        />
      )}
    </div>
  );
}

interface IEditProgramNavbarProps {
  state: IPlannerState;
  fullEvaluatedWeeks?: IPlannerEvalFullResult;
  originalProgram: IProgram;
  settings: ISettings;
  dispatch: IDispatch;
  plannerDispatch: ILensDispatch<IPlannerState>;
}

function EditProgramNavbar(props: IEditProgramNavbarProps): JSX.Element {
  const isValidFull = props.fullEvaluatedWeeks ? props.fullEvaluatedWeeks.success : true;

  const planner = props.state.current.program.planner!;
  const evaluatedWeeks = PlannerProgram.evaluate(planner, props.settings).evaluatedWeeks;
  const isValidPerDay = evaluatedWeeks.every((week) => week.every((day) => day.success)) ?? true;
  const isValid = isValidFull && isValidPerDay;

  return (
    <div
      className="sticky left-0 flex flex-row items-center justify-between gap-2 py-2 pl-2 pr-4 bg-white border-b border-grayv3-50"
      style={{
        zIndex: 25,
        top: "3.75rem",
      }}
    >
      <div className="flex items-center">
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
      </div>
      <div className="flex items-center">
        <EditProgramModeSwitchButton
          isSelected={props.state.ui.mode === "reorder"}
          disabled={!isValid}
          name="program-mode-reorder"
          onClick={() => {
            props.plannerDispatch([lb<IPlannerState>().p("ui").p("mode").record("reorder")]);
          }}
        >
          {(color) => <IconReorder color={color} />}
        </EditProgramModeSwitchButton>
        <EditProgramModeSwitchButton
          isSelected={props.state.ui.mode === "ui"}
          name="program-mode-ui"
          disabled={!isValid}
          onClick={() => {
            props.plannerDispatch([lb<IPlannerState>().p("ui").p("mode").record("ui")]);
          }}
        >
          {(color) => <IconUiMode color={color} />}
        </EditProgramModeSwitchButton>
        <EditProgramModeSwitchButton
          isSelected={props.state.ui.mode === "perday"}
          name="program-mode-day-text"
          onClick={() => {
            props.plannerDispatch([lb<IPlannerState>().p("ui").p("mode").record("perday")]);
          }}
        >
          {(color) => <IconDayTextMode color={color} />}
        </EditProgramModeSwitchButton>
        <EditProgramModeSwitchButton
          isSelected={props.state.ui.mode === "full"}
          name="program-mode-full-text"
          onClick={() => {
            props.plannerDispatch([lb<IPlannerState>().p("ui").p("mode").record("full")]);
          }}
        >
          {(color) => <IconFullTextMode color={color} />}
        </EditProgramModeSwitchButton>
      </div>
      <div className="flex items-center">
        <Button
          disabled={!isValid}
          name="save-program"
          kind="purple"
          buttonSize="md"
          data-cy="save-program"
          onClick={() => {
            let newPlanner = {
              ...planner,
              weeks: planner.weeks.map((w) => ({
                ...ObjectUtils.omit(w, ["id"]),
                days: w.days.map((d) => ({
                  ...ObjectUtils.omit(d, ["id"]),
                })),
              })),
            };
            const newProgram: IProgram = {
              ...Program.cleanPlannerProgram(props.originalProgram),
              planner: newPlanner,
            };
            updateState(props.dispatch, [
              lb<IState>()
                .p("storage")
                .p("programs")
                .recordModify((programs) => {
                  return CollectionUtils.setBy(programs, "id", props.originalProgram.id, newProgram);
                }),
            ]);
            props.dispatch(Thunk.pushScreen("main", undefined, true));
          }}
        >
          Save
        </Button>
      </div>
    </div>
  );
}

interface IEditProgramModeSwitchButtonProps {
  isSelected: boolean;
  name: string;
  disabled?: boolean;
  children: (color: string) => JSX.Element;
  onClick: () => void;
}

function EditProgramModeSwitchButton(props: IEditProgramModeSwitchButtonProps): JSX.Element {
  const isSelected = props.isSelected;
  return (
    <button
      className={`p-2 ${isSelected ? "bg-purplev3-200" : ""} rounded nm-${props.name}`}
      style={{ opacity: props.disabled && !isSelected ? 0.5 : 1 }}
      onClick={() => {
        if (!props.disabled && !isSelected) {
          props.onClick();
        }
      }}
    >
      {props.children(isSelected ? Tailwind.colors().purplev3.main : Tailwind.colors().grayv3.main)}
    </button>
  );
}
