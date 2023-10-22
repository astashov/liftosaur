import { lb } from "lens-shmens";
import { h, JSX, Fragment } from "preact";
import { useRef, useState } from "preact/hooks";
import { Service } from "../../api/service";
import Prism from "prismjs";
import { Button } from "../../components/button";
import { IconSpinner } from "../../components/icons/iconSpinner";
import { LinkButton } from "../../components/linkButton";
import { ProgramPreview } from "../../components/programPreview";
import { getLatestMigrationVersion } from "../../migrations/migrations";
import { Program } from "../../models/program";
import { Settings } from "../../models/settings";
import { IProgram, ISettings } from "../../types";
import { useLensReducer } from "../../utils/useLensReducer";

export interface IFreeformContentProps {
  client: Window["fetch"];
}

interface IFreeformState {
  prompt?: string;
  response?: string;
  program?: IProgram;
  settings: ISettings;
}

export function FreeformContent(props: IFreeformContentProps): JSX.Element {
  const initialState: IFreeformState = {
    settings: Settings.build(),
  };
  const [state, dispatch] = useLensReducer(initialState, { client: props.client }, [
    async (action, oldState, newState) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).state = newState;
    },
  ]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [doneMs, setDoneMs] = useState<number | undefined>(undefined);
  const [link, setLink] = useState("");
  const [showResponse, setShowResponse] = useState(false);
  const highlightedResponse =
    state.response && Prism.highlight(state.response, Prism.languages.javascript, "javascript");

  return (
    <div className="px-4">
      <h1 className="text-2xl font-bold">Experimental Freeform Program Generator</h1>
      <h3 className="mt-1 mb-4 text-xs leading-tight text-grayv2-main">
        Use the power of ChatGPT to generate a weightlifting program from freeform text description!
        <br />
        It may not work, it's kinda experimental.
      </h3>
      <div className="flex flex-col sm:flex-row">
        <div className="flex-1">
          <div>
            <label className="block font-bold">Enter freeform weightlifting program description:</label>
            <textarea
              className="w-full p-2 border h- border-grayv2-400 rounded-xl"
              style={{ height: "24rem" }}
              value={state.prompt}
              ref={textareaRef}
              placeholder="Something like: 
              
Workout A:
Bench Press - 3 sets of 5 reps, supersetted with 3 sets of 10 reps of dumbbell flyes,
Then, 3 sets of 10 reps of dumbbell pullovers, and finish with 3 sets of 10 reps of dumbbell rows.

Workout B:
Squat - 3 sets of 5 reps, supersetted with 3 sets of 10 reps of leg press,
Then, 3 sets of 10 reps of leg extensions, and ab wheel rollouts for 3 sets of 10 reps.
"
            />
          </div>
          <div className="flex">
            <div>
              <Button
                name="freeform-generate-program"
                kind="orange"
                style={{ width: "8rem" }}
                onClick={async () => {
                  const start = Date.now();
                  setDoneMs(undefined);
                  setIsLoading(true);
                  try {
                    const service = new Service(props.client);
                    const id = await service.postFreeformGenerator(textareaRef.current.value);
                    const result = await service.getFreeformRecord(id, 1000 * 60 * 5);
                    if (result.success) {
                      dispatch(lb<IFreeformState>().p("program").record(result.data.program));
                      dispatch(lb<IFreeformState>().p("response").record(result.data.response));
                      const url = await Program.exportProgramToLink(
                        result.data.program,
                        state.settings,
                        getLatestMigrationVersion()
                      );
                      service.postShortUrl(url, "p").then(setLink);
                    } else {
                      dispatch(lb<IFreeformState>().p("response").record(result.error.response));
                      alert(result.error.error.join("\n\n"));
                    }
                  } catch (e) {
                    alert(e.message);
                  } finally {
                    setDoneMs(Date.now() - start);
                    setIsLoading(false);
                  }
                }}
              >
                {isLoading ? <IconSpinner color="white" width={18} height={18} /> : "Generate"}
              </Button>
            </div>
            <div className="flex-1 ml-2 text-xs text-grayv2-main">
              {isLoading && "Please be patient, ChatGPT sometimes needs a few minutes to generate a program."}
              {doneMs && (
                <>
                  Done in <strong>{(doneMs / 1000).toFixed(1)}s</strong>.
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex-1">
          {state.program && (
            <div className="pl-2">
              <h4 className="text-xs text-grayv2-main">
                Use this link:
                <a href={link} className="block font-bold underline text-bluev2" target="_blank">
                  {link}
                </a>
                to edit this program on your laptop, or import into <strong>Liftosaur</strong> on your phone.
              </h4>
              <ProgramPreview
                program={state.program}
                settings={state.settings}
                subscription={{ google: { fake: null }, apple: {} }}
              />
            </div>
          )}
        </div>
      </div>
      {highlightedResponse && (
        <div className="text-xs">
          <div>
            <LinkButton name="freeform-show-response" onClick={() => setShowResponse(!showResponse)}>
              {showResponse ? "Hide" : "Show"} ChatGPT response
            </LinkButton>
          </div>
          {showResponse && (
            <pre>
              <code class="code language-javascript" dangerouslySetInnerHTML={{ __html: highlightedResponse }} />
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
