import { h, JSX, Fragment } from "preact";
import { useState } from "preact/hooks";
import { IDayData, IHistoryEntry, IProgramExercise, ISettings } from "../../types";
import { GroupHeader } from "../groupHeader";
import { MenuItemWrapper } from "../menuItem";
import { MenuItemEditable } from "../menuItemEditable";
import { EditProgramExerciseTimer } from "./editProgramExerciseTimer";

interface IProps {
  onChangeTimer: (value: string) => void;
  onChangeQuickAddSets: (value: boolean) => void;
  onChangeEnableRpe: (value: boolean) => void;
  onChangeEnableRepRanges: (value: boolean) => void;
  onValid: (isValid: boolean) => void;
  areVariationsEnabled: boolean;
  onEnableVariations: (value: boolean) => void;
  dayData: IDayData;
  settings: ISettings;
  programExercise: IProgramExercise;
  entry?: IHistoryEntry;
}

export function EditProgramExtraFeatures(props: IProps): JSX.Element {
  const { programExercise } = props;
  const [showTimer, setShowTimer] = useState(!!programExercise.timerExpr);

  return (
    <div>
      <GroupHeader
        topPadding={true}
        name="Extra features"
        help={
          <>
            <div>
              <strong>Timer: </strong> Liftoscript expression for the exercise's timer. If empty, will use default
              global timer from Settings.
            </div>
            <div>
              <strong>Set Variations: </strong> Enable if you want different number of set schemes based on a condition.
            </div>
            <div>
              <strong>Quick Add Sets: </strong> There will be + button next to last set on the workout screen, so you
              can quickly add a set. Useful for set-based programs, where you progress based on how many sets you can
              do. based on
            </div>
            <div>
              <strong>Enable RPE: </strong> For each set, you'll be able to set required RPEs and potentially enable
              logging completed RPE. RPE (Rate of Perceived Exertion) is a measure of how hard the set was, very popular
              in hypertrophy programs. It's a scale from 1 to 10, where 10 is you cannot possibly do any rep, 9 - you
              still could do another rep, 8 - 2 reps, etc. You can use Liftoscript to specify required RPE, and access
              required and completed RPE in the finish day script (by <code>RPE</code> and <code>completedRPE</code>{" "}
              variables).
            </div>
            <div>
              <strong>Enable rep ranges: </strong> For each set, you'll be able to set min reps, as a Liftoscript
              expression. If it's set, it'll be used during workouts, and would mark the set yellow if you're below the
              max reps, but equal or above the min reps. You can use it in the finish day scripts too - all the min reps
              would be available in the <code>minReps</code> variable, similar to the <code>reps</code> variable.
            </div>
          </>
        }
      />
      {props.areVariationsEnabled ? (
        <MenuItemWrapper name="set-variations-are-enabled">
          <div className="py-2">Set Variations are enabled</div>
        </MenuItemWrapper>
      ) : (
        <MenuItemEditable
          type="boolean"
          name="Enable Set Variations"
          value={props.areVariationsEnabled ? "true" : "false"}
          onChange={(v) => {
            props.onEnableVariations(v === "true");
          }}
        />
      )}
      <MenuItemEditable
        type="boolean"
        name="Enable Exercise Rest Timer"
        value={showTimer ? "true" : "false"}
        onChange={(v) => {
          setShowTimer(v === "true");
          if (v !== "true") {
            props.onChangeTimer("");
          }
        }}
        nextLine={
          showTimer ? (
            <div className="pl-4">
              <EditProgramExerciseTimer
                dayData={props.dayData}
                settings={props.settings}
                state={programExercise.state}
                exerciseType={programExercise.exerciseType}
                timerExpr={programExercise.timerExpr}
                onValid={props.onValid}
                onChangeTimer={props.onChangeTimer}
                entry={props.entry}
              />
            </div>
          ) : undefined
        }
      />
      <MenuItemEditable
        type="boolean"
        name="Enable Quick Add Sets"
        value={programExercise.quickAddSets ? "true" : "false"}
        onChange={(v) => {
          props.onChangeQuickAddSets(v === "true");
        }}
      />
      <MenuItemEditable
        type="boolean"
        name="Enable RPE"
        value={programExercise.enableRpe ? "true" : "false"}
        onChange={(v) => {
          props.onChangeEnableRpe(v === "true");
        }}
      />
      <MenuItemEditable
        type="boolean"
        name="Enable rep ranges"
        value={programExercise.enableRepRanges ? "true" : "false"}
        onChange={(v) => {
          props.onChangeEnableRepRanges(v === "true");
        }}
      />
    </div>
  );
}
