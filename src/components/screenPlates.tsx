import { h, JSX } from "preact";
import { FooterView } from "./footer";
import { HeaderView } from "./header";
import { IDispatch } from "../ducks/types";
import { Thunk } from "../ducks/thunks";
import { ObjectUtils } from "../utils/object";
import { ISettings, IEquipment } from "../types";
import { ILoading } from "../models/state";
import { EquipmentSettings } from "./equipmentSettings";
import { useState } from "preact/hooks";
import { ModalPlates } from "./modalPlates";
import { Weight } from "../models/weight";
import { lb } from "lens-shmens";
import { ModalNewFixedWeight } from "./modalNewFixedWeight";

interface IProps {
  dispatch: IDispatch;
  settings: ISettings;
  loading: ILoading;
}

export function ScreenPlates(props: IProps): JSX.Element {
  const [modalNewPlateEquipmentToShow, setModalNewPlateEquipmentToShow] = useState<IEquipment | undefined>(undefined);
  const [modalNewFixedWeightEquipmentToShow, setModalNewFixedWeightEquipmentToShow] = useState<IEquipment | undefined>(
    undefined
  );
  return (
    <section className="h-full">
      <HeaderView
        title="Equipment Settings"
        left={<button onClick={() => props.dispatch(Thunk.pullScreen())}>Back</button>}
      />
      <section style={{ paddingTop: "3.5rem", paddingBottom: "4rem" }}>
        {ObjectUtils.keys(props.settings.equipment).map((bar) => {
          const equipmentData = props.settings.equipment[bar];
          if (equipmentData) {
            return (
              <EquipmentSettings
                key={bar}
                dispatch={props.dispatch}
                equipment={bar}
                setModalNewPlateEquipmentToShow={setModalNewPlateEquipmentToShow}
                setModalNewFixedWeightEquipmentToShow={setModalNewFixedWeightEquipmentToShow}
                equipmentData={equipmentData}
                settings={props.settings}
              />
            );
          } else {
            return undefined;
          }
        })}
      </section>

      <FooterView loading={props.loading} dispatch={props.dispatch} />
      <ModalPlates
        isHidden={modalNewPlateEquipmentToShow == null}
        units={props.settings.units}
        onInput={(weight) => {
          setModalNewPlateEquipmentToShow(undefined);
          if (weight != null && modalNewPlateEquipmentToShow != null) {
            const newWeight = Weight.build(weight, props.settings.units);
            const plates =
              props.settings.equipment[modalNewPlateEquipmentToShow]?.plates.filter(
                (p) => p.weight.unit === props.settings.units
              ) || [];
            if (plates.every((p) => !Weight.eqeq(p.weight, newWeight))) {
              const lensRecording = lb<ISettings>()
                .p("equipment")
                .pi(modalNewPlateEquipmentToShow)
                .p("plates")
                .recordModify((p) => [...p, { weight: newWeight, num: 2 }]);
              props.dispatch({ type: "UpdateSettings", lensRecording });
            }
          }
        }}
      />
      <ModalNewFixedWeight
        isHidden={modalNewFixedWeightEquipmentToShow == null}
        equipment={modalNewFixedWeightEquipmentToShow || "barbell"}
        units={props.settings.units}
        onInput={(weight) => {
          setModalNewFixedWeightEquipmentToShow(undefined);
          if (weight != null && modalNewFixedWeightEquipmentToShow != null) {
            const newWeight = Weight.build(weight, props.settings.units);
            const fixedWeights =
              props.settings.equipment[modalNewFixedWeightEquipmentToShow]?.fixed.filter(
                (p) => p.unit === props.settings.units
              ) || [];
            if (fixedWeights.every((p) => !Weight.eqeq(p, newWeight))) {
              const lensRecording = lb<ISettings>()
                .p("equipment")
                .pi(modalNewFixedWeightEquipmentToShow)
                .p("fixed")
                .recordModify((p) => [...p, newWeight]);
              props.dispatch({ type: "UpdateSettings", lensRecording });
            }
          }
        }}
      />
    </section>
  );
}
