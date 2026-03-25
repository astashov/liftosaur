---
name: lezer-grammar
description: Write, debug, and integrate Lezer grammars for the Liftosaur project. Use when creating or modifying .grammar files, evaluators, syntax highlighting, or CodeMirror integration.
disable-model-invocation: true
argument-hint: [grammar description or task]
---

# Write Lezer Grammar

Write, fix, or integrate a Lezer grammar for: $ARGUMENTS

Before writing any grammar, read the relevant existing reference files:
1. `liftoscript.grammar` — expression-oriented grammar (operators, precedence, control flow)
2. `src/pages/planner/plannerExercise.grammar` — line-oriented grammar (exercises, sets, mixed parsing)
3. `src/liftohistory/liftohistory.grammar` — record-oriented grammar (dates, metadata, block structure)

---

## Part 1: Lezer Grammar Syntax Reference

### File Structure

A `.grammar` file consists of:
- `@top` directive — designates the root rule
- **Rules** — define parse tree structure (context-free grammar)
- `@tokens` block — defines lexical tokens (regular language, no non-tail recursion)
- `@skip` directive — defines what to ignore between tokens
- `@precedence` directive (at rule level) — resolves shift/reduce conflicts
- `@precedence` (inside `@tokens`) — resolves token overlap conflicts

```
@top Program { expression* }

@precedence { times @left, plus @left }

expression { NumberExpression | BinaryExpression }

BinaryExpression {
  expression !plus "+" expression |
  expression !times "*" expression
}

NumberExpression { Number }

@skip { space }

@tokens {
  space { @whitespace+ }
  Number { @digit+ }
}
```

### Naming Convention

- **Capitalized** names (e.g. `ExerciseSet`, `Number`) produce **visible nodes** in the syntax tree
- **Lowercase** names (e.g. `expression`, `emptyLine`) are **anonymous/transparent** — their content is inlined into the parent node, not appearing as a named node

### Rule Syntax (Outside `@tokens`)

Rules define tree structure. They can reference other rules AND tokens.

**Operators:**
- `*` — zero or more
- `+` — one or more
- `?` — optional
- `|` — alternation (lowest precedence)
- Juxtaposition — sequence
- `()` — grouping

**Example:**
```
ExerciseSet { (Rpe | Timer | SetPart | Weight)+ }
ExerciseLine { ExerciseName (SectionSeparator ExerciseSection)* linebreak }
```

### Token Syntax (Inside `@tokens`)

Tokens define lexical atoms. They can ONLY reference other tokens in the same `@tokens` block.

**Character classes:**
- `$[a-zA-Z]` — include range
- `$[.,]` — include specific chars
- `![/\n]` — exclude (match anything except)
- `_` — wildcard, any single character

**Built-in classes:**
- `@digit` = `$[0-9]`
- `@asciiLetter` = `$[a-zA-Z]`
- `@asciiLowercase` = `$[a-z]`
- `@asciiUppercase` = `$[A-Z]`
- `@whitespace` = Unicode whitespace
- `@eof` = end of input

**Strings:** `"keyword"` matches literal text. Can be used in both rules and `@tokens`.

**Examples:**
```
@tokens {
  Keyword { $[a-zA-Z_] $[0-9a-zA-Z_]* }
  Int { @digit+ }
  Float { @digit+ "." @digit+ }
  Weight { ("+" | "-")? (Float | Int) ("lb" | "kg") }
  NonSeparator { ![/{}() \t\n\r]+ }
  LineComment { "//" ![\n]* linebreakOrEof }
  QuotedString { '"' !["\n]* '"' }
}
```

### Token Precedence (Inside `@tokens`)

Resolves conflicts when multiple tokens match at the same position. Earlier items win:

```
@tokens {
  @precedence { Weight, Percentage, Float, Int }
  @precedence { LineComment, SectionSeparator }
}
```

Tokens are **greedy** (longest match wins). The DFA tracks all possible token states simultaneously and falls back to the last accepting state if a longer match fails.

