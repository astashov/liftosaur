import { JSX, memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, LayoutChangeEvent } from "react-native";
import { useRemScale } from "../../utils/useRem";
import { Pressable } from "../primitives/pressable";
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
import { EditProgramGrid } from "./editProgramGrid/editProgramGrid";
import { IconCalendarSmall } from "../icons/iconCalendarSmall";
import { PlannerProgram_evaluate } from "../../pages/planner/models/plannerProgram";
import { ScrollableTabs } from "../scrollableTabs";
import { IEvaluatedProgram, Program_cleanPlannerProgram } from "../../models/program";
import { Thunk_pushScreen, Thunk_log } from "../../ducks/thunks";
import { updateState, IState } from "../../models/state";
import { CollectionUtils_setBy } from "../../utils/collection";
import { IDispatch } from "../../ducks/types";
import { IPlannerEvalResult } from "../../pages/planner/plannerExerciseEvaluator";
import { usePerfRenderCount } from "../../utils/usePerfRenderCount";

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

export const EditProgramView = memo(function EditProgramView(
  props: IEditProgramViewProps & { hideNavbar?: boolean; hideWeekTabBar?: boolean }
): JSX.Element {
  usePerfRenderCount("EditProgramView");
  const ui = props.state.ui;
  const program = props.state.current.program;
  const planner = program.planner!;
  const { evaluatedWeeks, exerciseFullNames, plannerDispatch } = props;
  const weekIndex = ui.weekIndex ?? 0;

  const onWeekTabChange = useCallback(
    (newWeekIndex: number) =>
      plannerDispatch(
        lb<IPlannerState>().p("ui").p("weekIndex").record(newWeekIndex),
        `Change week index to ${newWeekIndex}`
      ),
    [plannerDispatch]
  );

  return (
    <View className="pb-6">
      {!props.hideNavbar && (
        <EditProgramNavbar
          dispatch={props.dispatch}
          originalProgram={props.originalProgram}
          settings={props.settings}
          state={props.state}
          evaluatedWeeks={evaluatedWeeks}
          plannerDispatch={plannerDispatch}
        />
      )}
      {ui.mode === "grid" ? (
        <EditProgramGrid
          evaluatedProgram={props.evaluatedProgram}
          settings={props.settings}
          programId={props.programId}
          dispatch={props.dispatch}
          scale={ui.gridScale}
          plannerDispatch={props.plannerDispatch}
        />
      ) : ui.mode === "reorder" ? (
        <EditProgramV2Weeks state={props.state} settings={props.settings} plannerDispatch={props.plannerDispatch} />
      ) : ui.mode === "full" ? (
        <EditProgramV2Full
          plannerProgram={planner}
          evaluatedProgram={props.evaluatedProgram}
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
          onChange={onWeekTabChange}
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
                  plannerDispatch={plannerDispatch}
                  settings={props.settings}
                />
              ),
            };
          })}
        />
      )}
    </View>
  );
});

const NAVBAR_ICON_BUTTONS = 6;
const NAVBAR_ICON_PADDING = 8;

interface IToolbarPadding {
  padding: number;
  onRowLayout: (event: LayoutChangeEvent) => void;
  onGroupLayout: (index: number) => (event: LayoutChangeEvent) => void;
}

// The icons and the Save label in this toolbar grow with the text size, so at large sizes the row
// still runs off a narrow screen even with constant padding. Measure the natural width once per
// text size / screen width, then trim the icon buttons' horizontal padding by just enough to fit.
function useToolbarPadding(): IToolbarPadding {
  const scale = useRemScale();
  const basePadding = NAVBAR_ICON_PADDING;
  const [padding, setPadding] = useState(basePadding);
  const paddingRef = useRef(padding);
  paddingRef.current = padding;
  const rowWidthRef = useRef(0);
  const groupWidthsRef = useRef<(number | undefined)[]>([]);

  // Padding is constant now, but the icons and label still grow, so a text size change means the
  // natural width has to be measured again.
  useEffect(() => {
    groupWidthsRef.current = [];
    setPadding(basePadding);
  }, [scale, basePadding]);

  const fit = useCallback(() => {
    const groupWidths = groupWidthsRef.current;
    const rowWidth = rowWidthRef.current;
    if (rowWidth === 0 || groupWidths.length < 3 || groupWidths.some((w) => w == null)) {
      return;
    }
    const overflow = groupWidths.reduce<number>((acc, w) => acc + (w ?? 0), 0) - rowWidth;
    const trim = overflow > 0 ? Math.ceil(overflow / (NAVBAR_ICON_BUTTONS * 2)) : 0;
    setPadding(Math.max(2, basePadding - trim));
  }, [basePadding]);

  const onRowLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const width = event.nativeEvent.layout.width;
      if (rowWidthRef.current !== 0 && rowWidthRef.current !== width) {
        groupWidthsRef.current = [];
        setPadding(basePadding);
      }
      rowWidthRef.current = width;
      fit();
    },
    [basePadding, fit]
  );

  // Group widths are only meaningful while the buttons still have their natural padding -
  // measuring the trimmed row would shrink it again on every pass.
  const onGroupLayout = useCallback(
    (index: number) => (event: LayoutChangeEvent) => {
      if (paddingRef.current !== basePadding) {
        return;
      }
      groupWidthsRef.current[index] = event.nativeEvent.layout.width;
      fit();
    },
    [basePadding, fit]
  );

  return { padding, onRowLayout, onGroupLayout };
}

