import { h, JSX } from "preact";
import { useRef } from "preact/compat";
import { Settings } from "../../models/settings";
import { IProgram } from "../../types";
import { CollectionUtils } from "../../utils/collection";
import { useLensReducer } from "../../utils/useLensReducer";
import { IAudioInterface } from "../../lib/audioInterface";
import { Service } from "../../api/service";
import { lb } from "lens-shmens";
import { ProgramDetails } from "./programDetails/programDetails";
import { IProgramDetailsState } from "./programDetails/types";
import { ProgramDetailsSettings } from "./programDetails/programDetailsSettings";
import { ProgramDetailsMusclesModal } from "./programDetails/programDetailsMusclesModal";
import { ProgramDetailsArnoldGoldenSix } from "./detailed/programDetailsArnoldGoldenSix";
import { ProgramDetailsTheRippler } from "./detailed/programDetailsTheRippler";

export interface IProgramDetailsContentProps {
  selectedProgramId: string;
  programs: IProgram[];
  client: Window["fetch"];
  audio: IAudioInterface;
}

export function ProgramDetailsContent(props: IProgramDetailsContentProps): JSX.Element {
  const service = new Service(props.client);
  const ref = useRef<HTMLSelectElement>();
  const initialState: IProgramDetailsState = {
    programs: props.programs,
    selectedProgramId: props.selectedProgramId,
    shouldShowAllScripts: false,
    shouldShowAllFormulas: false,
    settings: Settings.build(),
  };
  const [state, dispatch] = useLensReducer(initialState, { audio: props.audio, service });
  const program = state.programs.filter((p) => p.id === state.selectedProgramId)[0] || state.programs[0];

  if (props.selectedProgramId === "arnoldgoldensix") {
    return (
      <ProgramDetailsArnoldGoldenSix
        program={program}
        client={props.client}
        audio={props.audio}
        settings={initialState.settings}
      />
    );
  } else if (props.selectedProgramId === "gzcl-the-rippler") {
    return (
      <ProgramDetailsTheRippler
        program={program}
        client={props.client}
        audio={props.audio}
        settings={initialState.settings}
      />
    );
  }

  if (typeof window !== "undefined" && window.history) {
    window.history.replaceState({}, `Liftosaur: Program Details - ${program.name}`, `/programs/${program.id}`);
  }
  return (
    <div>
      <div className="flex program-details-header">
        <div className="flex-1">
          <ProgramDetailsSettings settings={state.settings} dispatch={dispatch} />
        </div>
        <div>
          <div className="px-4 text-right">
            <select
              ref={ref}
              className="py-2 border border-gray-400 rounded-lg"
              name="selected_program_id"
              id="selected_program_id"
              onChange={() => {
                dispatch(lb<IProgramDetailsState>().p("selectedProgramId").record(ref.current.value));
                window.history.replaceState(
                  {},
                  `Liftosaur: Program Details - ${program.name}`,
                  `/programs/${program.id}`
                );
              }}
            >
              {CollectionUtils.sort(state.programs, (a, b) => a.name.localeCompare(b.name)).map((p) => (
                <option selected={p.id === state.selectedProgramId} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div class="pb-4 text-right px-4">
            <button
              onClick={() =>
                dispatch(lb<IProgramDetailsState>().p("shouldShowAllFormulas").record(!state.shouldShowAllFormulas))
              }
              className="mr-2 text-sm italic text-blue-700 underline"
            >
              {state.shouldShowAllFormulas ? "Hide All Formulas" : "Show All Formulas"}
            </button>
            <button
              onClick={() =>
                dispatch(lb<IProgramDetailsState>().p("shouldShowAllScripts").record(!state.shouldShowAllScripts))
              }
              className="text-sm italic text-blue-700 underline"
            >
              {state.shouldShowAllScripts ? "Hide All Scripts" : "Show All Scripts"}
            </button>
          </div>
        </div>
      </div>
      <ProgramDetails
        settings={state.settings}
        subscription={{ google: { fake: null }, apple: {} }}
        key={`${program.id}_${state.shouldShowAllFormulas}_${state.shouldShowAllScripts}`}
        program={program}
        shouldShowAllFormulas={state.shouldShowAllFormulas}
        shouldShowAllScripts={state.shouldShowAllScripts}
        dispatch={dispatch}
      />
      {state.muscles && (
        <ProgramDetailsMusclesModal
          muscles={state.muscles}
          program={program}
          settings={state.settings}
          dispatch={dispatch}
        />
      )}
    </div>
  );
}
