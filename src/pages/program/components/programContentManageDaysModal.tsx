import { lb } from "lens-shmens";
import React, { JSX } from "react";
import { DraggableList } from "../../../components/draggableList";
import { GroupHeader } from "../../../components/groupHeader";
import { IconPlus } from "../../../components/icons/iconPlus";
import { IconTrash } from "../../../components/icons/iconTrash";
import { MenuItem } from "../../../components/menuItem";
import { LftModal } from "../../../components/modal";
import { EditProgramLenses } from "../../../models/editProgramLenses";
import { IProgram } from "../../../types";
import { ILensDispatch } from "../../../utils/useLensReducer";
import { IProgramEditorState } from "../models/types";

interface IProgramContentManageDaysModalProps {
  onClose: () => void;
  program: IProgram;
  weekIndex: number;
  dispatch: ILensDispatch<IProgramEditorState>;
}

export function ProgramContentManageDaysModal(props: IProgramContentManageDaysModalProps): JSX.Element {
  const { program, weekIndex } = props;
  const week = program.weeks[weekIndex];
  const lbPrefix = lb<IProgramEditorState>().p("current").p("program");

  return (
    <LftModal shouldShowClose={true} onClose={props.onClose}>
      <div style={{ minWidth: "20rem" }}>
        <section>
          <DraggableList
            items={week.days}
            element={(dayRef, dayIndex, handleTouchStart) => {
              const day = program.days.find((d) => d.id === dayRef.id)!;
              return (
                <MenuItem
                  handleTouchStart={handleTouchStart}
                  name={day.name}
                  value={
                    <>
                      <button
                        className="p-2 align-middle ls-day-toggle-exercise button"
                        onClick={() => props.dispatch(EditProgramLenses.removeWeekDay(lbPrefix, weekIndex, dayIndex))}
                      >
                        <IconTrash />
                      </button>
                    </>
                  }
                />
              );
            }}
            onDragEnd={(startIndex, endIndex) => {
              props.dispatch(EditProgramLenses.reorderDaysWithinWeek(lbPrefix, weekIndex, startIndex, endIndex));
            }}
          />
        </section>
        <section data-cy="available-days">
          <GroupHeader name="Available days" />
          {program.days.map((day) => (
            <MenuItem
              name={day.name}
              onClick={() => {
                props.dispatch(EditProgramLenses.addWeekDay(lbPrefix, weekIndex, day.id));
              }}
              value={
                <button className="p-2 ls-day-toggle-exercise button">
                  <IconPlus />
                </button>
              }
            />
          ))}
        </section>
      </div>
    </LftModal>
  );
}
