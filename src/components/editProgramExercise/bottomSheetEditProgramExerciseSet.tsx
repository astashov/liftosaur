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
import { Weight_build } from "../../models/weight";

interface IBottomSheetEditProgramExerciseSetProps {
  ui: IPlannerExerciseUi;
  evaluatedProgram: IEvaluatedProgram;
  plannerDispatch: ILensDispatch<IPlannerExerciseState>;
  settings: ISettings;
}

export function BottomSheetEditProgramExerciseSet(props: IBottomSheetEditProgramExerciseSetProps): JSX.Element {
  const lbUi = lb<IPlannerExerciseState>().pi("ui");
  function onClose(): void {
    props.plannerDispatch(lbUi.p("editSetBottomSheet").record(undefined), "Close edit set sheet");
  }
  const editSetBottomSheet = props.ui.editSetBottomSheet;
  const weekIndex = props.ui.weekIndex;
  const { setVariationIndex, setIndex, dayInWeekIndex } = editSetBottomSheet ?? {
    setVariationIndex: 0,
    setIndex: 0,
    dayInWeekIndex: 0,
  };
  const exercise = props.evaluatedProgram.weeks[weekIndex]?.days[dayInWeekIndex]?.exercises.find(
    (e) => e.key === editSetBottomSheet?.exerciseKey
  );
  const set = exercise?.evaluatedSetVariations[setVariationIndex]?.sets[setIndex];
  const lbProgram = lb<IPlannerExerciseState>().p("current").p("program").pi("planner");
  const plannerExercise = props.evaluatedProgram.weeks[weekIndex]?.days[dayInWeekIndex]?.exercises.find(
    (e) => e.key === editSetBottomSheet?.exerciseKey
  );

  function changeSet(cb: (s: IPlannerProgramExerciseEvaluatedSet) => void): void {
    if (!plannerExercise) {
      return;
    }
    props.plannerDispatch(
      lbProgram.recordModify((program) => {
        return EditProgramUiHelpers.changeCurrentInstance2(program, plannerExercise, props.settings, true, (ex) => {
          const setVariation = ex.evaluatedSetVariations[setVariationIndex];
          const s = setVariation.sets[setIndex];
          cb(s);
        });
      }),
      "Update set"
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
                changeSet((s) => {
                  s.label = value;
                });
              }}
            />
            <MenuItemEditable
              type="boolean"
              name="Reps Range"
              value={set.minrep != null ? "true" : "false"}
              onChange={(value) => {
                changeSet((s) => {
                  if (value === "true") {
                    s.minrep = Math.min(s.maxrep ?? 5, s.minrep ?? 3);
                  } else {
                    s.minrep = undefined;
                  }
                });
              }}
            />
            <MenuItemEditable
              type="boolean"
              name="Weight"
              value={set.weight != null ? "true" : "false"}
              onChange={(value) => {
                changeSet((s) => {
                  if (value === "true") {
                    s.weight = s.weight ?? Weight_build(0, props.settings.units);
                  } else {
                    s.weight = undefined;
                  }
                });
              }}
            />
            <MenuItemEditable
              type="boolean"
              name="RPE"
              value={set.rpe != null ? "true" : "false"}
              onChange={(value) => {
                changeSet((s) => {
                  if (value === "true") {
                    s.rpe = s.rpe ?? 8;
                  } else {
                    s.rpe = undefined;
                  }
                });
              }}
            />
            <MenuItemEditable
              type="boolean"
              name="Timer"
              value={set.timer != null ? "true" : "false"}
              onChange={(value) => {
                changeSet((s) => {
                  if (value === "true") {
                    s.timer = s.timer ?? 120;
                  } else {
                    s.timer = undefined;
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
