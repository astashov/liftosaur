import { h, JSX } from "preact";
import { IExportedProgram, Program } from "../../models/program";
import { IStorage } from "../../types";
import { IAccount } from "../../models/account";
import { buildState, IEnv, IState, updateState } from "../../models/state";
import { Storage } from "../../models/storage";
import { useThunkReducer } from "../../utils/useThunkReducer";
import { reducerWrapper } from "../../ducks/reducer";
import { Thunk } from "../../ducks/thunks";
import { ProgramContent } from "./programContent";
import { lb } from "lens-shmens";
import { CollectionUtils } from "../../utils/collection";
import { useRef, useState } from "preact/hooks";
import { AsyncQueue } from "../../utils/asyncQueue";
import { MockAudioInterface } from "../../lib/audioInterface";
import { Service } from "../../api/service";
import { ObjectUtils } from "../../utils/object";
import { IconSpinner } from "../../components/icons/iconSpinner";

export interface IProgramContentSyncerProps {
  client: Window["fetch"];
  isMobile: boolean;
  storage?: IStorage;
  account?: IAccount;
  exportedProgram?: IExportedProgram;
  shouldSyncProgram: boolean;
}

export function ProgramContentSyncer(props: IProgramContentSyncerProps): JSX.Element {
  const { account, storage } = props;
  const env = useRef<IEnv>({
    queue: new AsyncQueue(),
    audio: new MockAudioInterface(),
    service: new Service(props.client),
  });

  const initialState = buildState({ storage, userId: account?.id });

  const [isReset, setIsReset] = useState(false);
  const [exportedProgram, setExportedProgram] = useState(props.exportedProgram);

  const [state, dispatch] = useThunkReducer(reducerWrapper(false), initialState, env.current, [
    (aDispatch, action, oldState, newState) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).syncer = newState;
    },
    (aDispatch, action, oldState, newState) => {
      if (Storage.isChanged(oldState.storage, newState.storage)) {
        aDispatch(
          Thunk.sync({ withHistory: false, withStats: false, withPrograms: true }, (newStorage, status) => {
            const programId = props.exportedProgram?.program.id;
            if (status === "merged" && programId) {
              console.log("Resetting");
              setExportedProgram(Program.storageToExportedProgram(newStorage, programId));
              setIsReset(!isReset);
            }
          })
        );
      }
    },
  ]);
  const isLoading =
    ObjectUtils.keys(state.loading.items).filter((key) => state.loading.items[key]?.endTime == null).length > 0;

  return (
    <div>
      <div
        className={`fixed p-2 font-bold bg-white border border-gray-300 rounded-lg text-greenv2-800 fade ${
          isLoading ? "fadein" : "fadeout"
        }`}
        style={{ top: "1rem", right: "2rem" }}
      >
        <IconSpinner width={12} height={12} /> Saving...
      </div>

      <ProgramContent
        key={isReset ? "reset" : "noreset"}
        isMobile={props.isMobile}
        client={props.client}
        account={props.account}
        exportedProgram={exportedProgram}
        shouldSync={props.shouldSyncProgram}
        onUpdate={(args) => {
          if ("program" in args && args.program) {
            updateState(dispatch, [
              lb<IState>()
                .p("storage")
                .p("programs")
                .recordModify((programs) => CollectionUtils.setOrAddBy(programs, "id", args.program.id, args.program)),
            ]);
          } else if ("settings" in args && args.settings) {
            updateState(dispatch, [lb<IState>().p("storage").p("settings").record(args.settings)]);
          }
        }}
      />
    </div>
  );
}
