import { JSX, h, Fragment } from "preact";
import {
  ISettings,
  ICustomExercise,
  IExercisePickerState,
  IExercisePickerScreen,
  IMuscle,
  exerciseKinds,
  IExerciseKind,
} from "../../types";
import { Button } from "../button";
import { ILensDispatch } from "../../utils/useLensReducer";
import { lb } from "lens-shmens";
import { IconBack } from "../icons/iconBack";
import { IconClose2 } from "../icons/iconClose2";
import { IconPlus2 } from "../icons/iconPlus2";
import { Tailwind } from "../../utils/tailwindConfig";
import { Input2 } from "../input2";
import { Textarea2 } from "../textarea2";
import { IconAi } from "../icons/iconAi";
import { ExercisePickerOptionsMuscles } from "./exercisePickerOptionsMuscles";
import { useContext, useState } from "preact/hooks";
import { BottomSheet } from "../bottomSheet";
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
import { ExerciseImageUtils } from "../../models/exerciseImage";
import { UrlUtils } from "../../utils/url";

interface IExercisePickerCustomExercise2Props {
  settings: ISettings;
  screenStack: IExercisePickerScreen[];
  originalExercise?: ICustomExercise;
  exercise: ICustomExercise;
  dispatch: ILensDispatch<IExercisePickerState>;
  onClose: () => void;
  onChange: (action: "upsert" | "delete", exercise: ICustomExercise, notes?: string) => void;
}

async function uploadAndUpdateImage(
  source: "camera" | "photo-library",
  exerciseId: string,
  service: Service,
  dispatch: ILensDispatch<IExercisePickerState>
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
    lb<IExercisePickerState>().pi("editCustomExercise").p("smallImageUrl").record(url),
    "Set custom exercise image URL"
  );
}

