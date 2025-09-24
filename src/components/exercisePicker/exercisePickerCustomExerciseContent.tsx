import { JSX, h, Fragment } from "preact";
import { ISettings, ICustomExercise, IMuscle, exerciseKinds, IExerciseKind } from "../../types";
import { Button } from "../button";
import { ILensDispatch } from "../../utils/useLensReducer";
import { lb } from "lens-shmens";
import { Tailwind } from "../../utils/tailwindConfig";
import { Input2 } from "../input2";
import { IconAi } from "../icons/iconAi";
import { ExercisePickerOptionsMuscles } from "./exercisePickerOptionsMuscles";
import { useContext, useState } from "preact/hooks";
import { IconArrowDown2 } from "../icons/iconArrowDown2";
import { ExercisePickerOptions, IFilterValue } from "./exercisePickerOptions";
import { StringUtils } from "../../utils/string";
import { ObjectUtils } from "../../utils/object";
import { Exercise } from "../../models/exercise";
import { AppContext } from "../appContext";
import { Service } from "../../api/service";
import { IconSpinner } from "../icons/iconSpinner";
import { BottomSheetItem } from "../bottomSheetItem";
import { SendMessage } from "../../utils/sendMessage";
import { IconCamera } from "../icons/iconCamera";
import { ImageUploader } from "../../utils/imageUploader";
import { IconPicture } from "../icons/iconPicture";
import { BottomSheetExerciseImageLibrary } from "./bottomSheetExerciseImageLibrary";
import { LinkButton } from "../linkButton";
import { Importer } from "../importer";
import { MarkdownEditor } from "../markdownEditor";
import { BottomSheetExerciseCloneLibrary } from "./bottomSheetExerciseCloneLibrary";
import { ExerciseImageUtils } from "../../models/exerciseImage";
import { BottomSheetOrModal } from "../bottomSheetOrModal";

interface IExercisePickerCustomExerciseContentProps {
  settings: ISettings;
  originalExercise?: ICustomExercise;
  showMuscles: boolean;
  exercise: ICustomExercise;
  isLoggedIn: boolean;
  hideDeleteButton: boolean;
  hideNotes: boolean;
  notes: string | undefined;
  setNotes: (notes: string) => void;
  dispatch: ILensDispatch<ICustomExercise>;
  onClose: () => void;
  onGoBack: (reason: string) => void;
  onDelete: () => void;
}

async function uploadAndUpdateImage(
  source: "camera" | "photo-library",
  exerciseId: string,
  service: Service,
  dispatch: ILensDispatch<ICustomExercise>
): Promise<void> {
  const result = await SendMessage.toIosAndAndroidWithResult<{ data: string }>({
    type: "pickphoto",
    source,
  });
  if (!result?.data) {
    alert(source === "camera" ? "Couldn't get image from camera" : "Couldn't get image from photo library");
    return;
  }
  const imageUploader = new ImageUploader(service);
  const url = await imageUploader.uploadBase64Image(result.data, exerciseId);
  dispatch(
    [lb<ICustomExercise>().p("smallImageUrl").record(url), lb<ICustomExercise>().p("largeImageUrl").record(undefined)],
    "Set custom exercise image URL"
  );
}

