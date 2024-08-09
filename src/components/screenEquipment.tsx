import { h, JSX } from "preact";
import { IDispatch } from "../ducks/types";
import { ISettings, IEquipment, IAllEquipment } from "../types";
import { ILoading, IState, updateState } from "../models/state";
import { EquipmentSettings } from "./equipmentSettings";
import { lb } from "lens-shmens";
import { Surface } from "./surface";
import { NavbarView } from "./navbar";
import { Footer2View } from "./footer2";
import { IScreen, Screen } from "../models/screen";
import { HelpPlates } from "./help/helpPlates";
import { useEffect } from "preact/hooks";
import { MenuItemEditable } from "./menuItemEditable";

interface IProps {
  dispatch: IDispatch;
  settings: ISettings;
  expandedEquipment?: IEquipment;
  allEquipment: IAllEquipment;
  loading: ILoading;
  selectedGymId?: string;
  screenStack: IScreen[];
}

export function ScreenEquipment(props: IProps): JSX.Element {
  useEffect(() => {
    if (props.expandedEquipment) {
      const el = document.getElementById(props.expandedEquipment);
      if (el) {
        const offsetY = el.getBoundingClientRect().top + document.documentElement.scrollTop;
        window.scrollTo(0, offsetY - 70);
      }
      updateState(props.dispatch, [lb<IState>().p("defaultEquipmentExpanded").record(undefined)]);
    }
  }, []);
  const selectedGym = props.settings.gyms.find((g) => g.id === props.selectedGymId) ?? props.settings.gyms[0];

  return (
    <Surface
      navbar={
        <NavbarView
          loading={props.loading}
          dispatch={props.dispatch}
          screenStack={props.screenStack}
          title="Equipment Settings"
          helpContent={<HelpPlates />}
        />
      }
      footer={<Footer2View dispatch={props.dispatch} screen={Screen.current(props.screenStack)} />}
    >
      <section className="px-2">
        <div className="px-2 pb-2">
          {props.settings.gyms.length > 1 && (
            <MenuItemEditable
              type="text"
              name="Gym Name"
              value={selectedGym.name}
              onChange={(name) => {
                if (name) {
                  updateState(props.dispatch, [
                    lb<IState>()
                      .p("storage")
                      .p("settings")
                      .p("gyms")
                      .findBy("id", selectedGym.id)
                      .p("name")
                      .record(name),
                  ]);
                }
              }}
            />
          )}
        </div>
        <EquipmentSettings
          expandedEquipment={props.expandedEquipment}
          lensPrefix={lb<IState>()
            .p("storage")
            .p("settings")
            .p("gyms")
            .findBy("id", selectedGym.id)
            .p("equipment")
            .get()}
          dispatch={props.dispatch}
          allEquipment={props.allEquipment}
          settings={props.settings}
        />
      </section>
    </Surface>
  );
}
