import { h } from "preact";
import { IAccount } from "../../models/account";
import { useState } from "preact/hooks";

interface IAiContentProps {
  client: Window["fetch"];
  account?: IAccount;
}

export function AiContent(props: IAiContentProps): JSX.Element {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConvert = async () => {
    if (!input.trim()) return;
    
    setIsLoading(true);
    setError(null);
    setOutput("");
    
    try {
      const response = await props.client("/api/ai/convert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to convert: ${response.statusText}`);
      }
      
      const data = await response.json();
      setOutput(data.program);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="flex flex-col h-screen max-w-full mx-auto">
      <div className="px-4 py-6 border-b">
        <h1 className="text-2xl font-bold">AI Program Converter</h1>
        <p className="text-gray-600 mt-2">
          Convert any workout program to Liftoscript format using AI
        </p>
      </div>
      
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        <div className="flex-1 flex flex-col p-4 border-r">
          <label className="font-semibold mb-2">
            Input Program (paste text or provide URL)
          </label>
          <textarea
            className="flex-1 w-full p-3 border rounded-lg resize-none font-mono text-sm"
            placeholder="Paste your workout program here or provide a link to a spreadsheet/document..."
            value={input}
            onInput={(e) => setInput((e.target as HTMLTextAreaElement).value)}
            disabled={isLoading}
          />
          <button
            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleConvert}
            disabled={isLoading || !input.trim()}
          >
            {isLoading ? "Converting..." : "Convert to Liftoscript"}
          </button>
        </div>
        
        <div className="flex-1 flex flex-col p-4">
          <label className="font-semibold mb-2">
            Liftoscript Output
          </label>
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}
          <pre className="flex-1 w-full p-3 bg-gray-50 border rounded-lg overflow-auto font-mono text-sm whitespace-pre-wrap">
            {output || (isLoading ? "Generating Liftoscript..." : "Output will appear here...")}
          </pre>
          {output && (
            <button
              className="mt-4 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
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