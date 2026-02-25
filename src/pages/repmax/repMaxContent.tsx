import { h, JSX } from "preact";
import { useEffect, useState } from "preact/hooks";
import { InputNumber } from "../../components/inputNumber";
import { LinkButton } from "../../components/linkButton";
import { MathUtils_toWord, MathUtils_clamp, MathUtils_roundTo05 } from "../../utils/math";
import { StringUtils_capitalize } from "../../utils/string";
import { Weight_calculateRepMax, Weight_rpeMultiplier } from "../../models/weight";

export interface IRepMaxContentProps {
  reps: number | undefined;
}

export function RepMaxContent(props: IRepMaxContentProps): JSX.Element {
  const [rpeEnabled, setRpeEnabled] = useState(false);
  const [knownReps, setKnownReps] = useState<number | undefined>(undefined);
  const [knownRpe, setKnownRpe] = useState<number>(10);
  const [knownWeight, setKnownWeight] = useState<number>(100);
  const [reps, setReps] = useState<number | undefined>(props.reps);
  const repsWord = reps ? MathUtils_toWord(reps) : undefined;
  const [rpe, setRpe] = useState<number | undefined>(10);
  const weight =
    knownReps != null && knownWeight != null && reps
      ? Weight_calculateRepMax(knownReps, knownRpe ?? 10, knownWeight, reps, rpe ?? 10)
      : undefined;

  useEffect(() => {
    const onPopState = (e: PopStateEvent): void => {
      if (e.state.reps) {
        setReps(e.state.reps);
      }
    };
    window.addEventListener("popstate", onPopState);
    setTimeout(() => {
      const word = reps ? MathUtils_toWord(reps) : undefined;
      window.history.replaceState(
        { reps },
        `${word != null ? `${StringUtils_capitalize(word)} ` : ""}Rep Max Calculator | Liftosaur`,
        `/${word != null ? `${word}-` : ""}rep-max-calculator`
      );
    }, 0);
    return () => {
      window.removeEventListener("popstate", onPopState);
    };
  }, []);

  useEffect(() => {
    const word = reps ? MathUtils_toWord(reps) : undefined;
    window.history.replaceState({ reps }, "", `/${word != null ? `${word}-` : ""}rep-max-calculator`);
  }, [reps]);

  return (
    <div className="px-2 text-center">
      <div className="mb-4">
        <h1 className="px-6 text-2xl font-bold">
          {repsWord ? `${StringUtils_capitalize(repsWord)} ` : ""}Rep Max ({reps != null ? reps : ""}RM) calculator
        </h1>
        <div>
          <LinkButton name="enable-rpe" onClick={() => setRpeEnabled(!rpeEnabled)}>
            {rpeEnabled ? "Disable" : "Enable"} RPE
          </LinkButton>
        </div>
      </div>
      <div className="mb-2">
        <div className="mb-2">
          <h2 className="text-lg font-bold">
            Enter how many reps <span className="text-icon-yellow">you can do</span> with some weight
          </h2>
          {rpeEnabled && (
            <p className="text-xs text-text-secondary">
              Also you can specify RPE. If you don't know your RPE, leave it as <strong>10</strong>.
            </p>
          )}
        </div>
        <div className="flex items-center justify-center">
          <div className="flex flex-col items-center gap-2 px-6 py-3 mx-2 mb-4 bg-yellow-100 border border-orange-400 rounded-lg sm:flex-row">
            <div>
              <InputNumber
                label="Reps"
                value={knownReps}
                data-cy="known-reps-input"
                data-name="known-reps-input"
                min={1}
                max={24}
                step={1}
                className="w-10 outline-none no-arrows"
                onUpdate={(newValue) => {
                  setKnownReps(MathUtils_clamp(newValue, 1, 24));
                }}
              />
            </div>
            {rpeEnabled && <div className="hidden text-xl font-bold sm:block">@</div>}
            {rpeEnabled && (
              <div>
                <InputNumber
                  label="RPE"
                  value={knownRpe}
                  data-cy="known-rpe-input"
                  data-name="known-rpe-input"
                  min={0}
                  max={10}
                  step={0.5}
                  className="w-10 outline-none no-arrows"
                  onUpdate={(newValue) => {
                    setKnownRpe(MathUtils_clamp(newValue, 0, 10));
                  }}
                />
              </div>
            )}
            <div className="hidden text-xl font-bold sm:block">x</div>
            <div>
              <InputNumber
                label="Weight"
                value={knownWeight}
                data-cy="known-weight-input"
                data-name="known-weight-input"
                min={0}
                step={2.5}
                className="w-10 outline-none no-arrows"
                onUpdate={(newValue) => {
                  setKnownWeight(newValue);
                }}
              />
            </div>
          </div>
        </div>
      </div>
      <div className="mb-2">
        <div className="mb-2">
          <h2 className="text-lg font-bold">
            This would be your weight for <span className="text-icon-yellow">{reps}RM</span>
          </h2>
        </div>
        <div className="flex items-center justify-center">
          <div className="flex flex-col items-center gap-2 mx-2 mb-4 rounded-lg sm:flex-row">
            <div>
              <InputNumber
                label="Reps"
                value={reps}
                data-cy="reps-input"
                data-name="reps-input"
                min={1}
                max={24}
                step={1}
                className="w-10 outline-none no-arrows"
                onUpdate={(newValue) => {
                  setReps(MathUtils_clamp(newValue, 1, 24));
                }}
              />
            </div>
            {rpeEnabled && <div className="hidden text-xl font-bold sm:block">@</div>}
            {rpeEnabled && (
              <div>
                <InputNumber
                  label="RPE"
                  value={rpe}
                  data-cy="rpe-input"
                  data-name="rpe-input"
                  min={0}
                  max={10}
                  step={0.5}
                  className="w-10 outline-none no-arrows"
                  onUpdate={(newValue) => {
                    setRpe(MathUtils_clamp(newValue, 0, 10));
                  }}
                />
              </div>
            )}
            <div className="text-2xl font-bold">
              <span className="mx-2">=</span>
              <span className="text-text-purple">{weight == null ? "?" : weight}</span>
            </div>
          </div>
        </div>
      </div>
      <div className="mb-4">
        <OtherRepMaxes
          knownReps={knownReps}
          knownRpe={knownRpe}
          knownWeight={knownWeight}
          reps={reps}
          rpe={rpe}
          rpeEnabled={rpeEnabled}
        />
      </div>
      <div className="mb-4">
        <TMConverter />
      </div>
    </div>
  );
}

