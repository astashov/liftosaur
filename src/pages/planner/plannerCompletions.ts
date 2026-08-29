import { SyntaxNode, Tree } from "@lezer/common";
import { equipments, IAllCustomExercises, IEquipment, IProgramState } from "../../types";
import { equipmentName, Exercise_all, Exercise_findByName, Exercise_searchNames } from "../../models/exercise";
import { ExerciseImageUtils_exists } from "../../models/exerciseImage";
import { ObjectUtils_values } from "../../utils/object";
import { StringUtils_fuzzySearch } from "../../utils/string";
import { PlannerNodeName } from "./plannerExerciseStyles";
import { PlannerStateVars_fromArgs } from "./models/plannerStateVars";
import { liftoscriptFnSignatures, VScriptBindings, IScriptFnSignature, IScriptFnName } from "../../liftoscriptFns";

// The completion sources, with no CodeMirror in them: CodeMirror's autocomplete pulls in
// @codemirror/view and the DOM, and the phone's editor is a native text view driven from JS.
// Everything the sources actually needed from CodeMirror was the text before the cursor and a
// Lezer tree, both of which the native editor's parse cache already has.

export type ICompletionKind =
  | "exercise"
  | "exerciseVariant"
  | "reuse"
  | "section"
  | "progressFn"
  | "stateVar"
  | "liftoscript";

export interface ICompletionOption {
  label: string;
  type: string;
  detail?: string;
  // What goes into the document. Defaults to `label`, which carries trailing punctuation for
  // some of these ("progress: ").
  insert?: string;
  // What a one-line host — the phone's suggestion strip — shows on the chip. Defaults to `label`.
  display?: string;
}

export interface ICompletionResult {
  kind: ICompletionKind;
  from: number;
  // The text between `from` and the cursor — what the options were matched against.
  query: string;
  // Where the replacement ends, which is the end of the token the cursor is standing in, not the
  // cursor itself. Accepting "Deadlift" with the cursor after "Dead" has to replace "Deadlift",
  // not insert in front of the "lift" that's already there.
  to: number;
  options: ICompletionOption[];
}

// Ranking is the module's business, not a caller's: `ordered` says the options carry an order no
// string score can recover (equipment variants are sorted by what the bare name already means),
// and a host that re-sorted them would silently undo that. It never leaves this file — the two
// public shapes below are each finished for the host they name.
interface IRankableResult extends ICompletionResult {
  ordered?: boolean;
}

// In autocomplete the short aliases (w = weights, cr = completedReps, ...) are noise —
// they'd pop up on almost every keystroke while saving no typing over the completion itself.
const bindingAliases = new Set(["w", "r", "cr", "cw", "mr", "ns"]);

// CodeMirror's ensureAnchor(expr, false): wrap the source so the match has to end at the
// cursor, leaving any leading `^` where it is.
function anchorAtEnd(re: RegExp): RegExp {
  return new RegExp(`(?:${re.source})$`, re.flags);
}

// CompletionContext.matchBefore, minus CodeMirror: match against the text from the start of the
// line (capped 250 characters back, as CodeMirror caps it) up to the cursor.
function matchBefore(text: string, pos: number, re: RegExp): { from: number; text: string } | undefined {
  const lineStart = pos <= 0 ? 0 : text.lastIndexOf("\n", pos - 1) + 1;
  const start = Math.max(lineStart, pos - 250);
  const str = text.slice(start, pos);
  const found = str.search(anchorAtEnd(re));
  return found < 0 ? undefined : { from: start + found, text: str.slice(found) };
}

// Where the grammar says the node under the cursor ends. This is the honest answer to "how much
// does accepting a completion replace": `Squat[1-12]` parses as ExerciseName[Squat] followed by a
// separate Repeat, and only the parser knows that — a regex over the raw text either stops too
// early or eats the repeat range with it.
function nodeEndAt(tree: Tree, pos: number, name: PlannerNodeName): number | undefined {
  let node: SyntaxNode | null = tree.resolveInner(pos, -1);
  while (node != null && node.type.name !== name) {
    node = node.parent;
  }
  return node?.to;
}

