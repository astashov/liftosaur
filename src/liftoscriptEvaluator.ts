// import util from "util";
import { SyntaxNode } from "@lezer/common";
import { IScriptBindings, IScriptContext, IScriptFunctions } from "./models/progress";
import { Weight } from "./models/weight";
import { IProgramState, IWeight, IUnit, IPercentage } from "./types";
import { CollectionUtils } from "./utils/collection";
import { MathUtils } from "./utils/math";
import { IProgramMode } from "./models/program";

// eslint-disable-next-line no-shadow
export enum NodeName {
  LineComment = "LineComment",
  Program = "Program",
  BinaryExpression = "BinaryExpression",
  Plus = "Plus",
  Times = "Times",
  Cmp = "Cmp",
  AndOr = "AndOr",
  NumberExpression = "NumberExpression",
  Number = "Number",
  Percentage = "Percentage",
  WeightExpression = "WeightExpression",
  ParenthesisExpression = "ParenthesisExpression",
  BlockExpression = "BlockExpression",
  Ternary = "Ternary",
  IfExpression = "IfExpression",
  If = "If",
  Else = "Else",
  AssignmentExpression = "AssignmentExpression",
  IncAssignmentExpression = "IncAssignmentExpression",
  StateVariable = "StateVariable",
  BuiltinFunctionExpression = "BuiltinFunctionExpression",
  Keyword = "Keyword",
  VariableExpression = "VariableExpression",
  VariableIndex = "VariableIndex",
  Current = "Current",
  Wildcard = "Wildcard",
  UnaryExpression = "UnaryExpression",
  Not = "Not",
  Unit = "Unit",
}

export type IAssignmentOp = "+=" | "-=" | "*=" | "/=" | "=";

