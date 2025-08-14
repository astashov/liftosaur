import { JSX, h } from "preact";
import { IDispatch } from "../ducks/types";
import { ISettings } from "../types";
import { INavCommon, IState } from "../models/state";
import { NavbarView } from "./navbar";
import { Surface } from "./surface";
import { Thunk } from "../ducks/thunks";
import { Button } from "./button";
import { EquipmentSettings } from "./equipmentSettings";
import { Equipment } from "../models/equipment";
import { lb } from "lens-shmens";

interface IScreenSetupEquipmentProps {
  dispatch: IDispatch;
  settings: ISettings;
  navCommon: INavCommon;
}

export function ScreenSetupEquipment(props: IScreenSetupEquipmentProps): JSX.Element {
  const currentGym = Equipment.getCurrentGym(props.settings);
  return (
    <Surface
      navbar={<NavbarView navCommon={props.navCommon} dispatch={props.dispatch} title="Setup Equipment" />}
      footer={
        <Footer
          onContinue={() => {
            props.dispatch(Thunk.pushScreen("programs"));
          }}
        />
      }
    >
      <section>
        <p className="px-4 pb-2 text-sm">
          Equipment is used for <strong>rounding</strong> weights. You can <strong>assign</strong> this equipment to
          exercises. The app will use info about what <strong>bar</strong> and <strong>plates</strong> you have, or what{" "}
          <strong>dumbbells</strong> you have to round program weights. Program weights could be e.g. percentages of 1RM
          like 80%, or values like 124.45lb, and they'll be rounded to the weights you can do in a workout (e.g. 125lb)
        </p>
        <p className="px-4 pb-2 text-sm">
          Set up <strong>bar/plates</strong>, or <strong>fixed weights</strong> for the equipment you have. Hide the
          equipment you don't have.
        </p>
        <p className="px-4 pb-4 text-sm font-bold text-grayv3-main">
          You can skip it - and do it later during your first workout!
        </p>
        <EquipmentSettings
          lensPrefix={lb<IState>()
            .p("storage")
            .p("settings")
            .p("gyms")
            .findBy("id", currentGym.id)
            .p("equipment")
            .get()}
          dispatch={props.dispatch}
          allEquipment={currentGym.equipment}
          settings={props.settings}
        />
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
        className="box-content absolute flex bg-white safe-area-inset-bottom"
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
