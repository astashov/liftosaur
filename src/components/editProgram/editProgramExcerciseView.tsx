import { h, JSX } from "preact";
import { IProgramDayEntry } from "../../models/program";
import { Excercise } from "../../models/excercise";
import { IconDelete } from "../iconDelete";
import { IDispatch } from "../../ducks/types";
import { EditProgram } from "../../models/editProgram";

interface IProps {
  entry: IProgramDayEntry;
  programIndex: number;
  dayIndex: number;
  dispatch: IDispatch;
  onEditSet: (setIndex?: number) => void;
  onDeleteSet: (setIndex: number) => void;
}

export function EditProgramExcerciseView(props: IProps): JSX.Element {
  const excercise = Excercise.get(props.entry.excercise);
  return (
    <section className="relative px-4 pt-4 pb-2 mb-2 bg-gray-100 border border-gray-300 rounded-lg">
      <button
        className="absolute p-2"
        style={{ top: "0px", right: "0px" }}
        onClick={() => EditProgram.removeEntry(props.dispatch, props.entry, props.programIndex, props.dayIndex)}
      >
        <IconDelete />
      </button>
      <header className="flex">
        <div className="flex-1 mr-auto">{excercise.name}</div>
      </header>
      <section className="flex flex-wrap pt-2">
        {props.entry.sets.map((set, i) => {
          const isRepsValue = /^\d+$/.test(set.repsExpr.trim());
          const isWeightValue = /^\d+$/.test(set.weightExpr.trim());
          return (
            <span className="relative">
              {set.isAmrap && (
                <div
                  style={{ top: "0", right: "7px", width: "20px", height: "20px" }}
                  className="absolute p-1 text-xs leading-none text-center text-white bg-gray-600 border-gray-800 rounded-full"
                >
                  +
                </div>
              )}
              <button className="absolute" style={{ top: "0", left: "-5px" }} onClick={() => props.onDeleteSet(i)}>
                <IconDelete />
              </button>
              <button
                className="w-12 h-12 my-2 mr-3 leading-7 text-center bg-gray-300 border border-gray-400 rounded-lg"
                style={{ userSelect: "none", touchAction: "manipulation" }}
                onClick={() => props.onEditSet(i)}
              >
                <div className="leading-none">{isRepsValue ? set.repsExpr : "Expr"}</div>
                <div style={{ paddingTop: "2px" }} className="text-xs leading-none text-gray-600">
                  {isWeightValue ? set.weightExpr : "Expr"}
                </div>
              </button>
            </span>
          );
        })}
        <button
          className="w-12 h-12 my-2 mr-3 leading-7 text-center bg-gray-300 border border-gray-400 border-dashed rounded-lg"
          style={{ userSelect: "none", touchAction: "manipulation" }}
          onClick={() => props.onEditSet(undefined)}
        >
          +
        </button>
      </section>
    </section>
  );
}
