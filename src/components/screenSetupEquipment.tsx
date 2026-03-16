import { JSX, h } from "preact";
import { IDispatch } from "../ducks/types";
import { ISettings, IStats } from "../types";
import { INavCommon, IState } from "../models/state";
import { NavbarView } from "./navbar";
import { Surface } from "./surface";
import { Thunk_pushScreen } from "../ducks/thunks";
import { Button } from "./button";
import { EquipmentSettings, equipmentToIcon } from "./equipmentSettings";
import { Equipment_getCurrentGym, Equipment_getEquipmentData, Equipment_getEquipmentOfGym } from "../models/equipment";
import { equipmentName } from "../models/exercise";
import { lb } from "lens-shmens";
import { ObjectUtils_keys } from "../utils/object";

interface IScreenSetupEquipmentProps {
  dispatch: IDispatch;
  settings: ISettings;
  selectedGymId?: string;
  stats: IStats;
  navCommon: INavCommon;
}

export function ScreenSetupEquipment(props: IScreenSetupEquipmentProps): JSX.Element {
  const currentGym = Equipment_getCurrentGym(props.settings);
  const allEquipment = Equipment_getEquipmentOfGym(props.settings, props.selectedGymId);
  return (
    <section className="flex flex-col h-screen text-text-primary bg-background-default">
      <div className="flex-1 px-4 pt-8 pb-4 overflow-y-auto">
        <div className="p-4 text-center">
          <img
            src="/images/dinoequipment.png"
            className="inline-block object-cover h-60"
            alt="Dino with gym equipment"
          />
        </div>
        <div className="px-2 -mt-1">
          <h2 className="mb-2 text-xl font-bold text-center text-text-primary">What equipment do you have?</h2>
          <p className="mb-4 text-sm text-center text-text-secondary">
            Toggle on the equipment available at your gym. This helps the app round weights to what you can actually
            load.
          </p>

          <div className="space-y-2">
            {ObjectUtils_keys(allEquipment)
              .filter((e) => !allEquipment[e]?.isDeleted)
              .map((eqid) => {
                const equipmentData = Equipment_getEquipmentData(props.settings, eqid);
                const isEnabled = equipmentData && !equipmentData.isDeleted;
                const name = equipmentName(eqid, allEquipment);
                const icon = equipmentToIcon[eqid] ? equipmentToIcon[eqid]() : null;
                return (
                  <label
                    key={eqid}
                    className={`flex items-center gap-3 px-4 py-3 border rounded-xl cursor-pointer ${
                      isEnabled
                        ? "bg-background-subtlecardpurple border-border-cardpurple"
                        : "bg-background-default border-border-neutral"
                    }`}
                  >
                    {icon && <div>{icon}</div>}
                    <span className="flex-1 text-sm font-medium">{name}</span>
                    <input
                      type="checkbox"
                      checked={isEnabled}
                      className="block checkbox text-text-link"
                      data-cy={`equipment-toggle-${eqid}`}
                      onChange={() => {
                        props.dispatch({
                          type: "UpdateState",
                          lensRecording: [
                            lb<IState>()
                              .p("storage")
                              .p("settings")
                              .p("gyms")
                              .findBy("id", currentGym.id)
                              .p("equipment")
                              .pi(eqid)
                              .p("isDeleted")
                              .record(!isEnabled ? false : true),
                          ],
                          desc: `Toggle equipment ${eqid}`,
                        });
                      }}
                    />
                  </label>
                );
              })}
          </div>
        </div>
      </div>
      <div className="safe-area-inset-bottom">
        <div className="flex gap-2 px-4 pt-2 pb-8" style={{ boxShadow: "0 0 4px 0 rgba(0, 0, 0, 0.2)" }}>
          <Button
            className="flex-1"
            name="setup-equipment-skip"
            kind="lightgrayv3"
            buttonSize="lg"
            data-cy="setup-equipment-skip"
            onClick={() => props.dispatch(Thunk_pushScreen("programselect"))}
          >
            Skip
          </Button>
          <Button
            className="flex-1"
            name="setup-equipment-continue"
            kind="purple"
            buttonSize="lg"
            data-cy="setup-equipment-continue"
            onClick={() => props.dispatch(Thunk_pushScreen("setupplates"))}
          >
            Set up plates
          </Button>
        </div>
      </div>
    </section>
  );
}

interface IScreenSetupPlatesProps {
  dispatch: IDispatch;
  settings: ISettings;
  stats: IStats;
  navCommon: INavCommon;
}

export function ScreenSetupPlates(props: IScreenSetupPlatesProps): JSX.Element {
  const currentGym = Equipment_getCurrentGym(props.settings);
  return (
    <Surface
      navbar={<NavbarView navCommon={props.navCommon} dispatch={props.dispatch} title="Set Up Plates" />}
      footer={
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
                  name="setup-plates-continue"
                  kind="purple"
                  buttonSize="lg"
                  onClick={() => props.dispatch(Thunk_pushScreen("programselect"))}
                  data-cy="setup-plates-continue"
                >
                  Continue
                </Button>
              </div>
            </div>
          </div>
        </div>
      }
    >
      <section>
        <div className="p-4 text-center">
          <img src="/images/dinoplates.png" className="inline-block object-cover h-52" alt="Dino with plates" />
        </div>
        <div className="px-4 pb-4">
          <h2 className="mb-2 text-xl font-bold text-center text-text-primary">Set up your plates</h2>
          <p className="text-sm text-center text-text-secondary">
            Configure the <strong>bar weight</strong> and <strong>plates</strong> you have for each equipment type. The
            app uses this to round program weights to what you can actually load.
          </p>
        </div>
        <EquipmentSettings
          stats={props.stats}
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
