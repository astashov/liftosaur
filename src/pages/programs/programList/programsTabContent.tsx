import { h, JSX } from "preact";
import { useRef } from "preact/hooks";
import { ProgramCard } from "./programCard";
import { ISettings } from "../../../types";
import { StringUtils } from "../../../utils/string";
import { IProgramIndexEntry } from "../../../models/program";
import { IconMagnifyingGlass } from "../../../components/icons/iconMagnifyingGlass";
import { Tailwind } from "../../../utils/tailwindConfig";

interface IProgramsTabContentProps {
  programs: IProgramIndexEntry[];
  search: string;
  onSearchChange: (value: string) => void;
  settings: ISettings;
}

export function ProgramsTabContent(props: IProgramsTabContentProps): JSX.Element {
  return (
    <div className="pt-4">
      <div className="flex items-center justify-between pb-4">
        <div className="text-base">
          <span className="font-bold">{props.programs.length}</span>{" "}
          {StringUtils.pluralize("program", props.programs.length)}
        </div>
        <ProgramSearchField value={props.search} onChange={props.onSearchChange} />
      </div>

      {props.programs.length > 0 ? (
        <div className="grid gap-6" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}>
          {props.programs.map((program) => (
            <ProgramCard key={program.id} program={program} settings={props.settings} />
          ))}
        </div>
      ) : (
        <div className="px-6 py-12 text-lg text-center text-text-secondarysubtle">
          No programs found with selected filters
        </div>
      )}
    </div>
  );
}

interface IProgramSearchFieldProps {
  value: string;
  onChange: (value: string) => void;
}

function ProgramSearchField(props: IProgramSearchFieldProps): JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="relative">
      <IconMagnifyingGlass
        color={Tailwind.semantic().icon.neutralsubtle}
        size={16}
        className="absolute transform -translate-y-1/2 left-3 top-1/2"
      />
      <input
        ref={inputRef}
        className="py-2 pl-8 pr-4 text-base border rounded-lg border-border-neutral bg-background-default focus:outline-none focus:ring-1 focus:ring-button-primarybackground"
        type="text"
        value={props.value}
        placeholder="Search by name"
        onInput={() => {
          if (inputRef.current) {
            props.onChange(inputRef.current.value);
          }
        }}
        style={{ width: "220px" }}
      />
    </div>
  );
}
