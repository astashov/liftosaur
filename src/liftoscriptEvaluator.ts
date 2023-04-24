// import util from "util";
import { SyntaxNode } from "@lezer/common";
import { IScriptBindings, IScriptContext, IScriptFunctions } from "./models/progress";
import { Weight } from "./models/weight";
import { IProgramState, IWeight, IUnit } from "./types";

// eslint-disable-next-line no-shadow
enum NodeName {
  LineComment = "LineComment",
  Program = "Program",
  BinaryExpression = "BinaryExpression",
  Plus = "Plus",
  Times = "Times",
  Cmp = "Cmp",
  AndOr = "AndOr",
  NumberExpression = "NumberExpression",
  Number = "Number",
  WeightExpression = "WeightExpression",
  ParenthesisExpression = "ParenthesisExpression",
  BlockExpression = "BlockExpression",
  Ternary = "Ternary",
  IfExpression = "IfExpression",
  If = "If",
  Else = "Else",
  AssignmentExpression = "AssignmentExpression",
  StateVariable = "StateVariable",
  FunctionExpression = "FunctionExpression",
  Keyword = "Keyword",
  VariableExpression = "VariableExpression",
  UnaryExpression = "UnaryExpression",
  Not = "Not",
  Unit = "Unit",
}

function getChildren(node: SyntaxNode): SyntaxNode[] {
  const cur = node.cursor();
  const result: SyntaxNode[] = [];
  if (!cur.firstChild()) {
    return result;
  }
  do {
    result.push(cur.node);
  } while (cur.nextSibling());
  return result;
}

function comparing(
  left: number | IWeight | (number | IWeight)[],
  right: number | IWeight | (number | IWeight)[],
  operator: ">" | "<" | ">=" | "<=" | "==" | "!="
): boolean {
  function comparator(l: number | IWeight, r: number | IWeight): boolean {
    switch (operator) {
      case ">":
        return Weight.gt(l, r);
      case "<":
        return Weight.lt(l, r);
      case ">=":
        return Weight.gte(l, r);
      case "<=":
        return Weight.lte(l, r);
      case "==":
        return Weight.eq(l, r);
      case "!=":
        return !Weight.eq(l, r);
    }
  }

  if (Array.isArray(left) && Array.isArray(right)) {
    return left.every((l, i) => comparator(l, right[i]));
  } else if (Array.isArray(left) && !Array.isArray(right)) {
    return left.every((l, i) => comparator(l, right));
  } else if (!Array.isArray(left) && Array.isArray(right)) {
    return right.every((r, i) => comparator(left, r));
  } else if (!Array.isArray(left) && !Array.isArray(right)) {
    return comparator(left, right);
  } else {
    throw new Error("Impossible case");
  }
}

function assert(name: string): never {
  throw new SyntaxError(`Missing required nodes for ${name}, this should never happen`);
}

export class LiftoscriptEvaluator {
  private readonly script: string;
  private readonly state: IProgramState;
  private readonly bindings: IScriptBindings;
  private readonly fns: IScriptFunctions;
  private readonly context: IScriptContext;

  constructor(
    script: string,
    state: IProgramState,
    bindings: IScriptBindings,
    fns: IScriptFunctions,
    context: IScriptContext
  ) {
    this.script = script;
    this.state = state;
    this.bindings = bindings;
    this.fns = fns;
    this.context = context;
  }

  private getValue(node: SyntaxNode): string {
    return this.script.slice(node.from, node.to).replace(/\n/g, "\\n").replace(/\t/g, "\\t");
  }

  private error(message: string, node: SyntaxNode): never {
    const [line, offset] = this.getLineAndOffset(node);
    throw new SyntaxError(`${message} (${line}:${offset})`);
  }

  private getLineAndOffset(node: SyntaxNode): [number, number] {
    const linesLengths = this.script.split("\n").map((l) => l.length + 1);
    let offset = 0;
    for (let i = 0; i < linesLengths.length; i++) {
      const lineLength = linesLengths[i];
      if (node.from > offset && node.from < offset + lineLength) {
        return [i + 1, node.from - offset];
      }
      offset += lineLength;
    }
    return [linesLengths.length, linesLengths[linesLengths.length - 1]];
  }

