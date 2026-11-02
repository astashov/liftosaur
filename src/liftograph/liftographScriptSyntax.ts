import { SyntaxNode, Tree } from "@lezer/common";

const BUILTIN_CALL = "BuiltinFunctionExpression";
const KEYWORD = "Keyword";
const STATE_VARIABLE = "StateVariable";
const LINE_COMMENT = "LineComment";
const STRING = "String";
const UNCLOSED_STRING = "UnclosedString";
const MUSCLE_FNS = ["muscleSets", "muscleVolume"] as const;

export interface ILiftographScriptSignature {
  shape: string;
  arg?: string;
}

export type ILiftographScriptContext =
  | { kind: "none" }
  | { kind: "comment" }
  | { kind: "muscleGroup"; fn: (typeof MUSCLE_FNS)[number]; from: number; to: number; query: string }
  | { kind: "stateKey"; from: number; to: number; query: string }
  | { kind: "word"; from: number; to: number; query: string };

function nodeText(script: string, node: SyntaxNode): string {
  return script.slice(node.from, node.to);
}

function callName(script: string, node: SyntaxNode): string | undefined {
  const keyword = node.firstChild;
  return node.type.name === BUILTIN_CALL && keyword?.type.name === KEYWORD ? nodeText(script, keyword) : undefined;
}

function callArgs(node: SyntaxNode): SyntaxNode[] {
  const args: SyntaxNode[] = [];
  for (let child = node.firstChild?.nextSibling ?? null; child != null; child = child.nextSibling) {
    if (!child.type.isError && child.type.name !== LINE_COMMENT) {
      args.push(child);
    }
  }
  return args;
}

function ancestor(node: SyntaxNode | null, name: string): SyntaxNode | undefined {
  for (let n = node; n != null; n = n.parent) {
    if (n.type.name === name) {
      return n;
    }
  }
  return undefined;
}

export function LiftographScriptSyntax_calls(tree: Tree, script: string, name: string): SyntaxNode[][] {
  const calls: SyntaxNode[][] = [];
  const cursor = tree.topNode.cursor();
  do {
    if (callName(script, cursor.node) === name) {
      calls.push(callArgs(cursor.node));
    }
  } while (cursor.next());
  return calls;
}

export function LiftographScriptSyntax_pointArity(tree: Tree, script: string): Set<number> {
  return new Set(LiftographScriptSyntax_calls(tree, script, "point").map((args) => args.length));
}

export function LiftographScriptSyntax_stateKeys(tree: Tree, script: string): string[] {
  const keys = new Set<string>();
  const cursor = tree.topNode.cursor();
  do {
    if (cursor.node.type.name === STATE_VARIABLE) {
      const key = cursor.node.getChild(KEYWORD);
      if (key != null) {
        keys.add(nodeText(script, key));
      }
    }
  } while (cursor.next());
  return Array.from(keys);
}

export function LiftographScriptSyntax_hasError(tree: Tree): boolean {
  let hasError = false;
  tree.iterate({
    enter: (node) => {
      if (node.type.isError || node.type.name === UNCLOSED_STRING) {
        hasError = true;
      }
      return !hasError;
    },
  });
  return hasError;
}

export function LiftographScriptSyntax_signature(
  tree: Tree,
  script: string,
  argOf?: string
): ILiftographScriptSignature {
  let arg: string | undefined;
  function shapeOf(node: SyntaxNode): string {
    const kids: SyntaxNode[] = [];
    for (let child = node.firstChild; child != null; child = child.nextSibling) {
      if (child.type.name !== LINE_COMMENT) {
        kids.push(child);
      }
    }
    if (argOf != null && node.type.name === STRING && callName(script, node.parent ?? node) === argOf) {
      arg = nodeText(script, node).slice(1, -1);
      return "String($arg)";
    }
    if (kids.length === 0) {
      return `${node.type.name}(${nodeText(script, node)})`;
    }
    return `${node.type.name}[${kids.map(shapeOf).join(",")}]`;
  }
  return { shape: shapeOf(tree.topNode), arg };
}

export function LiftographScriptSyntax_contextAt(tree: Tree, script: string, pos: number): ILiftographScriptContext {
  const node = tree.resolveInner(pos, -1);
  if (ancestor(node, LINE_COMMENT) != null) {
    return { kind: "comment" };
  }
  const text = ancestor(node, UNCLOSED_STRING) ?? ancestor(node, STRING);
  if (text != null) {
    const fn = callName(script, text.parent ?? text);
    const muscleFn = MUSCLE_FNS.find((name) => name === fn);
    const contentTo = text.type.name === STRING ? text.to - 1 : text.to;
    if (muscleFn == null || pos <= text.from || pos > contentTo) {
      return { kind: "none" };
    }
    return {
      kind: "muscleGroup",
      fn: muscleFn,
      from: text.from + 1,
      to: contentTo,
      query: script.slice(text.from + 1, pos),
    };
  }
  const state = ancestor(node, STATE_VARIABLE);
  const stateKey = state?.getChild(KEYWORD);
  if (stateKey != null && pos >= stateKey.from) {
    return { kind: "stateKey", from: stateKey.from, to: stateKey.to, query: script.slice(stateKey.from, pos) };
  }
  if (node.type.name === KEYWORD && pos > node.from) {
    return { kind: "word", from: node.from, to: node.to, query: script.slice(node.from, pos) };
  }
  return { kind: "none" };
}
