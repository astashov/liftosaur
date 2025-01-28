import { Fragment, h, JSX } from "preact";
import { IDispatch } from "../ducks/types";
import { IEquipment, IGym, ISettings } from "../types";
import { INavCommon, IState, updateState } from "../models/state";
import { Surface } from "./surface";
import { NavbarView } from "./navbar";
import { Footer2View } from "./footer2";
import { MenuItem } from "./menuItem";
import { StringUtils } from "../utils/string";
import { IconDuplicate2 } from "./icons/iconDuplicate2";
import { IconEditSquare } from "./icons/iconEditSquare";
import { IconTrash } from "./icons/iconTrash";
import { lb } from "lens-shmens";
import { CollectionUtils } from "../utils/collection";
import { UidFactory } from "../utils/generator";
import { ObjectUtils } from "../utils/object";
import { ModalNewGym } from "./modalNewGym";
import { useState } from "preact/hooks";
import { Thunk } from "../ducks/thunks";
import { LinkButton } from "./linkButton";
import { Settings } from "../models/settings";

interface IProps {
  dispatch: IDispatch;
  settings: ISettings;
  expandedEquipment?: IEquipment;
  navCommon: INavCommon;
}

export function ScreenGyms(props: IProps): JSX.Element {
  const gyms = props.settings.gyms;
  const [modalNewGym, setModalNewGym] = useState(false);
  return (
    <Surface
      navbar={<NavbarView navCommon={props.navCommon} dispatch={props.dispatch} title="Gyms" />}
      footer={<Footer2View navCommon={props.navCommon} dispatch={props.dispatch} />}
      addons={[
        <ModalNewGym
          isHidden={!modalNewGym}
          onInput={(name) => {
            if (name) {
              updateState(props.dispatch, [
                lb<IState>()
                  .p("storage")
                  .p("settings")
                  .p("gyms")
                  .recordModify((oldGyms) => {
                    const id = `gym-${UidFactory.generateUid(8)}`;
                    return [...oldGyms, { id, name, equipment: Settings.defaultEquipment() }];
                  }),
              ]);
            }
            setModalNewGym(false);
          }}
        />,
      ]}
    >
      <section className="px-4">
        {gyms.map((gym) => {
          return (
            <MenuItem
              name={gym.name}
              addons={
                gym.id === props.settings.currentGymId ? (
                  <div className="text-xs text-grayv2-main" style={{ marginTop: "-0.5rem" }}>
                    current
                  </div>
                ) : undefined
              }
              value={
                <Fragment>
                  <button
                    data-cy="edit-gym"
                    className="px-2 align-middle ls-gyms-list-edit-gym button"
                    onClick={() => {
                      updateState(props.dispatch, [lb<IState>().p("selectedGymId").record(gym.id)]);
                      props.dispatch(Thunk.pushScreen("plates"));
                    }}
                  >
                    <IconEditSquare />
                  </button>
                  <button
                    className="px-2 align-middle ls-gyms-list-copy-gym button"
                    onClick={() => {
                      updateState(props.dispatch, [
                        lb<IState>()
                          .p("storage")
                          .p("settings")
                          .p("gyms")
                          .recordModify((g) => {
                            const newGym: IGym = {
                              ...gym,
                              name: StringUtils.nextName(gym.name),
                              id: UidFactory.generateUid(8),
                              equipment: ObjectUtils.clone(gym.equipment),
                            };
                            return [...g, newGym];
                          }),
                      ]);
                    }}
                  >
                    <IconDuplicate2 />
                  </button>
                  {props.settings.gyms.length > 1 && (
                    <button
                      data-cy={`menu-item-delete-${StringUtils.dashcase(gym.name)}`}
                      className="px-2 align-middle ls-gyms-list-delete-gym button"
                      onClick={() => {
                        if (confirm("Are you sure you want to delete this gym?")) {
                          updateState(props.dispatch, [
                            lb<IState>()
                              .p("storage")
                              .p("settings")
                              .recordModify((settings) => {
                                const newGyms = CollectionUtils.removeBy(settings.gyms, "id", gym.id);
                                const currentGym = newGyms.find((aGym) => aGym.id === props.settings.currentGymId);
                                if (currentGym == null) {
                                  settings = { ...settings, currentGymId: newGyms[0].id };
                                }
                                return { ...settings, gyms: newGyms };
                              }),
                            lb<IState>()
                              .p("storage")
                              .p("settings")
                              .p("deletedGyms")
                              .recordModify((dg) => {
                                return Array.from(new Set([...dg, gym.id]));
                              }),
                          ]);
                        }
                      }}
                    >
                      <IconTrash />
                    </button>
                  )}
                </Fragment>
              }
            />
          );
        })}
        <div className="mt-1">
          <LinkButton name="new-gym" onClick={() => setModalNewGym(true)}>
            Add Gym
          </LinkButton>
        </div>
      </section>
    </Surface>
  );
}
