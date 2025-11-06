import { h, JSX, Fragment } from "preact";
import { IDispatch } from "../ducks/types";
import { Exercise, IExercise } from "../models/exercise";
import { IExerciseType, IMuscleMultiplier, ISettings } from "../types";
import { Button } from "./button";
import { Nux } from "./nux";
import { CollectionUtils } from "../utils/collection";
import { useState } from "preact/hooks";
import { MenuItemWrapper } from "./menuItem";
import { StringUtils } from "../utils/string";
import { MuscleImage } from "./muscleImage";
import { IconTrash } from "./icons/iconTrash";
import { MathUtils } from "../utils/math";
import { ExercisePickerOptionsMuscles } from "./exercisePicker/exercisePickerOptionsMuscles";
import { LinkButton } from "./linkButton";
import { Muscle } from "../models/muscle";
import { Input2 } from "./input2";
import { ObjectUtils } from "../utils/object";
import { BottomSheetOrModal } from "./bottomSheetOrModal";

interface IBottomSheetMusclesOverrideProps {
  exerciseType: IExerciseType;
  settings: ISettings;
  helps: string[];
  isHidden: boolean;
  onNewExerciseData: (exerciseData: Partial<ISettings["exerciseData"]>) => void;
  onClose: () => void;
  dispatch?: IDispatch;
}

function getMultiplierValue(multiplier: number | string | undefined): number {
  if (multiplier == null) {
    return 0;
  } else {
    let value = 0;
    if (typeof multiplier === "string") {
      const parsed = parseFloat(multiplier);
      value = isNaN(parsed) ? 0 : parsed;
    } else {
      value = multiplier;
    }
    return MathUtils.clamp(MathUtils.roundTo005(value), 0, 1);
  }
}

type IMuscleAndMultiplierOpt = Omit<IMuscleMultiplier, "multiplier"> & { multiplier: number | string | undefined };

function getDefaultMusclesAndMultipliers(exercise: IExercise, settings: ISettings): IMuscleAndMultiplierOpt[] {
  const targets = Exercise.defaultTargetMuscles(exercise, settings).map((m) => ({ muscle: m, multiplier: 1 }));
  const synergists = Exercise.defaultSynergistMuscleMultipliers(exercise, settings);
  return CollectionUtils.sort([...targets, ...synergists], (a, b) => a.muscle.localeCompare(b.muscle));
}

function getInitialMusclesAndMultipliers(exercise: IExercise, settings: ISettings): IMuscleAndMultiplierOpt[] {
  const exerciseData = settings.exerciseData[Exercise.toKey(exercise)];
  if (exerciseData?.muscleMultipliers != null) {
    return exerciseData.muscleMultipliers;
  } else {
    return getDefaultMusclesAndMultipliers(exercise, settings);
  }
}