interface IOtherRepMaxesProps {
  knownReps: number | undefined;
  knownRpe: number | undefined;
  knownWeight: number | undefined;
  reps: number | undefined;
  rpe: number | undefined;
  rpeEnabled: boolean;
}

function OtherRepMaxes(props: IOtherRepMaxesProps): JSX.Element {
  const { knownReps, knownRpe, knownWeight, reps, rpe, rpeEnabled } = props;

  return (
    <div className="flex items-center justify-center">
      <div className="flex gap-6">
        <div>
          <div className="mb-2">
            <h2 className="text-lg font-bold">Other Rep Maxes</h2>
          </div>
          {knownReps != null && knownWeight != null && (
            <ul>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((r) => {
                if (r !== reps) {
                  const w = Weight_calculateRepMax(knownReps, knownRpe ?? 10, knownWeight, r, rpe ?? 10);
                  return (
                    <li key={r}>
                      {r}RM{rpeEnabled ? <span className="text-text-secondary">@{rpe ?? 10}</span> : ""}:{" "}
                      <strong>{w}</strong>
                    </li>
                  );
                }
                return null;
              })}
            </ul>
          )}
        </div>
        <div className="bg-border-neutral" style={{ width: "1px" }} />
        <div>
          <div className="mb-2">
            <h2 className="text-lg font-bold">1RM Percentages</h2>
          </div>
          <ul>
            {[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((r) => {
              const w = (Weight_rpeMultiplier(r, rpe ?? 10) * 100).toFixed(0);
              return (
                <li key={r}>
                  {r}RM{rpeEnabled ? <span className="text-text-secondary">@{rpe ?? 10}</span> : ""}:{" "}
                  <strong>{w}%</strong>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}

function TMConverter(): JSX.Element {
  const [tm, setTm] = useState<number>(90);
  const percentages: number[] = [];
  for (let i = 100; i > 0; i -= 2.5) {
    percentages.push(i);
  }

  return (
    <div className="flex items-center justify-center">
      <div className="flex">
        <div>
          <div className="mb-2">
            <h2 className="text-lg font-bold">Convert TM percentages into RM percentages</h2>
            <p className="text-xs text-text-secondary">Enter what percentage of RM your TM is</p>
          </div>
          <div className="mb-2">
            <InputNumber
              label="TM, %"
              value={tm}
              data-cy="tm-input"
              data-name="tm-input"
              min={0}
              max={200}
              step={2.5}
              className="w-10 outline-none no-arrows"
              onUpdate={(newValue) => {
                setTm(MathUtils_clamp(newValue, 0, 200));
              }}
            />
          </div>
          <ul>
            {percentages.map((pct) => {
              return (
                <li key={pct}>
                  <strong>{pct}%</strong> TM = <strong>{MathUtils_roundTo05(tm * (pct / 100)).toFixed(1)}%</strong> 1RM
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
