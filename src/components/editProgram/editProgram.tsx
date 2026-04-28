import type { JSX } from "react";
import { View, Pressable } from "react-native";
import { IconUndo } from "../icons/iconUndo";
import { undo, canUndo, canRedo, redo } from "../../pages/builder/utils/undoredo";
import { IPlannerState } from "../../pages/planner/models/types";
import { ILensDispatch } from "../../utils/useLensReducer";
import { IconUiMode } from "../icons/iconUiMode";
import { Tailwind_semantic } from "../../utils/tailwindConfig";
import { IconDayTextMode } from "../icons/iconDayTextMode";
import { IconFullTextMode } from "../icons/iconFullTextMode";
import { Button } from "../button";
import { EditProgramUiWeekView } from "./editProgramUiWeek";
import { IProgram, ISettings } from "../../types";
import { lb } from "lens-shmens";
import { IconReorder } from "../icons/iconReorder";
import { EditProgramV2Weeks } from "./editProgramV2Weeks";
import { EditProgramV2Full } from "./editProgramV2Full";
import { PlannerProgram_evaluate } from "../../pages/planner/models/plannerProgram";
import { ScrollableTabs } from "../scrollableTabs";
import { IEvaluatedProgram, Program_cleanPlannerProgram } from "../../models/program";
import { Thunk_pushScreen } from "../../ducks/thunks";
import { updateState, IState } from "../../models/state";
import { CollectionUtils_setBy } from "../../utils/collection";
import { IDispatch } from "../../ducks/types";
import { IPlannerEvalResult } from "../../pages/planner/plannerExerciseEvaluator";

interface IEditProgramViewProps {
  evaluatedWeeks: IPlannerEvalResult[][];
  exerciseFullNames: string[];
  evaluatedProgram: IEvaluatedProgram;
  state: IPlannerState;
  originalProgram: IProgram;
  programId: string;
  dispatch: IDispatch;
  plannerDispatch: ILensDispatch<IPlannerState>;
  settings: ISettings;
}

