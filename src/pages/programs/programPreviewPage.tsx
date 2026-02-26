import { h, JSX } from "preact";
import { useState, useCallback, useEffect } from "preact/hooks";
import { parseFrontmatter, parseProgramMarkdownContent } from "../../utils/programUtils";
import { ProgramDetailsContent } from "./programDetailsContent";
import { Program_create, IProgramIndexEntry } from "../../models/program";
import { IProgram } from "../../types";
import { IProgramDetail } from "../../api/service";
import { MarkdownEditorBorderless } from "../../components/markdownEditorBorderless";

interface IParsedProgram {
  program: IProgram;
  fullDescription: string;
  faq?: string;
  indexEntry: IProgramIndexEntry;
  liftoscriptError?: string;
}

function buildProgram(entry: IProgramIndexEntry, detail: IProgramDetail): IProgram {
  return {
    ...Program_create(entry.name, entry.id),
    author: entry.author,
    url: entry.url,
    shortDescription: entry.shortDescription,
    description: entry.description || "",
    isMultiweek: entry.isMultiweek,
    tags: entry.tags as IProgram["tags"],
    planner: detail.planner,
  };
}

function parseMarkdown(raw: string): IParsedProgram | { error: string } {
  try {
    const { data: frontmatter, content } = parseFrontmatter(raw);
    const { indexEntry, detail, liftoscriptError } = parseProgramMarkdownContent(content, frontmatter);
    const program = buildProgram(indexEntry, detail);
    return { program, fullDescription: detail.fullDescription, faq: detail.faq, indexEntry, liftoscriptError };
  } catch (e) {
    return { error: String(e) };
  }
}

export function ProgramPreviewPage(): JSX.Element {
  const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : undefined;
  const [user, setUser] = useState(params?.get("user") || "");
  const [commit, setCommit] = useState(params?.get("commit") || "");
  const [programName, setProgramName] = useState(params?.get("program") || "");
  const [markdown, setMarkdown] = useState("");
  const [parsed, setParsed] = useState<IParsedProgram | null>(null);
  const [parseVersion, setParseVersion] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [fetching, setFetching] = useState(false);
  const [editorVersion, setEditorVersion] = useState(0);

  const doParse = useCallback((raw: string) => {
    if (!raw.trim()) {
      setParsed(null);
      setError(null);
      return;
    }
    const result = parseMarkdown(raw);
    if ("error" in result) {
      setError(result.error);
      setParsed(null);
    } else {
      setParsed(result);
      setParseVersion((v) => v + 1);
      setError(null);
    }
  }, []);

  const handleMarkdownChange = useCallback(
    (raw: string) => {
      setMarkdown(raw);
      doParse(raw);
    },
    [doParse]
  );

  const fetchFromGithub = useCallback(async () => {
    if (!user || !commit || !programName) {
      return;
    }
    setFetching(true);
    setError(null);
    try {
      const url = `https://raw.githubusercontent.com/${user}/liftosaur/${commit}/programs/builtin/${programName}.md`;
      const resp = await fetch(url);
      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
      }
      const text = await resp.text();
      setMarkdown(text);
      setEditorVersion((v) => v + 1);
      doParse(text);
    } catch (e) {
      setError(String(e));
    } finally {
      setFetching(false);
    }
    if (typeof window !== "undefined") {
      const newParams = new URLSearchParams();
      newParams.set("user", user);
      newParams.set("commit", commit);
      newParams.set("program", programName);
      window.history.replaceState(null, "", `?${newParams.toString()}`);
    }
  }, [user, commit, programName, doParse]);

  useEffect(() => {
    if (user && commit && programName) {
      fetchFromGithub();
    }
  }, []);

  return (
    <div className="px-4 py-4 mx-auto" style={{ maxWidth: 1400 }}>
      <h1 className="mb-4 text-2xl font-bold">Program Previewer</h1>
      <div className="flex flex-wrap items-end gap-2 mb-4">
        <label className="flex flex-col text-sm">
          <span className="mb-1 font-bold">GitHub User</span>
          <input
            className="px-2 py-1 border rounded border-border-neutral"
            type="text"
            value={user}
            onInput={(e) => setUser((e.target as HTMLInputElement).value)}
            placeholder="astashovai"
          />
        </label>
        <label className="flex flex-col text-sm">
          <span className="mb-1 font-bold">Commit Hash</span>
          <input
            className="px-2 py-1 border rounded border-border-neutral"
            type="text"
            value={commit}
            onInput={(e) => setCommit((e.target as HTMLInputElement).value)}
            placeholder="210b376..."
          />
        </label>
        <label className="flex flex-col text-sm">
          <span className="mb-1 font-bold">Program Name</span>
          <input
            className="px-2 py-1 border rounded border-border-neutral"
            type="text"
            value={programName}
            onInput={(e) => setProgramName((e.target as HTMLInputElement).value)}
            placeholder="ivysaur-4-4-8"
          />
        </label>
        <button
          className="px-4 py-1 text-sm font-bold text-white bg-blue-700 rounded disabled:opacity-50"
          onClick={fetchFromGithub}
          disabled={fetching || !user || !commit || !programName}
        >
          {fetching ? "Fetching..." : "Fetch"}
        </button>
      </div>

      <div className="flex gap-4" style={{ minHeight: "80vh" }}>
        <div className="flex flex-col w-1/3">
          <h2 className="mb-2 text-lg font-bold">Markdown</h2>
          <div className="flex-1 overflow-auto border rounded border-border-neutral">
            <MarkdownEditorBorderless
              key={editorVersion}
              value={markdown}
              placeholder="Paste program .md content here..."
              onChange={handleMarkdownChange}
              debounceMs={500}
            />
          </div>
          {parsed?.liftoscriptError && (
            <div className="p-2 mt-2 text-sm text-red-800 bg-red-100 rounded">
              <strong>Liftoscript error: </strong>
              {parsed.liftoscriptError}
            </div>
          )}
        </div>
        <div className="w-2/3 overflow-auto">
          <h2 className="mb-2 text-lg font-bold">Preview</h2>
          {error && <div className="p-2 mb-2 text-sm text-red-800 bg-red-100 rounded">{error}</div>}
          {parsed && (
            <div className="border rounded border-border-neutral">
              <ProgramDetailsContent
                key={parseVersion}
                program={parsed.program}
                fullDescription={parsed.fullDescription}
                faq={parsed.faq}
                indexEntry={parsed.indexEntry}
                client={window.fetch.bind(window)}
              />
            </div>
          )}
          {!parsed && !error && (
            <div className="text-sm text-text-secondary">Paste markdown or fetch from GitHub to preview</div>
          )}
        </div>
      </div>
    </div>
  );
}
