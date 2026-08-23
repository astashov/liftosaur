import { SyntaxNode } from "@lezer/common";
import {
  ILiftoEditorContext,
  ILiftoEditorLevel,
  ITextEdit,
  LiftoEditorBrain_contextAt,
  LiftoEditorParseCache,
} from "../../src/components/primitives/liftoEditorBrain";
import {
  ILiftoEditorAcrossField,
  ILiftoEditorPill,
  LiftoEditorActions_acrossField,
} from "../../src/components/primitives/liftoEditorActions";

// Position of `needle`'s occurrence in `text`, nudged one char inside the token — the same
// spot LiftoEditorSession_tap anchors to (token.start + 1).
export function LiftoEditorTestUtils_pos(text: string, needle: string, occurrence: number = 0): number {
  let index = -1;
  for (let i = 0; i <= occurrence; i += 1) {
    index = text.indexOf(needle, index + 1);
    if (index === -1) {
      throw new Error(`"${needle}" (occurrence ${occurrence}) not found in "${text}"`);
    }
  }
  return index + 1;
}

// A fresh cache per call: every assertion starts from an empty slate, so no test can be
// affected by what another one parsed.
export function LiftoEditorTestUtils_contextAt(
  text: string,
  needle: string,
  occurrence: number = 0
): ILiftoEditorContext {
  return LiftoEditorBrain_contextAt(
    new LiftoEditorParseCache(),
    text,
    LiftoEditorTestUtils_pos(text, needle, occurrence)
  );
}

// LiftoEditorActions_acrossField answers about one node; contextAt asks it of every ancestor
// on its way out, and so does this — a tap inside "3x8" resolves to the inner Rep, and it is
// the SetPart above it that names a field.
export function LiftoEditorTestUtils_acrossField(
  text: string,
  needle: string,
  occurrence: number = 0
): ILiftoEditorAcrossField | undefined {
  const index = LiftoEditorTestUtils_pos(text, needle, occurrence);
  let node: SyntaxNode | null = new LiftoEditorParseCache().parse(text).resolveInner(index, -1);
  for (; node != null; node = node.parent) {
    const field = LiftoEditorActions_acrossField(node);
    if (field != null) {
      return field;
    }
  }
  return undefined;
}

export function LiftoEditorTestUtils_level(
  text: string,
  needle: string,
  levelLabel: string,
  occurrence: number = 0
): ILiftoEditorLevel {
  const context = LiftoEditorTestUtils_contextAt(text, needle, occurrence);
  const level = context.levels.find((l) => l.label === levelLabel);
  if (level == null) {
    throw new Error(`No level "${levelLabel}" at "${needle}" (levels: ${context.breadcrumb.join(" / ")})`);
  }
  return level;
}

export function LiftoEditorTestUtils_pills(
  text: string,
  needle: string,
  levelLabel: string,
  occurrence: number = 0
): ILiftoEditorPill[] {
  return LiftoEditorTestUtils_level(text, needle, levelLabel, occurrence).pills;
}

export function LiftoEditorTestUtils_pillLabels(
  text: string,
  needle: string,
  levelLabel: string,
  occurrence: number = 0
): string[] {
  return LiftoEditorTestUtils_pills(text, needle, levelLabel, occurrence).map((p) => p.label);
}

// Descending-by-start application, matching how the controller sends pill edits to the
// native editor so earlier offsets stay valid.
export function LiftoEditorTestUtils_applyEdits(text: string, edits: ITextEdit[]): string {
  const ordered = [...edits].sort((a, b) => b.start - a.start);
  let result = text;
  for (const edit of ordered) {
    result = result.slice(0, edit.start) + edit.text + result.slice(edit.end);
  }
  return result;
}

export function LiftoEditorTestUtils_applyPill(text: string, pill: ILiftoEditorPill): string {
  return LiftoEditorTestUtils_applyEdits(text, [
    { start: pill.start, end: pill.end, text: pill.text },
    ...(pill.extraEdits ?? []),
  ]);
}

export function LiftoEditorTestUtils_pressPill(
  text: string,
  needle: string,
  levelLabel: string,
  pillLabel: string,
  occurrence: number = 0
): string {
  const pills = LiftoEditorTestUtils_pills(text, needle, levelLabel, occurrence);
  const pill = pills.find((p) => p.label === pillLabel);
  if (pill == null) {
    throw new Error(`No pill "${pillLabel}" on level "${levelLabel}" (pills: ${pills.map((p) => p.label).join(", ")})`);
  }
  return LiftoEditorTestUtils_applyPill(text, pill);
}
