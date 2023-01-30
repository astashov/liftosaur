import { h, JSX } from "preact";
import { IBuilderExercise, IBuilderWeek, ISelectedExercise } from "../models/types";
import { IBuilderDispatch, IBuilderSettings, IBuilderState } from "../models/builderReducer";
import { ExerciseImage } from "../../../components/exerciseImage";
import { LinkButton } from "../../../components/linkButton";
import { equipmentName, Exercise } from "../../../models/exercise";
import { BuilderExerciseSets } from "./builderExerciseSets";
import { lb } from "lens-shmens";
import { BuilderLinkInlineInput } from "./builderInlineInput";
import { Weight } from "../../../models/weight";
import { BuilderWeekModel, IVolumeSplit } from "../models/builderWeekModel";
import { ObjectUtils } from "../../../utils/object";
import { HtmlUtils } from "../../../utils/html";
import { CollectionUtils } from "../../../utils/collection";
import { StringUtils } from "../../../utils/string";
import { IEquipment } from "../../../types";
import { BuilderExerciseModel } from "../models/builderExerciseModel";

interface IBuilderExerciseProps {
  exercise: IBuilderExercise;
  week: IBuilderWeek;
  index: number;
  dayIndex: number;
  weekIndex: number;
  settings: IBuilderSettings;
  selectedExercise?: ISelectedExercise;
  dispatch: IBuilderDispatch;
}

