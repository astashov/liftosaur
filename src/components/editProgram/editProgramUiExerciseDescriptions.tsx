import { JSX, h, Fragment } from "preact";
import { PlannerProgramExercise } from "../../pages/planner/models/plannerProgramExercise";
import { IPlannerProgramExercise } from "../../pages/planner/models/types";
import { GroupHeader } from "../groupHeader";
import { IconArrowDown3 } from "../icons/iconArrowDown3";
import { ISettings } from "../../types";
import { Markdown } from "../markdown";

interface IEditProgramUiExerciseDescriptionsProps {
  plannerExercise: IPlannerProgramExercise;
  settings: ISettings;
}

export function EditProgramUiExerciseDescriptions(props: IEditProgramUiExerciseDescriptionsProps): JSX.Element {
  const { plannerExercise } = props;
  const descriptions = plannerExercise.descriptions.values;
  const currentIndex = PlannerProgramExercise.currentDescriptionIndex(plannerExercise);

  if (descriptions.length === 0) {
    return <></>;
  }

  return (
    <>
      {descriptions.map((_, i) => {
        return (
          <div className={`${i > 0 ? "mt-2 pt-2" : ""}`}>
            <div>
              {descriptions.length > 1 && (
                <GroupHeader
                  highlighted={true}
                  name={`Description ${i + 1}`}
                  nameAddOn={
                    currentIndex === i ? (
                      <IconArrowDown3 size={14} className="ml-2" style={{ transform: "rotate(90deg)" }} />
                    ) : undefined
                  }
                />
              )}
            </div>
            <div>
              <div className="flex">
                <div>
                  <Markdown
                    className="text-xs markdown"
                    truncate={2}
                    value={plannerExercise.descriptions.values[i].value}
                  />
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
}