// The fallback for when the tree can't answer — a line too broken to parse mid-edit, or a token
// the grammar gives no node of its own. `re` is matched against the text *after* the cursor, and
// trailing whitespace is never part of the token.
function tokenEnd(text: string, pos: number, re: RegExp): number {
  const rest = text.slice(pos).match(re)?.[0] ?? "";
  return pos + rest.replace(/\s+$/, "").length;
}

function fnSignatureDetail(signature: IScriptFnSignature): string {
  if (signature.variadic != null) {
    return "(...values)";
  }
  return `(${(signature.args || []).map((a) => (a.optional ? `${a.name}?` : a.name)).join(", ")})`;
}

// Building the expanded exercise list means every exercise crossed with every equipment, with
// an image-existence check per pair — fine once, too much on every keystroke. Owned by whoever
// is completing (the editor session) rather than living in the module, so it dies with them.
export class PlannerCompletionsIndex {
  private builtinNames: string[] | undefined;
  private builtinLabels: string[] | undefined;

  // One entry per exercise, with no equipment on it. A bare name is already a complete
  // reference — the planner resolves it to the exercise's defaultEquipment — so the suffix is
  // only worth asking about once the user types the comma that asks for it.
  public searchNames(query: string, customExercises: IAllCustomExercises): string[] {
    if (this.builtinNames == null) {
      this.builtinNames = Exercise_all({}).map((exercise) => exercise.name);
    }
    const needle = query.toLowerCase();
    const customNames = ObjectUtils_values(customExercises)
      .filter((ce) => ce != null && !ce.isDeleted)
      .map((ce) => ce!.name);
    const seen = new Set<string>();
    const names: string[] = [];
    for (const name of [...customNames, ...this.builtinNames]) {
      const key = name.toLowerCase();
      if (!seen.has(key) && StringUtils_fuzzySearch(needle, key)) {
        seen.add(key);
        names.push(name);
      }
    }
    return names;
  }

  // Whole "Name, Equipment" labels. Only the fallback for a name the variant path can't
  // resolve — a custom exercise with a comma of its own, say.
  public searchLabels(query: string, customExercises: IAllCustomExercises): string[] {
    if (this.builtinLabels == null) {
      this.builtinLabels = Exercise_searchNames("", {});
    }
    const needle = query.toLowerCase();
    const labels = this.builtinLabels.filter((name) => StringUtils_fuzzySearch(needle, name.toLowerCase()));
    const custom = Exercise_searchNames(query, customExercises).filter((name) => labels.indexOf(name) === -1);
    return [...labels, ...custom];
  }
}

// Custom exercises whose whole name matches what has been typed so far, commas and all.
function customExerciseMatches(query: string, customExercises: IAllCustomExercises): string[] {
  const needle = query.toLowerCase();
  return ObjectUtils_values(customExercises)
    .filter((ce) => ce != null && !ce.isDeleted && StringUtils_fuzzySearch(needle, ce.name.toLowerCase()))
    .map((ce) => ce!.name);
}

// The variants of one exercise, best first: whatever the bare name already means, then the rest
// of the catalog. undefined = not a built-in exercise name, which is the caller's cue to fall
// back rather than to offer nothing.
function exerciseVariants(
  name: string,
  equipmentQuery: string,
  customExercises: IAllCustomExercises
): ICompletionOption[] | undefined {
  const exercise = Exercise_findByName(name, customExercises);
  // A custom exercise is one thing under its own name; there is no equipment axis to offer.
  if (exercise == null || exercise.defaultEquipment == null || customExercises[exercise.id] != null) {
    return undefined;
  }
  const defaultEquipment = exercise.defaultEquipment;
  // defaultEquipment goes in whether or not it has an image, unlike the rest: it is what the
  // bare name already resolves to, so it can't be an invalid variant.
  const ordered: IEquipment[] = [
    defaultEquipment,
    ...equipments.filter(
      (equipment) =>
        equipment !== defaultEquipment && ExerciseImageUtils_exists({ id: exercise.id, equipment }, "small")
    ),
  ];
  const needle = equipmentQuery.toLowerCase();
  return ordered
    .filter((equipment) => StringUtils_fuzzySearch(needle, equipmentName(equipment).toLowerCase()))
    .map((equipment) => ({
      // The exercise's own name rather than what was typed, so picking a variant also fixes
      // the casing of what came before the comma.
      label: `${exercise.name}, ${equipmentName(equipment)}`,
      type: "keyword",
    }));
}

