/* eslint-disable @typescript-eslint/ban-types */
import { h, JSX } from "preact";
import { IBuilderExercise, IBuilderSet } from "../models/types";
import { IBuilderDispatch, IBuilderState } from "../models/builderReducer";
import { IconTrash } from "../../../components/icons/iconTrash";
import { lb, LensBuilder } from "lens-shmens";
import { CollectionUtils } from "../../../utils/collection";
import { BuilderInlineInput } from "./builderInlineInput";
import { Weight } from "../../../models/weight";
import { IWeight } from "../../../types";
import { Settings } from "../../../models/settings";

interface IBuilderExerciseSetsProps {
  onerm: IWeight;
  sets: IBuilderSet[];
  exerciseIndex: number;
  dayIndex: number;
  weekIndex: number;
  dispatch: IBuilderDispatch;
}

export function BuilderExerciseSets(props: IBuilderExerciseSetsProps): JSX.Element {
  const lbe = lb<IBuilderState>()
    .p("current")
    .p("program")
    .p("weeks")
    .i(props.weekIndex)
    .p("days")
    .i(props.dayIndex)
    .p("exercises")
    .i(props.exerciseIndex);
  return (
    <div className="flex flex-wrap">
      {props.sets.map((set, index) => (
        <div className="relative pb-8">
          <BuilderExerciseSet onerm={props.onerm} index={index} lbe={lbe} set={set} dispatch={props.dispatch} />
          {props.sets.length > 1 && (
            <button
              className="absolute bottom-0 p-2"
              style={{ marginLeft: "-15px", left: "50%" }}
              onClick={() => {
                props.dispatch([lbe.p("sets").recordModify((sets) => CollectionUtils.removeAt(sets, index))]);
              }}
            >
              <IconTrash width={14} height={18} />
            </button>
          )}
        </div>
      ))}
      <div className="flex justify-center pb-8 align-middle">
        <div className="m-auto">
          <button
            className="block p-1"
            onClick={() => {
              const lastSet = props.sets[props.sets.length - 1];
              props.dispatch([
                lbe
                  .p("sets")
                  .recordModify((sets) => [
                    ...sets,
                    { weightPercentage: lastSet.weightPercentage, reps: lastSet.reps },
                  ]),
              ]);
            }}
          >
            <CreateButton size={24} />
          </button>
        </div>
      </div>
    </div>
  );
}

interface IBuilderExerciseSetProps {
  onerm: IWeight;
  set: IBuilderSet;
  index: number;
  lbe: LensBuilder<IBuilderState, IBuilderExercise, {}>;
  dispatch: IBuilderDispatch;
}

function BuilderExerciseSet(props: IBuilderExerciseSetProps): JSX.Element {
  const set = props.set;
  const lbe = props.lbe.p("sets").i(props.index);

  return (
    <div className="flex mx-1 leading-none">
      <div className="text-center">
        <div className="pb-1 font-bold border-b border-grayv2-200">
          <BuilderInlineInput
            type="tel"
            value={set.reps}
            className="text-lg text-center text-grayv2-main"
            maxLength={3}
            minWidth={1}
            onInputInt={(reps) => {
              props.dispatch([lbe.record({ ...set, reps })]);
            }}
          />
        </div>
        <div className="relative pt-2">
          <div
            className="absolute w-full text-center text-grayv2-400"
            style={{ top: "3px", left: 0, fontSize: "0.65rem" }}
          >
            {Weight.roundConvertTo(Weight.multiply(props.onerm, set.weightPercentage / 100), Settings.build()).value}
          </div>
          <BuilderInlineInput
            type="tel"
            value={set.weightPercentage}
            className="mt-1 text-sm font-bold text-center text-grayv2-main"
            maxLength={4}
            minWidth={1}
            onInputFloat={(weightPercentage) => {
              props.dispatch([lbe.record({ ...set, weightPercentage })]);
            }}
          />
          %
        </div>
      </div>
    </div>
  );
}

function CreateButton(props: { size: number }): JSX.Element {
  const size = props.size || 24;
  return (
    <svg width={size} height={size} viewBox="0 0 54 54" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="2" width="50" height="50" rx="25" fill="#8356F6" stroke="#E6DEFC" stroke-width="4" />
      <path
        fill-rule="venodd"
        clip-rule="evenodd"
        d="M27 19C27.8837 19 28.6 19.7163 28.6 20.6V25.4H33.4C34.2837 25.4 35 26.1163 35 27C35 27.8837 34.2836 28.6 33.4 28.6H28.6V33.4C28.6 34.2837 27.8837 35 27 35C26.1163 35 25.4 34.2837 25.4 33.4V28.6H20.6C19.7163 28.6 19 27.8837 19 27C19 26.1163 19.7163 25.4 20.6 25.4H25.4V20.6C25.4 19.7163 26.1163 19 27 19Z"
        fill="white"
      />
    </svg>
  );
}
