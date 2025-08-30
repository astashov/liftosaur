import { h, JSX } from "preact";
import { IDispatch } from "../ducks/types";
import { ISettings, IEquipment, IAllEquipment, IStats } from "../types";
import { INavCommon, IState, updateState } from "../models/state";
import { EquipmentSettings } from "./equipmentSettings";
import { lb } from "lens-shmens";
import { Surface } from "./surface";
import { NavbarView } from "./navbar";
import { Footer2View } from "./footer2";
import { HelpPlates } from "./help/helpPlates";
import { useEffect } from "preact/hooks";
import { MenuItemEditable } from "./menuItemEditable";
import { LinkButton } from "./linkButton";
import { Thunk } from "../ducks/thunks";

interface IProps {
  dispatch: IDispatch;
  settings: ISettings;
  expandedEquipment?: IEquipment;
  stats: IStats;
  allEquipment: IAllEquipment;
  selectedGymId?: string;
  navCommon: INavCommon;
}

export function ScreenEquipment(props: IProps): JSX.Element {
  useEffect(() => {
    if (props.expandedEquipment) {
      const el = document.getElementById(props.expandedEquipment);
      if (el) {
        const offsetY = el.getBoundingClientRect().top + document.documentElement.scrollTop;
        window.scrollTo(0, offsetY - 70);
      }
      updateState(
        props.dispatch,
        [lb<IState>().p("defaultEquipmentExpanded").record(undefined)],
        "Clear expanded equipment"
      );
    }
  }, []);
  const selectedGym = props.settings.gyms.find((g) => g.id === props.selectedGymId) ?? props.settings.gyms[0];

  return (
    <Surface
      navbar={
        <NavbarView
          navCommon={props.navCommon}
          dispatch={props.dispatch}
          title="Equipment Settings"
          helpContent={<HelpPlates />}
        />
      }
      footer={<Footer2View navCommon={props.navCommon} dispatch={props.dispatch} />}
    >
      <section>
        <div className="px-4 pb-2">
          {props.settings.gyms.length > 1 && (
            <MenuItemEditable
              type="text"
              name="Gym Name"
              value={selectedGym.name}
              onChange={(name) => {
                if (name?.trim()) {
                  updateState(
                    props.dispatch,
                    [
                      lb<IState>()
                        .p("storage")
                        .p("settings")
                        .p("gyms")
                        .findBy("id", selectedGym.id)
                        .p("name")
                        .record(name.trim()),
                    ],
                    "Update gym name"
                  );
                }
              }}
            />
          )}
        </div>
        {props.settings.gyms.length === 1 && (
          <div className="px-2 mb-2 text-right">
            <LinkButton className="text-sm" name="add-new-gym" onClick={() => props.dispatch(Thunk.pushScreen("gyms"))}>
              Manage Gyms
            </LinkButton>
          </div>
        )}
        <EquipmentSettings
          stats={props.stats}
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