Token precedence only matters when tokens can match at the **same grammar position**. If token A only appears in rule X and token B only in rule Y, no precedence is needed even if they match the same text — Lezer's tokenizer is context-aware.

### Rule-Level Precedence

Resolves shift/reduce conflicts in the grammar (e.g., operator precedence):

```
@precedence {
  unary
  fncall @left
  times @left
  plus @left
  cmp @left
  ternary @right
  assign @right
}
```

Use `!name` markers in rules to reference precedence levels:

```
BinaryExpression {
  expression !plus Plus expression |
  expression !times Times expression
}
```

Associativity: `@left` (left-associative), `@right` (right-associative), or omitted.

**`@cut` modifier:** `@precedence { keyword @cut }` discards alternative parse branches once a `!keyword` marker is passed — improves performance and error messages.

### `@skip`

Defines tokens to silently consume between all other tokens:

```
@skip { space | LineComment | ";" | "{~" | "~}" }
```

**Context-specific skip** — disable skipping inside certain rules:
```
@skip {} {
  String { stringOpen stringContent* stringClose }
}
```

### `@specialize` and `@extend`

Handle keywords that overlap with identifiers:

- `@specialize<Keyword, "if">` — when a Keyword token matches "if", produce a specialized "if" token instead
- `@extend<Keyword, "none">` — like specialize but allows GLR (both interpretations possible)

Used in rules:
```
IfExpression {
  @specialize<Keyword, "if"> ParenthesisExpression BlockExpression
  (@specialize<Keyword, "else"> BlockExpression)?
}
None { @specialize<Keyword, "none"> }
```

### Template Rules

Parameterized rules for reuse:

```
commaSep<content> { "" | content ("," content)* }
FunctionExpression { FunctionName "(" commaSep<expression> ")" }
```

### Ambiguity Markers (GLR)

When the grammar is genuinely ambiguous, use `~name` markers to split into parallel parse threads:

```
expression { GoodValue ~choice | BadValue ~choice }
```

**Dynamic precedence** tips the scale: `A[@dynamicPrecedence=1] { ... }` (range -10 to 10).

### External Tokens

For patterns regular token rules cannot express (indentation, automatic semicolons):

```
@external tokens myTokenizer from "./tokens" { token1, token2 }
```

Implemented as `ExternalTokenizer` instances:
```typescript
import { ExternalTokenizer } from "@lezer/lr";
import { token1 } from "./parser.terms";

export const myTokenizer = new ExternalTokenizer(
  (input, stack) => {
    if (someCondition) input.acceptToken(token1);
  },
  { contextual: false, fallback: false, extend: false }
);
```

### Context Tracking

Maintain parse state accessible to external tokenizers:

```
@context trackContext from "./context.js"
```

Implemented as a `ContextTracker`:
```typescript
import { ContextTracker } from "@lezer/lr";
export const trackContext = new ContextTracker({
  start: initialValue,
  shift(context, term, stack, input) { return newContext; },
  reduce(context, term, stack, input) { return newContext; },
  hash(context) { return hashNumber; },
});
```

### Local Token Groups

Context-specific tokenization (e.g., inside strings or template literals):

```
@local tokens {
  stringEnd[@name='"'] { '"' }
  StringEscape { "\\" _ }
  @else stringContent
}
```

The `@else` fallback captures everything not matched by the local tokens.

### Dialects

Conditional language variants:

```
@dialects { strictMode }
StrictKeyword[@dialect=strictMode] { "strict" }
```

Enable via `parser.configure({ dialect: "strictMode" })`.

### Node Props

Attach metadata:

```
StartTag[closedBy="EndTag"] { "<" }
```

Pseudo-props: `@name` (override node name), `@detectDelim`, `@isGroup`.

---

## Part 2: Building and Compiling

### Build Commands

```bash
npm run grammar:planner        # plannerExercise.grammar -> plannerExerciseParser.ts
npm run grammar:liftohistory   # liftohistory.grammar -> liftohistoryParser.ts
```

These run:
```bash
lezer-generator --output <output.ts> <input.grammar>
```

