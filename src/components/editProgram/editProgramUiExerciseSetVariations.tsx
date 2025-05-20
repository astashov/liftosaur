import { JSX, h, Fragment } from "preact";
import { PlannerProgramExercise } from "../../pages/planner/models/plannerProgramExercise";
import { IPlannerProgramExercise } from "../../pages/planner/models/types";
import { GroupHeader } from "../groupHeader";
import { HistoryRecordSet } from "../historyRecordSets";
import { IconArrowDown3 } from "../icons/iconArrowDown3";
import { ISettings } from "../../types";

interface IEditProgramUiExerciseSetVariationsProps {
  isCurrentIndicatorNearby?: boolean;
  plannerExercise: IPlannerProgramExercise;
  settings: ISettings;
}

export function EditProgramUiExerciseSetVariations(props: IEditProgramUiExerciseSetVariationsProps): JSX.Element {
  const { plannerExercise } = props;
  const setVariations = PlannerProgramExercise.setVariations(plannerExercise);
  return (
    <>
      {setVariations.map((_, i) => {
        const sets = PlannerProgramExercise.sets(plannerExercise, i);
        const hasCurrentSets = !!plannerExercise.setVariations[i]?.sets;
        const globals = plannerExercise.globals;
        const displayGroups = PlannerProgramExercise.setsToDisplaySets(sets, hasCurrentSets, globals, props.settings);
        let currentIndex = setVariations.findIndex((v) => v.isCurrent);
        currentIndex = currentIndex === -1 ? 0 : currentIndex;
        return (
          <div className={`${i > 0 ? "mt-2 pt-2 border-t border-grayv3-200" : ""}`}>
            <div>
              {setVariations.length > 1 && (
                <GroupHeader
                  highlighted={true}
                  name={`Set Variation ${i + 1}`}
                  nameAddOn={
                    props.isCurrentIndicatorNearby && currentIndex === i ? (
                      <IconArrowDown3 size={14} className="ml-2" style={{ transform: "rotate(90deg)" }} />
                    ) : undefined
                  }
                  rightAddOn={
                    !props.isCurrentIndicatorNearby && currentIndex === i ? (
                      <IconArrowDown3 size={14} className="ml-2" style={{ transform: "rotate(90deg)" }} />
                    ) : undefined
                  }
                />
              )}
            </div>
            <div className="text-right">
              <div className="flex">
                <div>
                  {displayGroups.map((g) => (
                    <HistoryRecordSet sets={g} isNext={true} settings={props.settings} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
}
