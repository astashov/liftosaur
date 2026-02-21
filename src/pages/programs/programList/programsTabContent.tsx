import { h, JSX } from "preact";
import { useRef } from "preact/hooks";
import { ProgramCard } from "./programCard";
import { ISettings } from "../../../types";
import { StringUtils } from "../../../utils/string";
import { IProgramListItem } from "../programsPageContent";

interface IProgramsTabContentProps {
  programs: IProgramListItem[];
  search: string;
  onSearchChange: (value: string) => void;
  settings: ISettings;
}

export function ProgramsTabContent(props: IProgramsTabContentProps): JSX.Element {
  const searchRef = useRef<HTMLInputElement>(null);

  return (
    <div className="pt-4">
      <div className="flex items-center justify-between pb-4">
        <div className="text-base">
          <span className="font-bold">{props.programs.length}</span>{" "}
          {StringUtils.pluralize("program", props.programs.length)}
        </div>
        <div className="relative">
          <svg
            className="absolute text-gray-400 transform -translate-y-1/2 left-3 top-1/2"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={searchRef}
            className="py-2 pl-8 pr-4 text-sm border rounded-lg border-border-neutral bg-background-default focus:outline-none focus:ring-1 focus:ring-button-primarybackground"
            type="text"
            value={props.search}
            placeholder="Search by name"
            onInput={() => {
              if (searchRef.current) {
                props.onSearchChange(searchRef.current.value);
              }
            }}
            style={{ width: "220px" }}
          />
        </div>
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