The `--output` flag with a `.ts` extension produces TypeScript. The generator also creates a `.terms.ts` file with numeric term IDs.

### Generated Output

Each generated parser file exports a `parser` via `LRParser.deserialize()`:

```typescript
import { LRParser } from "@lezer/lr";
export const parser = LRParser.deserialize({
  version: 14,
  states: "...",       // serialized state machine
  stateData: "...",
  goto: "...",
  nodeNames: "⚠ LineComment Program BinaryExpression ...",
  maxTerm: 59,
  skippedNodes: [0, 1],
  tokenData: "...",
  topRules: { Program: [0, 2] },
});
```

The `.terms.ts` file exports numeric constants for each node type:
```typescript
export const Program = 1;
export const WorkoutRecord = 2;
export const Keyword = 6;
```

### Dependencies

- `@lezer/generator` (v1.2.3) — build-time grammar compiler (CLI + API)
- `@lezer/lr` (v1.3.7) — runtime LR parser
- `@lezer/common` — shared types: `Tree`, `TreeCursor`, `SyntaxNode`, `NodeType`
- `@lezer/highlight` (v1.1.6) — syntax highlighting tags
- `@codemirror/language` (v6.10.6) — CodeMirror language integration

---

## Part 3: Using the Generated Parser

### Parsing

```typescript
import { parser as liftoscriptParser } from "./liftoscript";

const tree = liftoscriptParser.parse(script);
const topNode = tree.topNode;  // SyntaxNode for the root
```

### Tree Traversal Patterns

**Pattern 1: Linear cursor traversal** — visit every node in the tree:
```typescript
const cursor = tree.cursor();
do {
  if (cursor.node.type.name === NodeName.StateVariable) {
    // process node
  }
} while (cursor.next());
```
Used for: scanning all nodes of a type (state variables, error detection, weight unit conversion).

**Pattern 2: Child iteration** — get all direct children of a node:
```typescript
function getChildren(node: SyntaxNode): SyntaxNode[] {
  const cur = node.cursor();
  const result: SyntaxNode[] = [];
  if (!cur.firstChild()) return result;
  do {
    result.push(cur.node);
  } while (cur.nextSibling());
  return result;
}
```
This helper is duplicated across all three evaluators. Use it to iterate children.

**Pattern 3: Named child lookup** — find specific children by type:
```typescript
const numberNode = expr.getChild(NodeName.NumberExpression);  // first match
const fnArgs = node.getChildren(PlannerNodeName.FunctionArgument);  // all matches
```
Used for: extracting structured data from known node shapes.

**Pattern 4: Type checking:**
```typescript
// By name (string comparison)
if (cursor.node.type.name === NodeName.BuiltinFunctionExpression) { ... }

// By numeric ID (faster, use .terms.ts imports)
if (child.type.id === WorkoutRecord) { ... }

// Error detection
if (cursor.node.type.isError) {
  this.error("Syntax error", cursor.node);
}
```

### Text Extraction

Extract source text from node positions:
```typescript
function getValue(node: SyntaxNode, script: string): string {
  return script.slice(node.from, node.to);
}
```

Node positions (`from`, `to`) are byte offsets into the original string.

### Error Handling

All three evaluators follow this pattern:

```typescript
export class MySyntaxError extends SyntaxError {
  public readonly line: number;
  public readonly offset: number;
  public readonly from: number;
  public readonly to: number;

  constructor(message: string, line: number, offset: number, from: number, to: number) {
    super(message);
    this.line = line;
    this.offset = offset;
    this.from = from;
    this.to = to;
  }
}
```

Line/offset are computed from `node.from` by splitting the source on newlines:
```typescript
private getLineAndOffset(node: SyntaxNode): [number, number] {
  const linesLengths = this.script.split("\n").map((l) => l.length + 1);
  let offset = 0;
  for (let i = 0; i < linesLengths.length; i++) {
    if (node.from >= offset && node.from < offset + linesLengths[i]) {
      return [i + 1, node.from - offset];
    }
    offset += linesLengths[i];
  }
  return [linesLengths.length, linesLengths[linesLengths.length - 1]];
}
```

