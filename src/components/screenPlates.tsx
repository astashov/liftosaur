import { h, JSX } from "preact";
import { FooterView } from "./footer";
import { HeaderView } from "./header";
import { IDispatch } from "../ducks/types";
import { IPlate } from "../models/weight";
import { MenuItemEditable } from "./menuItemEditable";
import { Button } from "./button";
import { useState } from "preact/hooks";
import { ModalPlates } from "./modalPlates";
import { Lens } from "../utils/lens";
import { Settings } from "../models/settings";

interface IProps {
  dispatch: IDispatch;
  plates: IPlate[];
}

export function ScreenPlates(props: IProps): JSX.Element {
  const [shouldShowModal, setShouldShowModal] = useState<boolean>(false);
  const plates = [...props.plates];
  plates.sort((a, b) => b.weight - a.weight);

  return (
    <section className="flex flex-col h-full">
      <HeaderView
        title="Available Plates"
        left={<button onClick={() => props.dispatch({ type: "PullScreen" })}>Back</button>}
      />
      <section className="flex-1 w-full">
        {plates.map(plate => {
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
                  newPlates = props.plates.map(p => (p.weight === plate.weight ? { ...p, num } : p));
                } else {
                  newPlates = props.plates.filter(p => p.weight !== plate.weight);
                }
                const lensPlay = Lens.buildLensPlay(Settings.lens.plates, newPlates);
                props.dispatch({ type: "UpdateSettings", lensPlay });
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
          onInput={weight => {
            setShouldShowModal(false);
            if (weight != null && props.plates.every(p => p.weight !== weight)) {
              const newPlates: IPlate[] = [...props.plates, { weight, num: 0 }];
              const lensPlay = Lens.buildLensPlay(Settings.lens.plates, newPlates);
              props.dispatch({ type: "UpdateSettings", lensPlay });
            }
          }}
        />
      )}
    </section>
  );
}
