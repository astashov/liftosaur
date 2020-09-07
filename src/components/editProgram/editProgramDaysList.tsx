import { h, JSX, Fragment } from "preact";
import { IProgram } from "../../models/program";
import { IDispatch } from "../../ducks/types";
import { HeaderView } from "../header";
import { GroupHeader } from "../groupHeader";
import { MenuItem, MenuItemWrapper } from "../menuItem";
import { FooterView } from "../footer";
import { IconDuplicate } from "../iconDuplicate";
import { lb } from "../../utils/lens";
import { IState } from "../../ducks/reducer";
import { HtmlUtils } from "../../utils/html";
import { IconDelete } from "../iconDelete";
import { DraggableList } from "../draggableList";
import { EditProgram } from "../../models/editProgram";
import { MenuItemEditable } from "../menuItemEditable";

interface IProps {
  editProgram: IProgram;
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
        <MenuItemEditable
          type="number"
          name="Next Day:"
          value={props.editProgram.nextDay.toString()}
          onChange={(newValueStr) => {
            const newValue = newValueStr != null ? parseInt(newValueStr, 10) : undefined;
            if (newValue != null && !isNaN(newValue)) {
              const newDay = Math.max(1, Math.min(newValue, props.editProgram.days.length));
              EditProgram.setNextDay(props.dispatch, props.editProgram, newDay);
            }
          }}
        />
        <GroupHeader name="Excercises" />
        {props.editProgram.excercises.map((excercise) => {
          return (
            <MenuItem
              name={excercise.name}
              value={
                <Fragment>
                  <button
                    className="mr-2 align-middle button"
                    onClick={() => {
                      EditProgram.copyProgramExcercise(props.dispatch, props.editProgram, excercise);
                    }}
                  >
                    <IconDuplicate />
                  </button>
                  <button
                    className="align-middle button"
                    onClick={() => {
                      const isExcerciseUsed = props.editProgram.days.some(
                        (d) => d.excercises.map((e) => e.id).indexOf(excercise.id) !== -1
                      );
                      if (isExcerciseUsed) {
                        alert("You can't delete this excercise, it's used in one of the days");
                      } else if (confirm("Are you sure?")) {
                        EditProgram.removeProgramExcercise(props.dispatch, props.editProgram, excercise.id);
                      }
                    }}
                  >
                    <IconDelete />
                  </button>
                </Fragment>
              }
              onClick={(e) => {
                if (!HtmlUtils.classInParents(e.target as Element, "button")) {
                  EditProgram.editProgramExcercise(props.dispatch, excercise);
                }
              }}
            />
          );
        })}
        <MenuItemWrapper onClick={() => EditProgram.addProgramExcercise(props.dispatch)}>
          <div className="p-2 text-center border border-gray-500 border-dashed rounded-md">Add Excercise +</div>
        </MenuItemWrapper>
        <GroupHeader name="Days" />
        <DraggableList
          onDragEnd={(startIndex, endIndex) => {
            EditProgram.reorderDays(props.dispatch, props.programIndex, startIndex, endIndex);
          }}
          items={props.editProgram.days}
          element={(day, index, handleTouchStart) => {
            return (
              <MenuItem
                handleTouchStart={handleTouchStart}
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
                    {props.editProgram.days.length > 1 && (
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
                    )}
                  </Fragment>
                }
              />
            );
          }}
        />
        <MenuItemWrapper
          onClick={() => {
            props.dispatch({ type: "CreateDayAction" });
          }}
        >
          <div className="p-2 text-center border border-gray-500 border-dashed rounded-md">Add Day +</div>
        </MenuItemWrapper>
      </section>

      <FooterView dispatch={props.dispatch} />
    </section>
  );
}
