import { h, JSX, Fragment } from "preact";
import { Modal } from "./modal";
import { Exercise, IExercise } from "../models/exercise";
import { StringUtils } from "../utils/string";
import { IDispatch } from "../ducks/types";
import { GroupHeader } from "./groupHeader";
import { DraggableList } from "./draggableList";
import { IconHandle } from "./iconHandle";
import { IconDelete } from "./iconDelete";
import { EditGraphs } from "../models/editGraphs";
import { IExerciseId } from "../types";

interface IModalGraphsProps {
  isHidden: boolean;
  exerciseIds: IExerciseId[];
  selectedExerciseIds: IExerciseId[];
  dispatch: IDispatch;
  onClose: (value?: IExerciseId) => void;
}

export function ModalGraphs(props: IModalGraphsProps): JSX.Element {
  const selectedExercises = Exercise.getByIds(props.selectedExerciseIds);
  const exercises = Exercise.getByIds(props.exerciseIds.filter((e) => props.selectedExerciseIds.indexOf(e) === -1));

  return (
    <Modal isHidden={props.isHidden} shouldShowClose={true} onClose={props.onClose} isFullWidth>
      <form className="relative" data-cy="modal-graphs" onSubmit={(e) => e.preventDefault()}>
        {selectedExercises.length > 0 && <GroupHeader name="Selected Graphs" />}
        <DraggableList
          items={selectedExercises}
          element={(e, i, handleTouchStart) => {
            return (
              <section
                data-cy={`item-graph-${StringUtils.dashcase(e.name)}`}
                className="w-full px-2 py-1 text-left border-b border-gray-200"
              >
                <section className="flex items-center">
                  <div className="p-2 cursor-move" style={{ marginLeft: "-16px", touchAction: "none" }}>
                    <span onMouseDown={handleTouchStart} onTouchStart={handleTouchStart}>
                      <IconHandle />
                    </span>
                  </div>
                  <ExercisePreview exercise={e} />
                  <div>
                    <button
                      data-cy="remove-graph"
                      className="align-middle"
                      onClick={() => EditGraphs.removeGraph(props.dispatch, e)}
                    >
                      <IconDelete />
                    </button>
                  </div>
                </section>
              </section>
            );
          }}
          onDragEnd={(startIndex, endIndex) => EditGraphs.reorderGraphs(props.dispatch, startIndex, endIndex)}
        />
        <GroupHeader name="Available Graphs" />
        {exercises.map((e) => {
          return (
            <section
              data-cy={`item-graph-${StringUtils.dashcase(e.name)}`}
              className="flex w-full px-2 py-1 text-left border-b border-gray-200"
              onClick={() => EditGraphs.addGraph(props.dispatch, e)}
            >
              <ExercisePreview exercise={e} />
            </section>
          );
        })}
      </form>
    </Modal>
  );
}

function ExercisePreview(props: { exercise: IExercise }): JSX.Element {
  const e = props.exercise;
  const equipment = Exercise.defaultEquipment(e.id);
  return (
    <Fragment>
      <div className="w-12 pr-4">
        {equipment && (
          <img
            src={`https://www.liftosaur.com/externalimages/exercises/single/small/${e.id.toLowerCase()}_${equipment.toLowerCase()}_single_small.png`}
            alt={`${e.name} image`}
          />
        )}
      </div>
      <div className="flex items-center flex-1 py-2 text-left">{e.name}</div>
    </Fragment>
  );
}
