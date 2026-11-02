import type { SyntaxNode, Tree } from "@lezer/common";
import { ILiftographDocument, ILiftographLineOwner, LiftographDocument_lineAt } from "./liftographDocument";
import * as T from "./liftographParser.terms";

export type ILiftographCompletionOwner = "series" | "graph" | "value" | "muscles" | "calendar";
export type ILiftographCompletionSourceType = "exercise" | "workout" | "stats";

export type ILiftographCompletionContext =
  | { type: "kind"; from: number; to: number; indent: string; isAlone: boolean; isInRow: boolean }
  | {
      type: "key";
      owner: ILiftographCompletionOwner;
      from: number;
      to: number;
      present: string[];
      hasColonAfter: boolean;
    }
  | { type: "nextKey"; owner: ILiftographCompletionOwner; pos: number; present: string[] }
  | {
      type: "value";
      owner: ILiftographCompletionOwner;
      key: string;
      from: number;
      to: number;
      hasParens: boolean;
      sourceType?: ILiftographCompletionSourceType;
      script?: string;
    }
  | {
      type: "argument";
      key: string;
      fn: string;
      argIndex: number;
      from: number;
      to: number;
      matchFrom: number;
      present: string[];
      hasColonAfter: boolean;
      firstArg?: string;
      script?: string;
    }
  | { type: "script"; source: string; offset: number; sourceType?: ILiftographCompletionSourceType };

function textOf(text: string, node: SyntaxNode): string {
  return text.slice(node.from, node.to);
}

function ancestor(node: SyntaxNode | null, ids: number[]): SyntaxNode | undefined {
  for (let n = node; n != null; n = n.parent) {
    if (ids.indexOf(n.type.id) !== -1) {
      return n;
    }
  }
  return undefined;
}

function children(node: SyntaxNode): SyntaxNode[] {
  const result: SyntaxNode[] = [];
  for (let child = node.firstChild; child != null; child = child.nextSibling) {
    result.push(child);
  }
  return result;
}

export function LiftographCompletionContext_nodeBefore(tree: Tree, pos: number): SyntaxNode {
  let node = tree.resolve(pos, -1);
  for (let child = node.childBefore(pos); child != null; child = node.childBefore(pos)) {
    node = child;
  }
  return node;
}

function ownerOf(
  lineOwner: ILiftographLineOwner | undefined,
  kind: string | undefined
): ILiftographCompletionOwner | undefined {
  if (lineOwner === "graph") {
    return "series";
  }
  return kind === "graph" || kind === "value" || kind === "muscles" || kind === "calendar" ? kind : undefined;
}

function headKind(text: string, fieldLine: SyntaxNode | undefined): string | undefined {
  const head = fieldLine?.getChild(T.Head);
  const key = head?.getChild(T.Key);
  return head != null && key != null && head.getChild(T.Colon) == null ? textOf(text, key) : undefined;
}

function fieldsOf(fieldLine: SyntaxNode | undefined): SyntaxNode[] {
  return fieldLine == null ? [] : [...fieldLine.getChildren(T.Head), ...fieldLine.getChildren(T.Field)];
}

function keyOf(text: string, field: SyntaxNode): string | undefined {
  const key = field.getChild(T.Key);
  return key != null && field.getChild(T.Colon) != null ? textOf(text, key) : undefined;
}

function presentKeys(text: string, fieldLine: SyntaxNode | undefined, except?: SyntaxNode): string[] {
  return fieldsOf(fieldLine).flatMap((field) => {
    const key = field.from !== except?.from ? keyOf(text, field) : undefined;
    return key != null ? [key] : [];
  });
}

function sourceTypeOf(text: string, fieldLine: SyntaxNode | undefined): ILiftographCompletionSourceType | undefined {
  const source = fieldsOf(fieldLine).find((field) => keyOf(text, field) === "source");
  const value = source?.getChild(T.Value)?.firstChild;
  const name = value?.type.id === T.Call ? value.getChild(T.Identifier) : value?.firstChild;
  const word = name != null ? textOf(text, name) : undefined;
  return word === "workout" || word === "stats" ? word : word != null ? "exercise" : undefined;
}

function scriptOf(text: string, fieldLine: SyntaxNode | undefined): string | undefined {
  const body = fieldLine?.getChild(T.Script)?.getChild(T.ScriptBody);
  return body != null ? textOf(text, body) : undefined;
}

function quotedContent(text: string, quoted: SyntaxNode): { from: number; to: number } {
  return {
    from: quoted.getChild(T.QuoteOpen)?.to ?? quoted.from,
    to: quoted.getChild(T.QuoteClose)?.from ?? quoted.to,
  };
}

function isValueComplete(value: SyntaxNode | undefined): boolean {
  const inner = value?.firstChild;
  if (inner == null) {
    return false;
  } else if (inner.type.id === T.Call) {
    return inner.getChild(T.CloseParen) != null;
  } else if (inner.type.id === T.Quoted) {
    return inner.getChild(T.QuoteClose) != null;
  }
  return true;
}

