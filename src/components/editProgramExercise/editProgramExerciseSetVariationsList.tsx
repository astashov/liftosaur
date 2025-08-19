import { h, JSX } from "preact";
import { IPlannerExerciseState, IPlannerExerciseUi, IPlannerProgramExercise } from "../../pages/planner/models/types";
import { ISettings } from "../../types";
import { ILensDispatch } from "../../utils/useLensReducer";
import { IconArrowDown3 } from "../icons/iconArrowDown3";
import { Tailwind } from "../../utils/tailwindConfig";
import { EditProgramExerciseSetVariation } from "./editProgramExerciseSetVariation";
import { IconPlus2 } from "../icons/iconPlus2";
import { EditProgramUiHelpers } from "../editProgram/editProgramUi/editProgramUiHelpers";
import { ObjectUtils } from "../../utils/object";
import { useRef } from "preact/hooks";

interface IEditProgramExerciseSetVariationsListProps {
  plannerExercise: IPlannerProgramExercise;
  plannerDispatch: ILensDispatch<IPlannerExerciseState>;
  ui: IPlannerExerciseUi;
  settings: ISettings;
}

export function EditProgramExerciseSetVariationsList(props: IEditProgramExerciseSetVariationsListProps): JSX.Element {
  const setVariations = props.plannerExercise.evaluatedSetVariations;
  const scrollRef = useRef<HTMLDivElement>();

  return (
    <div>
      {setVariations.length > 1 && (
        <div className="flex items-center gap-4 pt-3 mx-4 mt-1 mb-2 border-t border-border-neutral">
          <div className="flex-1">{setVariations.length} Set Variations</div>
          <div className="flex items-center gap-1">
            <button
              data-cy="set-variations-add"
              className="p-1 mr-4 border rounded-full border-border-neutral"
              onClick={() => {
                return EditProgramUiHelpers.changeCurrentInstanceExercise(
                  props.plannerDispatch,
                  props.plannerExercise,
                  props.settings,
                  (ex) => {
                    const lastSetVariation = ObjectUtils.clone(
                      ex.evaluatedSetVariations[ex.evaluatedSetVariations.length - 1]
                    );
                    ex.evaluatedSetVariations.push(lastSetVariation);
                  }
                );
              }}
            >
              <IconPlus2 color={Tailwind.colors().lightgray[600]} size={14} />
            </button>
            <button
              className="p-1 border rounded-full border-border-neutral"
              data-cy="set-variations-scroll-left"
              onClick={() => {
                scrollRef.current.scrollTo({
                  left: scrollRef.current.scrollLeft - scrollRef.current.clientWidth,
                  behavior: "smooth",
                });
              }}
            >
              <IconArrowDown3 className="rotate-90" color={Tailwind.colors().lightgray[600]} size={14} />
            </button>
            <button
              data-cy="set-variations-scroll-right"
              className="p-1 border rounded-full border-border-neutral"
              onClick={() => {
                scrollRef.current.scrollTo({
                  left: scrollRef.current.scrollLeft + scrollRef.current.clientWidth,
                  behavior: "smooth",
                });
              }}
            >
              <IconArrowDown3 className="-rotate-90" color={Tailwind.colors().lightgray[600]} size={14} />
            </button>
          </div>
        </div>
      )}
      <div
        className="flex overflow-x-scroll overflow-y-hidden parent-scroller"
        onScroll={() => {}}
        ref={scrollRef}
        style={{
          WebkitOverflowScrolling: "touch",
          scrollSnapType: "x mandatory",
        }}
      >
        {setVariations.map((setVariation, index) => {
          return (
            <div
              key={index}
              data-cy={`set-variation-${index + 1}`}
              style={{ minWidth: "calc(-4px + 100vw)", scrollSnapAlign: "center", scrollSnapStop: "always" }}
            >
              <EditProgramExerciseSetVariation
                areSetVariationsEnabled={setVariations.length > 1}
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
