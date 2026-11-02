import { Tree, TreeFragment } from "@lezer/common";
import type { LRParser } from "@lezer/lr";

// Consecutive versions reparse incrementally: the edited span is recovered by prefix/suffix
// diff and everything outside it is reused from the previous tree, so typing cost stays
// proportional to the edited line, not the document.
export class IncrementalParseCache {
  private last: { text: string; tree: Tree } | undefined;

  constructor(private readonly parser: LRParser) {}

  public parse(text: string): Tree {
    const previous = this.last;
    if (previous?.text === text) {
      return previous.tree;
    }
    let tree: Tree;
    if (previous == null) {
      tree = this.parser.parse(text);
    } else {
      const old = previous.text;
      let from = 0;
      const minLength = Math.min(old.length, text.length);
      while (from < minLength && old.charCodeAt(from) === text.charCodeAt(from)) {
        from += 1;
      }
      let toA = old.length;
      let toB = text.length;
      while (toA > from && toB > from && old.charCodeAt(toA - 1) === text.charCodeAt(toB - 1)) {
        toA -= 1;
        toB -= 1;
      }
      const fragments = TreeFragment.applyChanges(TreeFragment.addTree(previous.tree), [
        { fromA: from, toA, fromB: from, toB },
      ]);
      tree = this.parser.parse(text, fragments);
    }
    this.last = { text, tree };
    return tree;
  }
}

// Script bodies are small and repeat across keystrokes (an edit elsewhere leaves them
// byte-identical), so a keyed memo covers them; the cap only guards against unbounded growth
// over a very long session.
export class KeyedParseCache {
  private readonly trees = new Map<string, Tree>();

  constructor(
    private readonly parser: LRParser,
    private readonly limit: number = 500
  ) {}

  public parse(source: string): Tree {
    let tree = this.trees.get(source);
    if (tree == null) {
      if (this.trees.size > this.limit) {
        this.trees.clear();
      }
      tree = this.parser.parse(source);
      this.trees.set(source, tree);
    }
    return tree;
  }
}
