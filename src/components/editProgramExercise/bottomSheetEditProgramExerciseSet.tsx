import { h, JSX } from "preact";
import {
  IPlannerExerciseState,
  IPlannerExerciseUi,
  IPlannerProgramExerciseEvaluatedSet,
} from "../../pages/planner/models/types";
import { ISettings } from "../../types";
import { ILensDispatch } from "../../utils/useLensReducer";
import { lb } from "lens-shmens";
import { BottomSheet } from "../bottomSheet";
import { MenuItemEditable } from "../menuItemEditable";
import { IEvaluatedProgram } from "../../models/program";
import { EditProgramUiHelpers } from "../editProgram/editProgramUi/editProgramUiHelpers";
import { Weight } from "../../models/weight";

interface IBottomSheetEditProgramExerciseSetProps {
  ui: IPlannerExerciseUi;
  evaluatedProgram: IEvaluatedProgram;
  plannerDispatch: ILensDispatch<IPlannerExerciseState>;
  settings: ISettings;
}

export function BottomSheetEditProgramExerciseSet(props: IBottomSheetEditProgramExerciseSetProps): JSX.Element {
  const lbUi = lb<IPlannerExerciseState>().pi("ui");
  function onClose(): void {
    props.plannerDispatch(lbUi.p("editSetBottomSheet").record(undefined));
  }
  const editSetBottomSheet = props.ui.editSetBottomSheet;
  const weekIndex = props.ui.weekIndex;
  const { setVariationIndex, setIndex, dayInWeekIndex } = editSetBottomSheet ?? {
    setVariationIndex: 0,
    setIndex: 0,
    dayInWeekIndex: 0,
  };
  const set =
    props.evaluatedProgram.weeks[weekIndex]?.days[dayInWeekIndex]?.exercises[setVariationIndex]?.evaluatedSetVariations[
      setVariationIndex
    ]?.sets[setIndex];
  const lbProgram = lb<IPlannerExerciseState>().p("current").p("program").pi("planner");
  const plannerExercise = props.evaluatedProgram.weeks[weekIndex]?.days[dayInWeekIndex]?.exercises.find(
    (e) => e.key === editSetBottomSheet?.exerciseKey
  );

  function changeSet(cb: (set: IPlannerProgramExerciseEvaluatedSet) => void): void {
    if (!plannerExercise) return;
    props.plannerDispatch(
      lbProgram.recordModify((program) => {
        return EditProgramUiHelpers.changeCurrentInstance2(
          program,
          plannerExercise,
          plannerExercise.dayData,
          props.settings,
          true,
          (ex) => {
            const setVariation = ex.evaluatedSetVariations[setVariationIndex];
            const set = setVariation.sets[setIndex];
            cb(set);
          }
        );
      })
    );
  }

  return (
    <BottomSheet isHidden={!props.ui.editSetBottomSheet} onClose={onClose} shouldShowClose={true}>
      {set && (
        <div>
          <h3 className="px-4 pt-1 text-base font-bold">Edit Set</h3>
          <div className="px-4 py-2">
            <MenuItemEditable
              type="text"
              name="Label"
              value={set.label}
              maxLength={8}
              onChange={(value) => {
                changeSet((set) => {
                  set.label = value;
                });
              }}
            />
            <MenuItemEditable
              type="boolean"
              name="Reps Range"
              value={set.minrep != null ? "true" : "false"}
              onChange={(value) => {
                changeSet((set) => {
                  if (value === "true") {
                    set.minrep = Math.min(set.maxrep ?? 5, set.minrep ?? 3);
                  } else {
                    set.minrep = undefined;
                  }
                });
              }}
            />
            <MenuItemEditable
              type="boolean"
              name="Weight"
              value={set.weight != null ? "true" : "false"}
              onChange={(value) => {
                changeSet((set) => {
                  if (value === "true") {
                    set.weight = set.weight ?? Weight.build(0, props.settings.units);
                  } else {
                    set.weight = undefined;
                  }
                });
              }}
            />
            <MenuItemEditable
              type="boolean"
              name="RPE"
              value={set.rpe != null ? "true" : "false"}
              onChange={(value) => {
                changeSet((set) => {
                  if (value === "true") {
                    set.rpe = set.rpe ?? 8;
                  } else {
                    set.rpe = undefined;
                  }
                });
              }}
            />
            <MenuItemEditable
              type="boolean"
              name="Timer"
              value={set.timer != null ? "true" : "false"}
              onChange={(value) => {
                changeSet((set) => {
                  if (value === "true") {
                    set.timer = set.timer ?? 120;
                  } else {
                    set.timer = undefined;
                  }
                });
              }}
            />
          </div>
        </div>
      )}
    </BottomSheet>
  );
}
