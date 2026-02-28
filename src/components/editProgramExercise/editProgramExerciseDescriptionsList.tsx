import { h, JSX, Fragment } from "preact";
import { IPlannerExerciseState, IPlannerProgramExercise } from "../../pages/planner/models/types";
import { ISettings } from "../../types";
import { ILensDispatch } from "../../utils/useLensReducer";
import { IconArrowDown3 } from "../icons/iconArrowDown3";
import { Tailwind_colors } from "../../utils/tailwindConfig";
import { IconPlus2 } from "../icons/iconPlus2";
import { EditProgramUiHelpers_changeCurrentInstanceExercise } from "../editProgram/editProgramUi/editProgramUiHelpers";
import { useRef } from "preact/hooks";
import { EditProgramExerciseDescription } from "./editProgramExerciseDescription";

interface IEditProgramExerciseDescriptionsListProps {
  plannerExercise: IPlannerProgramExercise;
  plannerDispatch: ILensDispatch<IPlannerExerciseState>;
  settings: ISettings;
}

export function EditProgramExerciseDescriptionsList(props: IEditProgramExerciseDescriptionsListProps): JSX.Element {
  const descriptions = props.plannerExercise.descriptions;
  const scrollRef = useRef<HTMLDivElement>();
  const isMultiple = descriptions.values.length > 1;

  return (
    <div>
      <div className="flex items-center gap-4 pt-3 mx-4 mt-1 mb-2 border-t border-border-neutral">
        <div className="flex-1">
          {descriptions.values.length === 1 ? "Description" : `${descriptions.values.length} Descriptions`}
        </div>
        <div className="flex items-center gap-1">
          <button
            className="p-1 border rounded-full border-border-neutral"
            onClick={() => {
              return EditProgramUiHelpers_changeCurrentInstanceExercise(
                props.plannerDispatch,
                props.plannerExercise,
                props.settings,
                (ex) => {
                  ex.descriptions.values.push({ isCurrent: false, value: "" });
                }
              );
            }}
          >
            <IconPlus2 color={Tailwind_colors().lightgray[600]} size={14} />
          </button>
          {isMultiple && (
            <>
              <button
                className="p-1 ml-4 border rounded-full border-border-neutral"
                onClick={() => {
                  scrollRef.current.scrollTo({
                    left: scrollRef.current.scrollLeft - scrollRef.current.clientWidth,
                    behavior: "smooth",
                  });
                }}
              >
                <IconArrowDown3 className="rotate-90" color={Tailwind_colors().lightgray[600]} size={14} />
              </button>
              <button
                className="p-1 border rounded-full border-border-neutral"
                onClick={() => {
                  scrollRef.current.scrollTo({
                    left: scrollRef.current.scrollLeft + scrollRef.current.clientWidth,
                    behavior: "smooth",
                  });
                }}
              >
                <IconArrowDown3 className="-rotate-90" color={Tailwind_colors().lightgray[600]} size={14} />
              </button>
            </>
          )}
        </div>
      </div>
      <div
        className="flex mb-6 overflow-x-scroll overflow-y-hidden parent-scroller"
        onScroll={() => {}}
        ref={scrollRef}
        style={{
          WebkitOverflowScrolling: "touch",
          scrollSnapType: "x mandatory",
        }}
      >
        {descriptions.values.map((description, index) => {
          return (
            <div
              key={index}
              style={{ minWidth: "calc(-4px + 100vw)", scrollSnapAlign: "center", scrollSnapStop: "always" }}
            >
              <EditProgramExerciseDescription
                isMultiple={isMultiple}
                description={description}
                descriptionIndex={index}
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
