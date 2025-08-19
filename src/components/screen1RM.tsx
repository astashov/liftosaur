import { JSX, h } from "preact";
import { IDispatch } from "../ducks/types";
import { IExerciseType, IProgram, ISettings } from "../types";
import { INavCommon } from "../models/state";
import { NavbarView } from "./navbar";
import { Surface } from "./surface";
import { Thunk } from "../ducks/thunks";
import { Settings } from "../models/settings";
import { Exercise } from "../models/exercise";
import { ExerciseImage } from "./exerciseImage";
import { InputWeight2 } from "./inputWeight2";
import { Button } from "./button";
import { Weight } from "../models/weight";
import { useState } from "preact/hooks";

interface IScreen1RMProps {
  dispatch: IDispatch;
  settings: ISettings;
  program: IProgram;
  navCommon: INavCommon;
}

export function Screen1RM(props: IScreen1RMProps): JSX.Element {
  const [exerciseTypes] = useState<IExerciseType[]>(Settings.getExercisesWithUnset1RMs(props.program, props.settings));

  return (
    <Surface
      navbar={<NavbarView navCommon={props.navCommon} dispatch={props.dispatch} title="Set 1 Rep Maxes" />}
      footer={
        <Footer
          onContinue={() => {
            props.dispatch(Thunk.pushScreen("main", undefined, true));
          }}
        />
      }
    >
      <section>
        <p className="px-4 pb-2 text-sm">
          The selected program uses <strong>1RM</strong> - <strong>1 Rep Max</strong> weights - it calculates set
          weights based on what weight you can do for 1 rep max.
        </p>
        <p className="px-4 pb-2 text-sm">
          Enter your <strong>1 Rep Max</strong> for the following exercises. If you don't know it, but you know{" "}
          <strong>N rep max</strong> (for example, you remember you were able to do only 5 reps with 185lb) - use the{" "}
          <strong>1 Rep Max calculator in the keyboard</strong>.
        </p>
        <p className="px-4 pb-4 text-sm font-bold text-text-secondary">
          You can skip it - and do it later during your first workout!
        </p>
        <div className="table w-full">
          <div className="table-row-group">
            <div className="table-row text-xs border-b text-text-secondary border-background-subtle">
              <div className="table-cell pb-1 pl-4 font-normal text-left border-b border-background-subtle">Exercise</div>
              <div className="table-cell pb-1 pr-4 font-normal text-center border-b border-background-subtle">1 Rep Max</div>
            </div>
          </div>
          <div className="table-row-group">
            {exerciseTypes.map((exerciseType) => {
              const exercise = Exercise.get(exerciseType, props.settings.exercises);
              const onerm = Exercise.onerm(exerciseType, props.settings);
              return (
                <div className="table-row">
                  <div className="table-cell py-1 pl-4 align-middle border-b border-background-subtle">
                    <div className="flex items-center gap-4">
                      <div className="w-12">
                        <ExerciseImage
                          settings={props.settings}
                          className="w-full"
                          exerciseType={exerciseType}
                          size="small"
                        />
                      </div>
                      <div className="flex-1">
                        <span className="text-base font-semibold">
                          {Exercise.nameWithEquipment(exercise, props.settings)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="table-cell py-1 pr-4 text-sm align-middle border-b border-background-subtle">
                    <div className="flex justify-center">
                      <InputWeight2
                        name="onerm-weight"
                        width={4}
                        exerciseType={exerciseType}
                        data-cy="onerm-weight"
                        units={["lb", "kg"] as const}
                        onInput={(v) => {
                          if (v != null && !Weight.isPct(v)) {
                            Settings.setOneRM(props.dispatch, exerciseType, v, props.settings);
                          }
                        }}
                        onBlur={(v) => {
                          if (v != null && !Weight.isPct(v)) {
                            Settings.setOneRM(props.dispatch, exerciseType, v, props.settings);
                          }
                        }}
                        showUnitInside={true}
                        subscription={undefined}
                        value={onerm}
                        max={9999}
                        min={-9999}
                        settings={props.settings}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </Surface>
  );
}

interface IFooterProps {
  onContinue: () => void;
}

function Footer(props: IFooterProps): JSX.Element {
  return (
    <div
      className="fixed bottom-0 left-0 z-10 items-center w-full text-center pointer-events-none"
      style={{ marginBottom: "-2px" }}
    >
      <div
        className="box-content absolute flex bg-background-default safe-area-inset-bottom"
        style={{
          width: "4000px",
          marginLeft: "-2000px",
          left: "50%",
          height: "4.25rem",
          bottom: "0",
          boxShadow: "0 0 4px 0 rgba(0, 0, 0, 0.2)",
        }}
      />
      <div className="safe-area-inset-bottom">
        <div className="box-content relative z-10 flex px-2 py-4 pointer-events-auto">
          <div className="flex-1 w-full">
            <Button
              className="w-full"
              name="continue-1rms"
              kind="purple"
              buttonSize="lg"
              onClick={props.onContinue}
              data-cy="continue-1rms"
            >
              Continue
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
