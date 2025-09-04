import { lf } from "lens-shmens";
import { h, JSX } from "preact";
import { GroupHeader } from "../../../components/groupHeader";
import { Input } from "../../../components/input";
import { MenuItemValue } from "../../../components/menuItemEditable";
import { Modal } from "../../../components/modal";
import { IPlannerSettings, ISettings, IUnit, screenMuscles } from "../../../types";
import { ObjectUtils } from "../../../utils/object";
import { StringUtils } from "../../../utils/string";

interface IModalPlannerSettingsProps {
  settings: ISettings;
  inApp: boolean;
  onNewSettings: (settings: ISettings) => void;
  onClose: () => void;
}

export function ModalPlannerSettings(props: IModalPlannerSettingsProps): JSX.Element {
  let allWeeklySetsMin: number | undefined;
  if (
    ObjectUtils.keys(props.settings.planner.weeklyRangeSets).every(
      (k) => props.settings.planner.weeklyRangeSets[k]?.[0] === props.settings.planner.weeklyRangeSets.abs?.[0]
    )
  ) {
    allWeeklySetsMin = props.settings.planner.weeklyRangeSets.abs?.[0];
  } else {
    allWeeklySetsMin = undefined;
  }

  let allWeeklySetsMax: number | undefined;
  if (
    ObjectUtils.keys(props.settings.planner.weeklyRangeSets).every(
      (k) => props.settings.planner.weeklyRangeSets[k]?.[1] === props.settings.planner.weeklyRangeSets.abs?.[1]
    )
  ) {
    allWeeklySetsMax = props.settings.planner.weeklyRangeSets.abs?.[1];
  } else {
    allWeeklySetsMax = undefined;
  }

  let allWeeklyFrequency: number | undefined;
  if (
    ObjectUtils.keys(props.settings.planner.weeklyFrequency).every(
      (k) => props.settings.planner.weeklyFrequency[k] === props.settings.planner.weeklyFrequency.abs
    )
  ) {
    allWeeklyFrequency = props.settings.planner.weeklyFrequency.abs;
  } else {
    allWeeklyFrequency = undefined;
  }

  return (
    <Modal shouldShowClose={true} onClose={props.onClose}>
      <GroupHeader size="large" name="Muscle Settings" />
      <form className="mt-2" style={{ minWidth: props.inApp ? "auto" : "32rem" }}>
        {!props.inApp && (
          <div className="mb-1">
            <label>
              <span className="mr-2">Units:</span>
              <MenuItemValue
                name="Sets split preset"
                setPatternError={() => undefined}
                type="desktop-select"
                value={props.settings.units}
                values={[
                  ["lb", "lb"],
                  ["kg", "kg"],
                ]}
                onChange={(newValue) => {
                  props.onNewSettings(
                    lf(props.settings)
                      .p("units")
                      .set(newValue as IUnit)
                  );
                }}
              />
            </label>
          </div>
        )}
        <div className="flex mb-2" style={{ gap: "1rem" }}>
          {!props.inApp && (
            <div className="flex-1">
              <Input
                label="Rest Timer"
                min={0}
                type="number"
                value={props.settings.timers.workout ?? 180}
                changeHandler={(e) => {
                  if (e.success) {
                    const value = parseInt(e.data, 10);
                    if (!isNaN(value)) {
                      const clampedValue = Math.max(0, value);
                      props.onNewSettings(lf(props.settings).p("timers").p("workout").set(clampedValue));
                    }
                  }
                }}
              />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <Input
              label="Synergist multiplier"
              min={0}
              type="number"
              value={props.settings.planner.synergistMultiplier}
              changeHandler={(e) => {
                if (e.success) {
                  const value = parseFloat(e.data);
                  if (!isNaN(value)) {
                    const clampedValue = Math.max(0, value);
                    props.onNewSettings(lf(props.settings).p("planner").p("synergistMultiplier").set(clampedValue));
                  }
                }
              }}
            />
          </div>
        </div>
        <div className="mt-4 mb-1">
          <label>
            <span className="mr-2">Sets split preset:</span>
            <MenuItemValue
              name="Sets split preset"
              setPatternError={() => undefined}
              type="desktop-select"
              value=""
              values={[
                ["", ""],
                ["strength", "Strength"],
                ["hypertrophy", "Hypertrophy"],
              ]}
              onChange={(newValue) => {
                if (newValue === "strength") {
                  props.onNewSettings(
                    lf(lf(props.settings).p("planner").p("strengthSetsPct").set(70))
                      .p("planner")
                      .p("hypertrophySetsPct")
                      .set(30)
                  );
                } else if (newValue === "hypertrophy") {
                  props.onNewSettings(
                    lf(lf(props.settings).p("planner").p("strengthSetsPct").set(30))
                      .p("planner")
                      .p("hypertrophySetsPct")
                      .set(70)
                  );
                }
              }}
            />
          </label>
        </div>
        <div className="flex flex-col mb-2 sm:flex-row" style={{ gap: props.inApp ? "0.25rem" : "1rem" }}>
          <div className="flex-1">
            <Input
              label="Strength sets %"
              min={0}
              max={100}
              type="number"
              value={props.settings.planner.strengthSetsPct}
              changeHandler={(e) => {
                if (e.success) {
                  const value = parseInt(e.data, 10);
                  if (!isNaN(value)) {
                    const clampedValue = Math.min(100, Math.max(0, value));
                    props.onNewSettings(lf(props.settings).p("planner").p("strengthSetsPct").set(clampedValue));
                  }
                }
              }}
            />
          </div>
          <div className="flex-1">
            <Input
              label="Hypertrophy sets %"
              min={0}
              max={100}
              type="number"
              value={props.settings.planner.hypertrophySetsPct}
              changeHandler={(e) => {
                if (e.success) {
                  const value = parseInt(e.data, 10);
                  if (!isNaN(value)) {
                    const clampedValue = Math.min(100, Math.max(0, value));
                    props.onNewSettings(lf(props.settings).p("planner").p("hypertrophySetsPct").set(clampedValue));
                  }
                }
              }}
            />
          </div>
        </div>
        <div className="mt-8 mb-1 text-base font-bold">Weekly Sets Per Muscle Group</div>
        <div className="mb-1">
          <label>
            <span className="mr-2">Muscle Groups sets preset:</span>
            <MenuItemValue
              name="Sets split preset"
              setPatternError={() => undefined}
              type="desktop-select"
              value=""
              values={[
                ["", ""],
                ["novice", "Novice"],
                ["intermediate", "Intermediate"],
                ["advanced", "Advanced"],
              ]}
              onChange={(newValue) => {
                if (newValue === "novice") {
                  let newSettings = lf(props.settings)
                    .p("planner")
                    .p("weeklyRangeSets")
                    .set(
                      ObjectUtils.mapValues(props.settings.planner.weeklyRangeSets, (e) => [10, 12] as [number, number])
                    );
                  newSettings = lf(newSettings)
                    .p("planner")
                    .p("weeklyFrequency")
                    .set(ObjectUtils.mapValues(newSettings.planner.weeklyFrequency, (e) => 2));
                  props.onNewSettings(newSettings);
                } else if (newValue === "intermediate") {
                  let newSettings = lf(props.settings)
                    .p("planner")
                    .p("weeklyRangeSets")
                    .set(
                      ObjectUtils.mapValues(props.settings.planner.weeklyRangeSets, (e) => [13, 15] as [number, number])
                    );
                  newSettings = lf(newSettings)
                    .p("planner")
                    .p("weeklyFrequency")
                    .set(ObjectUtils.mapValues(newSettings.planner.weeklyFrequency, (e) => 3));
                  props.onNewSettings(newSettings);
                } else if (newValue === "advanced") {
                  let newSettings = lf(props.settings)
                    .p("planner")
                    .p("weeklyRangeSets")
                    .set(
                      ObjectUtils.mapValues(props.settings.planner.weeklyRangeSets, (e) => [16, 20] as [number, number])
                    );
                  newSettings = lf(newSettings)
                    .p("planner")
                    .p("weeklyFrequency")
                    .set(ObjectUtils.mapValues(newSettings.planner.weeklyFrequency, (e) => 4));
                  props.onNewSettings(newSettings);
                }
              }}
            />
          </label>
        </div>
        <ul>
          <li className={`${!props.inApp ? "flex" : ""} flex-col items-start mb-2 sm:items-center sm:flex-row`}>
            <div className="w-32 text-sm font-bold text-redv2-700 sm:text-base">Change All</div>
            <div className="flex flex-1" style={{ gap: "0.5rem" }}>
              <div className="min-w-0" style={{ flex: 2 }}>
                <Input
                  label="Min"
                  min={0}
                  labelSize="xs"
                  type="number"
                  value={allWeeklySetsMin}
                  changeHandler={(e) => {
                    if (e.success) {
                      const value = parseInt(e.data, 10);
                      if (!isNaN(value)) {
                        const clampedValue = Math.max(0, value);
                        const newSets = ObjectUtils.keys(props.settings.planner.weeklyRangeSets).reduce<
                          IPlannerSettings["weeklyRangeSets"]
                        >(
                          (acc, k) => {
                            acc[k] = [clampedValue, props.settings.planner.weeklyRangeSets[k]?.[1] ?? 0];
                            return acc;
                          },
                          {} as IPlannerSettings["weeklyRangeSets"]
                        );
                        props.onNewSettings(lf(props.settings).p("planner").p("weeklyRangeSets").set(newSets));
                      }
                    }
                  }}
                />
              </div>
              <div className="min-w-0" style={{ flex: 2 }}>
                <Input
                  label="Max"
                  min={0}
                  labelSize="xs"
                  type="number"
                  value={allWeeklySetsMax}
                  changeHandler={(e) => {
                    if (e.success) {
                      const value = parseInt(e.data, 10);
                      if (!isNaN(value)) {
                        const clampedValue = Math.max(0, value);
                        const newSets = ObjectUtils.keys(props.settings.planner.weeklyRangeSets).reduce<
                          IPlannerSettings["weeklyRangeSets"]
                        >(
                          (acc, k) => {
                            acc[k] = [props.settings.planner.weeklyRangeSets[k]?.[0] ?? 0, clampedValue];
                            return acc;
                          },
                          {} as IPlannerSettings["weeklyRangeSets"]
                        );
                        props.onNewSettings(lf(props.settings).p("planner").p("weeklyRangeSets").set(newSets));
                      }
                    }
                  }}
                />
              </div>
              <div className="min-w-0" style={{ flex: 3 }}>
                <Input
                  label="Freq, days"
                  labelSize="xs"
                  min={0}
                  type="number"
                  value={allWeeklyFrequency}
                  changeHandler={(e) => {
                    if (e.success) {
                      const value = parseInt(e.data, 10);
                      if (!isNaN(value)) {
                        const clampedValue = Math.max(0, value);
                        const newSets = ObjectUtils.keys(props.settings.planner.weeklyFrequency).reduce<
                          IPlannerSettings["weeklyFrequency"]
                        >(
                          (acc, k) => {
                            acc[k] = clampedValue;
                            return acc;
                          },
                          {} as IPlannerSettings["weeklyFrequency"]
                        );
                        props.onNewSettings(lf(props.settings).p("planner").p("weeklyFrequency").set(newSets));
                      }
                    }
                  }}
                />
              </div>
            </div>
          </li>
          {screenMuscles.map((muscleGroup) => {
            return (
              <li className={`${!props.inApp ? "flex" : ""} flex-col items-start mb-2 sm:items-center sm:flex-row`}>
                <div className="w-32 text-xs font-bold sm:text-sm">{StringUtils.capitalize(muscleGroup)}</div>
                <div className="flex flex-1" style={{ gap: "0.5rem" }}>
                  <div className="min-w-0" style={{ flex: 2 }}>
                    <Input
                      label="Min"
                      min={0}
                      type="number"
                      labelSize="xs"
                      value={props.settings.planner.weeklyRangeSets[muscleGroup]?.[0]}
                      changeHandler={(e) => {
                        if (e.success) {
                          const value = parseInt(e.data, 10);
                          if (!isNaN(value)) {
                            const clampedValue = Math.max(0, value);
                            props.onNewSettings(
                              lf(props.settings).p("planner").p("weeklyRangeSets").p(muscleGroup).i(0).set(clampedValue)
                            );
                          }
                        }
                      }}
                    />
                  </div>
                  <div className="min-w-0" style={{ flex: 2 }}>
                    <Input
                      label="Max"
                      labelSize="xs"
                      min={0}
                      type="number"
                      value={props.settings.planner.weeklyRangeSets[muscleGroup]?.[1]}
                      changeHandler={(e) => {
                        if (e.success) {
                          const value = parseInt(e.data, 10);
                          if (!isNaN(value)) {
                            const clampedValue = Math.max(0, value);
                            props.onNewSettings(
                              lf(props.settings).p("planner").p("weeklyRangeSets").p(muscleGroup).i(1).set(clampedValue)
                            );
                          }
                        }
                      }}
                    />
                  </div>
                  <div className="min-w-0" style={{ flex: 3 }}>
                    <Input
                      label="Freq, days"
                      min={0}
                      labelSize="xs"
                      type="number"
                      value={props.settings.planner.weeklyFrequency[muscleGroup]}
                      changeHandler={(e) => {
                        if (e.success) {
                          const value = parseInt(e.data, 10);
                          if (!isNaN(value)) {
                            const clampedValue = Math.max(0, value);
                            props.onNewSettings(
                              lf(props.settings).p("planner").p("weeklyFrequency").p(muscleGroup).set(clampedValue)
                            );
                          }
                        }
                      }}
                    />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </form>
    </Modal>
  );
}
