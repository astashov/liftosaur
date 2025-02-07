import { h, JSX, Fragment } from "preact";
import { useState, useEffect } from "preact/hooks";
import { Service } from "../../api/service";
import { Button } from "../../components/button";
import { IconSpinner } from "../../components/icons/iconSpinner";
import { LinkButton } from "../../components/linkButton";
import { Modal } from "../../components/modal";
import { DateUtils } from "../../utils/date";
import { IEither } from "../../utils/types";
import { PlannerCodeBlock } from "./components/plannerCodeBlock";

interface IModalPlannerProgramRevisionsProps {
  client: Window["fetch"];
  programId: string;
  revisions: string[];
  onClose: () => void;
  onRestore: (text: string) => void;
}

type IProgramRevisionState =
  | {
      isLoading: true;
      promise: Promise<IEither<string, string>>;
    }
  | {
      isLoading: false;
      result: IEither<string, string>;
    };

export function ModalPlannerProgramRevisions(props: IModalPlannerProgramRevisionsProps): JSX.Element {
  const initialCurrentRevision = props.revisions[0];
  const [currentRevision, setCurrentRevision] = useState<string>(initialCurrentRevision);
  const [state, setState] = useState<Partial<Record<string, IProgramRevisionState>>>({});
  const service = new Service(props.client);

  function loadRevision(revision: string): void {
    setCurrentRevision(revision);
    if (state[revision]) {
      return;
    }
    const result = service.getProgramRevision(props.programId, revision);
    setState((prevState) => ({
      ...prevState,
      [revision]: { isLoading: true, promise: result },
    }));
    result.then((r) => {
      setState((prevState) => ({
        ...prevState,
        [revision]: { isLoading: false, result: r },
      }));
    });
  }

  useEffect(() => {
    loadRevision(currentRevision);
  }, []);

  const programRevision = state[currentRevision];

  return (
    <Modal
      innerClassName="flex flex-col"
      isFullWidth={true}
      onClose={props.onClose}
      shouldShowClose={true}
      noPaddings={true}
    >
      <div className="flex flex-col flex-1 min-h-0 sm:flex-row">
        <div
          className="h-40 p-4 overflow-y-auto border-r min-h-40 bg-grayv2-50 border-grayv2-200 sm:h-auto sm:min-h-max"
          style={{ borderRadius: "0.5rem 0 0 0.5rem", minWidth: "16rem" }}
        >
          <h3 className="mb-2 text-lg font-bold">Version History</h3>
          <ul>
            {props.revisions.map((revision) => {
              const date = DateUtils.parseYYYYMMDDHHMM(revision);
              if (!date) {
                return null;
              }
              const text = DateUtils.formatWithTime(date);
              return (
                <li className="text-left">
                  {revision === currentRevision ? (
                    <span className="font-bold">{text}</span>
                  ) : (
                    <LinkButton
                      className="text-left"
                      name="change-program-revision"
                      onClick={() => {
                        loadRevision(revision);
                      }}
                    >
                      {text}
                    </LinkButton>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
        <div className="flex flex-col flex-1 overflow-auto">
          {!programRevision || programRevision.isLoading ? (
            <div className="flex items-center justify-center h-full">
              <IconSpinner width={40} height={40} />
            </div>
          ) : programRevision.result.success ? (
            <>
              <div className="flex-1 p-4 overflow-auto">
                <div>
                  <PlannerCodeBlock script={programRevision.result.data} />
                </div>
              </div>
              <div className="p-4 text-center border-t bg-grayv2-50 border-grayv2-200">
                <Button
                  name="restore-program-revision"
                  kind="orange"
                  onClick={() => {
                    if (
                      programRevision.result.success &&
                      confirm("Are you sure you want to restore this version? It'll overwrite your current changes.")
                    ) {
                      props.onRestore(programRevision.result.data);
                    }
                  }}
                >
                  Restore
                </Button>
              </div>
            </>
          ) : (
            <div>{programRevision.result.error}</div>
          )}
        </div>
      </div>
    </Modal>
  );
}
