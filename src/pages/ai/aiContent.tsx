import { h, JSX } from "preact";
import { IAccount } from "../../models/account";
import { useState } from "preact/hooks";
import { Service } from "../../api/service";

interface IAiContentProps {
  client: Window["fetch"];
  account?: IAccount;
}

export function AiContent(props: IAiContentProps): JSX.Element {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const service = new Service(props.client);

  const handleConvert = async () => {
    if (!input.trim()) return;

    setIsLoading(true);
    setError(null);
    setOutput("");

    const result = await service.convertProgramWithAi(input);
    
    if (result.success) {
      setOutput(result.data.program);
    } else {
      setError(result.error);
    }
    
    setIsLoading(false);
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
          <button
            className="px-6 py-2 mt-4 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleConvert}
            disabled={isLoading || !input.trim()}
          >
            {isLoading ? "Converting..." : "Convert to Liftoscript"}
          </button>
        </div>

        <div className="flex flex-col flex-1 p-4">
          <label className="mb-2 font-semibold">Liftoscript Output</label>
          {error && <div className="p-3 mb-4 text-red-700 bg-red-100 border border-red-400 rounded">{error}</div>}
          <pre className="flex-1 w-full p-3 overflow-auto font-mono text-sm whitespace-pre-wrap border rounded-lg bg-gray-50">
            {output || (isLoading ? "Generating Liftoscript..." : "Output will appear here...")}
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
