import { JSX, h } from "preact";
import { IconUndo } from "../icons/iconUndo";
import { undo, canUndo, canRedo, redo } from "../../pages/builder/utils/undoredo";
import { IPlannerState } from "../../pages/planner/models/types";
import { ILensDispatch } from "../../utils/useLensReducer";
import { IconUiMode } from "../icons/iconUiMode";
import { Tailwind } from "../../utils/tailwindConfig";
import { IconDayTextMode } from "../icons/iconDayTextMode";
import { IconFullTextMode } from "../icons/iconFullTextMode";
import { IconMuscleSettings } from "../icons/iconMuscleSettings";
import { Button } from "../button";

interface IEditProgramViewProps {
  state: IPlannerState;
  plannerDispatch: ILensDispatch<IPlannerState>;
}

export function EditProgramView(props: IEditProgramViewProps): JSX.Element {
  return (
    <div>
      <EditProgramNavbar state={props.state} plannerDispatch={props.plannerDispatch} />
    </div>
  );
}

interface IEditProgramNavbarProps {
  state: IPlannerState;
  plannerDispatch: ILensDispatch<IPlannerState>;
}

function EditProgramNavbar(props: IEditProgramNavbarProps): JSX.Element {
  return (
    <div className="flex flex-row items-center justify-between gap-2 pb-2 pl-2 pr-4">
      <div className="flex items-center">
        <button
          style={{ cursor: canUndo(props.state) ? "pointer" : "default" }}
          title="Undo"
          className="p-2 nm-program-undo"
          disabled={!canUndo(props.state)}
          onClick={() => undo(props.plannerDispatch, props.state)}
        >
          <IconUndo width={20} height={20} color={!canUndo(props.state) ? "#BAC4CD" : "#171718"} />
        </button>
        <button
          style={{ cursor: canRedo(props.state) ? "pointer" : "default" }}
          title="Redo"
          className="p-2 nm-program-redo"
          disabled={!canRedo(props.state)}
          onClick={() => redo(props.plannerDispatch, props.state)}
        >
          <IconUndo
            width={20}
            height={20}
            style={{ transform: "scale(-1,  1)" }}
            color={!canRedo(props.state) ? "#BAC4CD" : "#171718"}
          />
        </button>
      </div>
      <div className="flex items-center">
        <EditProgramModeSwitchButton
          isSelected={props.state.ui.isUiMode === true}
          name="program-mode-ui"
          onClick={() => undefined}
        >
          {(color) => <IconUiMode color={color} />}
        </EditProgramModeSwitchButton>
        <EditProgramModeSwitchButton
          isSelected={!props.state.ui.isUiMode && !props.state.fulltext}
          name="program-mode-day-text"
          onClick={() => undefined}
        >
          {(color) => <IconDayTextMode color={color} />}
        </EditProgramModeSwitchButton>
        <EditProgramModeSwitchButton
          isSelected={!!props.state.fulltext}
          name="program-mode-full-text"
          onClick={() => undefined}
        >
          {(color) => <IconFullTextMode color={color} />}
        </EditProgramModeSwitchButton>
      </div>
      <div className="flex items-center">
        <button className="p-2 nm-program-muscle-settings" onClick={() => undefined}>
          <IconMuscleSettings />
        </button>
      </div>
      <div className="flex items-center">
        <Button name="save-program" kind="purple" buttonSize="md" data-cy="save-program" onClick={() => undefined}>
          Save
        </Button>
      </div>
    </div>
  );
}

interface IEditProgramModeSwitchButtonProps {
  isSelected: boolean;
  name: string;
  children: (color: string) => JSX.Element;
  onClick: () => void;
}

function EditProgramModeSwitchButton(props: IEditProgramModeSwitchButtonProps): JSX.Element {
  const isSelected = props.isSelected;
  return (
    <button className={`p-2 ${isSelected ? "bg-purplev3-200" : ""} rounded nm-${props.name}`} onClick={props.onClick}>
      {props.children(isSelected ? Tailwind.colors().purplev3.main : Tailwind.colors().grayv3.main)}
    </button>
  );
}
