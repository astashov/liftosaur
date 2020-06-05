import { h, JSX } from "preact";
import { FooterView } from "./footer";
import { HeaderView } from "./header";
import { IDispatch } from "../ducks/types";
import { IPlate, IBars } from "../models/weight";
import { MenuItemEditable } from "./menuItemEditable";
import { Button } from "./button";
import { useState } from "preact/hooks";
import { ModalPlates } from "./modalPlates";
import { Lens } from "../utils/lens";
import { ISettings } from "../models/settings";
import { Thunk } from "../ducks/thunks";
import { GroupHeader } from "./groupHeader";
import { ObjectUtils } from "../utils/object";
import { StringUtils } from "../utils/string";

interface IProps {
  dispatch: IDispatch;
  plates: IPlate[];
  bars: IBars;
}

export function ScreenPlates(props: IProps): JSX.Element {
  const [shouldShowModal, setShouldShowModal] = useState<boolean>(false);
  const plates = [...props.plates];
  plates.sort((a, b) => b.weight - a.weight);

  return (
    <section className="h-full">
      <HeaderView
        title="Available Plates"
        left={<button onClick={() => props.dispatch(Thunk.pullScreen())}>Back</button>}
      />
      <section style={{ paddingTop: "3.5rem", paddingBottom: "4rem" }}>
        <GroupHeader name="Bars" />
        {ObjectUtils.keys(props.bars).map((bar) => {
          return (
            <MenuItemEditable
              name={StringUtils.capitalize(bar)}
              type="number"
              value={props.bars[bar].toString()}
              valueUnits="lb"
              onChange={(newValue?: string) => {
                const v = newValue != null && newValue !== "" ? parseInt(newValue, 10) : null;
                if (v != null) {
                  const lensRecording = Lens.build<ISettings>().p("bars").p(bar).record(v);
                  props.dispatch({ type: "UpdateSettings", lensRecording });
                }
              }}
            />
          );
        })}
        <GroupHeader name="Plates" />
        {plates.map((plate) => {
          return (
            <MenuItemEditable
              name={`${plate.weight} lb`}
              type="number"
              value={plate.num.toString()}
              hasClear={true}
              onChange={(newValue?: string) => {
                const v = newValue != null && newValue !== "" ? parseInt(newValue, 10) : null;
                let newPlates;
                if (v != null) {
                  const num = Math.floor(v / 2) * 2;
                  newPlates = props.plates.map((p) => (p.weight === plate.weight ? { ...p, num } : p));
                } else {
                  newPlates = props.plates.filter((p) => p.weight !== plate.weight);
                }
                const lensRecording = Lens.build<ISettings>().p("plates").record(newPlates);
                props.dispatch({ type: "UpdateSettings", lensRecording });
              }}
            />
          );
        })}
        <div className="p-2 text-center">
          <Button kind="green" onClick={() => setShouldShowModal(true)}>
            Add
          </Button>
        </div>
      </section>

      <FooterView dispatch={props.dispatch} />
      {shouldShowModal && (
        <ModalPlates
          onInput={(weight) => {
            setShouldShowModal(false);
            if (weight != null && props.plates.every((p) => p.weight !== weight)) {
              const newPlates: IPlate[] = [...props.plates, { weight, num: 0 }];
              const lensRecording = Lens.build<ISettings>().p("plates").record(newPlates);
              props.dispatch({ type: "UpdateSettings", lensRecording });
            }
          }}
        />
      )}
    </section>
  );
}
