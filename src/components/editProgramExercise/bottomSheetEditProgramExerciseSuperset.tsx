import { h, JSX, Fragment } from "preact";
import { IEvaluatedProgram, Program_getSupersetGroups } from "../../models/program";
import { IPlannerProgramExercise } from "../../pages/planner/models/types";
import { BottomSheet } from "../bottomSheet";
import { ISettings } from "../../types";
import { ObjectUtils_entriesNonnull } from "../../utils/object";
import { Button } from "../button";
import { useState } from "preact/hooks";
import { ModalNewSupersetGroup } from "../modalNewSupersetGroup";
import { StringUtils_dashcase } from "../../utils/string";

interface IBottomSheetEditProgramExerciseSupersetProps {
  onSelect: (name: string | undefined) => void;
  plannerExercise: IPlannerProgramExercise;
  evaluatedProgram: IEvaluatedProgram;
  settings: ISettings;
  isHidden: boolean;
  onClose: () => void;
}

export function BottomSheetEditProgramExerciseSuperset(
  props: IBottomSheetEditProgramExerciseSupersetProps
): JSX.Element {
  const supersetGroups = Program_getSupersetGroups(props.evaluatedProgram, props.plannerExercise.dayData);
  const [newGroupModal, setNewGroupModal] = useState(false);

  return (
    <>
      <BottomSheet isHidden={props.isHidden} onClose={props.onClose} shouldShowClose={true}>
        <div className="flex flex-col h-full" style={{ marginTop: "-0.75rem" }}>
          <div className="relative py-2 mt-2">
            <h3 className="text-lg font-semibold text-center">Select Superset Group</h3>
          </div>
          <div className="flex-1 pb-4 overflow-y-auto">
            <button
              key="none"
              data-cy={`superset-group-none`}
              className={`text-left block w-full font-bold ${props.plannerExercise.superset == null ? "bg-background-cardpurple" : ""} gap-2 px-4 py-1 border-b border-border-neutral min-h-12`}
              onClick={() => {
                props.onSelect(undefined);
              }}
            >
              None
            </button>
            {ObjectUtils_entriesNonnull(supersetGroups).map(([name, plannerExercises]) => {
              const isSelected = props.plannerExercise.superset?.name === name;
              return (
                <button
                  key={name}
                  data-cy={`superset-group-${StringUtils_dashcase(name)}`}
                  className={`text-left block w-full items-center ${isSelected ? "bg-background-cardpurple" : ""} gap-2 px-4 py-1 border-b border-border-neutral min-h-12`}
                  onClick={() => {
                    props.onSelect(name);
                  }}
                >
                  <div>
                    <div className="text-base font-bold">{name}</div>
                    {plannerExercises.length > 0 && (
                      <div className="text-xs text-text-secondary">
                        {plannerExercises.map((e, i) => {
                          return (
                            <>
                              {i !== 0 ? ", " : ""}
                              <strong>{e.fullName}</strong>
                            </>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
          <div className="w-full px-4 pt-2 pb-2" style={{ boxShadow: "0 -4px 4px 0 rgba(0, 0, 0, 0.05)" }}>
            <Button
              className="w-full"
              name="superset-create-group"
              kind="purple"
              buttonSize="lg"
              onClick={() => setNewGroupModal(true)}
              data-cy="superset-create-group"
            >
              Create New Group
            </Button>
          </div>
        </div>
      </BottomSheet>
      {newGroupModal && (
        <ModalNewSupersetGroup
          onSelect={(name) => {
            props.onSelect(name);
          }}
          onClose={() => setNewGroupModal(false)}
        />
      )}
    </>
  );
}