### Script Rewriting

Use cursor traversal with position tracking to rewrite parts of the source:

```typescript
public switchWeightsToUnit(programNode: SyntaxNode, toUnit: IUnit): string {
  const cursor = programNode.cursor();
  let script = this.script;
  let shift = 0;
  do {
    if (cursor.node.type.name === NodeName.WeightExpression) {
      const from = cursor.node.from;
      const to = cursor.node.to;
      const newStr = convertWeight(cursor.node, toUnit);
      const oldStr = script.slice(from + shift, to + shift);
      script = script.substring(0, from + shift) + newStr + script.substring(to + shift);
      shift += newStr.length - oldStr.length;
    }
  } while (cursor.next());
  return script;
}
```

Track `shift` to account for length changes from earlier replacements.

---

## Part 4: NodeName Enums

Each grammar needs a manually maintained enum mapping node names:

**Liftoscript** (`src/liftoscriptEvaluator.ts`):
```typescript
export enum NodeName {
  Program = "Program",
  BinaryExpression = "BinaryExpression",
  NumberExpression = "NumberExpression",
  WeightExpression = "WeightExpression",
  StateVariable = "StateVariable",
  BuiltinFunctionExpression = "BuiltinFunctionExpression",
  Keyword = "Keyword",
  // ... one entry per Capitalized grammar rule
}
```

**Planner** (`src/pages/planner/plannerExerciseStyles.ts`):
```typescript
export enum PlannerNodeName {
  Program = "Program",
  ExerciseExpression = "ExerciseExpression",
  ExerciseName = "ExerciseName",
  SetPart = "SetPart",
  // ... etc
}
```

**Liftohistory** — uses numeric term IDs from the auto-generated `.terms.ts`:
```typescript
import { WorkoutRecord, ExerciseLine, SetPart, ... } from "./liftohistoryParser.terms";
if (child.type.id === WorkoutRecord) { ... }
```

Both approaches work. String comparison (`type.name`) is more readable; numeric ID comparison (`type.id`) is faster.

---

## Part 5: CodeMirror Integration

### Language Definition

Wrap the parser with `LRLanguage.define()`:

```typescript
import { LRLanguage } from "@codemirror/language";
import { styleTags, tags as t } from "@lezer/highlight";
import { parser } from "./myParser";

const parserWithMetadata = parser.configure({
  props: [
    styleTags({
      Number: t.number,
      Keyword: t.keyword,
      LineComment: t.lineComment,
      StateVariable: t.variableName,
    }),
  ],
});

export const myLanguage = LRLanguage.define({
  name: "myLanguage",
  parser: parserWithMetadata,
});
```

### Syntax Highlighting Styles

Map node names to `@lezer/highlight` tags. Selector syntax:

- `"Number"` — match by node name
- `"FunctionName/..."` — recursive: tag applies to all descendants
- `"CallExpression/VariableName"` — path: child only when inside parent
- `"*/Escape"` — wildcard parent

Liftosaur uses these common tag mappings:

```typescript
export const plannerExerciseStyles = {
  [`${PlannerNodeName.SetPart}/...`]: t.atom,         // sets like "3x5"
  [`${PlannerNodeName.Weight}/...`]: t.number,         // "100kg"
  [`${PlannerNodeName.Rpe}/...`]: t.number,            // "@8"
  [`${PlannerNodeName.Timer}/...`]: t.keyword,         // "90s"
  [PlannerNodeName.LineComment]: t.lineComment,        // "// comment"
  [PlannerNodeName.TripleLineComment]: t.blockComment, // "/// description"
  [`${PlannerNodeName.FunctionName}/...`]: t.attributeName,
  [`${PlannerNodeName.FunctionArgument}/...`]: t.attributeValue,
  [PlannerNodeName.Week]: t.annotation,                // "# Week 1"
  [PlannerNodeName.Day]: t.docComment,                 // "## Day 1"
};
```