export interface IPlannerCompletionsArgs {
  customExercises?: IAllCustomExercises;
  exerciseFullNames?: string[];
  index?: PlannerCompletionsIndex;
}

// Every planner caller has a tree already — CodeMirror's own, or the one the parse cache just
// built — so it is required rather than optional. What's uncertain is whether the tree has a
// useful node at the cursor, not whether there is a tree; that's what the fallbacks are for.
type IPlannerCandidatesArgs = IPlannerCompletionsArgs & { tree: Tree };

function plannerCandidates(text: string, pos: number, args: IPlannerCandidatesArgs): IRankableResult | undefined {
  const exerciseMatch = matchBefore(text, pos, /^[^/]+/);
  if (exerciseMatch != null) {
    // Past a "label:" prefix, and then past the indentation — replacing from the raw line start
    // would swallow the leading whitespace along with the typed name.
    const withoutLabel = exerciseMatch.text.replace(/^[^:]*:\s*/, "");
    const query = withoutLabel.replace(/^\s+/, "");
    const from = exerciseMatch.from + (exerciseMatch.text.length - query.length);
    const customExercises = args.customExercises || {};
    const index = args.index ?? new PlannerCompletionsIndex();
    // The name node, which excludes the `[1-12]` repeat that may follow it. The fallback stops at
    // `[` for the same reason, for a line too broken to parse.
    const to = nodeEndAt(args.tree, pos, PlannerNodeName.ExerciseName) ?? tokenEnd(text, pos, /^[^[/\n]*/);
    // The comma is the ask. Before it the name is the whole answer, and offering six equipment
    // spellings of the same lift crowds out the five other lifts that might have been meant;
    // after it the equipment is the only thing left to choose.
    const comma = query.indexOf(",");
    if (comma >= 0) {
      const variants = exerciseVariants(query.slice(0, comma).trim(), query.slice(comma + 1).trim(), customExercises);
      if (variants != null) {
        // A custom exercise may itself be named with a comma — "Bench Press, Tempo" — and its
        // prefix can be a built-in, so reading the comma as an equipment split would hide it for
        // good. Both readings are legitimate here, so both are offered.
        const customs = customExerciseMatches(query, customExercises).filter(
          (label) => !variants.some((variant) => variant.label === label)
        );
        return {
          kind: "exerciseVariant",
          from,
          query,
          to,
          options: [...variants, ...customs.map((label) => ({ label, type: "keyword" }))],
          ordered: true,
        };
      }
      return {
        kind: "exercise",
        from,
        query,
        to,
        options: index.searchLabels(query, customExercises).map((label) => ({ label, type: "keyword" })),
      };
    }
    return {
      kind: "exercise",
      from,
      query,
      to,
      options: index.searchNames(query, customExercises).map((name) => ({ label: name, type: "keyword" })),
    };
  }

  const reuseMatch = matchBefore(text, pos, /\.\.\.[^/]*/);
  if (reuseMatch != null) {
    const query = reuseMatch.text.replace("...", "");
    // Deduped here rather than asked of every host: a day host's list comes straight from
    // Program_getAllProgramExercises, which walks every week, so a lift used in four weeks
    // arrives four times. Left in, the repeats fill the cap and crowd out lifts that appear
    // once — and they collide as React keys, since a chip is keyed by its label.
    const names = Array.from(new Set(args.exerciseFullNames || [])).filter((name) =>
      StringUtils_fuzzySearch(query.toLowerCase(), name.toLowerCase())
    );
    return {
      kind: "reuse",
      from: reuseMatch.from + 3,
      query,
      // A reuse target nests its own ExerciseName node — `...t1` holds ExerciseName["t1"] — so it
      // stops before the `[w:d]` a sets-reuse may carry, the same way the declaration does.
      to: nodeEndAt(args.tree, pos, PlannerNodeName.ExerciseName) ?? tokenEnd(text, pos, /^[^[/\n]*/),
      options: names.map((name) => ({ label: name, type: "method" })),
    };
  }

  const sectionMatch = matchBefore(text, pos, /\/\s*\w+$/);
  if (sectionMatch != null) {
    const offset = sectionMatch.text.match(/\/\s*/)?.[0]?.length ?? 0;
    const query = sectionMatch.text.substring(offset);
    return {
      kind: "section",
      from: sectionMatch.from + offset,
      query,
      to: tokenEnd(text, pos, /^\w*/),
      options: ["progress: "]
        .filter((prop) => prop.startsWith(query))
        .map((prop) => ({ label: prop, type: "property", display: prop.replace(": ", "") })),
    };
  }

  const propertyMatch = matchBefore(text, pos, /progress:\s*[^(]*$/);
  if (propertyMatch != null) {
    const offset = propertyMatch.text.match(/progress:\s*/)?.[0]?.length ?? 0;
    const query = propertyMatch.text.substring(offset);
    return {
      kind: "progressFn",
      from: propertyMatch.from + offset,
      query,
      to: tokenEnd(text, pos, /^\w*/),
      options: ["lp", "sum", "dp", "custom"]
        .filter((fn) => fn.startsWith(query))
        .map((fn) => ({ label: fn, type: "function" })),
    };
  }

  return undefined;
}

function findStateInScope(tree: Tree, pos: number, source: string): IProgramState | undefined {
  let node: SyntaxNode | null = tree.resolveInner(pos, -1);
  while (node != null && node.type.name !== PlannerNodeName.FunctionExpression) {
    node = node.parent;
  }
  if (node == null) {
    return undefined;
  }
  const fnArgs = node
    .getChildren(PlannerNodeName.FunctionArgument)
    .map((argNode) => source.slice(argNode.from, argNode.to));
  return PlannerStateVars_fromArgs(fnArgs).state;
}

function liftoscriptCandidates(
  source: string,
  pos: number,
  args: { tree: Tree; state: IProgramState }
): IRankableResult | undefined {
  const stateVar = matchBefore(source, pos, /state\.[a-zA-Z0-9_]*/);
  if (stateVar != null) {
    const query = stateVar.text.replace(/^state\./, "");
    const stateKeys = Object.keys(findStateInScope(args.tree, pos, source) || args.state);
    return {
      kind: "stateVar",
      from: stateVar.from + "state.".length,
      query,
      to: tokenEnd(source, pos, /^[a-zA-Z0-9_]*/),
      options: stateKeys
        .filter((key) => key.startsWith(query))
        .map((key) => ({ label: key, type: "keyword liftoscript" })),
    };
  }

  // completeFromList bails without a word token unless the completion was asked for
  // explicitly, and so does this — otherwise every keystroke inside a script offers the whole
  // binding list.
  const word = matchBefore(source, pos, /\w+/);
  if (word == null) {
    return undefined;
  }
  const bindings = Object.keys(VScriptBindings.entries)
    .filter((key) => !bindingAliases.has(key))
    .map((key) => ({ label: key, type: "keyword liftoscript" }));
  const fns = (Object.keys(liftoscriptFnSignatures) as IScriptFnName[]).map((name) => ({
    label: name,
    type: "function liftoscript",
    detail: fnSignatureDetail(liftoscriptFnSignatures[name]),
  }));
  return {
    kind: "liftoscript",
    from: word.from,
    query: word.text,
    to: tokenEnd(source, pos, /^\w*/),
    options: [
      { label: "state", type: "keyword liftoscript" },
      { label: "var", type: "keyword liftoscript" },
      ...bindings,
      ...fns,
    ],
  };
}

// What LiftoEditorParseCache provides, named structurally so this module doesn't depend on the
// native editor's brain.
export interface IPlannerCompletionsTrees {
  parse(text: string): Tree;
  parseLiftoscript(source: string): Tree;
}

function liftoscriptBlockAt(tree: Tree, pos: number): { from: number; to: number } | undefined {
  let node: SyntaxNode | null = tree.resolveInner(pos, -1);
  while (node != null && node.type.name !== PlannerNodeName.Liftoscript) {
    node = node.parent;
  }
  return node != null ? { from: node.from, to: node.to } : undefined;
}

// The dispatch CodeMirror gets for free from language data at the cursor: inside a `{~ ~}` block
// the Liftoscript source applies, outside it the planner one does.
function candidatesAt(
  text: string,
  pos: number,
  args: IPlannerCompletionsArgs & { cache: IPlannerCompletionsTrees; state?: IProgramState }
): IRankableResult | undefined {
  const tree = args.cache.parse(text);
  const block = liftoscriptBlockAt(tree, pos);
  if (block != null) {
    // The planner token includes the `{~ ~}` delimiters and the Liftoscript grammar @skips
    // them, so the raw slice parses and offsets are relative to the block's start.
    const source = text.slice(block.from, block.to);
    const result = liftoscriptCandidates(source, pos - block.from, {
      tree: args.cache.parseLiftoscript(source),
      // `custom(increment: 5lb)` is planner grammar, not Liftoscript — the args declaring the
      // state vars sit outside the slice, so the scope is resolved against the planner tree
      // here rather than inside. CodeMirror needs none of this: its mixed tree spans both.
      state: args.state ?? findStateInScope(tree, pos, text) ?? {},
    });
    return result != null ? { ...result, from: result.from + block.from, to: result.to + block.from } : undefined;
  }
  return plannerCandidates(text, pos, { ...args, tree });
}

// How many chips a strip can hold before scrolling stops being worth it.
const HOST_LIMIT = 30;

// For a host that renders the list exactly as handed over — the phone's suggestion strip.
// Finished: dispatched, filtered, ranked, capped. There is nothing left for a caller to get
// wrong, which is the point.
export function PlannerCompletions_at(
  text: string,
  pos: number,
  args: IPlannerCompletionsArgs & { cache: IPlannerCompletionsTrees; state?: IProgramState }
): ICompletionResult | undefined {
  const result = candidatesAt(text, pos, args);
  if (result == null) {
    return undefined;
  }
  const options = result.ordered ? result.options.slice(0, HOST_LIMIT) : rank(result.options, result.query, HOST_LIMIT);
  return options.length > 0
    ? { kind: result.kind, from: result.from, to: result.to, query: result.query, options }
    : undefined;
}

// For CodeMirror, which has its own fuzzy filter and scorer and re-applies them as the user
// types — so these are candidates, deliberately unranked. Ranking here would fight CodeMirror's
// own, and pre-filtering would hide options it expects to still have on backspace.
export function PlannerCompletions_codemirrorPlanner(
  text: string,
  pos: number,
  args: IPlannerCandidatesArgs
): ICompletionResult | undefined {
  return plannerCandidates(text, pos, args);
}

// The same, for the Liftoscript language CodeMirror nests inside the planner one. `tree` is
// CodeMirror's mixed tree, which spans both grammars, so `source` is the whole document.
export function PlannerCompletions_codemirrorLiftoscript(
  source: string,
  pos: number,
  args: { tree: Tree; state: IProgramState }
): ICompletionResult | undefined {
  return liftoscriptCandidates(source, pos, args);
}

function matchScore(label: string, query: string): number {
  if (query.length === 0) {
    return 2;
  }
  const lower = label.toLowerCase();
  if (lower === query) {
    return 0;
  }
  if (lower.startsWith(query)) {
    return 1;
  }
  if (lower.split(/[^a-z0-9]+/).some((word) => word.startsWith(query))) {
    return 2;
  }
  return StringUtils_fuzzySearch(query, lower) ? 3 : 4;
}

// A strip showing five chips at a time can't afford the alphabetical order
// Exercise_searchNames comes back in. Internal: only PlannerCompletions_at applies it, and only
// where the options don't already carry an order of their own.
function rank(options: ICompletionOption[], query: string, limit?: number): ICompletionOption[] {
  const needle = query.trim().toLowerCase();
  const scored = options
    .map((option) => ({ option, score: matchScore(option.label, needle) }))
    .filter((entry) => entry.score < 4);
  scored.sort((a, b) => {
    if (a.score !== b.score) {
      return a.score - b.score;
    }
    if (a.option.label.length !== b.option.label.length) {
      return a.option.label.length - b.option.label.length;
    }
    return a.option.label.localeCompare(b.option.label);
  });
  const ranked = scored.map((entry) => entry.option);
  return limit != null ? ranked.slice(0, limit) : ranked;
}