export function BuilderExercise(props: IBuilderExerciseProps): JSX.Element {
  const exercise = Exercise.get(props.exercise.exerciseType, {});
  const lbe = lb<IBuilderState>()
    .p("program")
    .p("weeks")
    .i(props.weekIndex)
    .p("days")
    .i(props.dayIndex)
    .p("exercises")
    .i(props.index);
  const volumeSplit = BuilderWeekModel.calculateVolumeSplit(props.week, props.exercise.exerciseType);
  const musclePoints = BuilderExerciseModel.getScreenMusclePointsForExercise(props.exercise);
  const equipments = Exercise.sortedEquipments(props.exercise.exerciseType.id).map<[string, string]>((e) => [
    e,
    equipmentName(e),
  ]);
  const isSelected =
    props.selectedExercise != null &&
    props.selectedExercise.weekIndex === props.weekIndex &&
    props.selectedExercise.dayIndex === props.dayIndex &&
    props.selectedExercise.exerciseIndex === props.index;

  return (
    <div
      className="box-content flex w-full p-2 pb-8 mt-6 rounded selectable"
      style={{
        marginLeft: "-0.5rem",
        marginRight: "-0.5rem",
        borderBottom: isSelected ? "1px solid #28839F" : "1px solid #D2D8DE",
        borderLeft: isSelected ? "1px solid #28839F" : "1px solid white",
        borderTop: isSelected ? "1px solid #28839F" : "1px solid white",
        borderRight: isSelected ? "1px solid #28839F" : "1px solid white",
      }}
      onClick={(e) => {
        const hasActionableElement =
          e.target instanceof HTMLElement && HtmlUtils.selectableInParents(e.target, e.currentTarget);
        if (!hasActionableElement) {
          props.dispatch([
            lb<IBuilderState>().p("ui").p("selectedExercise").record({
              weekIndex: props.weekIndex,
              dayIndex: props.dayIndex,
              exerciseIndex: props.index,
            }),
          ]);
        }
      }}
    >
      <div className="pr-4 border-r border-grayv2-100" style={{ flex: 3 }}>
        <div className="flex">
          <div>
            <ExerciseImage
              className="w-12 mr-3"
              exerciseType={props.exercise.exerciseType}
              size="small"
              customExercises={{}}
            />
          </div>
          <div className="flex-1">
            <div>
              <LinkButton
                onClick={() => {
                  props.dispatch([
                    lb<IBuilderState>().p("ui").p("modalExercise").record({
                      weekIndex: props.weekIndex,
                      dayIndex: props.dayIndex,
                      exerciseIndex: props.index,
                    }),
                  ]);
                }}
              >
                {exercise.name}
              </LinkButton>
            </div>
            <div className="pt-1">
              <select
                className="border rounded border-grayv2-main"
                value={props.exercise.exerciseType.equipment}
                onChange={(e) => {
                  if (e.target instanceof HTMLSelectElement) {
                    props.dispatch([
                      lbe
                        .p("exerciseType")
                        .p("equipment")
                        .record(e.target.value as IEquipment),
                    ]);
                  }
                }}
              >
                {equipments.map(([id, value]) => {
                  return (
                    <option value={id} selected={id === props.exercise.exerciseType.equipment}>
                      {value}
                    </option>
                  );
                })}
              </select>
            </div>
            <div className="pt-2">
              <BuilderExerciseSets
                exerciseIndex={props.index}
                dayIndex={props.dayIndex}
                weekIndex={props.weekIndex}
                sets={props.exercise.sets}
                dispatch={props.dispatch}
              />
            </div>
          </div>
        </div>
        <h4 className="font-bold">Contributions:</h4>
        <ul>
          {CollectionUtils.sort(
            ObjectUtils.keys(musclePoints),
            (a, b) => (musclePoints[b] || 0) - (musclePoints[a] || 0)
          )
            .filter((a) => (musclePoints[a] || 0) > 0)
            .map((key) => {
              return (
                <li>
                  {StringUtils.capitalize(key)} - {musclePointValue((musclePoints[key] || 0) * 100)}
                </li>
              );
            })}
        </ul>
        <div className="mt-2">
          <LinkButton
            onClick={() => {
              props.dispatch([
                lb<IBuilderState>().p("ui").p("modalSubstitute").record({
                  weekIndex: props.weekIndex,
                  dayIndex: props.dayIndex,
                  exerciseIndex: props.index,
                  exerciseType: props.exercise.exerciseType,
                }),
              ]);
            }}
          >
            Substitute
          </LinkButton>
        </div>
      </div>
      <div className="pl-4" style={{ flex: 2 }}>
        <div>
          <label className="flex items-center py-2">
            <input
              type="checkbox"
              className="text-bluev2 checkbox"
              checked={props.exercise.isSuperset}
              onChange={(e: Event): void => {
                props.dispatch([lbe.p("isSuperset").record(!!(e.target as HTMLInputElement)?.checked)]);
              }}
            />
            <span className="ml-2">Superset</span>
          </label>
        </div>
        <div className="py-1" style={{ opacity: props.exercise.isSuperset ? 0.5 : 1 }}>
          <span className="font-bold">Rest Timer: </span>
          <BuilderLinkInlineInput
            maxLength={5}
            disabled={props.exercise.isSuperset}
            type="tel"
            value={props.exercise.restTimer}
            onInputNumber={(num) => props.dispatch([lbe.p("restTimer").record(num)])}
          />
          <span className="font-bold"> sec</span>
        </div>
        <div className="py-1">
          <span className="font-bold">1 RM: </span>
          <BuilderLinkInlineInput
            maxLength={5}
            type="tel"
            value={props.exercise.onerm.value}
            onInputNumber={(num) => {
              props.dispatch([lbe.p("onerm").record(Weight.build(num, props.settings.unit))]);
            }}
          />
          <span className="font-bold"> {props.settings.unit}</span>
        </div>
        <h4 className="pt-1 font-bold">Weekly Stats:</h4>
        <div className="pl-2">
          <span>Intensity: </span>
          <span className="font-bold">
            {Weight.display(
              BuilderWeekModel.calculateIntensity(props.week, props.exercise.exerciseType, props.settings.unit)
            )}
          </span>
        </div>
        <div className="pl-2">
          <div className="font-bold">Volume: </div>
          {ObjectUtils.keys(volumeSplit).map((key) => {
            return (
              <div className="text-grayv2-main">
                <div className="inline-block text-right" style={{ width: "9rem" }}>
                  1RM <strong>{volumeSplitKeyToName(key)}</strong> sets:
                </div>
                <div className="inline-block w-8 ml-1 text-left">{volumeSplitValue(key, volumeSplit[key])}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function volumeSplitKeyToName(key: keyof IVolumeSplit): string {
  switch (key) {
    case "rmLess60":
      return "<60%";
    case "rm60":
      return "60%-75%";
    case "rm75":
      return "75%-85%";
    case "rm85":
      return ">85%";
  }
}

function volumeSplitValue(key: keyof IVolumeSplit, value: number): JSX.Element {
  let color = "";
  switch (key) {
    case "rmLess60":
      if (value > 100) {
        color = "text-greenv2-main";
      } else if (value > 75) {
        color = "text-yellowv2";
      } else {
        color = "text-redv2-main";
      }
      break;
    case "rm60":
      if (value > 50) {
        color = "text-greenv2-main";
      } else if (value > 25) {
        color = "text-yellowv2";
      } else {
        color = "text-redv2-main";
      }
      break;
    case "rm75":
      if (value > 25) {
        color = "text-greenv2-main";
      } else if (value > 15) {
        color = "text-yellowv2";
      } else {
        color = "text-redv2-main";
      }
      break;
    case "rm85":
      if (value > 15) {
        color = "text-greenv2-main";
      } else if (value > 5) {
        color = "text-yellowv2";
      } else {
        color = "text-redv2-main";
      }
      break;
  }

  return <span className={color}>{value}</span>;
}

function musclePointValue(value: number): JSX.Element {
  let color = "";
  if (value > 60) {
    color = "text-greenv2-main";
  } else if (value > 30) {
    color = "text-yellowv2";
  } else {
    color = "text-redv2-main";
  }

  return (
    <span>
      <span className={color}>{value.toFixed(0)}%</span>
    </span>
  );
}