export function ExercisePickerCustomExerciseContent(props: IExercisePickerCustomExerciseContentProps): JSX.Element {
  const appContext = useContext(AppContext);
  const service = appContext.service ?? new Service(window.fetch.bind(window));

  const editCustomExercise = props.exercise;
  const { notes, setNotes } = props;
  const isValid = editCustomExercise.name.trim().length ?? 0 > 0;
  const [isAutofilling, setIsAutofilling] = useState<boolean>(false);
  const [showCloneBottomSheet, setShowCloneBottomSheet] = useState<boolean>(false);
  const [showImageBottomSheet, setShowImageBottomSheet] = useState<boolean>(false);
  const [showPicturePickerBottomSheet, setShowPicturePickerBottomSheet] = useState<boolean>(false);
  const [showImageLibrary, setShowImageLibrary] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);

  const typeValues = exerciseKinds.reduce<Record<IExerciseKind, IFilterValue>>(
    (memo, type) => {
      memo[type] = {
        label: StringUtils.capitalize(type),
        isSelected: !!editCustomExercise.types?.includes(type),
      };
      return memo;
    },
    {} as Record<IExerciseKind, IFilterValue>
  );

  return (
    <div>
      <div>
        <div className="pb-2 text-center">
          <LinkButton className="text-xs" name="clone-builtin-exercise" onClick={() => setShowCloneBottomSheet(true)}>
            Clone from another exercise
          </LinkButton>
        </div>
        <div>
          <Input2
            identifier="custom-exercise-name"
            label="Name"
            value={editCustomExercise.name}
            placeholder="Super Squat"
            required
            requiredMessage="Name cannot be empty"
            onInput={(v) => {
              const target = v.target;
              if (target instanceof HTMLInputElement) {
                props.dispatch(lb<ICustomExercise>().p("name").record(target.value), "Update custom exercise name");
              }
            }}
          />
        </div>
        <div className="mt-4">
          {editCustomExercise.largeImageUrl || editCustomExercise.smallImageUrl ? (
            <div className="text-center">
              <div className="text-center">
                <img
                  onClick={() => setShowImageBottomSheet(true)}
                  src={editCustomExercise.largeImageUrl ?? editCustomExercise.smallImageUrl}
                  alt="Exercise"
                  className="inline-block object-contain h-48"
                />
              </div>
              <div>
                <LinkButton
                  name="custom-exercise-change-image"
                  className="text-xs"
                  onClick={() => {
                    setShowImageBottomSheet(true);
                  }}
                >
                  Change Image
                </LinkButton>
              </div>
            </div>
          ) : (
            <div>
              <Button
                name="custom-exercise-add-image"
                kind="purple"
                className="w-full"
                buttonSize="md"
                onClick={() => setShowImageBottomSheet(true)}
              >
                Add image
              </Button>
            </div>
          )}
        </div>
        <div className="mt-4">
          <Button
            buttonSize="sm"
            kind="lightgrayv3"
            name="autofill-muscles"
            className="flex items-center justify-center w-full"
            onClick={async () => {
              if (!isValid) {
                alert("Please enter a name");
                return;
              }
              setIsAutofilling(true);
              const response = await service.getMuscles(editCustomExercise.name);
              setIsAutofilling(false);
              if (response != null) {
                const { targetMuscles, synergistMuscles, types } = response;
                props.dispatch(
                  [
                    lb<ICustomExercise>().p("meta").p("targetMuscles").record(targetMuscles),
                    lb<ICustomExercise>().p("meta").p("synergistMuscles").record(synergistMuscles),
                    lb<ICustomExercise>().p("types").record(types),
                  ],
                  "Autofill custom exercise muscles and types"
                );
              } else {
                alert("Could't autofill the muscles for this exercise. Try a different name!");
              }
            }}
          >
            <div className="flex items-center">
              {isAutofilling ? (
                <div className="flex items-center min-h-6">
                  <IconSpinner width={18} height={18} />
                </div>
              ) : (
                <>
                  <div>
                    <IconAi color={Tailwind.semantic().icon.blue} />
                  </div>
                  <div className="ml-1">Autofill Muscles and Types</div>
                </>
              )}
            </div>
          </Button>
        </div>
        <div className="pt-2">
          <ExercisePickerCustomExerciseMuscles
            bottomSheetTitle="Target Muscles"
            label={
              <>
                <span>Target Muscles</span> <span className="text-xs text-text-secondary">(optional)</span>
              </>
            }
            selectedMuscles={editCustomExercise.meta.targetMuscles}
            onSelect={(muscle) => {
              const current = new Set(editCustomExercise.meta.targetMuscles);
              if (current.has(muscle)) {
                current.delete(muscle);
              } else {
                current.add(muscle);
              }
              props.dispatch(
                lb<ICustomExercise>().p("meta").p("targetMuscles").record(Array.from(current).sort()),
                "Update custom exercise target muscles"
              );
            }}
          />
        </div>
        <div className="pt-2">
          <ExercisePickerCustomExerciseMuscles
            bottomSheetTitle="Synergist Muscles"
            label={
              <>
                <span>Synergist Muscles</span> <span className="text-xs text-text-secondary">(optional)</span>
              </>
            }
            selectedMuscles={editCustomExercise.meta.synergistMuscles}
            onSelect={(muscle) => {
              const current = new Set(editCustomExercise.meta.synergistMuscles);
              if (current.has(muscle)) {
                current.delete(muscle);
              } else {
                current.add(muscle);
              }
              props.dispatch(
                lb<ICustomExercise>().p("meta").p("synergistMuscles").record(Array.from(current).sort()),
                "Update custom exercise synergist muscles"
              );
            }}
          />
        </div>
        <div className="pt-2">
          <ExercisePickerCustomExerciseTypes
            types={typeValues}
            onNewTypes={(types) => {
              const newTypes = ObjectUtils.keys(types).filter((k) => types[k].isSelected);
              props.dispatch(lb<ICustomExercise>().p("types").record(newTypes), "Update custom exercise types");
            }}
          />
        </div>
        {!props.hideNotes && (
          <div className="pt-2 pb-4">
            <label className={`leading-none text-sm text-text-primary pb-1`}>
              <span>Exercise Notes</span> <span className="text-xs text-text-secondary">(optional)</span>
            </label>
            <div className="text-xs">
              <MarkdownEditor
                value={notes ?? ""}
                onChange={(v) => {
                  setNotes(v);
                }}
              />
            </div>
          </div>
        )}
      </div>
      {props.originalExercise && !props.hideDeleteButton && (
        <div className="px-4 pb-4">
          <Button
            name="delete-custom-exercise"
            kind="red"
            data-cy="custom-exercise-delete"
            buttonSize="md"
            className="w-full mt-4"
            onClick={() => {
              if (confirm("Are you sure you want to delete this exercise? This action cannot be undone.")) {
                props.onDelete();
              }
              props.onGoBack("Delete custom exercise");
            }}
          >
            Delete Exercise
          </Button>
        </div>
      )}
      {showImageBottomSheet && (
        <BottomSheetOrModal
          shouldShowClose={true}
          onClose={() => setShowImageBottomSheet(false)}
          isHidden={!showImageBottomSheet}
        >
          <div className="p-4">
            <div className="text-xs text-center text-text-secondary">Prefer 2:3 aspect ratio</div>
            <BottomSheetItem
              name="from-image-library"
              className="ls-custom-exercise-image-library"
              title="From Image Library"
              onClick={() => {
                setShowImageBottomSheet(false);
                setShowImageLibrary(true);
              }}
            />
            {SendMessage.isIos() || SendMessage.isAndroid() ? (
              <BottomSheetItem
                name="upload-image"
                className="ls-custom-exercise-upload-image"
                title="Upload Image"
                onClick={() => {
                  if (!props.isLoggedIn) {
                    alert("You need to be logged in to upload custom exercise images");
                    return;
                  }
                  setShowImageBottomSheet(false);
                  setShowPicturePickerBottomSheet(true);
                }}
              />
            ) : (
              <Importer
                onRawFile={async (file) => {
                  const imageUploader = new ImageUploader(service);
                  const url = await imageUploader.uploadImage(file, editCustomExercise.id);
                  setIsUploading(true);
                  props.dispatch(
                    [
                      lb<ICustomExercise>().p("smallImageUrl").record(url),
                      lb<ICustomExercise>().p("largeImageUrl").record(undefined),
                    ],
                    "Set custom exercise image URL"
                  );
                  setIsUploading(false);
                  setShowImageBottomSheet(false);
                }}
              >
                {(onClick) => {
                  return (
                    <BottomSheetItem
                      name="upload-image"
                      icon={isUploading ? <IconSpinner width={18} height={18} /> : undefined}
                      className="ls-custom-exercise-upload-image"
                      title="Upload Image"
                      onClick={() => {
                        if (!props.isLoggedIn) {
                          alert("You need to be logged in to upload custom exercise images");
                        } else {
                          onClick();
                        }
                      }}
                    />
                  );
                }}
              </Importer>
            )}
          </div>
        </BottomSheetOrModal>
      )}
      {showPicturePickerBottomSheet && (
        <BottomSheetOrModal
          shouldShowClose={true}
          onClose={() => setShowPicturePickerBottomSheet(false)}
          isHidden={!showPicturePickerBottomSheet}
        >
          <div className="p-4">
            <BottomSheetItem
              title="From Camera"
              name="from-camera"
              icon={isUploading ? <IconSpinner width={18} height={18} /> : <IconCamera size={24} />}
              isFirst={true}
              description="Take a photo"
              onClick={async () => {
                setIsUploading(true);
                await uploadAndUpdateImage("camera", editCustomExercise.id, service, props.dispatch);
                setIsUploading(false);
                setShowPicturePickerBottomSheet(false);
              }}
            />
            <BottomSheetItem
              title="From Photo Library"
              name="from-photo-library"
              icon={isUploading ? <IconSpinner width={18} height={18} /> : <IconPicture size={24} />}
              description="Pick photo from your photo library"
              onClick={async () => {
                setIsUploading(true);
                await uploadAndUpdateImage("photo-library", editCustomExercise.id, service, props.dispatch);
                setIsUploading(false);
                setShowPicturePickerBottomSheet(false);
              }}
            />
          </div>
        </BottomSheetOrModal>
      )}
      {showImageLibrary && (
        <BottomSheetExerciseImageLibrary
          isHidden={!showImageLibrary}
          isLoggedIn={props.isLoggedIn}
          service={service}
          settings={props.settings}
          onClose={() => setShowImageLibrary(false)}
          onSelect={(smallImageUrl, largeImageUrl) => {
            props.dispatch(
              [
                lb<ICustomExercise>().p("smallImageUrl").record(smallImageUrl),
                lb<ICustomExercise>().p("largeImageUrl").record(largeImageUrl),
              ],
              "Set custom exercise image URL"
            );
            setShowImageLibrary(false);
          }}
        />
      )}
      {showCloneBottomSheet && (
        <BottomSheetExerciseCloneLibrary
          isHidden={!showCloneBottomSheet}
          showMuscles={props.showMuscles}
          settings={props.settings}
          onClose={() => setShowCloneBottomSheet(false)}
          onSelect={(exercise) => {
            const customExercise = props.settings.exercises[exercise.id];
            const smallImageUrl = customExercise
              ? customExercise.smallImageUrl
              : ExerciseImageUtils.url(exercise, "small");
            const largeImageUrl = customExercise
              ? customExercise.largeImageUrl
              : ExerciseImageUtils.url(exercise, "large");
            const targetMuscles = ObjectUtils.clone(Exercise.targetMuscles(exercise, props.settings.exercises));
            const synergistMuscles = ObjectUtils.clone(Exercise.synergistMuscles(exercise, props.settings.exercises));
            const types = ObjectUtils.clone(exercise.types);
            props.dispatch(
              [
                lb<ICustomExercise>().p("smallImageUrl").record(smallImageUrl),
                lb<ICustomExercise>().p("largeImageUrl").record(largeImageUrl),
                lb<ICustomExercise>().p("meta").p("targetMuscles").record(targetMuscles),
                lb<ICustomExercise>().p("meta").p("synergistMuscles").record(synergistMuscles),
                lb<ICustomExercise>().p("types").record(types),
              ],
              "Clone built-in exercise into custom exercise"
            );
            setShowCloneBottomSheet(false);
          }}
        />
      )}
    </div>
  );
}

