// import util from "util";
import { SyntaxNode } from "@lezer/common";
import { parser } from "./liftoscript";
import { IScriptBindings, IScriptContext, IScriptFunctions, Progress } from "./models/progress";
import { Settings } from "./models/settings";
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
  ArrayVariableExpression = "ArrayVariableExpression",
  ArrayVariable = "ArrayVariable",
  BindingVariable = "BindingVariable",
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

class LiftoscriptEvaluator {
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
    return this.script.slice(node.from, node.to).replaceAll("\n", "\\n").replaceAll("\t", "\\t");
  }

  public evaluate(expr: SyntaxNode): number | boolean | IWeight {
    if (expr.type.name === NodeName.Program || expr.type.name === NodeName.BlockExpression) {
      let result: number | boolean | IWeight = 0;
      for (const child of getChildren(expr)) {
        result = this.evaluate(child);
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
          throw new SyntaxError(`Unknown operator ${op} at: ${expr.from}:${expr.to}`);
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
            throw new SyntaxError(`You cannot apply ${op} to arrays`);
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
            throw new SyntaxError(`Unknown operator ${op} between ${evalLeft} and ${evalRight}`);
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
      const parenthesisNode = expr.getChild(NodeName.ParenthesisExpression);
      const [thenNode, orNode] = expr.getChildren(NodeName.BlockExpression);
      if (parenthesisNode == null || thenNode == null) {
        assert(NodeName.IfExpression);
      }
      const condition = this.evaluate(parenthesisNode);
      if (condition) {
        return this.evaluate(thenNode);
      } else if (!condition && orNode != null) {
        return this.evaluate(orNode);
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
        throw new SyntaxError(`There's no state variable '${stateKey}'`);
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
        throw new SyntaxError(`Unknown function '${name}'`);
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
        throw new SyntaxError("WeightExpression must contain a number");
      }
      return Weight.build(num, this.getValue(unitNode) as IUnit);
    } else if (expr.type.name === NodeName.ArrayVariableExpression) {
      const [varNode, expression] = getChildren(expr);
      if (varNode == null || varNode.node.name !== NodeName.ArrayVariable || expression == null) {
        assert(NodeName.ArrayVariableExpression);
      }
      const name = this.getValue(varNode) as keyof IScriptBindings;
      const indexEval = this.evaluate(expression);
      let index: number;
      if (Weight.is(indexEval)) {
        index = indexEval.value;
      } else if (typeof indexEval === "number") {
        index = indexEval;
      } else {
        index = indexEval ? 1 : 0;
      }
      const value = this.bindings[name];
      if (!Array.isArray(value)) {
        throw new SyntaxError(`Variable ${name} should be an array`);
      }
      if (value[index] == null) {
        throw new SyntaxError(`Out of bounds index ${index} for array ${name}`);
      }
      return value[index];
    } else if (expr.type.name === NodeName.BindingVariable) {
      const name = this.getValue(expr) as keyof IScriptBindings;
      const value = this.bindings[name];
      if (value == null) {
        throw new SyntaxError(`Unknown variable ${name}`);
      }
      if (Array.isArray(value)) {
        throw new SyntaxError(`Variable ${name} shouldn't be an array`);
      }
      return value;
    } else if (expr.type.name === NodeName.StateVariable) {
      const stateKey = this.getValue(expr).replace("state.", "");
      if (stateKey in this.state) {
        return this.state[stateKey];
      } else {
        throw new SyntaxError(`There's no state variable '${stateKey}'`);
      }
    } else {
      return 0;
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

const bindings: IScriptBindings = {
  day: 1,
  weights: [
    { value: 40, unit: "lb" },
    { value: 40, unit: "lb" },
    { value: 40, unit: "lb" },
  ],
  reps: [1, 2, 3],
  completedReps: [1, 2, 3],
  w: [
    { value: 40, unit: "lb" },
    { value: 40, unit: "lb" },
    { value: 40, unit: "lb" },
  ],
  r: [1, 2, 3],
  cr: [1, 2, 3],
  ns: 3,
  numberOfSets: 3,
};

const fns = Progress.createScriptFunctions(Settings.build());

const state = { foo: 2 };

const program = `
if ((r[1] == 3 || r[1] == 6) && (((r[2] == 3 ? 1 == 1 : 1 == 2)))) {
  state.reps = 1 == 1 ? state.reps + 1 : state.reps + 2
}
`;
const tree = parser.parse(program);

const evaluator = new LiftoscriptEvaluator(program, state, bindings, fns, {});
const result = evaluator.evaluate(tree.topNode);
console.log(result);
console.log(state);

// const cursor = tree.cursor();
// do {
//   switch (cursor.node.type.name) {
//     case "Program": {
//       console.log("Program");
//       cursor.firstChild();
//       break;
//     }
//     case "LineComment": {
//       console.log("LineComment");
//       cursor.firstChild();
//       break;
//     }
//   }
// } while (cursor.next());

// console.log(util.inspect(tree.topNode., { depth: null, colors: true }));