  public parse(expr: SyntaxNode): void {
    const cursor = expr.cursor();
    do {
      if (cursor.node.type.isError) {
        this.error("Syntax error", cursor.node);
      } else if (cursor.node.type.name === NodeName.FunctionExpression) {
        const [keyword] = getChildren(cursor.node);
        if (keyword == null || keyword.type.name !== NodeName.Keyword) {
          assert(NodeName.FunctionExpression);
        }
        const name = this.getValue(keyword);
        if (!(name in this.fns)) {
          this.error(`Unknown function '${name}'`, keyword);
        }
      } else if (cursor.node.type.name === NodeName.StateVariable) {
        const stateKey = this.getValue(cursor.node).replace("state.", "");
        if (!(stateKey in this.state)) {
          this.error(`There's no state variable '${stateKey}'`, cursor.node);
        }
      } else if (cursor.node.type.name === NodeName.VariableExpression) {
        const [nameNode, indexExpr] = getChildren(cursor.node);
        if (nameNode == null) {
          assert(NodeName.VariableExpression);
        }
        const name = this.getValue(nameNode);
        if (indexExpr != null) {
          const validNames: (keyof IScriptBindings)[] = ["weights", "reps", "completedReps", "w", "r", "cr"];
          if (validNames.indexOf(name as keyof IScriptBindings) === -1) {
            this.error(`${name} is not an array variable`, nameNode);
          }
        } else if (!(name in this.bindings)) {
          this.error(`${name} is not a valid variable`, nameNode);
        }
      }
    } while (cursor.next());
  }