export function ExercisePickerCustomExercise2(props: IExercisePickerCustomExercise2Props): JSX.Element {
  function goBack(desc: string): void {
    if (props.screenStack.length > 1) {
      props.dispatch(
        [
          lb<IExercisePickerState>()
            .p("screenStack")
            .recordModify((stack) => stack.slice(0, -1)),
          lb<IExercisePickerState>().p("editCustomExercise").record(undefined),
        ],
        desc
      );
    } else {
      props.onClose();
    }
  }
  const appContext = useContext(AppContext);
  const service = appContext.service ?? new Service(window.fetch.bind(window));

  const editCustomExercise = props.exercise;
  const [notes, setNotes] = useState<string | undefined>(
    props.exercise ? Exercise.getNotes(props.exercise, props.settings) : undefined
  );
  const isEdited = !props.originalExercise || !ObjectUtils.isEqual(editCustomExercise, props.originalExercise);
  const isValid = editCustomExercise.name.trim().length ?? 0 > 0;
  const [isAutofilling, setIsAutofilling] = useState<boolean>(false);
  const [showImageBottomSheet, setShowImageBottomSheet] = useState<boolean>(false);
  const [showPicturePickerBottomSheet, setShowPicturePickerBottomSheet] = useState<boolean>(false);
  const [showImageLibrary, setShowImageLibrary] = useState<boolean>(false);
  const smallImageUrlResult = editCustomExercise.smallImageUrl
    ? UrlUtils.buildSafe(editCustomExercise.smallImageUrl)
    : undefined;
  const isLiftosaurUrl = smallImageUrlResult?.success && smallImageUrlResult.data.host.includes("liftosaur.com");
  const [showUrlInputs, setShowUrlInputs] = useState<boolean>(!!editCustomExercise.smallImageUrl && !isLiftosaurUrl);

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
    <div className="flex flex-col h-full" style={{ marginTop: "-0.75rem" }}>
      <div className="relative py-4 mt-2">
        <div className="absolute flex top-2 left-2">
          <div>
            <button
              className="p-2 nm-back"
              data-cy="navbar-back"
              onClick={() => {
                goBack("Pop screen in exercise picker screen stack");
              }}
            >
              {props.screenStack.length > 1 ? <IconBack /> : <IconClose2 size={22} />}
            </button>
          </div>
        </div>
        <h3 className="px-4 font-semibold text-center">{props.exercise ? "Edit" : "Create"} Custom Exercise</h3>
        <div className="absolute flex top-3 right-4">
          <div>
            <Button
              kind="purple"
              buttonSize="md"
              disabled={!isEdited || !isValid}
              name="navbar-save-custom-exercise"
              className="p-2 nm-save-custom-exercise"
              data-cy="custom-exercise-create"
              onClick={(e) => {
                e.preventDefault();
                props.onChange("upsert", editCustomExercise, notes);
                goBack("Save custom exercise");
              }}
            >
              Save
            </Button>
          </div>
        </div>
      </div>
      <div className="flex-1 pb-4 overflow-y-auto">
        <div className="flex px-4">
          {showUrlInputs ? (
            <div>
              <div>
                <Input2
                  identifier="custom-exercise-small-url"
                  label="Small Image Url"
                  value={editCustomExercise.smallImageUrl}
                  onInput={(v) => {
                    const target = v.target;
                    if (target instanceof HTMLInputElement) {
                      props.dispatch(
                        lb<IExercisePickerState>().pi("editCustomExercise").p("smallImageUrl").record(target.value),
                        "Update custom exercise small iamge url"
                      );
                    }
                  }}
                />
                <div className="text-xs text-text-secondary">1:1 aspect ratio, {">"}= 150px width</div>
              </div>
              <div>
                <Input2
                  identifier="custom-exercise-large-url"
                  label="Large Image Url"
                  value={editCustomExercise.largeImageUrl}
                  onInput={(v) => {
                    const target = v.target;
                    if (target instanceof HTMLInputElement) {
                      props.dispatch(
                        lb<IExercisePickerState>().pi("editCustomExercise").p("largeImageUrl").record(target.value),
                        "Update custom exercise large image url"
                      );
                    }
                  }}
                />
                <div className="text-xs text-text-secondary">4:3 aspect ratio, {">"}= 800px width</div>
              </div>
            </div>
          ) : (
            <div>
              <button
                className="relative flex items-center justify-center w-16 h-20 p-2 text-xs border rounded-md border-border-neutral text-text-secondary"
                onClick={() => setShowImageBottomSheet(true)}
              >
                Add image
                <span className="absolute p-1 rounded-full bg-icon-purple" style={{ bottom: "-8px", right: "-8px" }}>
                  <IconPlus2 size={8} color={Tailwind.colors().white} />
                </span>
              </button>
            </div>
          )}
          {editCustomExercise.smallImageUrl && (
            <div>
              <img
                src={editCustomExercise.smallImageUrl}
                alt="Exercise"
                className="object-cover w-16 h-20 ml-4 border rounded-md border-border-neutral"
              />
            </div>
          )}
        </div>
        <div className="px-4 pt-2"></div>
        <div className="px-4 pt-2">
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
                  props.dispatch(
                    lb<IExercisePickerState>().pi("editCustomExercise").p("name").record(target.value),
                    "Update custom exercise name"
                  );
                }
              }}
            />
          </div>
          <div className="pt-2">
            <Textarea2
              identifier="custom-exercise-name"
              labelElement={
                <>
                  <span>Exercise Notes</span> <span className="text-xs text-text-secondary">(optional)</span>
                </>
              }
              value={notes}
              onInput={(v) => {
                const target = v.target;
                if (target instanceof HTMLTextAreaElement) {
                  setNotes(target.value);
                }
              }}
              height={3}
            />
          </div>
          <div className="pt-2">
            <Button
              buttonSize="sm"
              kind="lightgrayv3"
              name="autofill-muscles"
              className="flex items-center justify-center w-full"
              onClick={async () => {
                setIsAutofilling(true);
                const response = await service.getMuscles(editCustomExercise.name);
                setIsAutofilling(false);
                if (response != null) {
                  const { targetMuscles, synergistMuscles, types } = response;
                  props.dispatch(
                    [
                      lb<IExercisePickerState>()
                        .pi("editCustomExercise")
                        .p("meta")
                        .p("targetMuscles")
                        .record(targetMuscles),
                      lb<IExercisePickerState>()
                        .pi("editCustomExercise")
                        .p("meta")
                        .p("synergistMuscles")
                        .record(synergistMuscles),
                      lb<IExercisePickerState>().pi("editCustomExercise").p("types").record(types),
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
                  lb<IExercisePickerState>()
                    .pi("editCustomExercise")
                    .p("meta")
                    .p("targetMuscles")
                    .record(Array.from(current).sort()),
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
                  lb<IExercisePickerState>()
                    .pi("editCustomExercise")
                    .p("meta")
                    .p("synergistMuscles")
                    .record(Array.from(current).sort()),
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
                props.dispatch(
                  lb<IExercisePickerState>().pi("editCustomExercise").p("types").record(newTypes),
                  "Update custom exercise types"
                );
              }}
            />
          </div>
        </div>
      </div>
      {showImageBottomSheet && (
        <BottomSheet
          shouldShowClose={true}
          onClose={() => setShowImageBottomSheet(false)}
          isHidden={!showImageBottomSheet}
        >
          <div className="p-4">
            <BottomSheetItem
              isFirst={true}
              name="from-image-url"
              className="ls-custom-exercise-image-url"
              title="From Image URL"
              onClick={() => {
                setShowImageBottomSheet(false);
                setShowUrlInputs(true);
              }}
            />
            <BottomSheetItem
              name="from-image-library"
              className="ls-custom-exercise-image-library"
              title="From Image Library"
              onClick={() => {
                setShowImageBottomSheet(false);
                setShowImageLibrary(true);
              }}
            />
            {(SendMessage.isIos() || SendMessage.isAndroid()) && (
              <BottomSheetItem
                name="upload-image"
                className="ls-custom-exercise-upload-image"
                title="Upload Image"
                onClick={() => {
                  setShowImageBottomSheet(false);
                  setShowPicturePickerBottomSheet(true);
                }}
              />
            )}
          </div>
        </BottomSheet>
      )}
      {showPicturePickerBottomSheet && (
        <BottomSheet
          shouldShowClose={true}
          onClose={() => setShowPicturePickerBottomSheet(false)}
          isHidden={!showPicturePickerBottomSheet}
        >
          <div className="p-4">
            <BottomSheetItem
              title="From Camera"
              name="from-camera"
              icon={<IconCamera size={24} color="black" />}
              isFirst={true}
              description="Take a photo"
              onClick={async () => {
                await uploadAndUpdateImage("camera", editCustomExercise.id, service, props.dispatch);
                setShowPicturePickerBottomSheet(false);
              }}
            />
            <BottomSheetItem
              title="From Photo Library"
              name="from-photo-library"
              icon={<IconPicture size={24} color="black" />}
              description="Pick photo from your photo library"
              onClick={async () => {
                await uploadAndUpdateImage("photo-library", editCustomExercise.id, service, props.dispatch);
                setShowPicturePickerBottomSheet(false);
              }}
            />
          </div>
        </BottomSheet>
      )}
      {showImageLibrary && (
        <BottomSheetExerciseImageLibrary
          isHidden={!showImageLibrary}
          settings={props.settings}
          onClose={() => setShowImageLibrary(false)}
          onSelect={(exerciseType) => {
            const smallImageUrl = ExerciseImageUtils.url(exerciseType, "small");
            const largeImageUrl = ExerciseImageUtils.url(exerciseType, "large");
            props.dispatch(
              [
                lb<IExercisePickerState>().pi("editCustomExercise").p("smallImageUrl").record(smallImageUrl),
                lb<IExercisePickerState>().pi("editCustomExercise").p("largeImageUrl").record(largeImageUrl),
              ],
              "Set custom exercise image URL"
            );
            setShowImageLibrary(false);
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
        <BottomSheet
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
        </BottomSheet>
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
        <BottomSheet
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
        </BottomSheet>
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