### HTML Syntax Highlighting (Server-Side)

For non-CodeMirror rendering, use `highlightTree`:

```typescript
import { highlightTree, classHighlighter, styleTags } from "@lezer/highlight";

export function highlight(script: string): string {
  const tree = parserWithMetadata.parse(script);
  const ranges: { from: number; to: number; clazz: string }[] = [];
  highlightTree(tree, classHighlighter, (from, to, classes) => {
    ranges.push({ from, to, clazz: classes });
  });
  return ranges.reduceRight((acc, range) => {
    const span = `<span class="${range.clazz}">${acc.slice(range.from, range.to)}</span>`;
    return acc.slice(0, range.from) + span + acc.slice(range.to);
  }, script);
}
```

### Mixed/Nested Parsing

Embed one grammar inside another using `parseMixed()`:

```typescript
import { parseMixed } from "@lezer/common";
import { liftoscriptLanguage } from "../../liftoscriptLanguage";

const parserWithMetadata = plannerExerciseParser.configure({
  props: [styleTags(plannerExerciseStyles)],
  wrap: parseMixed((node) => {
    return node.name === "Liftoscript" ? { parser: liftoscriptLanguage.parser } : null;
  }),
});
```

The embedded region must be captured as a single token in the outer grammar:
```
Liftoscript { "{~" ![~]* "~}" }
```

This allows `{~ if (cr >= 5) { state.weight += 5lb } ~}` blocks in the planner grammar to be parsed and highlighted with the Liftoscript grammar.

---

## Part 6: Liftosaur-Specific Conventions

### Common Token Patterns

| Pattern | Token | Example |
|---------|-------|---------|
| Set notation | `SetPart { Rep "x" (RepRange \| Rep) }` | `3x5`, `3x5-8` |
| Weight | `Weight { ("+" \| "-")? (Float \| Int) ("lb" \| "kg") "+"? }` (token) | `100kg`, `+5lb` |
| Ask weight | `AskWeight { "?+" }` (token) | `?+` |
| Percentage | `Percentage { ("+" \| "-")? (Float \| Int) "%" }` (token) | `80%`, `-5%` |
| RPE | `Rpe { "@" PosNumber }` (rule, `"@"` is inline token) | `@8`, `@9.5` |
| Duration/Timer | `Duration { @digit+ "s" }` (token) | `90s` |
| Section separator | `SectionSeparator { "/" }` (token) | `/` |
| Exercise name | `ExerciseName { NonSeparator+ }` (rule) | `Bench Press` |
| Comments | `LineComment { "//" ![\n]* linebreakOrEof }` (token) | `// rest day` |
| Unilateral reps | `UnilateralReps { Rep "\|" Rep }` | `5\|5` |

### Line-Oriented Format Pattern

For formats where newlines are significant:

```
@skip { space }  // space = $[ \t]+, NOT @whitespace (no newlines)

@tokens {
  space { $[ \t]+ }
  linebreakOrEof { linebreak | @eof }
  linebreak { "\n" | "\r" | "\r\n" }
}
```

Always define `linebreakOrEof` to handle the last line without a trailing newline.

### NonSeparator Pattern

For exercise names and free-form text, exclude all structural characters:

```
NonSeparator { ![/{}() \t\n\r]+ }
```

Add characters as needed (e.g., `@`, `|`, `"`, `:` for liftohistory). Use `@precedence` for inline tokens that overlap:

```
@precedence { "+", "-", "x", NonSeparator }
```

### Compound Tokens

When a sequence like `keyword ":" "{" ` could be ambiguous, fuse it into a single token:

```
ExercisesOpen { "exercises:" $[ \t]* "{" }
```

The DFA's longest-match + fallback handles it: if the compound token fails (no `{`), it falls back to the shorter Keyword match.

### Embedded Liftoscript

Liftoscript expressions can be embedded in `{~ ... ~}` blocks:

Grammar:
```
Liftoscript { "{~" ![~]* "~}" }
```

Evaluator strips delimiters:
```typescript
const liftoscriptText = script.slice(node.from + 2, node.to - 2);  // strip {~ and ~}
```

