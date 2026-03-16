import { h, JSX } from "preact";
import { useRef } from "preact/hooks";
import { useState } from "preact/compat";
import { IDispatch } from "../ducks/types";
import { IHistoryRecord, IProgram, ISettings } from "../types";
import { INavCommon } from "../models/state";
import { NavbarView } from "./navbar";
import { Surface } from "./surface";
import { BuiltinProgramsList } from "./builtinProgramsList";
import { CustomProgramsList } from "./customProgramsList";
import { ScrollableTabs } from "./scrollableTabs";
import { IProgramIndexEntry } from "../models/program";
import { IconMagnifyingGlass } from "./icons/iconMagnifyingGlass";
import { Tailwind_semantic } from "../utils/tailwindConfig";

interface IProps {
  dispatch: IDispatch;
  programs: IProgram[];
  programsIndex: IProgramIndexEntry[];
  progress?: IHistoryRecord;
  settings: ISettings;
  customPrograms: IProgram[];
  editProgramId?: string;
  navCommon: INavCommon;
}

export function ChooseProgramView(props: IProps): JSX.Element {
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const builtinPrograms = (): JSX.Element => (
    <BuiltinProgramsList
      hasCustomPrograms={props.customPrograms.length > 0}
      programs={props.programs}
      programsIndex={props.programsIndex}
      settings={props.settings}
      dispatch={props.dispatch}
      search={search}
    />
  );
  const customPrograms = (): JSX.Element => (
    <CustomProgramsList
      progress={props.progress}
      programs={props.customPrograms}
      settings={props.settings}
      dispatch={props.dispatch}
      search={search}
    />
  );

  return (
    <Surface
      navbar={<NavbarView navCommon={props.navCommon} title="Choose a program" dispatch={props.dispatch} />}
      footer={null}
    >
      <div className="px-4 pt-2 pb-2">
        <div className="relative">
          <IconMagnifyingGlass
            color={Tailwind_semantic().icon.neutralsubtle}
            size={16}
            className="absolute transform -translate-y-1/2 left-3 top-1/2"
          />
          <input
            ref={inputRef}
            className="w-full py-2 pr-4 text-sm border rounded-lg pl-9 border-border-neutral bg-background-default focus:outline-none focus:ring-1 focus:ring-button-primarybackground"
            style={{ fontSize: "15px" }}
            type="text"
            value={search}
            placeholder="Search by name"
            data-cy="program-search"
            onInput={() => {
              if (inputRef.current) {
                setSearch(inputRef.current.value);
              }
            }}
          />
        </div>
      </div>
      {props.customPrograms.length > 0 ? (
        <ScrollableTabs
          offsetY="3.5rem"
          nonSticky={true}
          topPadding="0"
          defaultIndex={0}
          tabs={[
            { label: "Yours", children: customPrograms },
            {
              label: "Built-in",
              children: builtinPrograms,
            },
          ]}
        />
      ) : (
        builtinPrograms()
      )}
    </Surface>
  );
}
