import { h, JSX } from "preact";
import { useRef } from "preact/compat";
import { Settings } from "../../models/settings";
import { IProgram } from "../../types";
import { CollectionUtils } from "../../utils/collection";
import { useLensReducer } from "../../utils/useLensReducer";
import { IAudioInterface } from "../../lib/audioInterface";
import { Service } from "../../api/service";
import { lb } from "lens-shmens";
import { IProgramDetailsState } from "./programDetails/types";
import { ProgramDetailsArnoldGoldenSix } from "./detailed/programDetailsArnoldGoldenSix";
import { ProgramDetailsGzclp } from "./detailed/programDetailsGzclp";
import { ProgramDetailsJackedAndTan } from "./detailed/programDetailsJackedAndTan";
import { ProgramDetailsTheRippler } from "./detailed/programDetailsTheRippler";
import { ProgramDetailsGzclUhf9w } from "./detailed/programDetailsGzclUhf9w";
import { ProgramDetailsGzclVdip } from "./detailed/programDetailsGzclVdip";
import { ProgramDetailsGzclGeneralGainz } from "./detailed/programDetailsGzclGeneralGainz";
import { ProgramDetailsGzclUhf5w } from "./detailed/programDetailsGzclUhf5w";
import { ProgramDetailsGzclBurritoButBig } from "./detailed/programDetailsGzclBurritoButBig";
import { ProgramPreviewOrPlayground } from "../../components/programPreviewOrPlayground";

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
  } else if (props.selectedProgramId === "gzclp") {
    return (
      <ProgramDetailsGzclp
        program={program}
        client={props.client}
        audio={props.audio}
        settings={initialState.settings}
      />
    );
  } else if (props.selectedProgramId === "gzcl-jacked-and-tan-2") {
    return (
      <ProgramDetailsJackedAndTan
        program={program}
        client={props.client}
        audio={props.audio}
        settings={initialState.settings}
      />
    );
  } else if (props.selectedProgramId === "gzcl-uhf-9-weeks") {
    return (
      <ProgramDetailsGzclUhf9w
        program={program}
        client={props.client}
        audio={props.audio}
        settings={initialState.settings}
      />
    );
  } else if (props.selectedProgramId === "gzcl-general-gainz-burrito-but-big") {
    return (
      <ProgramDetailsGzclBurritoButBig
        program={program}
        client={props.client}
        audio={props.audio}
        settings={initialState.settings}
      />
    );
  } else if (props.selectedProgramId === "gzcl-uhf-5-weeks") {
    return (
      <ProgramDetailsGzclUhf5w
        program={program}
        client={props.client}
        audio={props.audio}
        settings={initialState.settings}
      />
    );
  } else if (props.selectedProgramId === "gzcl-vdip") {
    return (
      <ProgramDetailsGzclVdip
        program={program}
        client={props.client}
        audio={props.audio}
        settings={initialState.settings}
      />
    );
  } else if (props.selectedProgramId === "gzcl-general-gainz") {
    return (
      <ProgramDetailsGzclGeneralGainz
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
    <div className="px-4">
      <div className="flex program-details-header">
        <div>
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
      </div>
      <ProgramPreviewOrPlayground
        key={state.selectedProgramId}
        program={program}
        settings={state.settings}
        isMobile={false}
        hasNavbar={false}
      />
    </div>
  );
}