---

## Part 7: Debugging

### Grammar Won't Compile

1. **Start minimal** — get a skeleton grammar compiling first, then add rules incrementally
2. **"Overlapping tokens X and Y"** — add `@precedence { X, Y }` in `@tokens`
3. **"Shift/reduce conflict"** — the grammar is ambiguous at the rule level; restructure rules or add rule-level `@precedence` with `!markers`
4. **Token cannot reference non-token rule** — move the referenced rule into `@tokens` or restructure
5. **"Too many states"** — grammar is too complex; simplify or use external tokens

### Testing a Parser

```typescript
const tree = parser.parse("input text");
const cursor = tree.cursor();
do {
  console.log(
    "  ".repeat(cursor.node.depth ?? 0),
    cursor.node.type.name,
    `[${cursor.from}-${cursor.to}]`,
    cursor.node.type.isError ? "ERROR" : ""
  );
} while (cursor.next());
```

### Common Mistakes

1. **Forgetting to regenerate** — after changing a `.grammar` file, run `npm run grammar:planner` or `npm run grammar:liftohistory`
2. **NodeName enum out of sync** — when adding new Capitalized rules, add them to the corresponding enum
3. **`@skip` consuming significant whitespace** — use `$[ \t]+` not `@whitespace+` for line-oriented formats
4. **Duration as a rule vs token** — `Duration { @digit+ "s" }` must be a token, not a rule like `Duration { Int "s" }`, to avoid ambiguity between `Int` as reps and `Int "s"` as duration
5. **Missing `linebreakOrEof`** — line-terminated rules must end with `linebreakOrEof` to handle the final line

---

## Part 8: Full Workflow Checklist

When creating a new grammar:

1. **Write the `.grammar` file** following the patterns above
2. **Add a build command** to `package.json`:
   ```json
   "grammar:myformat": "lezer-generator --output ./src/path/myParser.ts ./src/path/my.grammar"
   ```
3. **Run the generator**: `npm run grammar:myformat`
4. **Create a NodeName enum** (or use `.terms.ts` numeric IDs)
5. **Write an evaluator/deserializer** class that:
   - Imports the generated parser
   - Parses text with `parser.parse(text)`
   - Traverses the tree using the patterns above
   - Has error handling with line/offset info
6. **If CodeMirror integration is needed:**
   - Create style mappings (`styleTags(...)`)
   - Define an `LRLanguage` with the configured parser
   - If nested grammars needed, use `parseMixed()`
7. **If HTML highlighting is needed:**
   - Use `highlightTree()` with `classHighlighter`

### Key Files Reference

| File | Purpose |
|------|---------|
| `liftoscript.grammar` | Expression grammar (operators, control flow) |
| `src/pages/planner/plannerExercise.grammar` | Exercise/set/week grammar |
| `src/liftohistory/liftohistory.grammar` | History record grammar |
| `src/liftoscript.ts` | Generated liftoscript parser |
| `src/liftoscriptEvaluator.ts` | Liftoscript tree evaluator + NodeName enum |
| `src/parser.ts` | ScriptRunner orchestrator |
| `src/pages/planner/plannerExerciseParser.ts` | Generated planner parser |
| `src/pages/planner/plannerExerciseEvaluator.ts` | Planner tree evaluator |
| `src/pages/planner/plannerExerciseStyles.ts` | PlannerNodeName enum + highlight styles |
| `src/pages/planner/plannerExerciseCodemirror.ts` | Planner CodeMirror language + autocomplete |
| `src/pages/planner/plannerHighlighter.ts` | Planner HTML syntax highlighting |
| `src/liftoscriptLanguage.ts` | Liftoscript CodeMirror language definition |
| `src/liftohistory/liftohistoryParser.ts` | Generated liftohistory parser |
| `src/liftohistory/liftohistoryParser.terms.ts` | Liftohistory term ID constants |
| `src/liftohistory/liftohistoryDeserializer.ts` | Liftohistory tree deserializer |