export function BottomSheetMusclesOverride(props: IBottomSheetMusclesOverrideProps): JSX.Element {
  const exercise = Exercise.get(props.exerciseType, props.settings.exercises);
  const [musclesAndMultipliers, setMusclesAndMultipliers] = useState(
    getInitialMusclesAndMultipliers(exercise, props.settings)
  );
  const [showAddMuscle, setShowAddMuscle] = useState(false);

  return (
    <>
      <BottomSheetOrModal shouldShowClose={true} onClose={props.onClose} isHidden={props.isHidden}>
        <div className="flex flex-col h-full px-4 py-2" style={{ marginTop: "-0.5rem" }}>
          <div className="py-2">
            <h3 className="text-base font-semibold leading-none text-center">Override Muscles</h3>
            <div className="leading-none text-center">
              <LinkButton
                data-cy="toggle-muscle-overrides"
                name="toggle-muscle-overrides"
                className="text-xs"
                onClick={() => setShowAddMuscle(true)}
              >
                + Add Muscles
              </LinkButton>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            <div className="pb-4">
              <div style={{ maxWidth: "40rem" }}>
                <Nux id="muscle-override-help" helps={props.helps} dispatch={props.dispatch}>
                  <>
                    <span>
                      Here you can override the muscles for this exercise. This affects how the volume / number of sets
                      is calculated for this exercise.
                    </span>
                    <div>
                      For each muscle, you can set a multiplier - from <strong>0</strong> to <strong>1</strong>. If it's
                      1 - it's a <strong>target muscle</strong>, and we count each set as a full one when we calculate
                      the volume. If it's less 1 - it's a <strong>synergist</strong> muscle, and we apply the specified
                      multiplier to the number of sets.
                    </div>
                    <div>These multipliers takes precedence over the default target/synergist multiplier.</div>
                  </>
                </Nux>
              </div>
              {musclesAndMultipliers.map((mm) => {
                const muscleGroup = Muscle.getScreenMusclesFromMuscle(mm.muscle, props.settings)[0];
                if (muscleGroup == null) {
                  return null;
                }
                return (
                  <MenuItemWrapper name={`muscle-override-${StringUtils.dashcase(mm.muscle)}`}>
                    <div className="py-2">
                      <div className="flex items-center gap-2">
                        <div>
                          <MuscleImage muscle={mm.muscle} size={61} />
                        </div>
                        <div className="flex-1">
                          <div>{mm.muscle}</div>
                          <div className="text-xs text-text-secondary">
                            {Muscle.getMuscleGroupName(muscleGroup, props.settings)}
                          </div>
                        </div>
                        <div className="w-12">
                          <Input2
                            identifier={`muscle-multiplier-${StringUtils.dashcase(mm.muscle)}`}
                            className="text-center"
                            value={mm.multiplier}
                            onBlur={(event) => {
                              const value = (event.target as HTMLInputElement).value;
                              const finalValue = getMultiplierValue(value);
                              setMusclesAndMultipliers((mms) =>
                                mms.map((x) => (x.muscle === mm.muscle ? { ...x, multiplier: finalValue } : x))
                              );
                            }}
                            onInput={(event) => {
                              const value = (event.target as HTMLInputElement).value;
                              setMusclesAndMultipliers((mms) =>
                                mms.map((x) => (x.muscle === mm.muscle ? { ...x, multiplier: value } : x))
                              );
                            }}
                          />
                        </div>
                        <div className="ml-4">
                          <button
                            data-cy={`remove-muscle-override-${StringUtils.dashcase(mm.muscle)}`}
                            onClick={() => {
                              setMusclesAndMultipliers((mms) => mms.filter((x) => x.muscle !== mm.muscle));
                            }}
                          >
                            <IconTrash />
                          </button>
                        </div>
                      </div>
                    </div>
                  </MenuItemWrapper>
                );
              })}
            </div>
          </div>
          <div className="py-2 bg-background-default">
            <Button
              kind="purple"
              data-cy="save-muscle-overrides"
              name="save-muscle-overrides"
              className="w-full"
              buttonSize="md"
              onClick={() => {
                const muscleMultipliers = musclesAndMultipliers.map((mm) => ({
                  muscle: mm.muscle,
                  multiplier: getMultiplierValue(mm.multiplier),
                }));
                const exerciseData = props.settings.exerciseData;
                const newExerciseData = ObjectUtils.clone(exerciseData);
                if (ObjectUtils.isEqual(muscleMultipliers, getDefaultMusclesAndMultipliers(exercise, props.settings))) {
                  delete newExerciseData[Exercise.toKey(exercise)];
                } else {
                  const ed = newExerciseData[Exercise.toKey(exercise)] || {};
                  ed.muscleMultipliers = muscleMultipliers;
                  newExerciseData[Exercise.toKey(exercise)] = ed;
                }
                props.onNewExerciseData(newExerciseData);
                props.onClose();
              }}
            >
              Save
            </Button>
          </div>
        </div>
      </BottomSheetOrModal>
      {showAddMuscle && (
        <BottomSheetOrModal shouldShowClose={true} onClose={() => setShowAddMuscle(false)} isHidden={!showAddMuscle}>
          <div className="flex flex-col h-full px-4 py-2" style={{ marginTop: "-0.5rem" }}>
            <h3 className="pt-2 pb-3 text-base font-semibold text-center">Toggle Muscles</h3>
            <div className="flex-1 overflow-y-auto">
              <div className="pb-4">
                <ExercisePickerOptionsMuscles
                  settings={props.settings}
                  selectedValues={musclesAndMultipliers.map((mm) => mm.muscle)}
                  onSelect={(muscle) => {
                    setMusclesAndMultipliers((mms) => {
                      if (mms.some((x) => x.muscle === muscle)) {
                        return mms.filter((x) => x.muscle !== muscle);
                      } else {
                        return CollectionUtils.sort([...mms, { muscle, multiplier: 1 }], (a, b) =>
                          a.muscle.localeCompare(b.muscle)
                        );
                      }
                    });
                  }}
                />
              </div>
            </div>
            <div className="py-2 bg-background-default">
              <Button
                kind="purple"
                data-cy="done-selecting-muscles"
                name="done-selecting-muscles"
                className="w-full"
                buttonSize="md"
                onClick={() => {
                  setShowAddMuscle(false);
                }}
              >
                Done
              </Button>
            </div>
          </div>
        </BottomSheetOrModal>
      )}
    </>
  );
}
