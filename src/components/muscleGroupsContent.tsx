import { JSX, Fragment, useState } from "react";
import {
  Muscle_getAvailableMuscleGroups,
  Muscle_getHiddenMuscleGroups,
  Muscle_getMuscleGroupName,
  Muscle_isBuiltInMuscleGroup,
  Muscle_getMusclesFromScreenMuscle,
} from "../models/muscle";
import { IMuscle, IScreenMuscle, ISettings } from "../types";
import { CollectionUtils_sort, CollectionUtils_remove } from "../utils/collection";
import { IconEdit2 } from "./icons/iconEdit2";
import { IconEyeClosed } from "./icons/iconEyeClosed";
import { IconTrash } from "./icons/iconTrash";
import { LinkButton } from "./linkButton";
import { MenuItemWrapper } from "./menuItem";
import { MuscleGroupImage } from "./muscleGroupImage";
import { BottomSheetMuscleGroupMusclePicker } from "./bottomSheetMuscleGroupMusclePicker";
import { StringUtils_dashcase } from "../utils/string";
import { useModalDispatch, useModalResult, Modal_open } from "../navigation/ModalStateContext";
import { getNavigationRef } from "../navigation/navUtils";

interface IProps {
  settings: ISettings;
  useInlineModals?: boolean;
  onCreate: (name: string) => void;
  onDelete: (muscleGroup: IScreenMuscle) => void;
  onUpdate?: (muscleGroup: IScreenMuscle, muscles: IMuscle[]) => void;
  onRestore: (muscleGroup: IScreenMuscle) => void;
}

export function MuscleGroupsContent(props: IProps): JSX.Element {
  const visibleMuscleGroups = Muscle_getAvailableMuscleGroups(props.settings);
  const hiddenMuscleGroups = Muscle_getHiddenMuscleGroups(props.settings);
  const [showMusclePicker, setShowMusclePicker] = useState<IScreenMuscle | undefined>(undefined);
  const modalDispatch = useModalDispatch();

  useModalResult("textInputModal", (name) => {
    props.onCreate(name);
  });
  return (
    <div>
      {visibleMuscleGroups.map((muscleGroup) => {
        const muscleGroupName = Muscle_getMuscleGroupName(muscleGroup, props.settings);
        const muscleGroupSlug = StringUtils_dashcase(muscleGroupName);
        const isBuiltin = Muscle_isBuiltInMuscleGroup(muscleGroup);
        return (
          <MenuItemWrapper key={muscleGroup} name={`muscle-group-${muscleGroup}`}>
            <div className="flex items-center gap-4">
              <div className="w-12">
                <MuscleGroupImage muscleGroup={muscleGroup} size={48} />
              </div>
              <div className="flex-1 py-2">
                <div className="text-base font-bold">{muscleGroupName}</div>
                <div className="text-xs text-text-secondary">
                  {CollectionUtils_sort(Muscle_getMusclesFromScreenMuscle(muscleGroup, props.settings), (a, b) =>
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
                      if (props.useInlineModals) {
                        setShowMusclePicker(muscleGroup);
                      } else {
                        getNavigationRef().then(({ navigationRef: ref }) =>
                          ref.navigate("muscleGroupMusclePickerModal", { muscleGroup })
                        );
                      }
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
            Modal_open(modalDispatch, "textInputModal", {
              title: "Enter new group name",
              inputLabel: "Name",
              placeholder: "My Group Name",
              submitLabel: "Add",
              dataCyPrefix: "modal-new-muscle-group",
            });
            getNavigationRef().then(({ navigationRef: ref }) => ref.navigate("textInputModal"));
          }}
        >
          Add custom muscle group
        </LinkButton>
      </div>
      {hiddenMuscleGroups.length > 0 && (
        <div className="pb-6 text-xs text-text-secondary">
          <span>Unhide muscle groups: </span>
          {hiddenMuscleGroups.map((muscleGroup, i) => {
            const muscleGroupName = Muscle_getMuscleGroupName(muscleGroup, props.settings);
            const muscleGroupSlug = StringUtils_dashcase(muscleGroupName);
            return (
              <Fragment key={muscleGroup}>
                {i !== 0 ? ", " : ""}
                <LinkButton
                  data-cy={`unhide-muscle-group-${muscleGroupSlug}`}
                  name="unhide-muscle-group"
                  onClick={() => props.onRestore(muscleGroup)}
                >
                  {muscleGroupName}
                </LinkButton>
              </Fragment>
            );
          })}
        </div>
      )}
      {props.useInlineModals && showMusclePicker && (
        <BottomSheetMuscleGroupMusclePicker
          settings={props.settings}
          muscleGroup={showMusclePicker}
          onClose={() => setShowMusclePicker(undefined)}
          onSelect={(muscle) => {
            const existingMuscles = Muscle_getMusclesFromScreenMuscle(showMusclePicker, props.settings);
            const newMuscles = existingMuscles.includes(muscle)
              ? CollectionUtils_remove(existingMuscles, muscle)
              : [...existingMuscles, muscle];
            props.onUpdate?.(showMusclePicker, newMuscles);
          }}
        />
      )}
    </div>
  );
}
