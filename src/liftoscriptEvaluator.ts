// import util from "util";
import { SyntaxNode } from "@lezer/common";
import { IScriptBindings, IScriptFnContext, IScriptFunctions } from "./models/progress";
import { Weight } from "./models/weight";
import { IProgramState, IWeight, IUnit, IPercentage } from "./types";
import { CollectionUtils } from "./utils/collection";
import { MathUtils } from "./utils/math";
import { IProgramMode } from "./models/program";
import { parser as LiftoscriptParser } from "./liftoscript";

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
  ForExpression = "ForExpression",
  ForInExpression = "ForInExpression",
  If = "If",
  Else = "Else",
  AssignmentExpression = "AssignmentExpression",
  IncAssignmentExpression = "IncAssignmentExpression",
  StateVariable = "StateVariable",
  StateVariableIndex = "StateVariableIndex",
  Variable = "Variable",
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
  left: number | IWeight | IPercentage | (number | IWeight | IPercentage | undefined)[],
  right: number | IWeight | IPercentage | (number | IWeight | IPercentage | undefined)[],
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
    return left.every((l, i) => comparator(l ?? 0, right[i] ?? 0));
  } else if (Array.isArray(left) && !Array.isArray(right)) {
    return left.every((l, i) => comparator(l ?? 0, right ?? 0));
  } else if (!Array.isArray(left) && Array.isArray(right)) {
    return right.every((r, i) => comparator(left ?? 0, r ?? 0));
  } else if (!Array.isArray(left) && !Array.isArray(right)) {
    return comparator(left ?? 0, right ?? 0);
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

export type ILiftoscriptEvaluatorUpdate =
  | { type: "setVariationIndex"; value: ILiftoscriptVariableValue<number> }
  | { type: "descriptionIndex"; value: ILiftoscriptVariableValue<number> }
  | { type: "reps"; value: ILiftoscriptVariableValue<number> }
  | { type: "minReps"; value: ILiftoscriptVariableValue<number> }
  | { type: "weights"; value: ILiftoscriptVariableValue<number | IPercentage | IWeight> }
  | { type: "timers"; value: ILiftoscriptVariableValue<number> }
  | { type: "RPE"; value: ILiftoscriptVariableValue<number> }
  | { type: "numberOfSets"; value: ILiftoscriptVariableValue<number> };

export class LiftoscriptEvaluator {
  private readonly script: string;
  private readonly state: IProgramState;
  private readonly otherStates: Record<number, IProgramState>;
  private readonly bindings: IScriptBindings;
  private readonly fns: IScriptFunctions;
  private readonly fnContext: IScriptFnContext;
  private readonly unit: IUnit;
  private readonly mode: IProgramMode;
  private readonly vars: IProgramState = {};
  public readonly updates: ILiftoscriptEvaluatorUpdate[] = [];

  constructor(
    script: string,
    state: IProgramState,
    otherStates: Record<number, IProgramState>,
    bindings: IScriptBindings,
    fns: IScriptFunctions,
    fnContext: IScriptFnContext,
    unit: IUnit,
    mode: IProgramMode
  ) {
    this.script = script;
    this.state = state;
    this.otherStates = otherStates;
    this.bindings = bindings;
    this.fns = fns;
    this.fnContext = fnContext;
    this.unit = unit;
    this.mode = mode;
  }

  public static getValueRaw(script: string, node: SyntaxNode): string {
    return script.slice(node.from, node.to);
  }

  public static getValue(script: string, node: SyntaxNode): string {
    return this.getValueRaw(script, node).replace(/\n/g, "\\n").replace(/\t/g, "\\t");
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

  private getWeight(expr?: SyntaxNode | null): IWeight | undefined {
    if (expr?.type.name === NodeName.WeightExpression) {
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
    } else {
      return undefined;
    }
  }

  public switchWeightsToUnit(programNode: SyntaxNode, toUnit: IUnit): string {
    const cursor = programNode.cursor();
    let script = this.script;
    let shift = 0;
    do {
      if (cursor.node.type.name === NodeName.WeightExpression) {
        const weight = this.getWeight(cursor.node);
        if (weight != null) {
          if (weight.unit !== toUnit) {
            const from = cursor.node.from;
            const to = cursor.node.to;
            const oldWeightStr = Weight.print(weight);
            const newWeightStr = Weight.print(Weight.smartConvert(weight, toUnit));
            script = script.substring(0, from + shift) + newWeightStr + script.substring(to + shift);
            shift = shift + newWeightStr.length - oldWeightStr.length;
          }
        }
      }
    } while (cursor.next());
    return script;
  }

  public getStateVariableKeys(expr: SyntaxNode): Set<string> {
    const cursor = expr.cursor();
    const stateKeys: Set<string> = new Set();
    do {
      if (cursor.node.type.name === NodeName.StateVariable) {
        const stateKey = this.getStateKey(cursor.node);
        if (stateKey != null) {
          stateKeys.add(stateKey);
        }
      }
    } while (cursor.next());
    return stateKeys;
  }

  private getStateKey(expr: SyntaxNode): string | undefined {
    const index = expr.getChild(NodeName.StateVariableIndex);
    if (index == null) {
      const stateKeyNode = expr.getChild(NodeName.Keyword);
      if (stateKeyNode != null) {
        const stateKey = this.getValue(stateKeyNode);
        return stateKey;
      }
    }
    return undefined;
  }

  public parse(expr: SyntaxNode): void {
    const cursor = expr.cursor();
    const vars: IProgramState = {};
    do {
      if (cursor.node.type.isError) {
        this.error("Syntax error", cursor.node);
      } else if (cursor.node.type.name === NodeName.BuiltinFunctionExpression) {
        const [keyword, ...fnArgs] = getChildren(cursor.node);
        if (keyword == null || keyword.type.name !== NodeName.Keyword) {
          assert(NodeName.BuiltinFunctionExpression);
        }
        const name = this.getValue(keyword);
        if (!(name in this.fns)) {
          this.error(`Unknown function '${name}'`, keyword);
        }
        if (name === "sets" && fnArgs.length !== 9) {
          this.error(`'sets' function should have 9 arguments`, keyword);
        }
      } else if (cursor.node.type.name === NodeName.ForExpression) {
        const variableNode = cursor.node.getChild(NodeName.Variable);
        if (variableNode != null) {
          vars[this.getValue(variableNode)] = 1;
        }
      } else if (cursor.node.type.name === NodeName.AssignmentExpression) {
        const [variableNode] = getChildren(cursor.node);
        if (variableNode.type.name === NodeName.Variable) {
          vars[this.getValue(variableNode)] = 1;
        } else if (variableNode.type.name === NodeName.VariableExpression) {
          const nameNode = variableNode.getChild(NodeName.Keyword);
          if (nameNode != null) {
            const name = this.getValue(nameNode);
            if (this.mode === "update") {
              if (["reps", "weights", "RPE", "minReps", "numberOfSets", "timers"].indexOf(name) === -1) {
                this.error(`Cannot assign to '${name}'`, variableNode);
              }
              const indexExprs = variableNode.getChildren(NodeName.VariableIndex);
              if (name === "numberOfSets" && indexExprs.length > 0) {
                this.error(`${name} is not an array`, variableNode);
              } else if (indexExprs.length > 1) {
                this.error(`Can't assign to set variations, weeks or days here`, variableNode);
              }
            }
          }
        }
      } else if (cursor.node.type.name === NodeName.StateVariable) {
        const stateKey = this.getStateKey(cursor.node);
        if (stateKey != null && !(stateKey in this.state)) {
          this.error(`There's no state variable '${stateKey}'`, cursor.node);
        }
      } else if (cursor.node.type.name === NodeName.Variable) {
        const variableKey = this.getValue(cursor.node);
        if (!(variableKey in vars)) {
          this.error(`There's no variable '${variableKey}'`, cursor.node);
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
            "completedWeights",
            "timers",
            "w",
            "r",
            "cr",
            "cw",
            "mr",
            "completedRPE",
            "RPE",
            "setVariationIndex",
            "descriptionIndex",
            "numberOfSets",
            "programNumberOfSets",
            "completedNumberOfSets",
          ];
          if (validNames.indexOf(name as keyof IScriptBindings) === -1) {
            this.error(`${name} is not an array variable`, nameNode);
          }
        } else if (!(name in this.bindings)) {
          this.error(`${name} is not a valid variable`, nameNode);
        }
      }
    } while (cursor.next());
  }

  public static changeWeightsToCompleteWeights(oldScript: string): string {
    const node = LiftoscriptParser.parse(oldScript);
    const cursor = node.cursor();
    let script = oldScript;
    let shift = 0;
    do {
      if (cursor.node.type.name === NodeName.VariableExpression) {
        const keywordNode = cursor.node.getChild(NodeName.Keyword);
        if (keywordNode) {
          const keyword = LiftoscriptEvaluator.getValue(oldScript, keywordNode);
          if (keyword === "weights") {
            const parent = cursor.node.parent;
            if (
              parent != null &&
              !(
                (parent.type.name === NodeName.AssignmentExpression ||
                  parent.type.name === NodeName.IncAssignmentExpression) &&
                parent.firstChild?.from === cursor.node.from &&
                parent.firstChild?.to === cursor.node.to
              )
            ) {
              const from = keywordNode.from;
              const to = keywordNode.to;
              const oldWeightStr = keyword;
              const newWeightStr = "completedWeights";
              script = script.substring(0, from + shift) + newWeightStr + script.substring(to + shift);
              shift = shift + newWeightStr.length - oldWeightStr.length;
            }
          }
        }
      }
    } while (cursor.next());
    return script;
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

  private changeNumberOfSets(expression: SyntaxNode, op: IAssignmentOp): number | IWeight | IPercentage {
    const oldNumberOfSets = this.bindings.weights.length;
    const evaluatedValue = MathUtils.applyOp(this.bindings.numberOfSets, this.evaluateToNumber(expression), op);

    this.bindings.weights = this.bindings.weights.slice(0, evaluatedValue);
    this.bindings.originalWeights = this.bindings.originalWeights.slice(0, evaluatedValue);
    this.bindings.reps = this.bindings.reps.slice(0, evaluatedValue);
    this.bindings.minReps = this.bindings.minReps.slice(0, evaluatedValue);
    this.bindings.RPE = this.bindings.RPE.slice(0, evaluatedValue);
    this.bindings.w = this.bindings.weights.slice(0, evaluatedValue);
    this.bindings.r = this.bindings.reps.slice(0, evaluatedValue);
    this.bindings.mr = this.bindings.minReps.slice(0, evaluatedValue);
    this.bindings.timers = this.bindings.timers.slice(0, evaluatedValue);
    this.bindings.amraps = this.bindings.amraps.slice(0, evaluatedValue);
    this.bindings.logrpes = this.bindings.logrpes.slice(0, evaluatedValue);
    this.bindings.completedReps = this.bindings.completedReps.slice(0, evaluatedValue);
    this.bindings.cr = this.bindings.cr.slice(0, evaluatedValue);
    this.bindings.cw = this.bindings.cw.slice(0, evaluatedValue);
    this.bindings.completedWeights = this.bindings.completedWeights.slice(0, evaluatedValue);
    this.bindings.completedRPE = this.bindings.completedRPE.slice(0, evaluatedValue);
    this.bindings.isCompleted = this.bindings.isCompleted.slice(0, evaluatedValue);

    const ns = oldNumberOfSets - 1;
    for (let i = 0; i < evaluatedValue; i += 1) {
      if (this.bindings.weights[i] == null) {
        this.bindings.weights[i] = Weight.build(
          this.bindings.weights[ns]?.value ?? 0,
          this.bindings.weights[ns]?.unit || "lb"
        );
        this.bindings.originalWeights[i] = Weight.buildAny(
          this.bindings.originalWeights[ns]?.value ?? 0,
          this.bindings.originalWeights[ns]?.unit || "lb"
        );
        this.bindings.reps[i] = this.bindings.reps[ns] ?? 0;
        this.bindings.timers[i] = this.bindings.timers[ns];
        this.bindings.amraps[i] = this.bindings.amraps[ns];
        this.bindings.logrpes[i] = this.bindings.logrpes[ns];
        this.bindings.minReps[i] = this.bindings.minReps[ns];
        this.bindings.RPE[i] = this.bindings.RPE[ns];
        this.bindings.w[i] = this.bindings.weights[i];
        this.bindings.r[i] = this.bindings.reps[i];
        this.bindings.mr[i] = this.bindings.minReps[i];
        this.bindings.completedReps[i] = undefined;
        this.bindings.completedWeights[i] = undefined;
        this.bindings.completedRPE[i] = undefined;
        this.bindings.cr[i] = undefined;
        this.bindings.cw[i] = undefined;
        this.bindings.isCompleted[i] = 0;
      }
    }

    this.bindings.numberOfSets = evaluatedValue;
    this.bindings.ns = evaluatedValue;

    return evaluatedValue;
  }

  private changeBinding(
    key: "reps" | "weights" | "RPE" | "minReps" | "timers",
    expression: SyntaxNode,
    indexExprs: SyntaxNode[],
    op: IAssignmentOp
  ): number | IWeight | IPercentage {
    const indexes = indexExprs.map((ie) => getChildren(ie)[0]);
    const maxTargetLength = 1;
    if (indexes.length > maxTargetLength) {
      this.error(`${key} can only have 1 value inside []`, expression);
    }
    const indexValues = this.calculateIndexValues(indexes);
    const normalizedIndexValues = this.normalizeTarget(indexValues, maxTargetLength);
    const [setIndex] = normalizedIndexValues;
    let value: number | IWeight | IPercentage = 0;
    if (key === "weights") {
      for (let i = 0; i < this.bindings.weights.length; i += 1) {
        if (!this.bindings.isCompleted[i] && (setIndex === "*" || setIndex === i + 1)) {
          const evalutedValue = this.evaluateToNumberOrWeightOrPercentage(expression);
          const newValue = Weight.applyOp(
            this.bindings.rm1,
            this.bindings.weights[i] ?? Weight.build(0, this.unit),
            evalutedValue,
            op
          );
          value = Weight.convertToWeight(this.bindings.rm1, newValue, this.unit);
          this.bindings.originalWeights[i] = value;
          this.bindings.weights[i] = this.fns.roundWeight(value, this.fnContext);
        }
      }
    } else {
      for (let i = 0; i < this.bindings[key].length; i += 1) {
        if (!this.bindings.isCompleted[i] && (setIndex === "*" || setIndex === i + 1)) {
          const evaluatedValue = this.evaluateToNumber(expression);
          value = MathUtils.applyOp(this.bindings[key][i] ?? 0, evaluatedValue, op);
          if (key === "RPE") {
            value = MathUtils.round(MathUtils.clamp(value, 0, 10), 0.5);
          }
          this.bindings[key][i] = value;
        }
      }
    }
    return value;
  }

  private recordVariableUpdate(
    key: "reps" | "weights" | "timers" | "RPE" | "minReps" | "setVariationIndex" | "descriptionIndex" | "numberOfSets",
    expression: SyntaxNode,
    indexExprs: SyntaxNode[],
    op: IAssignmentOp
  ): number | IWeight | IPercentage {
    const indexes = indexExprs.map((ie) => getChildren(ie)[0]);
    const maxTargetLength =
      key === "setVariationIndex" || key === "descriptionIndex" ? 2 : key === "numberOfSets" ? 3 : 4;
    if (key === "setVariationIndex") {
      if (indexes.length > maxTargetLength) {
        this.error(`setVariationIndex can only have 2 values inside [*:*]`, expression);
      }
    } else if (key === "descriptionIndex") {
      if (indexes.length > maxTargetLength) {
        this.error(`descriptionIndex can only have 2 values inside [*:*]`, expression);
      }
    } else if (key === "numberOfSets") {
      if (indexes.length > maxTargetLength) {
        this.error(`numberOfSets can only have 3 values inside [*:*:*]`, expression);
      }
    } else if (indexes.length > maxTargetLength) {
      this.error(`${key} can only have 4 values inside [*:*:*:*]`, expression);
    }
    const indexValues = this.calculateIndexValues(indexes);
    const normalizedIndexValues = this.normalizeTarget(indexValues, maxTargetLength);
    let result: number | IWeight | IPercentage;
    if (key === "weights") {
      result = this.evaluateToNumberOrWeightOrPercentage(expression);
      this.updates.push({ type: key, value: { value: result, op, target: normalizedIndexValues } });
    } else {
      result = this.evaluateToNumber(expression);
      this.updates.push({ type: key, value: { value: result, op, target: normalizedIndexValues } });
      if (key === "setVariationIndex") {
        const [week, day] = normalizedIndexValues;
        if ((week === "*" || week === this.bindings.week) && (day === "*" || day === this.bindings.day)) {
          this.bindings.setVariationIndex = result;
        }
      } else if (key === "descriptionIndex") {
        const [week, day] = normalizedIndexValues;
        if ((week === "*" || week === this.bindings.week) && (day === "*" || day === this.bindings.day)) {
          this.bindings.descriptionIndex = result;
        }
      } else if (key === "numberOfSets") {
        const [week, day, setVariationIndex] = normalizedIndexValues;
        if (
          (week === "*" || week === this.bindings.week) &&
          (day === "*" || day === this.bindings.day) &&
          (setVariationIndex === "*" || setVariationIndex === this.bindings.setVariationIndex)
        ) {
          this.bindings.numberOfSets = result;
          this.bindings.ns = result;
        }
      }
    }

    return result;
  }

  private calculateIndexValues(indexes: SyntaxNode[]): (number | "*")[] {
    return CollectionUtils.compact(indexes).map((ie) => {
      if (ie.type.name === NodeName.Wildcard) {
        return "*" as const;
      } else {
        const v = this.evaluate(ie);
        const v1 = Array.isArray(v) ? v[0] : v;
        return Weight.is(v1) ? v1.value : typeof v1 === "number" ? v1 : v1 ? 1 : 0;
      }
    });
  }

  private normalizeTarget(target: (number | "*")[], length: number): (number | "*")[] {
    const newTarget = [...target];
    for (let i = 0; i < length - target.length; i += 1) {
      newTarget.unshift("*");
    }
    return newTarget;
  }

  private toNumber(
    value: number | boolean | IWeight | IPercentage | (IWeight | IPercentage | number | undefined)[]
  ): number {
    if (typeof value === "number") {
      return value;
    } else if (typeof value === "boolean") {
      return 0;
    } else if (Weight.is(value)) {
      return value.value;
    } else if (Weight.isPct(value)) {
      return value.value;
    } else if (Array.isArray(value)) {
      return this.toNumber(value[0] ?? 0);
    } else {
      return 0;
    }
  }

  public evaluate(
    expr: SyntaxNode
  ): number | boolean | IWeight | IPercentage | (IWeight | IPercentage | number | undefined)[] {
    if (expr.type.name === NodeName.Program || expr.type.name === NodeName.BlockExpression) {
      let result: number | boolean | IWeight | (IWeight | IPercentage | number | undefined)[] | IPercentage = 0;
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
    } else if (expr.type.name === NodeName.ForExpression) {
      const variableNode = expr.getChild(NodeName.Variable);
      const forInExpression = expr.getChild(NodeName.ForInExpression);
      const blockNode = expr.getChild(NodeName.BlockExpression);
      if (variableNode == null) {
        assert(NodeName.ForExpression);
      }
      if (forInExpression == null) {
        assert(NodeName.ForInExpression);
      }
      if (blockNode == null) {
        assert(NodeName.BlockExpression);
      }
      const forIn = this.evaluate(forInExpression);
      if (!Array.isArray(forIn)) {
        this.error(`for in expression should return an array`, forInExpression);
      }
      const varKey = this.getValue(variableNode).replace("var.", "");
      for (let i = 1; i <= forIn.length; i += 1) {
        this.vars[varKey] = i;
        this.evaluate(blockNode);
      }
      return forIn.length;
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
    } else if (expr.type.name === NodeName.StateVariableIndex) {
      const [expression] = getChildren(expr);
      return this.evaluate(expression);
    } else if (expr.type.name === NodeName.AssignmentExpression) {
      const [variableNode, expression] = getChildren(expr);
      if (
        variableNode == null ||
        (variableNode.type.name !== NodeName.StateVariable &&
          variableNode.type.name !== NodeName.VariableExpression &&
          variableNode.type.name !== NodeName.Variable) ||
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
          const evaluatedValue = this.evaluate(expression);
          let value = Array.isArray(evaluatedValue) ? evaluatedValue[0] : evaluatedValue;
          value = value ?? 0;
          value = value === true ? 1 : value === false ? 0 : value;
          value = Weight.convertToWeight(this.bindings.rm1, value, this.unit);
          this.bindings.rm1 = value;
          return value;
        } else if (
          this.mode === "planner" &&
          (variable === "reps" ||
            variable === "weights" ||
            variable === "RPE" ||
            variable === "minReps" ||
            variable === "timers" ||
            variable === "setVariationIndex" ||
            variable === "descriptionIndex" ||
            variable === "numberOfSets")
        ) {
          return this.recordVariableUpdate(variable, expression, indexExprs, "=");
        } else if (this.mode === "update" && variable === "numberOfSets") {
          return this.changeNumberOfSets(expression, "=");
        } else if (
          this.mode === "update" &&
          (variable === "reps" ||
            variable === "weights" ||
            variable === "RPE" ||
            variable === "minReps" ||
            variable === "timers")
        ) {
          return this.changeBinding(variable, expression, indexExprs, "=");
        } else {
          this.error(`Unknown variable '${variable}'`, variableNode);
        }
      } else if (variableNode.type.name === NodeName.Variable) {
        const varKey = this.getValue(variableNode).replace("var.", "");
        const value = this.evaluate(expression);
        if (Weight.is(value) || Weight.isPct(value) || typeof value === "number") {
          this.vars[varKey] = value;
        } else {
          this.vars[varKey] = value ? 1 : 0;
        }
        return this.vars[varKey];
      } else {
        const indexNode = variableNode.getChild(NodeName.StateVariableIndex);
        const stateKeyNode = variableNode.getChild(NodeName.Keyword);
        if (stateKeyNode != null) {
          const stateKey = this.getValue(stateKeyNode);
          let state: IProgramState | undefined;
          if (indexNode == null) {
            if (stateKey in this.state) {
              state = this.state;
            } else {
              this.error(`There's no state variable '${stateKey}'`, variableNode);
            }
          } else {
            const indexEval = this.evaluate(indexNode);
            const index = this.toNumber(indexEval);
            state = this.otherStates[index];
          }
          const value = this.evaluate(expression);
          if (state != null) {
            if (Weight.is(value) || Weight.isPct(value) || typeof value === "number") {
              state[stateKey] = value;
            } else {
              state[stateKey] = value ? 1 : 0;
            }
          }
          return value;
        } else {
          return 0;
        }
      }
    } else if (expr.type.name === NodeName.IncAssignmentExpression) {
      const [stateVar, incAssignmentExpr, expression] = getChildren(expr);
      if (
        stateVar == null ||
        (stateVar.type.name !== NodeName.StateVariable &&
          stateVar.type.name !== NodeName.VariableExpression &&
          stateVar.type.name !== NodeName.Variable) ||
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
          const evaluatedValue = this.evaluate(expression);
          let value = Array.isArray(evaluatedValue) ? evaluatedValue[0] : evaluatedValue;
          value = value ?? 0;
          value = value === true ? 1 : value === false ? 0 : value;

          const op = this.getValue(incAssignmentExpr);
          if (op === "+=") {
            this.bindings.rm1 = Weight.convertToWeight(
              this.bindings.rm1,
              this.add(this.bindings.rm1, value),
              this.unit
            );
          } else if (op === "-=") {
            this.bindings.rm1 = Weight.convertToWeight(
              this.bindings.rm1,
              this.subtract(this.bindings.rm1, value),
              this.unit
            );
          } else if (op === "*=") {
            this.bindings.rm1 = Weight.convertToWeight(
              this.bindings.rm1,
              this.multiply(this.bindings.rm1, value),
              this.unit
            );
          } else if (op === "/=") {
            this.bindings.rm1 = Weight.convertToWeight(
              this.bindings.rm1,
              this.divide(this.bindings.rm1, value),
              this.unit
            );
          } else {
            this.error(`Unknown operator ${op} after ${variable}`, incAssignmentExpr);
          }
          return this.bindings.rm1;
        } else if (
          this.mode === "planner" &&
          (variable === "reps" ||
            variable === "weights" ||
            variable === "RPE" ||
            variable === "minReps" ||
            variable === "timers" ||
            variable === "setVariationIndex" ||
            variable === "descriptionIndex" ||
            variable === "numberOfSets")
        ) {
          const op = this.getValue(incAssignmentExpr);
          if (op !== "=" && op !== "+=" && op !== "-=" && op !== "*=" && op !== "/=") {
            this.error(`Unknown operator ${op} after ${variable}`, incAssignmentExpr);
          }
          return this.recordVariableUpdate(variable, expression, indexExprs, op);
        } else if (this.mode === "update" && variable === "numberOfSets") {
          const op = this.getValue(incAssignmentExpr);
          if (op !== "=" && op !== "+=" && op !== "-=" && op !== "*=" && op !== "/=") {
            this.error(`Unknown operator ${op} after ${variable}`, incAssignmentExpr);
          }
          return this.changeNumberOfSets(expression, op);
        } else if (
          this.mode === "update" &&
          (variable === "reps" ||
            variable === "weights" ||
            variable === "RPE" ||
            variable === "minReps" ||
            variable === "timers")
        ) {
          const op = this.getValue(incAssignmentExpr);
          if (op !== "=" && op !== "+=" && op !== "-=" && op !== "*=" && op !== "/=") {
            this.error(`Unknown operator ${op} after ${variable}`, incAssignmentExpr);
          }
          return this.changeBinding(variable, expression, indexExprs, op);
        } else {
          this.error(`Unknown variable '${variable}'`, stateVar);
        }
      } else if (stateVar.type.name === NodeName.Variable) {
        const varKey = this.getValue(stateVar).replace("var.", "");
        let value = this.evaluate(expression);
        if (!(Weight.is(value) || Weight.isPct(value) || typeof value === "number")) {
          value = value ? 1 : 0;
        }
        const op = this.getValue(incAssignmentExpr);
        if (op !== "=" && op !== "+=" && op !== "-=" && op !== "*=" && op !== "/=") {
          this.error(`Unknown operator ${op} after ${varKey}`, incAssignmentExpr);
        }
        const currentValue = this.vars[varKey];
        if (op === "+=") {
          this.vars[varKey] = this.add(currentValue, value);
        } else if (op === "-=") {
          this.vars[varKey] = this.subtract(currentValue, value);
        } else if (op === "*=") {
          this.vars[varKey] = this.multiply(currentValue, value);
        } else if (op === "/=") {
          this.vars[varKey] = this.divide(currentValue, value);
        } else {
          this.error(`Unknown operator ${op} after ${varKey}`, incAssignmentExpr);
        }
        return this.vars[varKey];
      } else {
        const indexNode = stateVar.getChild(NodeName.StateVariableIndex);
        const stateKeyNode = stateVar.getChild(NodeName.Keyword);
        if (stateKeyNode != null) {
          const stateKey = this.getValue(stateKeyNode);
          let state: IProgramState | undefined;
          if (indexNode == null) {
            if (stateKey in this.state) {
              state = this.state;
            } else {
              this.error(`There's no state variable '${stateKey}'`, stateVar);
            }
          } else {
            const indexEval = this.evaluate(indexNode);
            const index = this.toNumber(indexEval);
            state = this.otherStates[index];
          }

          let value = this.evaluate(expression);
          if (state != null) {
            if (!(Weight.is(value) || Weight.isPct(value) || typeof value === "number")) {
              value = value ? 1 : 0;
            }
            const op = this.getValue(incAssignmentExpr);
            const currentValue = state[stateKey] ?? 0;
            if (op === "+=") {
              state[stateKey] = this.add(currentValue, value);
            } else if (op === "-=") {
              state[stateKey] = this.subtract(currentValue, value);
            } else if (op === "*=") {
              state[stateKey] = this.multiply(currentValue, value);
            } else if (op === "/=") {
              state[stateKey] = this.divide(currentValue, value);
            } else {
              this.error(`Unknown operator ${op} after state.${stateKey}`, incAssignmentExpr);
            }
            return state[stateKey];
          } else {
            return value;
          }
        } else {
          return 0;
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
        return (fn as any).apply(undefined, [...argValues, this.fnContext, this.bindings]);
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
      return this.getWeight(expr) ?? Weight.build(0, this.unit);
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
        let value = this.bindings[name];
        if (Array.isArray(value) && name === "minReps") {
          value = value.map((v, i) => (v as number) ?? this.bindings.reps[i]);
        }
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
        const binding = this.bindings[name];
        if (!Array.isArray(binding)) {
          this.error(`Variable ${name} should be an array`, nameNode);
        }
        if (index >= binding.length) {
          this.error(`Out of bounds index ${index + 1} for array ${name}`, nameNode);
        }
        let value = binding[index];
        if (value == null) {
          value = name === "minReps" ? (this.bindings.reps[index] ?? 0) : 0;
        }
        return value;
      } else {
        this.error(`Can't use [1:1] syntax when reading from the ${name} variable`, expr);
      }
    } else if (expr.type.name === NodeName.StateVariable) {
      const stateKey = this.getStateKey(expr);
      if (stateKey == null) {
        this.error(`You cannot read from other exercises states, you can only write to them`, expr);
      }
      if (stateKey in this.state) {
        return this.state[stateKey];
      } else {
        this.error(`There's no state variable '${stateKey}'`, expr);
      }
    } else if (expr.type.name === NodeName.Variable) {
      const varKey = this.getValue(expr).replace("var.", "");
      if (varKey in this.vars) {
        return this.vars[varKey];
      } else {
        this.error(`There's no variable '${varKey}'`, expr);
      }
    } else if (expr.type.name === NodeName.ForInExpression) {
      const child = getChildren(expr)[0];
      return this.evaluate(child);
    } else {
      this.error(`Unknown node type ${expr.node.type.name}`, expr);
    }
  }

  private add(
    one: IWeight | number | IPercentage,
    two: IWeight | number | IPercentage
  ): IWeight | number | IPercentage {
    return this.operation(this.bindings.rm1, one, two, (a, b) => a + b);
  }

  private subtract(
    one: IWeight | number | IPercentage,
    two: IWeight | number | IPercentage
  ): IWeight | number | IPercentage {
    return this.operation(this.bindings.rm1, one, two, (a, b) => a - b);
  }

  private multiply(
    one: IWeight | number | IPercentage,
    two: IWeight | number | IPercentage
  ): IWeight | number | IPercentage {
    return this.operation(this.bindings.rm1, one, two, (a, b) => a * b);
  }

  private divide(
    one: IWeight | number | IPercentage,
    two: IWeight | number | IPercentage
  ): IWeight | number | IPercentage {
    return this.operation(this.bindings.rm1, one, two, (a, b) => a / b);
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
    } catch (error) {
      const e = error as Error;
      throw new LiftoscriptSyntaxError(e.message, 0, 0, 0, 0);
    }
  }
}
