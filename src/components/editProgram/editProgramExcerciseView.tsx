import { h, JSX } from "preact";
import { IProgramDayEntry2 } from "../../models/program";
import { IDispatch } from "../../ducks/types";
import { Excercise } from "../../models/excercise";
import { IconDelete } from "../iconDelete";

interface IProps {
  entry: IProgramDayEntry2;
  dispatch: IDispatch;
  onEditSet: (setIndex?: number) => void;
  onDeleteSet: (setIndex: number) => void;
}

export function EditProgramExcerciseView(props: IProps): JSX.Element {
  const excercise = Excercise.get(props.entry.excercise);
  return (
    <section className="px-4 pt-4 pb-2 mb-2 bg-gray-100 border border-gray-300 rounded-lg">
      <header className="flex">
        <div className="flex-1 mr-auto">{excercise.name}</div>
      </header>
      <section className="flex flex-wrap pt-2">
        {props.entry.sets.map((set, i) => {
          const isRepsValue = /^\d+$/.test(set.repsExpr.trim());
          const isWeightValue = /^\d+$/.test(set.weightExpr.trim());
          return (
            <span className="relative">
              <button className="absolute" style={{ top: "2px", right: "3px" }} onClick={() => props.onDeleteSet(i)}>
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
