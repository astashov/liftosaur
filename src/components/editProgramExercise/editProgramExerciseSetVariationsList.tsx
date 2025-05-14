import { h, JSX } from "preact";
import { IPlannerExerciseState, IPlannerExerciseUi, IPlannerProgramExercise } from "../../pages/planner/models/types";
import { ISettings } from "../../types";
import { ILensDispatch } from "../../utils/useLensReducer";
import { IconArrowDown3 } from "../icons/iconArrowDown3";
import { Tailwind } from "../../utils/tailwindConfig";
import { EditProgramExerciseSetVariation } from "./editProgramExerciseSetVariation";

interface IEditProgramExerciseSetVariationsListProps {
  plannerExercise: IPlannerProgramExercise;
  plannerDispatch: ILensDispatch<IPlannerExerciseState>;
  ui: IPlannerExerciseUi;
  settings: ISettings;
}

export function EditProgramExerciseSetVariationsList(props: IEditProgramExerciseSetVariationsListProps): JSX.Element {
  const setVariations = props.plannerExercise.evaluatedSetVariations;

  return (
    <div>
      {setVariations.length > 1 && (
        <div className="flex items-center gap-4 pt-3 mx-4 mt-1 mb-2 border-t border-grayv3-200">
          <div className="flex-1">Set Variations</div>
          <div className="flex items-center gap-1">
            <button className="p-2 border rounded-full border-grayv3-200">
              <IconArrowDown3 className="rotate-90" color={Tailwind.colors().grayv3.main} size={16} />
            </button>
            <button className="p-2 border rounded-full border-grayv3-200">
              <IconArrowDown3 className="-rotate-90" color={Tailwind.colors().grayv3.main} size={16} />
            </button>
          </div>
        </div>
      )}
      <div
        className="flex overflow-x-scroll overflow-y-hidden"
        id="set-variations-scroller"
        onScroll={() => {}}
        style={{
          WebkitOverflowScrolling: "touch",
          scrollSnapType: "x mandatory",
        }}
      >
        {setVariations.map((setVariation, index) => {
          return (
            <div key={index} style={{ minWidth: "100vw", scrollSnapAlign: "center", scrollSnapStop: "always" }}>
              <EditProgramExerciseSetVariation
                name={setVariations.length > 1 ? `Set Variation ${index + 1}` : "Working Sets"}
                setVariation={setVariation}
                setVariationIndex={index}
                ui={props.ui}
                plannerExercise={props.plannerExercise}
                plannerDispatch={props.plannerDispatch}
                settings={props.settings}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
