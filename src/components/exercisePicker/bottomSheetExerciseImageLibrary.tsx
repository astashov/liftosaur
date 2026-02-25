import { h, JSX, Fragment } from "preact";
import { ISettings } from "../../types";
import { Exercise_allExpanded, Exercise_find, Exercise_fullName } from "../../models/exercise";
import { MenuItemWrapper } from "../menuItem";
import { ExerciseImage } from "../exerciseImage";
import { Tailwind_colors } from "../../utils/tailwindConfig";
import { IconMagnifyingGlass } from "../icons/iconMagnifyingGlass";
import { useState, useEffect } from "preact/hooks";
import { StringUtils_fuzzySearch } from "../../utils/string";
import { Service } from "../../api/service";
import { GroupHeader } from "../groupHeader";
import { IconSpinner } from "../icons/iconSpinner";
import { UidFactory_generateUid } from "../../utils/generator";
import { ExerciseImageUtils_url } from "../../models/exerciseImage";
import { BottomSheetOrModal } from "../bottomSheetOrModal";

interface IProps {
  isHidden: boolean;
  settings: ISettings;
  isLoggedIn: boolean;
  service: Service;
  onClose: () => void;
  onSelect: (smallImageUrl?: string, largeImageUrl?: string) => void;
}

function getExerciseIdFromImageUrl(url: string): string | undefined {
  return url.split("/").pop()?.split("-").slice(1).join("-").split(".")[0];
}

export function BottomSheetExerciseImageLibrary(props: IProps): JSX.Element {
  useEffect(() => {
    if (props.isLoggedIn) {
      props.service.getUploadedImages().then((imgs) => {
        setUploadedImages(imgs);
        setIsLoading(false);
      });
    }
  }, []);

  const [isLoading, setIsLoading] = useState<boolean>(props.isLoggedIn);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [search, setSearch] = useState<string>("");
  const trimmedSearch = search.trim().toLowerCase();
  const exercises = !trimmedSearch
    ? Exercise_allExpanded({})
    : Exercise_allExpanded({}).filter((e) => {
        return StringUtils_fuzzySearch(trimmedSearch, e.name.toLowerCase());
      });
  const filteredUploadedImages = !trimmedSearch
    ? uploadedImages
    : uploadedImages.filter((img) => {
        const exerciseId = getExerciseIdFromImageUrl(img);
        const customExercise = exerciseId ? Exercise_find({ id: exerciseId }, props.settings.exercises) : undefined;
        if (customExercise) {
          return StringUtils_fuzzySearch(trimmedSearch, customExercise.name.toLowerCase());
        } else {
          return false;
        }
      });

  return (
    <BottomSheetOrModal isHidden={props.isHidden} onClose={props.onClose} shouldShowClose={true}>
      <div className="flex flex-col h-full px-4">
        <div className="pb-2">
          <h3 className="pt-1 pb-3 text-base font-semibold text-center">Pick Exercise Image</h3>
          <div className="flex items-center flex-1 gap-2 p-2 rounded-lg bg-background-neutral">
            <div>
              <IconMagnifyingGlass size={18} color={Tailwind_colors().lightgray[600]} />
            </div>
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search by name"
                className="block w-full text-sm bg-transparent border-none outline-none bg-none text-text-secondary placeholder-text-secondarysubtle"
                data-cy="exercise-filter-by-name"
                value={search}
                onInput={(event) => {
                  const target = event.target as HTMLInputElement;
                  const value = target.value;
                  setSearch(value);
                }}
              />
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          <div className="pb-4">
            {(isLoading || filteredUploadedImages.length > 0) && (
              <>
                <GroupHeader name="Uploaded Images" />
                {isLoading ? (
                  <div className="py-4 text-sm text-center text-text-secondary">
                    <IconSpinner width={18} height={18} />
                  </div>
                ) : (
                  filteredUploadedImages.map((img) => {
                    const exerciseId = getExerciseIdFromImageUrl(img) ?? UidFactory_generateUid(8);
                    const customExercise = exerciseId
                      ? Exercise_find({ id: exerciseId }, props.settings.exercises)
                      : undefined;
                    return (
                      <MenuItemWrapper
                        key={exerciseId}
                        name={customExercise?.name ?? exerciseId}
                        onClick={() => {
                          props.onSelect(img);
                        }}
                      >
                        <div className="flex items-center h-20 gap-4">
                          <div className="w-10">
                            <img src={img} alt={customExercise?.name ?? "Custom Exercise"} className="w-full" />
                          </div>
                          {customExercise && (
                            <div className="flex-1">{Exercise_fullName(customExercise, props.settings)}</div>
                          )}
                        </div>
                      </MenuItemWrapper>
                    );
                  })
                )}
                <GroupHeader name="Built-in Images" topPadding={true} />
              </>
            )}
            {exercises.map((exercise) => (
              <MenuItemWrapper
                key={exercise.id}
                name={exercise.name}
                onClick={() => {
                  const smallImageUrl = ExerciseImageUtils_url(exercise, "small");
                  const largeImageUrl = ExerciseImageUtils_url(exercise, "large");
                  props.onSelect(smallImageUrl, largeImageUrl);
                }}
              >
                <div className="flex items-center h-20 gap-4">
                  <div className="w-10">
                    <ExerciseImage settings={props.settings} exerciseType={exercise} size="small" className="w-full" />
                  </div>
                  <div className="flex-1">{Exercise_fullName(exercise, props.settings)}</div>
                </div>
              </MenuItemWrapper>
            ))}
          </div>
        </div>
      </div>
    </BottomSheetOrModal>
  );
}