export class LiftoscriptSyntaxError extends SyntaxError {
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
  left: number | IWeight | IPercentage | (number | IWeight)[],
  right: number | IWeight | IPercentage | (number | IWeight)[],
  operator: ">" | "<" | ">=" | "<=" | "==" | "!="
): boolean {
  function comparator(l: number | IWeight | IPercentage, r: number | IWeight | IPercentage): boolean {
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

export interface ILiftoscriptVariableValue<T> {
  value: T;
  op: IAssignmentOp;
  target: ("*" | "_" | number)[];
}

export interface ILiftoscriptEvaluatorVariables {
  rm1?: IWeight;
  reps?: ILiftoscriptVariableValue<number>[];
  minReps?: ILiftoscriptVariableValue<number>[];
  weights?: ILiftoscriptVariableValue<number | IPercentage | IWeight>[];
  timer?: ILiftoscriptVariableValue<number>[];
  RPE?: ILiftoscriptVariableValue<number>[];
  setVariationIndex?: ILiftoscriptVariableValue<number>[];
  descriptionIndex?: ILiftoscriptVariableValue<number>[];
}

export class LiftoscriptEvaluator {
  private readonly script: string;
  private readonly state: IProgramState;
  private readonly bindings: IScriptBindings;
  private readonly fns: IScriptFunctions;
  private readonly context: IScriptContext;
  private readonly unit: IUnit;
  private readonly mode: IProgramMode;
  public readonly variables: ILiftoscriptEvaluatorVariables = {};

  constructor(
    script: string,
    state: IProgramState,
    bindings: IScriptBindings,
    fns: IScriptFunctions,
    context: IScriptContext,
    unit: IUnit,
    mode: IProgramMode
  ) {
    this.script = script;
    this.state = state;
    this.bindings = bindings;
    this.fns = fns;
    this.context = context;
    this.unit = unit;
    this.mode = mode;
  }

  public static getValue(script: string, node: SyntaxNode): string {
    return script.slice(node.from, node.to).replace(/\n/g, "\\n").replace(/\t/g, "\\t");
  }

  private getValue(node: SyntaxNode): string {
    return LiftoscriptEvaluator.getValue(this.script, node);
  }

  private error(message: string, node: SyntaxNode): never {
    const [line, offset] = this.getLineAndOffset(node);
    throw new LiftoscriptSyntaxError(`${message} (${line}:${offset})`, line, offset, node.from, node.to);
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

  public hasKeyword(expr: SyntaxNode, name: string): boolean {
    const cursor = expr.cursor();
    do {
      if (cursor.node.type.name === NodeName.Keyword) {
        if (this.getValue(cursor.node) === name) {
          return true;
        }
      }
    } while (cursor.next());
    return false;
  }

  public parse(expr: SyntaxNode): void {
    const cursor = expr.cursor();
    do {
      if (cursor.node.type.isError) {
        this.error("Syntax error", cursor.node);
      } else if (cursor.node.type.name === NodeName.BuiltinFunctionExpression) {
        const [keyword] = getChildren(cursor.node);
        if (keyword == null || keyword.type.name !== NodeName.Keyword) {
          assert(NodeName.BuiltinFunctionExpression);
        }
        const name = this.getValue(keyword);
        if (!(name in this.fns)) {
          this.error(`Unknown function '${name}'`, keyword);
        }
      } else if (cursor.node.type.name === NodeName.AssignmentExpression) {
        const variableNode = cursor.node.getChild(NodeName.VariableExpression);
        if (variableNode != null) {
          const nameNode = variableNode.getChild(NodeName.Keyword);
          if (nameNode != null) {
            const name = this.getValue(nameNode);
            if (this.mode === "update") {
              if (["reps", "weights", "RPE", "minReps"].indexOf(name) === -1) {
                this.error(`Cannot assign to '${name}'`, variableNode);
              }
              const indexExprs = variableNode.getChildren(NodeName.VariableIndex);
              if (indexExprs.length > 1) {
                this.error(`Can't assign to set variations, weeks or days here`, variableNode);
              }
            }
          }
        }
      } else if (cursor.node.type.name === NodeName.StateVariable) {
        if (this.mode === "update") {
          this.error(`Cannot access state variables in 'update' mode`, cursor.node);
        }
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
          const validNames: (keyof IScriptBindings)[] = [
            "weights",
            "reps",
            "minReps",
            "completedReps",
            "w",
            "r",
            "cr",
            "mr",
            "completedRPE",
            "RPE",
            "setVariationIndex",
            "descriptionIndex",
          ];
          if (validNames.indexOf(name as keyof IScriptBindings) === -1) {
            this.error(`${name} is not an array variable`, nameNode);
          }
        } else if (name !== "timer" && !(name in this.bindings)) {
          this.error(`${name} is not a valid variable`, nameNode);
        }
      }
    } while (cursor.next());
  }

  private evaluateToNumber(expr: SyntaxNode): number {
    const v = this.evaluate(expr);
    const v1 = Array.isArray(v) ? v[0] : v;
    return Weight.is(v1) ? v1.value : typeof v1 === "number" ? v1 : v1 ? 1 : 0;
  }

  private evaluateToNumberOrWeightOrPercentage(expr: SyntaxNode): number | IWeight | IPercentage {
    const v = this.evaluate(expr);
    const v1 = Array.isArray(v) ? v[0] : v;
    return Weight.is(v1) || Weight.isPct(v1) ? v1 : typeof v1 === "number" ? v1 : v1 ? 1 : 0;
  }

  private assignToVariable(
    key: "reps" | "weights" | "timer" | "RPE" | "minReps" | "setVariationIndex" | "descriptionIndex",
    expression: SyntaxNode,
    indexExprs: SyntaxNode[],
    op: IAssignmentOp
  ): number | IWeight | IPercentage {
    const indexes = indexExprs.map((ie) => getChildren(ie)[0]);
    if (this.mode === "planner") {
      if (key === "setVariationIndex") {
        if (indexes.length > 2) {
          this.error(`setVariationIndex can only have 2 values inside [*:*]`, expression);
        }
      } else if (key === "descriptionIndex") {
        if (indexes.length > 2) {
          this.error(`descriptionIndex can only have 2 values inside [*:*]`, expression);
        }
      } else if (indexes.length > 4) {
        this.error(`${key} can only have 4 values inside [*:*:*:*]`, expression);
      }
    } else if (this.mode === "update") {
      if (key === "setVariationIndex" || key === "descriptionIndex") {
        this.error(`Cannot change '${key}' in 'update' mode`, expression);
      } else if (indexes.length > 1) {
        this.error(`${key} can only have 1 value max inside []`, expression);
      }
    }
    const indexValues = CollectionUtils.compact(indexes).map((ie) => {
      if (ie.type.name === NodeName.Wildcard) {
        return "*" as const;
      } else {
        const v = this.evaluate(ie);
        const v1 = Array.isArray(v) ? v[0] : v;
        return Weight.is(v1) ? v1.value : typeof v1 === "number" ? v1 : v1 ? 1 : 0;
      }
    });
    let result: number | IWeight | IPercentage;
    if (key === "weights") {
      result = this.evaluateToNumberOrWeightOrPercentage(expression);
      this.variables[key] = this.variables[key] || [];
      this.variables[key]!.push({ value: result, op, target: indexValues });
    } else {
      result = this.evaluateToNumber(expression);
      this.variables[key] = this.variables[key] || [];
      this.variables[key]!.push({ value: result, op, target: indexValues });
    }
    return result;
  }

  public evaluate(expr: SyntaxNode): number | boolean | IWeight | IPercentage | number[] | IWeight[] {
    if (expr.type.name === NodeName.Program || expr.type.name === NodeName.BlockExpression) {
      let result: number | boolean | IWeight | number[] | IWeight[] | IPercentage = 0;
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
          } else if (op === "%") {
            return this.modulo(evalLeft, evalRight);
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
    } else if (expr.type.name === NodeName.Percentage) {
      const value = MathUtils.roundFloat(parseFloat(this.getValue(expr)), 2);
      return Weight.buildPct(value);
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
      const [variableNode, expression] = getChildren(expr);
      if (
        variableNode == null ||
        (variableNode.type.name !== NodeName.StateVariable && variableNode.type.name !== NodeName.VariableExpression) ||
        expression == null
      ) {
        assert(NodeName.AssignmentExpression);
      }
      if (variableNode.type.name === NodeName.VariableExpression) {
        const nameNode = variableNode.getChild(NodeName.Keyword);
        if (nameNode == null) {
          this.error(`Missing variable name`, variableNode);
        }
        const indexExprs = variableNode.getChildren(NodeName.VariableIndex);
        const variable = this.getValue(nameNode);
        if (variable === "rm1") {
          if (indexExprs.length > 0) {
            this.error(`rm1 is not an array`, expr);
          }
          const value = this.evaluate(expression);
          const rm1 = Weight.is(value)
            ? value
            : typeof value === "number"
            ? Weight.build(value, this.unit)
            : Weight.build(0, this.unit);
          this.variables.rm1 = rm1;
          return rm1;
        } else if (
          variable === "reps" ||
          variable === "weights" ||
          variable === "RPE" ||
          variable === "minReps" ||
          variable === "timer" ||
          variable === "setVariationIndex" ||
          variable === "descriptionIndex"
        ) {
          if (this.mode === "planner" || this.mode === "update") {
            return this.assignToVariable(variable, expression, indexExprs, "=");
          } else {
            this.error(`Unknown variable '${variable}'`, variableNode);
          }
        } else {
          this.error(`Unknown variable '${variable}'`, variableNode);
        }
      } else {
        const stateKey = this.getValue(variableNode).replace("state.", "");
        if (stateKey in this.state) {
          const value = this.evaluate(expression);
          if (Weight.is(value) || Weight.isPct(value) || typeof value === "number") {
            this.state[stateKey] = value;
          } else {
            this.state[stateKey] = value ? 1 : 0;
          }
          return this.state[stateKey];
        } else {
          this.error(`There's no state variable '${stateKey}'`, variableNode);
        }
      }
    } else if (expr.type.name === NodeName.IncAssignmentExpression) {
      const [stateVar, incAssignmentExpr, expression] = getChildren(expr);
      if (
        stateVar == null ||
        (stateVar.type.name !== NodeName.StateVariable && stateVar.type.name !== NodeName.VariableExpression) ||
        expression == null ||
        incAssignmentExpr == null
      ) {
        assert(NodeName.IncAssignmentExpression);
      }
      if (stateVar.type.name === NodeName.VariableExpression) {
        const nameNode = stateVar.getChild(NodeName.Keyword);
        if (nameNode == null) {
          this.error(`Missing variable name`, stateVar);
        }
        const indexExprs = stateVar.getChildren(NodeName.VariableIndex);
        const variable = this.getValue(nameNode);
        if (variable === "rm1") {
          if (indexExprs.length > 0) {
            this.error(`rm1 is not an array`, expr);
          }
          const value = this.evaluate(expression);
          const rm1 = Weight.is(value) ? value : typeof value === "number" ? value : 0;
          const op = this.getValue(incAssignmentExpr);
          if (op === "+=") {
            this.variables.rm1 = Weight.add(this.bindings.rm1, rm1);
          } else if (op === "-=") {
            this.variables.rm1 = Weight.subtract(this.bindings.rm1, rm1);
          } else if (op === "*=") {
            this.variables.rm1 = Weight.multiply(this.bindings.rm1, rm1);
          } else if (op === "/=") {
            this.variables.rm1 = Weight.divide(this.bindings.rm1, rm1);
          } else {
            this.error(`Unknown operator ${op} after ${variable}`, incAssignmentExpr);
          }
          return rm1;
        } else if (
          variable === "reps" ||
          variable === "weights" ||
          variable === "RPE" ||
          variable === "minReps" ||
          variable === "timer" ||
          variable === "setVariationIndex" ||
          variable === "descriptionIndex"
        ) {
          const op = this.getValue(incAssignmentExpr);
          if (op !== "=" && op !== "+=" && op !== "-=" && op !== "*=" && op !== "/=") {
            this.error(`Unknown operator ${op} after ${variable}`, incAssignmentExpr);
          }
          if (this.mode === "planner" || this.mode === "update") {
            return this.assignToVariable(variable, expression, indexExprs, op);
          } else {
            this.error(`Can't use incremental assignment for a variable '${variable}'`, stateVar);
          }
        } else {
          this.error(`Unknown variable '${variable}'`, stateVar);
        }
      } else {
        const stateKey = this.getValue(stateVar).replace("state.", "");
        if (stateKey in this.state) {
          let value = this.evaluate(expression);
          if (!(Weight.is(value) || Weight.isPct(value) || typeof value === "number")) {
            value = value ? 1 : 0;
          }
          const op = this.getValue(incAssignmentExpr);
          if (op === "+=") {
            this.state[stateKey] = this.add(this.state[stateKey], value);
          } else if (op === "-=") {
            this.state[stateKey] = this.subtract(this.state[stateKey], value);
          } else if (op === "*=") {
            this.state[stateKey] = this.multiply(this.state[stateKey], value);
          } else if (op === "/=") {
            this.state[stateKey] = this.divide(this.state[stateKey], value);
          } else {
            this.error(`Unknown operator ${op} after state.${stateKey}`, incAssignmentExpr);
          }
          return this.state[stateKey];
        } else {
          this.error(`There's no state variable '${stateKey}'`, stateVar);
        }
      }
    } else if (expr.type.name === NodeName.BuiltinFunctionExpression) {
      const fns = this.fns;
      const [keyword, ...args] = getChildren(expr);
      if (keyword == null || keyword.type.name !== NodeName.Keyword) {
        assert(NodeName.BuiltinFunctionExpression);
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
      const [nameNode, ...indexExprs] = getChildren(expr);
      if (nameNode == null) {
        assert(NodeName.VariableExpression);
      }
      const name = this.getValue(nameNode) as keyof IScriptBindings;
      if (indexExprs.some((e) => e.type.name !== NodeName.VariableIndex)) {
        assert(NodeName.VariableIndex);
      }
      if (indexExprs.length === 0) {
        const value = this.bindings[name];
        return value;
      } else if (indexExprs.length === 1) {
        const indexExpr = indexExprs[0];
        const indexNode = getChildren(indexExpr)[0];
        if (indexNode.type.name === NodeName.Wildcard || indexNode.type.name === NodeName.Current) {
          this.error(`Can't use '*' or '_' as an index when reading from variables`, indexNode);
        }
        const indexEval = this.evaluate(indexNode);
        let index: number;
        if (Weight.is(indexEval) || Weight.isPct(indexEval)) {
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
          this.error(`Out of bounds index ${index + 1} for array ${name}`, nameNode);
        }
        return value[index];
      } else {
        this.error(`Can't use [1:1] syntax when reading from the ${name} variable`, expr);
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

  private add(
    one: IWeight | number | IPercentage,
    two: IWeight | number | IPercentage
  ): IWeight | number | IPercentage {
    return this.operation(undefined, one, two, (a, b) => a + b);
  }

  private subtract(
    one: IWeight | number | IPercentage,
    two: IWeight | number | IPercentage
  ): IWeight | number | IPercentage {
    return this.operation(undefined, one, two, (a, b) => a - b);
  }

  private multiply(
    one: IWeight | number | IPercentage,
    two: IWeight | number | IPercentage
  ): IWeight | number | IPercentage {
    return this.operation(undefined, one, two, (a, b) => a * b);
  }

  private divide(
    one: IWeight | number | IPercentage,
    two: IWeight | number | IPercentage
  ): IWeight | number | IPercentage {
    return this.operation(undefined, one, two, (a, b) => a / b);
  }

  private modulo(
    one: IWeight | number | IPercentage,
    two: IWeight | number | IPercentage
  ): IWeight | number | IPercentage {
    return this.operation(undefined, one, two, (a, b) => a % b);
  }

  private operation(
    onerm: IWeight | undefined,
    a: IWeight | number | IPercentage,
    b: IWeight | number | IPercentage,
    op: (x: number, y: number) => number
  ): IWeight | number | IPercentage {
    try {
      return Weight.op(onerm, a, b, op);
    } catch (e) {
      throw new LiftoscriptSyntaxError(e.message, 0, 0, 0, 0);
    }
  }
}