function argumentContext(
  text: string,
  call: SyntaxNode,
  field: SyntaxNode,
  fieldLine: SyntaxNode | undefined,
  pos: number
): ILiftographCompletionContext | undefined {
  const callName = call.getChild(T.Identifier);
  const argIndex = children(call).filter((part) => part.type.id === T.Comma && part.to <= pos).length;
  const args = call.getChildren(T.Arg);
  const arg = args.find((a) => a.from <= pos && pos <= a.to);
  const named = arg?.getChild(T.NamedArg);
  const namedKey = named?.getChild(T.Key);
  if (named != null && (namedKey == null || pos > namedKey.to)) {
    return undefined;
  }
  const argValue = arg?.getChild(T.ArgValue)?.firstChild ?? namedKey;
  const quoted = argValue?.type.id === T.Quoted ? argValue : undefined;
  const content = quoted != null ? quotedContent(text, quoted) : argValue;
  const replace = argValue ?? { from: pos, to: pos };
  const firstValue = args[0]?.getChild(T.ArgValue)?.firstChild;
  const firstRange = firstValue?.type.id === T.Quoted ? quotedContent(text, firstValue) : firstValue;
  return {
    type: "argument",
    key: keyOf(text, field) ?? "",
    fn: callName != null ? textOf(text, callName) : "",
    argIndex,
    from: replace.from,
    to: replace.to,
    matchFrom: content?.from ?? pos,
    present: args.flatMap((a) => {
      const key = a.from !== arg?.from ? a.getChild(T.NamedArg)?.getChild(T.Key) : undefined;
      return key != null ? [textOf(text, key)] : [];
    }),
    hasColonAfter: named?.getChild(T.Colon) != null,
    firstArg: firstRange != null ? text.slice(firstRange.from, firstRange.to) : undefined,
    script: scriptOf(text, fieldLine),
  };
}

export function LiftographCompletionContext_resolve(
  doc: ILiftographDocument,
  pos: number
): ILiftographCompletionContext | undefined {
  const text = doc.text;
  const line = LiftographDocument_lineAt(doc, pos);
  if (line == null || line.owner === "skip") {
    return undefined;
  }
  const before = LiftographCompletionContext_nodeBefore(doc.tree, pos);
  const node = before.from >= line.span.from ? before : doc.tree.topNode;
  if (ancestor(node, [T.TextLine, T.HiddenLine]) != null) {
    return undefined;
  }
  const fieldLine = ancestor(node, [T.FieldLine]);
  const script = ancestor(node, [T.Script]);
  if (script != null) {
    const body = script.getChild(T.ScriptBody);
    const offset = body?.from ?? script.getChild(T.ScriptOpen)?.to ?? script.from;
    return pos >= offset
      ? {
          type: "script",
          source: body != null ? textOf(text, body) : "",
          offset,
          sourceType: sourceTypeOf(text, fieldLine),
        }
      : undefined;
  }
  const head = fieldLine?.getChild(T.Head);
  const headKey = head?.getChild(T.Key);
  const isBareLine = fieldLine == null || pos <= (head?.to ?? pos);
  if (line.owner !== "graph" && isBareLine && (head == null || head.getChild(T.Colon) == null)) {
    return {
      type: "kind",
      from: headKey?.from ?? pos,
      to: headKey?.to ?? pos,
      indent: text.slice(line.span.from, fieldLine?.from ?? pos),
      isAlone: fieldLine == null || children(fieldLine).length === 1,
      isInRow: line.owner === "row",
    };
  }
  const owner = ownerOf(line.owner, line.owner === "graph" ? undefined : headKind(text, fieldLine));
  if (owner == null) {
    return undefined;
  }
  const nextKey: ILiftographCompletionContext = { type: "nextKey", owner, pos, present: presentKeys(text, fieldLine) };
  const field = ancestor(node, [T.Field, T.Head]);
  const key = field?.getChild(T.Key);
  const colon = field?.getChild(T.Colon);
  if (field != null && key != null && (colon == null || pos <= colon.from) && pos >= key.from) {
    if (pos > key.to) {
      return colon == null ? nextKey : undefined;
    }
    return {
      type: "key",
      owner,
      from: key.from,
      to: key.to,
      present: presentKeys(text, fieldLine, field),
      hasColonAfter: colon != null,
    };
  }
  if (field == null || node.type.id === T.Sep) {
    return node.type.id === T.Sep || fieldLine == null
      ? { type: "key", owner, from: pos, to: pos, present: presentKeys(text, fieldLine), hasColonAfter: false }
      : undefined;
  }
  const value = field.getChild(T.Value);
  const call = ancestor(node, [T.Call]);
  const open = call?.getChild(T.OpenParen);
  if (call != null && open != null && pos >= open.to) {
    const close = call.getChild(T.CloseParen);
    if (close != null && pos >= close.to) {
      return nextKey;
    }
    return argumentContext(text, call, field, fieldLine, pos);
  }
  if (value != null && pos > value.to) {
    return isValueComplete(value) ? nextKey : undefined;
  }
  const keyName = keyOf(text, field);
  if (keyName == null) {
    return undefined;
  }
  const valueCall = value?.firstChild?.type.id === T.Call ? value.firstChild : undefined;
  const replaceTo = valueCall != null ? (valueCall.getChild(T.Identifier)?.to ?? pos) : (value?.to ?? pos);
  return {
    type: "value",
    owner,
    key: keyName,
    from: value?.from ?? pos,
    to: Math.max(pos, replaceTo),
    hasParens: valueCall != null,
    sourceType: sourceTypeOf(text, fieldLine),
    script: scriptOf(text, fieldLine),
  };
}