interface IExercisePickerCustomExerciseTypesProps {
  types: Record<IExerciseKind, IFilterValue>;
  onNewTypes: (types: Record<IExerciseKind, IFilterValue>) => void;
}

function ExercisePickerCustomExerciseTypes(props: IExercisePickerCustomExerciseTypesProps): JSX.Element {
  const [isOpened, setIsOpened] = useState<boolean>(false);
  const selectedValues = ObjectUtils.keys(props.types).filter((k) => props.types[k].isSelected);
  return (
    <div className="w-full">
      <label className="pb-1 text-sm leading-none text-text-primary">
        <span>Types</span> <span className="text-xs text-text-secondary">(optional)</span>
      </label>
      <div onClick={() => setIsOpened(true)}>
        <ExercisePickerCustomExercise2SelectInput selectedValues={selectedValues} />
      </div>
      {isOpened && (
        <BottomSheetOrModal
          shouldShowClose={true}
          onClose={() => {
            setIsOpened(false);
          }}
          isHidden={!isOpened}
        >
          <div className="flex flex-col h-full px-4">
            <h3 className="pt-1 pb-3 text-base font-semibold text-center">Types</h3>
            <div className="flex-1 overflow-y-auto">
              <div className="pb-4">
                <ExercisePickerOptions
                  values={props.types}
                  onSelect={(key) => {
                    const newTypes = ObjectUtils.mapValues(props.types, (type: IFilterValue, k: IExerciseKind) => {
                      if (k === key) {
                        return { ...type, isSelected: !type.isSelected };
                      }
                      return type;
                    });
                    props.onNewTypes(newTypes);
                  }}
                />
              </div>
            </div>
          </div>
        </BottomSheetOrModal>
      )}
    </div>
  );
}

