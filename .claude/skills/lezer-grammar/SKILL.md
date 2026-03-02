---
name: lezer-grammar
description: Write and debug Lezer grammars for the Liftosaur project. Use when creating or modifying .grammar files for Liftoscript, Liftohistory, or other DSLs.
disable-model-invocation: true
argument-hint: [grammar description]
---

# Write Lezer Grammar

Write or fix a Lezer grammar for: $ARGUMENTS

Before writing any grammar, read these reference files:

1. `src/pages/planner/plannerExercise.grammar` — working Liftoscript planner grammar (primary reference)
2. `liftoscript.grammar` — working Liftoscript expression grammar
3. The Lezer documentation at https://lezer.codemirror.net/docs/guide/

## Lezer Grammar Syntax Reference

### Structure

A Lezer grammar file consists of:
- **Rules** (outside `@tokens`): define the parse tree structure using context-free grammar
- **`@tokens` block**: defines lexical tokens using regular language (no recursion except tail)
- **`@skip` directive**: defines what to ignore between tokens
- **`@top` directive**: designates the root rule

### Rules vs Tokens — The Critical Distinction

**Rules** (outside `@tokens`) can reference other rules AND tokens. They define tree structure.
**Tokens** (inside `@tokens`) can ONLY reference other tokens (no non-tail recursion). They define lexical atoms.

Capitalized names produce nodes in the syntax tree. Lowercase names are anonymous helpers.

### Token Syntax

Inside `@tokens`:
- **Character sets**: `$[a-zA-Z]` (include), `![/\n]` (exclude)
- **Built-in sets**: `@digit`, `@asciiLetter`, `@whitespace`, `@eof`
- **Wildcard**: `_` matches any single character
- **Strings**: `"keyword"` matches literal text
- **Concatenation**: `"a" "b"` = `"ab"` (tokens concatenate by juxtaposition)
- **Repetition**: `*` (zero or more), `+` (one or more), `?` (optional)
- **Alternatives**: `|`
- **Grouping**: `()`
- **Inline token declarations**: `"(" ")" ","` — declare literal tokens that are used in rules

Tokens can reference other tokens defined in the same `@tokens` block, but NOT rules defined outside.

### @precedence (inside @tokens)

Resolves conflicts when two tokens can match the same input at the same position:
```
@precedence { HigherPriority, LowerPriority }
```
Earlier items win. Example: `@precedence { Weight, Float, Int }` means if input matches both Weight and Float, Weight wins.

### @skip

```
@skip { space | LineComment }
```
Tokens matched by skip rules are consumed between other tokens without appearing in tree (unless Capitalized).

**Context-specific skip**: `@skip {} { ... }` disables skipping inside certain rules.

### @specialize and @extend

- `@specialize<baseToken, "keyword">` — when a token matches both `baseToken` and the literal, produce the specialized token instead
- `@extend<baseToken, "keyword">` — like specialize but allows both interpretations (enables GLR)

### Inline Tokens vs @tokens Block

Literal strings like `"+"`, `"if"`, `"("` used directly in rules are implicit tokens. They can also be explicitly declared in `@tokens` block to add precedence rules to them.

### Common Patterns

**Line-oriented formats** (like Liftoscript):
```
@tokens {
  linebreakOrEof { linebreak | @eof }
  linebreak { "\n" | "\r" | "\r\n" }
  space { $[ \t]+ }  // tab and space only, NOT newlines
  LineComment { "//" ![\n]* linebreakOrEof }
}
@skip { space }  // skip spaces but NOT newlines (newlines are significant)
```

**Identifier-like tokens**:
```
Keyword { $[a-zA-Z_] $[0-9a-zA-Z_]* }
```

**Number tokens**:
```
Int { @digit+ }
Float { @digit* "." @digit+ }   // note: @digit* not @digit+ to handle ".5"
```
Or for strict floats: `Float { @digit+ "." @digit+ }`

**Weight/unit tokens** (Liftosaur-specific):
```
Weight { ("+" | "-")? (Float | Int) ("lb" | "kg") "+"? }
```

**Quoted strings**:
```
QuotedString { '"' !["\n]* '"' }
```

**Character exclusion for "everything except"**:
```
NonSeparator { ![/{}() \t\n\r]+ }  // everything except separators, braces, parens, whitespace
```

### Key Gotchas

1. **Token rules cannot reference non-token rules.** If `ExerciseName` is defined outside `@tokens`, you cannot use it inside `@tokens`.

