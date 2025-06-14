import { h, JSX } from "preact";
import { IAccount } from "../../models/account";
import { useState, useRef } from "preact/hooks";
import { Service } from "../../api/service";
import { PlannerProgram } from "../../pages/planner/models/plannerProgram";
import { Settings } from "../../models/settings";
import { PlannerSyntaxError } from "../../pages/planner/plannerExerciseEvaluator";

interface IAiContentProps {
  client: Window["fetch"];
  account: IAccount;
}

export function AiContent(props: IAiContentProps): JSX.Element {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<PlannerSyntaxError[]>([]);
  const [retryCount, setRetryCount] = useState(0);
  const [progress, setProgress] = useState("");
  const abortControllerRef = useRef<AbortController | null>(null);

  const service = new Service(props.client);

  const validateLiftoscript = (liftoscript: string): { isValid: boolean; errors?: PlannerSyntaxError[] } => {
    try {
      const settings = Settings.build();
      const { evaluatedWeeks } = PlannerProgram.evaluateFull(liftoscript, settings);

      if (!evaluatedWeeks.success) {
        return {
          isValid: false,
          errors: [evaluatedWeeks.error],
        };
      }

      return { isValid: true };
    } catch (e) {
      return {
        isValid: false,
        errors: [new PlannerSyntaxError("Unknown validation error", 0, 0, 0, 0)],
      };
    }
  };

  const handleConvert = async () => {
    if (!input.trim()) return;

    // Cancel any ongoing conversion
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Reset state
    setIsLoading(true);
    setError(null);
    setOutput("");
    setValidationErrors([]);
    setRetryCount(0);
    setProgress("");

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    try {
      let currentOutput = "";
      setProgress(input.trim().match(/^https?:\/\//) ? "Fetching content from URL..." : "Converting to Liftoscript...");

      for await (const event of service.streamAiLiftoscriptProgram(input)) {
        if (abortControllerRef.current.signal.aborted) break;

        switch (event.type) {
          case "progress":
            setProgress(event.data);
            break;
          case "result":
            currentOutput += event.data;
            setOutput(currentOutput);
            break;
          case "finish":
            currentOutput = event.data;
            setOutput(currentOutput);
            break;
          case "error":
            throw new Error(event.data);
          case "retry":
            setProgress(`Server is retrying: ${event.data}`);
            break;
        }
      }

      // Validate the output
      if (currentOutput) {
        const validation = validateLiftoscript(currentOutput);
        if (validation.isValid) {
          setProgress("");
          setValidationErrors([]);
        } else {
          setValidationErrors(validation.errors || []);
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        setProgress("Conversion cancelled");
      } else {
        setError(err instanceof Error ? err.message : "Unknown error occurred");
      }
    } finally {
      setIsLoading(false);
      setProgress("");
      abortControllerRef.current = null;
    }
  };

  const handleRetry = () => {
    setRetryCount(retryCount + 1);
    handleConvert();
  };

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsLoading(false);
      setProgress("Conversion cancelled");
    }
  };

  return (
    <section className="flex flex-col h-screen max-w-full mx-auto">
      <div className="px-4 py-6 border-b">
        <h1 className="text-2xl font-bold">AI Program Converter</h1>
        <p className="mt-2 text-gray-600">Convert any workout program to Liftoscript format using AI</p>
      </div>

      <div className="flex flex-col flex-1 overflow-hidden md:flex-row">
        <div className="flex flex-col flex-1 p-4 border-r">
          <label className="mb-2 font-semibold">Input Program (paste text or provide URL)</label>
          <textarea
            className="flex-1 w-full p-3 font-mono text-sm border rounded-lg resize-none"
            placeholder="Paste your workout program here or provide a link to a spreadsheet/document..."
            value={input}
            onInput={(e) => setInput((e.target as HTMLTextAreaElement).value)}
            disabled={isLoading}
          />
          {input.trim().match(/^https?:\/\//) && (
            <div className="mt-2 text-sm text-blue-600">
              URL detected - will fetch content from: {input.trim().split(/[?#]/)[0]}
            </div>
          )}
          <div className="flex gap-2 mt-4">
            <button
              className="px-6 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleConvert}
              disabled={isLoading || !input.trim()}
            >
              {isLoading ? "Converting..." : "Convert to Liftoscript"}
            </button>
            {isLoading && (
              <button className="px-6 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700" onClick={handleCancel}>
                Cancel
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-col flex-1 p-4">
          <label className="mb-2 font-semibold">Liftoscript Output</label>
          {error && (
            <div className="p-3 mb-4 text-red-700 bg-red-100 border border-red-400 rounded">
              <div className="flex items-center justify-between">
                <div>{error}</div>
                {!isLoading && (
                  <button
                    className="px-4 py-2 ml-4 text-white bg-red-600 rounded hover:bg-red-700"
                    onClick={handleRetry}
                  >
                    Retry
                  </button>
                )}
              </div>
            </div>
          )}
          {validationErrors.length > 0 && !isLoading && (
            <div className="p-3 mb-4 text-orange-700 bg-orange-100 border border-orange-400 rounded">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold">Validation errors found</div>
                  <ul className="mt-2 text-sm list-disc list-inside">
                    {validationErrors.map((err, idx) => (
                      <li key={idx}>{err.message}</li>
                    ))}
                  </ul>
                </div>
                <button
                  className="px-4 py-2 ml-4 text-white bg-orange-600 rounded hover:bg-orange-700"
                  onClick={handleRetry}
                >
                  Retry
                </button>
              </div>
            </div>
          )}
          {retryCount > 0 && (
            <div className="p-2 mb-2 text-sm text-blue-700 border border-blue-200 rounded bg-blue-50">
              Retry attempt {retryCount}
            </div>
          )}
          {progress && (
            <div className="p-2 mb-2 text-sm text-gray-600 bg-gray-100 border border-gray-200 rounded">{progress}</div>
          )}
          <pre className="flex-1 w-full p-3 overflow-auto font-mono text-sm whitespace-pre-wrap border rounded-lg bg-gray-50">
            {output || (!isLoading ? "Output will appear here..." : "")}
          </pre>
          {output && (
            <button
              className="px-6 py-2 mt-4 text-white bg-green-600 rounded-lg hover:bg-green-700"
              onClick={() => {
                navigator.clipboard.writeText(output);
                alert("Liftoscript copied to clipboard!");
              }}
            >
              Copy Liftoscript
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
