import { h, JSX, Fragment } from "preact";
import { IProgram2 } from "../../models/program";
import { IDispatch } from "../../ducks/types";
import { HeaderView } from "../header";
import { GroupHeader } from "../groupHeader";
import { MenuItem, MenuItemWrapper } from "../menuItem";
import { Button } from "../button";
import { FooterView } from "../footer";
import { IconDuplicate } from "../iconDuplicate";
import { lb } from "../../utils/lens";
import { IState } from "../../ducks/reducer";
import { HtmlUtils } from "../../utils/html";
import { IconDelete } from "../iconDelete";
import { Thunk } from "../../ducks/thunks";

interface IProps {
  editProgram: IProgram2;
  programIndex: number;
  dispatch: IDispatch;
}

export function EditProgramDaysList(props: IProps): JSX.Element {
  return (
    <section className="h-full">
      <HeaderView
        title="Edit Program"
        subtitle={props.editProgram.name}
        left={<button onClick={() => props.dispatch({ type: "PullScreen" })}>Back</button>}
      />
      <section style={{ paddingTop: "3.5rem", paddingBottom: "4rem" }}>
        <GroupHeader name="Days" />
        {props.editProgram.days.map((day, index) => (
          <MenuItem
            name={day.name}
            onClick={(e) => {
              if (!HtmlUtils.classInParents(e.target as Element, "button")) {
                props.dispatch({ type: "EditDayAction", index });
              }
            }}
            value={
              <Fragment>
                <button
                  className="mr-2 align-middle button"
                  onClick={() => {
                    const newName = `${day.name} Copy`;
                    props.dispatch({
                      type: "UpdateState",
                      lensRecording: [
                        lb<IState>()
                          .p("storage")
                          .p("programs")
                          .i(props.programIndex)
                          .p("days")
                          .recordModify((days) => {
                            const newDays = [...days];
                            newDays.push({ ...day, name: newName });
                            return newDays;
                          }),
                      ],
                    });
                  }}
                >
                  <IconDuplicate />
                </button>
                <button
                  className="align-middle button"
                  onClick={() => {
                    props.dispatch({
                      type: "UpdateState",
                      lensRecording: [
                        lb<IState>()
                          .p("storage")
                          .p("programs")
                          .i(props.programIndex)
                          .p("days")
                          .recordModify((days) => days.filter((d) => d !== day)),
                      ],
                    });
                  }}
                >
                  <IconDelete />
                </button>
              </Fragment>
            }
          />
        ))}
        <MenuItemWrapper
          onClick={() => {
            props.dispatch({ type: "CreateDayAction" });
          }}
        >
          <div className="p-2 text-center border border-gray-500 border-dashed rounded-md">+</div>
        </MenuItemWrapper>
        <div className="flex p-2">
          <div className="flex-1 mr-auto">
            <Button kind="blue" onClick={() => props.dispatch({ type: "PushScreen", screen: "editProgramDayScript" })}>
              Edit Script
            </Button>
          </div>
          <div>
            <Button kind="blue" onClick={() => props.dispatch(Thunk.publishProgram())}>
              Publish
            </Button>
          </div>
        </div>
      </section>

      <FooterView dispatch={props.dispatch} />
    </section>
  );
}
