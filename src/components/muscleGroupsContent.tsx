import { JSX, h, Fragment } from "preact";
import { useState } from "preact/hooks";
import { Muscle } from "../models/muscle";
import { IMuscle, IScreenMuscle, ISettings } from "../types";
import { CollectionUtils } from "../utils/collection";
import { IconEdit2 } from "./icons/iconEdit2";
import { IconEyeClosed } from "./icons/iconEyeClosed";
import { IconTrash } from "./icons/iconTrash";
import { LinkButton } from "./linkButton";
import { MenuItemWrapper } from "./menuItem";
import { MuscleGroupImage } from "./muscleGroupImage";
import { Button } from "./button";
import { GroupHeader } from "./groupHeader";
import { Input2 } from "./input2";
import { Modal } from "./modal";
import { BottomSheetMuscleGroupMusclePicker } from "./bottomSheetMuscleGroupMusclePicker";
import { StringUtils } from "../utils/string";

interface IProps {
  settings: ISettings;
  onCreate: (name: string) => void;
  onDelete: (muscleGroup: IScreenMuscle) => void;
  onUpdate: (muscleGroup: IScreenMuscle, muscles: IMuscle[]) => void;
  onRestore: (muscleGroup: IScreenMuscle) => void;
}

export function MuscleGroupsContent(props: IProps): JSX.Element {
  const visibleMuscleGroups = Muscle.getAvailableMuscleGroups(props.settings);
  const hiddenMuscleGroups = Muscle.getHiddenMuscleGroups(props.settings);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showMusclePicker, setShowMusclePicker] = useState<IScreenMuscle | undefined>(undefined);
  const [name, setName] = useState("");
  return (
    <div>
      {visibleMuscleGroups.map((muscleGroup) => {
        const muscleGroupName = Muscle.getMuscleGroupName(muscleGroup, props.settings);
        const muscleGroupSlug = StringUtils.dashcase(muscleGroupName);
        const isBuiltin = Muscle.isBuiltInMuscleGroup(muscleGroup);
        return (
          <MenuItemWrapper name={`muscle-group-${muscleGroup}`}>
            <div className="flex items-center gap-4">
              <div className="w-12">
                <MuscleGroupImage muscleGroup={muscleGroup} size={48} />
              </div>
              <div className="flex-1 py-2">
                <div className="text-base font-bold">{muscleGroupName}</div>
                <div className="text-xs text-text-secondary">
                  {CollectionUtils.sort(Muscle.getMusclesFromScreenMuscle(muscleGroup, props.settings), (a, b) =>
                    a.localeCompare(b)
                  ).join(", ")}
                </div>
              </div>
              <div className="flex">
                <div>
                  <button
                    className="p-2"
                    data-cy={`edit-muscle-group-${muscleGroupSlug}`}
                    onClick={() => {
                      setShowMusclePicker(muscleGroup);
                    }}
                  >
                    <IconEdit2 />
                  </button>
                </div>
                <div>
                  <button
                    className="p-2"
                    data-cy={`delete-muscle-group-${muscleGroupSlug}`}
                    onClick={() => {
                      props.onDelete(muscleGroup);
                    }}
                  >
                    {isBuiltin ? <IconEyeClosed /> : <IconTrash />}
                  </button>
                </div>
              </div>
            </div>
          </MenuItemWrapper>
        );
      })}
      <div className="pb-4">
        <LinkButton
          name="add-muscle-group"
          data-cy="add-muscle-group"
          className="text-sm"
          onClick={() => {
            setShowCreateModal(true);
          }}
        >
          Add custom muscle group
        </LinkButton>
      </div>
      {hiddenMuscleGroups.length > 0 && (
        <div className="pb-6 text-xs text-text-secondary">
          <span>Unhide muscle groups: </span>
          {hiddenMuscleGroups.map((muscleGroup, i) => {
            const muscleGroupName = Muscle.getMuscleGroupName(muscleGroup, props.settings);
            const muscleGroupSlug = StringUtils.dashcase(muscleGroupName);
            return (
              <>
                {i !== 0 ? ", " : ""}
                <LinkButton
                  data-cy={`unhide-muscle-group-${muscleGroupSlug}`}
                  name="unhide-muscle-group"
                  onClick={() => props.onRestore(muscleGroup)}
                >
                  {muscleGroupName}
                </LinkButton>
              </>
            );
          })}
        </div>
      )}
      {showMusclePicker && (
        <BottomSheetMuscleGroupMusclePicker
          settings={props.settings}
          muscleGroup={showMusclePicker}
          onClose={() => setShowMusclePicker(undefined)}
          onSelect={(muscle) => {
            const existingMuscles = Muscle.getMusclesFromScreenMuscle(showMusclePicker, props.settings);
            const newMuscles = existingMuscles.includes(muscle)
              ? CollectionUtils.remove(existingMuscles, muscle)
              : [...existingMuscles, muscle];
            props.onUpdate(showMusclePicker, newMuscles);
          }}
        />
      )}
      {showCreateModal && (
        <Modal zIndex={60} onClose={() => setShowCreateModal(false)} isHidden={false}>
          <GroupHeader size="large" name="Enter new group name" />
          <form onSubmit={(e) => e.preventDefault()}>
            <Input2
              identifier="muscle-group-input"
              data-cy="muscle-group-input"
              onInput={(event) => {
                setName(event.currentTarget.value);
              }}
              label="Name"
              required
              requiredMessage="Name cannot be empty"
              type="text"
              placeholder="My Group Name"
            />
            <div className="mt-4 text-right">
              <Button
                name="modal-new-muscle-group-cancel"
                data-cy="modal-new-muscle-group-cancel"
                type="button"
                kind="grayv2"
                className="mr-3"
                onClick={() => setShowCreateModal(false)}
              >
                Cancel
              </Button>
              <Button
                kind="purple"
                name="modal-new-muscle-group-submit"
                data-cy="modal-new-muscle-group-submit"
                type="submit"
                disabled={!name.trim()}
                className="ls-add-muscle-group"
                onClick={() => {
                  if (name.trim() !== "") {
                    props.onCreate(name.trim());
                    setShowCreateModal(false);
                  }
                }}
              >
                Add
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
