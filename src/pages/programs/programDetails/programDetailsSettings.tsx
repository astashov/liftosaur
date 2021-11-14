import { lb } from "lens-shmens";
import { h, JSX } from "preact";
import { useState } from "preact/hooks";
import { Button } from "../../../components/button";
import { GroupHeader } from "../../../components/groupHeader";
import { MenuItemEditable } from "../../../components/menuItemEditable";
import { ModalPlates } from "../../../components/modalPlates";
import { Weight } from "../../../models/weight";
import { ISettings } from "../../../types";
import { ObjectUtils } from "../../../utils/object";
import { StringUtils } from "../../../utils/string";
import { IProgramDetailsDispatch, IProgramDetailsState } from "./types";

interface IProgramDetailsSettingsProps {
  settings: ISettings;
  dispatch: IProgramDetailsDispatch;
}

export function ProgramDetailsSettings(props: IProgramDetailsSettingsProps): JSX.Element {
  const { units } = props.settings;
  const bars = props.settings.bars[units];
  const plates = props.settings.plates.filter((p) => p.weight.unit === units);
  plates.sort((a, b) => Weight.compare(b.weight, a.weight));
  const [areSettingsShown, setAreSettingsShown] = useState(false);
  const [isShowingAddPlateModal, setIsShowingAddPlateModal] = useState(false);

  return (
    <div>
      <div>
        <button
          className="program-details-settings-button text-sm italic text-blue-700 underline"
          onClick={() => setAreSettingsShown(!areSettingsShown)}
        >
          {areSettingsShown ? "Hide Settings" : "Show Settings"}
        </button>
      </div>
      {areSettingsShown && (
        <div className="program-details-settings flex pb-4">
          <div className="flex-1">
            <GroupHeader name="Units" />
            <MenuItemEditable
              name="Weight"
              type="select"
              value={units}
              values={[
                ["lb", "lb"],
                ["kg", "kg"],
              ]}
              onChange={(newValue?: string) => {
                if (newValue) {
                  props.dispatch(
                    lb<IProgramDetailsState>()
                      .p("settings")
                      .p("units")
                      .record(newValue as "kg" | "lb")
                  );
                }
              }}
            />
            <GroupHeader name="Bars" />
            {ObjectUtils.keys(bars).map((bar) => {
              return (
                <MenuItemEditable
                  name={StringUtils.capitalize(bar)}
                  type="number"
                  value={bars[bar].value.toString()}
                  valueUnits={units}
                  onChange={(newValue?: string) => {
                    const v = newValue != null && newValue !== "" ? parseInt(newValue, 10) : null;
                    if (v != null) {
                      props.dispatch(
                        lb<IProgramDetailsState>()
                          .p("settings")
                          .p("bars")
                          .p(units)
                          .p(bar)
                          .record(Weight.build(v, units))
                      );
                    }
                  }}
                />
              );
            })}
          </div>
          <div className="flex-1">
            <GroupHeader name="Plates" />
            {plates.map((plate) => {
              return (
                <MenuItemEditable
                  name={`${plate.weight.value} ${units}`}
                  type="number"
                  value={plate.num.toString()}
                  hasClear={true}
                  onChange={(newValue?: string) => {
                    const v = newValue != null && newValue !== "" ? parseInt(newValue, 10) : null;
                    props.dispatch(
                      lb<IProgramDetailsState>()
                        .p("settings")
                        .p("plates")
                        .recordModify((pl) => {
                          let newPlates;
                          if (v != null) {
                            const num = Math.floor(v / 2) * 2;
                            newPlates = pl.map((p) => (Weight.eqeq(p.weight, plate.weight) ? { ...p, num } : p));
                          } else {
                            newPlates = pl.filter((p) => !Weight.eqeq(p.weight, plate.weight));
                          }
                          return newPlates;
                        })
                    );
                  }}
                />
              );
            })}
            <div className="p-2 text-center">
              <Button kind="green" onClick={() => setIsShowingAddPlateModal(true)}>
                Add Plate
              </Button>
            </div>
          </div>
        </div>
      )}
      <ModalPlates
        isHidden={!isShowingAddPlateModal}
        units={units}
        onInput={(weight) => {
          setIsShowingAddPlateModal(false);
          if (weight != null) {
            const newWeight = Weight.build(weight, units);
            if (plates.every((p) => !Weight.eqeq(p.weight, newWeight))) {
              const lensRecording = lb<IProgramDetailsState>()
                .p("settings")
                .p("plates")
                .recordModify((p) => [...p, { weight: newWeight, num: 0 }]);
              props.dispatch(lensRecording);
            }
          }
        }}
      />
    </div>
  );
}
