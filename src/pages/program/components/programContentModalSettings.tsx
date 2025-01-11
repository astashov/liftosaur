import React, { JSX } from "react";
import { MenuItemValue } from "../../../components/menuItemEditable";
import { LftModal } from "../../../components/modal";
import { ILensDispatch } from "../../../utils/useLensReducer";
import { IProgramEditorState } from "../models/types";
import { IProgram, ISettings, IUnit } from "../../../types";
import { lb } from "lens-shmens";
import { BuilderLinkInlineInput } from "../../builder/components/builderInlineInput";
import { EditProgramLenses } from "../../../models/editProgramLenses";

interface IProgramContentModalSettingsProps {
  isHidden: boolean;
  isMobile: boolean;
  dispatch: ILensDispatch<IProgramEditorState>;
  program: IProgram;
  settings: ISettings;
  onClose: () => void;
}

export function ProgramContentModalSettings(props: IProgramContentModalSettingsProps): JSX.Element {
  return (
    <LftModal isHidden={props.isHidden} shouldShowClose={true} onClose={props.onClose}>
      {!props.isMobile && (
        <label className="flex items-center">
          <div className="mr-2 font-bold">Is Multiweek program?</div>
          <MenuItemValue
            name="Is Multiweek program?"
            setPatternError={() => undefined}
            type="boolean"
            value={props.program.isMultiweek.toString()}
            onChange={(newValue) => {
              props.dispatch(
                EditProgramLenses.setIsMultiweek(
                  lb<IProgramEditorState>().p("current").p("program"),
                  newValue === "true"
                )
              );
            }}
          />
        </label>
      )}
      <div className="mb-2">
        <label>
          <span className="mr-2 font-bold">Units:</span>
          <MenuItemValue
            name="Reuse Logic"
            setPatternError={() => undefined}
            type="desktop-select"
            value={props.settings.units}
            values={[
              ["lb", "lb"],
              ["kg", "kg"],
            ]}
            onChange={(newValue) => {
              props.dispatch(
                lb<IProgramEditorState>()
                  .p("settings")
                  .p("units")
                  .record(newValue as IUnit)
              );
            }}
          />
        </label>
      </div>
      <div className="mb-2">
        <label>
          <span className="mr-2 font-bold">Warmup Rest Timer:</span>
          <BuilderLinkInlineInput
            value={props.settings.timers.warmup || 0}
            onInputInt={(newValue) => {
              props.dispatch(lb<IProgramEditorState>().p("settings").p("timers").p("warmup").record(newValue));
            }}
          />
          <span className="ml-1 font-bold">sec</span>
        </label>
      </div>
      <div className="mb-2">
        <label>
          <span className="mr-2 font-bold">Workout Rest Timer:</span>
          <BuilderLinkInlineInput
            value={props.settings.timers.workout || 0}
            onInputInt={(newValue) => {
              props.dispatch(lb<IProgramEditorState>().p("settings").p("timers").p("workout").record(newValue));
            }}
          />
          <span className="ml-1 font-bold">sec</span>
        </label>
      </div>
    </LftModal>
  );
}
