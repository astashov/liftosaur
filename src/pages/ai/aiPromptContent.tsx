import { h, JSX } from "preact";
import { useState, useRef, useEffect } from "preact/hooks";
import { Button } from "../../components/button";
import { Service } from "../../api/service";
import { IconDoc } from "../../components/icons/iconDoc";
import { IAccount } from "../../models/account";

interface IAiPromptContentProps {
  client: Window["fetch"];
  account?: IAccount;
}

export function AiPromptContent(props: IAiPromptContentProps): JSX.Element {
  const [input, setInput] = useState("");
  const [generatedPrompt, setGeneratedPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const service = new Service(props.client);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = Math.min(scrollHeight, 500) + "px";
    }
  }, [input]);

  const generatePrompt = async () => {
    if (!input.trim()) {
      return;
    }

    setIsLoading(true);
    setError(null);
    setGeneratedPrompt("");

    try {
      const response = await service.generateAiPrompt(input.trim());
      if (response.prompt) {
        setGeneratedPrompt(response.prompt);
      } else if (response.error) {
        setError(response.error);
      } else {
        setError("Failed to generate prompt");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate prompt");
    } finally {
      setIsLoading(false);
    }
  };

  const copyPrompt = () => {
    if (generatedPrompt) {
      navigator.clipboard.writeText(generatedPrompt);
      alert("Prompt copied to clipboard!");
    }
  };

  return (
    <section className="flex flex-col max-w-full mx-auto">
      <div className="px-4 py-6 border-b">
        <h1 className="text-2xl font-bold">Liftoscript Prompt Generator</h1>
        <p className="mt-2 text-text-secondary">
          Generate a prompt to convert workout programs to Liftoscript using any LLM
        </p>
        <p className="mt-1 text-sm text-text-secondary">
          Copy the generated prompt and paste it into ChatGPT, Claude, or any other LLM
        </p>
        <p className="mt-1 text-sm text-text-secondary">Currently, Claude Sonnet 4 works the best.</p>
      </div>

      <div className="flex flex-col flex-1 overflow-hidden md:flex-row">
        <div className="flex flex-col flex-1 p-4 overflow-y-auto border-b md:border-r md:border-b-0 md:overflow-hidden">
          <label className="mb-2 font-semibold">Input Program (paste text or provide URL)</label>
          <textarea
            ref={textareaRef}
            className="w-full p-3 font-mono text-base border rounded-lg resize-none border-border-neutral min-h-[150px] max-h-[500px] overflow-y-auto"
            placeholder="Enter your workout program in plain text, or paste a link to a spreadsheet or website..."
            value={input}
            onInput={(e) => setInput((e.target as HTMLTextAreaElement).value)}
            disabled={isLoading}
          />
          {input.trim().match(/^https?:\/\//) && (
            <div className="mt-2 text-sm text-text-link">
              URL detected - will fetch content from: {input.trim().split(/[?#]/)[0]}
            </div>
          )}
          <div className="flex gap-2 mt-4">
            <Button
              name="generate-prompt"
              kind="purple"
              buttonSize="md"
              onClick={generatePrompt}
              disabled={isLoading || !input.trim()}
            >
              {isLoading ? "Generating..." : "Generate Prompt"}
            </Button>
          </div>
        </div>

        <div className="flex flex-col flex-1 p-4 overflow-y-auto">
          <label className="flex-shrink-0 mb-2 font-semibold">Generated Prompt for LLM</label>
          {error && (
            <div className="p-3 mb-4 border rounded text-redv3-700 bg-background-error border-redv3-200">
              <div>{error}</div>
            </div>
          )}
          <pre
            className="flex-1 w-full p-3 overflow-auto font-mono text-sm whitespace-pre-wrap border rounded-lg border-border-neutral bg-background-subtle"
            style={{ maxHeight: "400px" }}
          >
            {generatedPrompt || (!isLoading ? "Your prompt will appear here..." : "")}
          </pre>
          {generatedPrompt && (
            <div className="mt-4 space-y-2">
              <Button name="copy-prompt" kind="purple" buttonSize="md" className="w-full" onClick={copyPrompt}>
                Copy Prompt to Clipboard
              </Button>
              <div className="text-sm text-text-secondary">
                <p className="font-semibold">How to use:</p>
                <ol className="ml-4 list-decimal">
                  <li>Copy the prompt above</li>
                  <li>Go to your preferred LLM (ChatGPT, Claude, etc.)</li>
                  <li>Paste the prompt and send it</li>
                  <li>
                    Copy the Liftoscript output and paste it to{" "}
                    <a className="font-bold underline text-text-link" href="/planner" target="_blank">
                      Web Editor
                    </a>{" "}
                    (to the full mode, <IconDoc className="inline-block" /> icon)
                  </li>
                </ol>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