interface IEditProgramNavbarProps {
  state: IPlannerState;
  originalProgram: IProgram;
  settings: ISettings;
  evaluatedWeeks?: IPlannerEvalResult[][];
  dispatch: IDispatch;
  plannerDispatch: ILensDispatch<IPlannerState>;
}

export const EditProgramNavbar = memo(function EditProgramNavbar(props: IEditProgramNavbarProps): JSX.Element {
  const isValidFull = !props.state.ui.fullTextError;
  const planner = props.state.current.program.planner!;
  const evaluatedWeeks = useMemo(
    () => props.evaluatedWeeks ?? PlannerProgram_evaluate(planner, props.settings).evaluatedWeeks,
    [props.evaluatedWeeks, planner, props.settings]
  );
  const isValidPerDay = evaluatedWeeks.every((week) => week.every((day) => day.success)) ?? true;
  const isValid = isValidFull && isValidPerDay;
  const { padding, onRowLayout, onGroupLayout } = useToolbarPadding();

  return (
    <View className="py-2 pl-2 pr-4 border-b bg-background-default border-background-subtle" style={{ zIndex: 25 }}>
      <View className="flex-row items-center justify-between" onLayout={onRowLayout}>
        <View className="flex-row items-center" onLayout={onGroupLayout(0)}>
          <Pressable
            className="py-2 nm-program-undo"
            style={{ paddingHorizontal: padding }}
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
            className="py-2 nm-program-redo"
            style={{ paddingHorizontal: padding }}
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
        <View className="flex-row items-center" onLayout={onGroupLayout(1)}>
          <EditProgramModeSwitchButton
            padding={padding}
            isSelected={props.state.ui.mode === "grid"}
            disabled={!isValid}
            name="editor-v2-grid-program"
            onClick={() => {
              props.dispatch(Thunk_log("ls-program-mode-grid"));
              props.plannerDispatch([lb<IPlannerState>().p("ui").p("mode").record("grid")], "Switch to grid mode");
            }}
          >
            {(color) => <IconCalendarSmall color={color} size={20} />}
          </EditProgramModeSwitchButton>
          <EditProgramModeSwitchButton
            padding={padding}
            isSelected={props.state.ui.mode === "reorder"}
            disabled={!isValid}
            name="editor-v2-reorder-program"
            onClick={() => {
              props.dispatch(Thunk_log("ls-program-mode-reorder"));
              props.plannerDispatch(
                [lb<IPlannerState>().p("ui").p("mode").record("reorder")],
                "Switch to reorder mode"
              );
            }}
          >
            {(color) => <IconReorder color={color} />}
          </EditProgramModeSwitchButton>
          <EditProgramModeSwitchButton
            padding={padding}
            isSelected={props.state.ui.mode === "ui"}
            name="editor-v2-ui-program"
            disabled={!isValid}
            onClick={() => {
              props.dispatch(Thunk_log("ls-program-mode-ui"));
              props.plannerDispatch([lb<IPlannerState>().p("ui").p("mode").record("ui")], "Switch to UI mode");
            }}
          >
            {(color) => <IconUiMode color={color} />}
          </EditProgramModeSwitchButton>
          <EditProgramModeSwitchButton
            padding={padding}
            isSelected={props.state.ui.mode === "perday"}
            name="editor-v2-perday-program"
            onClick={() => {
              props.dispatch(Thunk_log("ls-program-mode-perday"));
              props.plannerDispatch([lb<IPlannerState>().p("ui").p("mode").record("perday")], "Switch to per-day mode");
            }}
          >
            {(color) => <IconDayTextMode color={color} />}
          </EditProgramModeSwitchButton>
          <EditProgramModeSwitchButton
            padding={padding}
            isSelected={props.state.ui.mode === "full"}
            name="editor-v2-full-program"
            onClick={() => {
              props.dispatch(Thunk_log("ls-program-mode-full"));
              props.plannerDispatch([lb<IPlannerState>().p("ui").p("mode").record("full")], "Switch to full text mode");
            }}
          >
            {(color) => <IconFullTextMode color={color} />}
          </EditProgramModeSwitchButton>
        </View>
        <View className="flex-row items-center" onLayout={onGroupLayout(2)}>
          <Button
            sticky
            className="ls-program-save"
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
    </View>
  );
});

interface IEditProgramModeSwitchButtonProps {
  isSelected: boolean;
  name: string;
  disabled?: boolean;
  padding: number;
  children: (color: string) => JSX.Element;
  onClick: () => void;
}

const EditProgramModeSwitchButton = memo(function EditProgramModeSwitchButton(
  props: IEditProgramModeSwitchButtonProps
): JSX.Element {
  const isSelected = props.isSelected;
  return (
    <Pressable
      data-testid={props.name}
      testID={props.name}
      className={`py-2 ${isSelected ? "bg-purplev3-200" : ""} rounded nm-${props.name}`}
      style={{ opacity: props.disabled && !isSelected ? 0.5 : 1, paddingHorizontal: props.padding }}
      onPress={() => {
        if (!props.disabled && !isSelected) {
          props.onClick();
        }
      }}
    >
      {props.children(isSelected ? Tailwind_semantic().icon.purple : Tailwind_semantic().icon.neutral)}
    </Pressable>
  );
});