export function EditProgramView(
  props: IEditProgramViewProps & { hideNavbar?: boolean; hideWeekTabBar?: boolean }
): JSX.Element {
  const ui = props.state.ui;
  const program = props.state.current.program;
  const planner = program.planner!;
  const { evaluatedWeeks, exerciseFullNames } = props;
  const weekIndex = ui.weekIndex ?? 0;

  return (
    <View className="pb-6">
      {!props.hideNavbar && (
        <EditProgramNavbar
          dispatch={props.dispatch}
          originalProgram={props.originalProgram}
          settings={props.settings}
          state={props.state}
          plannerDispatch={props.plannerDispatch}
        />
      )}
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
      ) : props.hideWeekTabBar ? (
        <View className="pt-2">
          <EditProgramUiWeekView
            key={weekIndex}
            evaluatedProgram={props.evaluatedProgram}
            dispatch={props.dispatch}
            programId={props.programId}
            state={props.state}
            exerciseFullNames={exerciseFullNames}
            evaluatedWeeks={evaluatedWeeks}
            plannerDispatch={props.plannerDispatch}
            settings={props.settings}
          />
        </View>
      ) : (
        <ScrollableTabs
          topPadding="0.5rem"
          className="gap-2 px-4"
          nonSticky={true}
          shouldNotExpand={true}
          defaultIndex={ui.weekIndex ?? 0}
          type="squares"
          onChange={(newWeekIndex) =>
            props.plannerDispatch(
              lb<IPlannerState>().p("ui").p("weekIndex").record(newWeekIndex),
              `Change week index to ${newWeekIndex}`
            )
          }
          tabs={planner.weeks.map((week, wi) => {
            return {
              label: week.name,
              isInvalid: evaluatedWeeks[wi].some((day) => !day.success),
              children: () => (
                <EditProgramUiWeekView
                  evaluatedProgram={props.evaluatedProgram}
                  dispatch={props.dispatch}
                  programId={props.programId}
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
    </View>
  );
}

interface IEditProgramNavbarProps {
  state: IPlannerState;
  originalProgram: IProgram;
  settings: ISettings;
  dispatch: IDispatch;
  plannerDispatch: ILensDispatch<IPlannerState>;
}

export function EditProgramNavbar(props: IEditProgramNavbarProps): JSX.Element {
  const isValidFull = !props.state.ui.fullTextError;
  const planner = props.state.current.program.planner!;
  const evaluatedWeeks = PlannerProgram_evaluate(planner, props.settings).evaluatedWeeks;
  const isValidPerDay = evaluatedWeeks.every((week) => week.every((day) => day.success)) ?? true;
  const isValid = isValidFull && isValidPerDay;

  return (
    <View
      className="flex-row items-center justify-between gap-2 py-2 pl-2 pr-4 border-b bg-background-default border-background-subtle"
      style={{ zIndex: 25 }}
    >
      <View className="flex-row items-center">
        <Pressable
          className="p-2 nm-program-undo"
          disabled={!canUndo(props.state)}
          onPress={() => undo(props.plannerDispatch, props.state)}
        >
          <IconUndo
            width={20}
            height={20}
            color={!canUndo(props.state) ? Tailwind_semantic().icon.light : Tailwind_semantic().icon.neutral}
          />
        </Pressable>
        <Pressable
          className="p-2 nm-program-redo"
          disabled={!canRedo(props.state)}
          onPress={() => redo(props.plannerDispatch, props.state)}
        >
          <View style={{ transform: [{ scaleX: -1 }] }}>
            <IconUndo
              width={20}
              height={20}
              color={!canRedo(props.state) ? Tailwind_semantic().icon.light : Tailwind_semantic().icon.neutral}
            />
          </View>
        </Pressable>
      </View>
      <View className="flex-row items-center">
        <EditProgramModeSwitchButton
          isSelected={props.state.ui.mode === "reorder"}
          disabled={!isValid}
          name="editor-v2-reorder-program"
          onClick={() => {
            props.plannerDispatch([lb<IPlannerState>().p("ui").p("mode").record("reorder")], "Switch to reorder mode");
          }}
        >
          {(color) => <IconReorder color={color} />}
        </EditProgramModeSwitchButton>
        <EditProgramModeSwitchButton
          isSelected={props.state.ui.mode === "ui"}
          name="editor-v2-ui-program"
          disabled={!isValid}
          onClick={() => {
            props.plannerDispatch([lb<IPlannerState>().p("ui").p("mode").record("ui")], "Switch to UI mode");
          }}
        >
          {(color) => <IconUiMode color={color} />}
        </EditProgramModeSwitchButton>
        <EditProgramModeSwitchButton
          isSelected={props.state.ui.mode === "perday"}
          name="editor-v2-perday-program"
          onClick={() => {
            props.plannerDispatch([lb<IPlannerState>().p("ui").p("mode").record("perday")], "Switch to per-day mode");
          }}
        >
          {(color) => <IconDayTextMode color={color} />}
        </EditProgramModeSwitchButton>
        <EditProgramModeSwitchButton
          isSelected={props.state.ui.mode === "full"}
          name="editor-v2-full-program"
          onClick={() => {
            props.plannerDispatch([lb<IPlannerState>().p("ui").p("mode").record("full")], "Switch to full text mode");
          }}
        >
          {(color) => <IconFullTextMode color={color} />}
        </EditProgramModeSwitchButton>
      </View>
      <View className="flex-row items-center">
        <Button
          disabled={!isValid}
          name="save-program"
          kind="purple"
          buttonSize="md"
          data-testid="save-program"
          testID="save-program"
          onClick={() => {
            const newProgram: IProgram = Program_cleanPlannerProgram({ ...props.originalProgram, planner });
            updateState(
              props.dispatch,
              [
                lb<IState>()
                  .p("storage")
                  .p("programs")
                  .recordModify((programs) => {
                    return CollectionUtils_setBy(programs, "id", props.originalProgram.id, newProgram);
                  }),
              ],
              `Save program '${newProgram.name}'`
            );
            props.dispatch(Thunk_pushScreen("main", undefined, { tab: "home" }));
          }}
        >
          Save
        </Button>
      </View>
    </View>
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
    <Pressable
      data-testid={props.name}
      testID={props.name}
      className={`p-2 ${isSelected ? "bg-purplev3-200" : ""} rounded nm-${props.name}`}
      style={{ opacity: props.disabled && !isSelected ? 0.5 : 1 }}
      onPress={() => {
        if (!props.disabled && !isSelected) {
          props.onClick();
        }
      }}
    >
      {props.children(isSelected ? Tailwind_semantic().icon.purple : Tailwind_semantic().icon.neutral)}
    </Pressable>
  );
}