2. **`@skip { space }` skips between ALL tokens.** If you need significant whitespace (e.g., indentation), handle it differently.

3. **Token precedence only matters when tokens overlap at the same position.** `@precedence { Float, Int }` resolves `3.5` matching both Float and Int.

4. **Tokens are greedy (longest match).** A token rule matches as much input as possible. When two tokens overlap, the longer match wins. The DFA tracks all possible token states simultaneously and falls back to the last accepting state if a longer match fails.

5. **Newlines in `@skip` vs not.** For line-oriented formats, define `space` as `$[ \t]+` (no newlines) and handle newlines explicitly in rules.

6. **`linebreakOrEof`** — always define this for line-terminated rules: `linebreakOrEof { linebreak | @eof }` to handle the last line without trailing newline.

7. **String literals in rules** ("+" "/") are implicitly tokens. If they conflict with tokens defined in `@tokens`, add them to `@precedence`.

8. **EmptyExpression** — use `emptyLine { linebreak }` as a lowercase rule (not a token, not capitalized) when it's just structural whitespace that shouldn't appear in the tree.

9. **Lezer's tokenizer is context-aware.** It only tries tokens valid at the current parse position. Overlapping tokens only need `@precedence` if they can appear at the **same grammar position**. If token A only appears in rule X and token B only appears in rule Y, no precedence needed even if they match the same text.

10. **Compound tokens avoid ambiguity.** When a sequence like `keyword ":" "{" ` could conflict with `keyword ":" value`, use a compound token (e.g., `ExercisesOpen { "exercises:" $[ \t]* "{" }`) to match the whole sequence as one token. The DFA's longest-match + fallback handles it: if the compound token fails (no `{`), it falls back to the shorter Keyword match.

11. **Duration as a token, not a rule.** `Duration { @digit+ "s" }` is better than `Duration { Int "s" }` as a rule — making it a single token avoids ambiguity between `Int` (for set reps) and `Int "s"` (duration) at the same position.

12. **NonSeparator exclusions must include ALL structural characters.** For Liftohistory: `![/{}() \t\n\r@|",:]+ `. The `+`, `-`, `x` chars are NOT excluded (exercise names could theoretically contain them) but need `@precedence { "+", "-", "x", NonSeparator }` since those inline tokens must win.

13. **Exercise names with spaces.** Since `@skip { space }` consumes spaces between tokens, `ExerciseName { NonSeparator+ ("," NonSeparator+)? }` handles "Bench Press" as two NonSeparator tokens with skipped space. The deserializer reconstructs the full name from token positions.

### Liftosaur Conventions

In this project:
- Set notation: `SetPart { Rep "x" (RepRange | Rep) AmrapMarker? }` where `Rep { Int }`
- Weight: `Weight { ("+" | "-")? (Float | Int) ("lb" | "kg") "+"? }` (token)
- RPE: `Rpe { "@" PosNumber AmrapMarker? }` (rule, with `"@"` inline token)
- Duration: `Duration { @digit+ "s" }` (token)
- Section separators: `SectionSeparator { "/" }` (token)
- Exercise names: `ExerciseName { NonSeparator+ ("," NonSeparator+)? }` (rule using tokens)
- Comments: `LineComment { "//" ![\n]* linebreakOrEof }` (token)
- Unilateral reps: `UnilateralReps { Rep "|" Rep }` (rule)

### Working Liftohistory Grammar Reference

See `src/liftohistory/liftohistory.grammar` for a complete working example of a line-oriented format with:
- Block structure using `{ }` braces
- Key-value metadata fields
- `/`-separated sections
- Set notation with weights, RPE, rep ranges
- Comments
- Compound token (`ExercisesOpen`) to resolve ambiguity

### Compilation

```bash
npm run grammar:planner    # plannerExercise.grammar → plannerExerciseParser.ts
npm run grammar:liftohistory  # liftohistory.grammar → liftohistoryParser.ts
```

Uses `lezer-generator --output <output.ts> <input.grammar>`.

### Debugging

When the grammar won't compile:
1. Start minimal — get a skeleton grammar compiling first
2. Add rules incrementally, compiling after each addition
3. Token conflicts show as "Overlapping tokens X and Y" — add `@precedence`
4. "Shift/reduce conflict" — the grammar is ambiguous; restructure rules or add `@precedence` at the rule level
5. Test with: `parser.parse("input text")` and inspect the resulting tree
