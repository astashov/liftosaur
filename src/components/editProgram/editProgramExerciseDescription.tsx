import { h, JSX } from "preact";
import { Input } from "../input";
import { IconTrash } from "../icons/iconTrash";
import { IDayData, IProgramExercise, ISettings } from "../../types";
import { Program } from "../../models/program";
import { ProgramExercise } from "../../models/programExercise";
import { OneLineTextEditor } from "./oneLineTextEditor";
import { LinkButton } from "../linkButton";
import { IconHandle } from "../icons/iconHandle";
import { DraggableList } from "../draggableList";
import { GroupHeader } from "../groupHeader";

interface IEditProgramExerciseAdvancedDescriptionsProps {
  programExercise: IProgramExercise;
  allProgramExercises: IProgramExercise[];
  dayData: IDayData;
  settings: ISettings;
  onAdd: () => void;
  onRemove: (index: number) => void;
  onChange: (value: string, index: number) => void;
  onChangeExpr: (value: string) => void;
  onReorder: (startIndex: number, endIndex: number) => void;
}

interface IEditProgramExerciseSimpleDescriptionProps {
  programExercise: IProgramExercise;
  onChange: (value: string, index: number) => void;
  onAdd?: () => void;
}

export function EditProgramExerciseSimpleDescription(props: IEditProgramExerciseSimpleDescriptionProps): JSX.Element {
  const onAdd = props.onAdd;
  return (
    <div>
      <Input
        multiline={3}
        data-cy="exercise-description"
        maxLength={4095}
        name="exercise-description"
        label="Description"
        placeholder="Place the feet shoulder width apart..."
        value={props.programExercise.descriptions[0]}
        onInput={(e) => {
          props.onChange(e.currentTarget.value, 0);
        }}
      />
      <div className="flex text-xs leading-none">
        {onAdd && (
          <div className="flex-1 mr-4">
            <LinkButton name="enable-conditional-descriptions" onClick={onAdd}>
              Enable conditional descriptions
            </LinkButton>
          </div>
        )}
        <div className="text-xs italic leading-none text-grayv2-main">
          <a className="underline text-bluev2" href="https://www.markdownguide.org/cheat-sheet" target="_blank">
            Markdown
          </a>{" "}
          supported
        </div>
      </div>
    </div>
  );
}

export function EditProgramExerciseAdvancedDescriptions(
  props: IEditProgramExerciseAdvancedDescriptionsProps
): JSX.Element {
  const state = ProgramExercise.getState(props.programExercise, props.allProgramExercises);
  const script = props.programExercise.descriptionExpr || "1";
  const isMultiple = props.programExercise.descriptions.length > 1;
  const exprResult = Program.runDescriptionScript(
    script,
    props.programExercise.exerciseType.equipment,
    state,
    props.dayData,
    props.settings
  );
  return (
    <div>
      {isMultiple && (
        <GroupHeader
          name="Descriptions"
          help={
            <span>
              You can set up multiple descriptions for an exercise. The one that will be actually shown is defined by{" "}
              <strong>Description Index</strong> script - the index it returns would be used for the description. I.e.
              if it evaluates as <strong>2</strong> - the second description would be shown.
            </span>
          }
        />
      )}
      {isMultiple && (
        <OneLineTextEditor
          label="Description Index"
          name="descriptionindex"
          state={state}
          value={script}
          result={exprResult}
          onChange={(value) => {
            props.onChangeExpr(value);
          }}
        />
      )}
      {isMultiple ? (
        <div className="mb-6">
          <ul>
            <DraggableList
              hideBorders={true}
              items={props.programExercise.descriptions}
              element={(description, index, handleTouchStart) => (
                <EditProgramExerciseDescription
                  handleTouchStart={handleTouchStart}
                  key={index}
                  index={index}
                  description={description}
                  isDeleteEnabled={props.programExercise.descriptions.length > 1}
                  onRemove={() => props.onRemove(index)}
                  onChange={(value) => props.onChange(value, index)}
                />
              )}
              onDragEnd={(startIndex, endIndex) => props.onReorder(startIndex, endIndex)}
            />
          </ul>
          <div className="leading-none">
            <LinkButton name="add-another-description" onClick={() => props.onAdd()}>
              Add another description
            </LinkButton>
          </div>
        </div>
      ) : (
        <div className="mb-6">
          <EditProgramExerciseSimpleDescription
            programExercise={props.programExercise}
            onAdd={props.onAdd}
            onChange={props.onChange}
          />
        </div>
      )}
    </div>
  );
}

interface IEditProgramExerciseDescriptionProps {
  index: number;
  description: string;
  isDeleteEnabled: boolean;
  onRemove: () => void;
  onChange: (value: string) => void;
  handleTouchStart?: (e: TouchEvent | MouseEvent) => void;
}

function EditProgramExerciseDescription(props: IEditProgramExerciseDescriptionProps): JSX.Element {
  return (
    <li className="relative pb-2">
      <div className={`flex px-1 py-2 select-none bg-purplev2-100 rounded-2xl`}>
        <div className={`flex flex-col pt-2 items-center`}>
          <div className="mx-2">
            <IndexNumber index={props.index} />
          </div>
          <Handle handleTouchStart={props.handleTouchStart} />
        </div>
        <div className="flex flex-col flex-1 min-w-0">
          <div className="flex">
            <div className="flex-1 min-w-0">
              <Input
                multiline={3}
                data-cy="exercise-description"
                maxLength={4095}
                name="exercise-description"
                label={`Description ${props.index + 1}`}
                placeholder="Place the feet shoulder width apart..."
                value={props.description}
                onInput={(e) => {
                  props.onChange(e.currentTarget.value);
                }}
              />
            </div>
            {props.isDeleteEnabled && (
              <div>
                <DeleteBtn onRemove={props.onRemove} />
              </div>
            )}
          </div>
        </div>
      </div>
    </li>
  );
}

export function IndexNumber(props: { index: number }): JSX.Element {
  return (
    <div className="flex items-center justify-center w-6 h-6 font-bold border rounded-full border-grayv2-main text-grayv2-main">
      {props.index + 1}
    </div>
  );
}

function DeleteBtn(props: { onRemove: () => void }): JSX.Element {
  return (
    <button
      className="p-3 nm-program-exercise-delete-description"
      style={{ top: 0, right: 0 }}
      onClick={() => props.onRemove()}
    >
      <IconTrash />
    </button>
  );
}

function Handle(props: { handleTouchStart?: (e: TouchEvent | MouseEvent) => void }): JSX.Element {
  return (
    <div className="p-2 cursor-move" onTouchStart={props.handleTouchStart} onMouseDown={props.handleTouchStart}>
      <IconHandle />
    </div>
  );
}