  public evaluate(expr: SyntaxNode): number | boolean | IWeight | number[] | IWeight[] {
    if (expr.type.name === NodeName.Program || expr.type.name === NodeName.BlockExpression) {
      let result: number | boolean | IWeight | number[] | IWeight[] = 0;
      for (const child of getChildren(expr)) {
        if (!child.type.isSkipped) {
          result = this.evaluate(child);
        }
      }
      return result;
    } else if (expr.type.name === NodeName.BinaryExpression) {
      const [left, operator, right] = getChildren(expr);
      const evalLeft = this.evaluate(left);
      const evalRight = this.evaluate(right);
      const op = this.getValue(operator);
      if (typeof evalLeft === "boolean" || typeof evalRight === "boolean") {
        if (op === "&&") {
          return evalLeft && evalRight;
        } else if (op === "||") {
          return evalLeft || evalRight;
        } else {
          this.error(`Unknown operator ${op}`, operator);
        }
      } else {
        if (op === ">") {
          return comparing(evalLeft, evalRight, op);
        } else if (op === "<") {
          return comparing(evalLeft, evalRight, op);
        } else if (op === ">=") {
          return comparing(evalLeft, evalRight, op);
        } else if (op === "<=") {
          return comparing(evalLeft, evalRight, op);
        } else if (op === "==") {
          return comparing(evalLeft, evalRight, op);
        } else if (op === "!=") {
          return comparing(evalLeft, evalRight, op);
        } else {
          if (Array.isArray(evalLeft) || Array.isArray(evalRight)) {
            this.error(`You cannot apply ${op} to arrays`, operator);
          }
          if (op === "+") {
            return this.add(evalLeft, evalRight);
          } else if (op === "-") {
            return this.subtract(evalLeft, evalRight);
          } else if (op === "*") {
            return this.multiply(evalLeft, evalRight);
          } else if (op === "/") {
            return this.divide(evalLeft, evalRight);
          } else {
            this.error(`Unknown operator ${op} between ${evalLeft} and ${evalRight}`, operator);
          }
        }
      }
    } else if (expr.type.name === NodeName.NumberExpression) {
      const numberNode = expr.getChild(NodeName.Number);
      if (numberNode == null) {
        assert(NodeName.NumberExpression);
      }
      const value = parseFloat(this.getValue(numberNode));
      const plusNode = expr.getChild(NodeName.Plus);
      const sign = plusNode ? this.getValue(plusNode) : undefined;
      return sign === "-" ? -value : value;
    } else if (expr.type.name === NodeName.Ternary) {
      const [condition, then, or] = getChildren(expr);
      return this.evaluate(condition) ? this.evaluate(then) : this.evaluate(or);
    } else if (expr.type.name === NodeName.IfExpression) {
      const parenthesisNodes = expr.getChildren(NodeName.ParenthesisExpression);
      const blockNodes = expr.getChildren(NodeName.BlockExpression);
      while (parenthesisNodes.length > 0) {
        const parenthesisNode = parenthesisNodes.shift()!;
        const blockNode = blockNodes.shift()!;
        const condition = this.evaluate(parenthesisNode);
        if (condition) {
          return this.evaluate(blockNode);
        }
      }
      const lastBlock = blockNodes.shift();
      if (lastBlock != null) {
        return this.evaluate(lastBlock);
      } else {
        return 0;
      }
    } else if (expr.type.name === NodeName.ParenthesisExpression) {
      const [node] = getChildren(expr);
      if (node == null) {
        assert(NodeName.ParenthesisExpression);
      }
      return this.evaluate(node);
    } else if (expr.type.name === NodeName.AssignmentExpression) {
      const [stateVar, expression] = getChildren(expr);
      if (stateVar == null || stateVar.type.name !== NodeName.StateVariable || expression == null) {
        assert(NodeName.AssignmentExpression);
      }
      const stateKey = this.getValue(stateVar).replace("state.", "");
      if (stateKey in this.state) {
        const value = this.evaluate(expression);
        if (Weight.is(value) || typeof value === "number") {
          this.state[stateKey] = value;
        } else {
          this.state[stateKey] = value ? 1 : 0;
        }
        return this.state[stateKey];
      } else {
        this.error(`There's no state variable '${stateKey}'`, stateVar);
      }
    } else if (expr.type.name === NodeName.FunctionExpression) {
      const fns = this.fns;
      const [keyword, ...args] = getChildren(expr);
      if (keyword == null || keyword.type.name !== NodeName.Keyword) {
        assert(NodeName.FunctionExpression);
      }
      const name = this.getValue(keyword) as keyof typeof fns;
      if (name != null && this.fns[name] != null) {
        const argValues = args.map((a) => this.evaluate(a));
        const fn = this.fns[name];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (fn as any).apply(undefined, [...argValues, this.context]);
      } else {
        this.error(`Unknown function '${name}'`, keyword);
      }
    } else if (expr.type.name === NodeName.UnaryExpression) {
      const [, expression] = getChildren(expr);
      if (expression == null) {
        assert(NodeName.UnaryExpression);
      }
      const evaluated = this.evaluate(expression);
      return !evaluated;
    } else if (expr.type.name === NodeName.WeightExpression) {
      const numberNode = expr.getChild(NodeName.NumberExpression);
      const unitNode = expr.getChild(NodeName.Unit);
      if (numberNode == null || unitNode == null) {
        assert(NodeName.WeightExpression);
      }
      const num = this.evaluate(numberNode);
      if (typeof num !== "number") {
        this.error("WeightExpression must contain a number", numberNode);
      }
      return Weight.build(num, this.getValue(unitNode) as IUnit);
    } else if (expr.type.name === NodeName.VariableExpression) {
      const [nameNode, indexExpr] = getChildren(expr);
      if (nameNode == null) {
        assert(NodeName.VariableExpression);
      }
      const name = this.getValue(nameNode) as keyof IScriptBindings;
      if (indexExpr == null) {
        const value = this.bindings[name];
        return value;
      } else {
        const indexEval = this.evaluate(indexExpr);
        let index: number;
        if (Weight.is(indexEval)) {
          index = indexEval.value;
        } else if (typeof indexEval === "number") {
          index = indexEval;
        } else {
          index = indexEval ? 1 : 0;
        }
        index -= 1;
        const value = this.bindings[name];
        if (!Array.isArray(value)) {
          this.error(`Variable ${name} should be an array`, nameNode);
        }
        if (value[index] == null) {
          this.error(`Out of bounds index ${index} for array ${name}`, indexExpr);
        }
        return value[index];
      }
    } else if (expr.type.name === NodeName.StateVariable) {
      const stateKey = this.getValue(expr).replace("state.", "");
      if (stateKey in this.state) {
        return this.state[stateKey];
      } else {
        this.error(`There's no state variable '${stateKey}'`, expr);
      }
    } else {
      this.error(`Unknown node type ${expr.node.type.name}`, expr);
    }
  }

  private add(one: IWeight | number, two: IWeight | number): IWeight | number {
    return this.operation(one, two, (a, b) => a + b);
  }

  private subtract(one: IWeight | number, two: IWeight | number): IWeight | number {
    return this.operation(one, two, (a, b) => a - b);
  }

  private multiply(one: IWeight | number, two: IWeight | number): IWeight | number {
    return this.operation(one, two, (a, b) => a * b);
  }

  private divide(one: IWeight | number, two: IWeight | number): IWeight | number {
    return this.operation(one, two, (a, b) => a / b);
  }

  private operation(a: IWeight | number, b: IWeight | number, op: (x: number, y: number) => number): IWeight | number {
    if (typeof a === "number" && typeof b === "number") {
      return op(a, b);
    } else {
      return Weight.operation(a as IWeight, b, op);
    }
  }
}