interface IExercisePickerCustomExerciseMusclesProps {
  label: JSX.Element;
  bottomSheetTitle: string;
  selectedMuscles: IMuscle[];
  onSelect: (muscle: IMuscle) => void;
}

function ExercisePickerCustomExerciseMuscles(props: IExercisePickerCustomExerciseMusclesProps): JSX.Element {
  const [isOpened, setIsOpened] = useState<boolean>(false);
  return (
    <div className="w-full">
      <label className="pb-1 text-sm leading-none text-text-primary">{props.label}</label>
      <div onClick={() => setIsOpened(true)}>
        <ExercisePickerCustomExercise2SelectInput selectedValues={props.selectedMuscles} />
      </div>
      {isOpened && (
        <BottomSheetOrModal
          shouldShowClose={true}
          onClose={() => {
            setIsOpened(false);
          }}
          isHidden={!isOpened}
        >
          <div className="flex flex-col h-full px-4">
            <h3 className="pt-1 pb-3 text-base font-semibold text-center">{props.bottomSheetTitle}</h3>
            <div className="flex-1 overflow-y-auto">
              <div className="pb-4">
                <ExercisePickerOptionsMuscles selectedValues={props.selectedMuscles} onSelect={props.onSelect} />
              </div>
            </div>
          </div>
        </BottomSheetOrModal>
      )}
    </div>
  );
}

interface IExercisePickerCustomExercise2SelectInputProps {
  selectedValues: string[];
}

function ExercisePickerCustomExercise2SelectInput(props: IExercisePickerCustomExercise2SelectInputProps): JSX.Element {
  return (
    <div className="relative flex">
      <div className="flex items-center flex-1 p-2 text-sm border rounded-md bg-form-inputbg border-form-inputstroke min-h-8">
        <div className="flex-1">
          {props.selectedValues.map((m) => (
            <span className="inline-block px-2 py-1 mr-1 text-xs rounded-full bg-background-subtle text-text-secondary">
              {m}
            </span>
          ))}
        </div>
        <div>
          <IconArrowDown2 />
        </div>
      </div>
    </div>
  );
}
