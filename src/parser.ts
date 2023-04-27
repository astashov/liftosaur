/* eslint-disable @typescript-eslint/unified-signatures */
import { LiftoscriptEvaluator } from "./liftoscriptEvaluator";
import { parser as LiftoscriptParser } from "./liftoscript";
import { IScriptBindings, IScriptContext, IScriptFunctions } from "./models/progress";
import { Weight } from "./models/weight";
import { IUnit, IWeight, IProgramState } from "./types";
import RB from "rollbar";
import { dequal } from "dequal";
import { IState } from "./models/state";

declare let Rollbar: RB;

type IPos = { readonly line: number; readonly offset: number };

type ITokenNumber = { readonly type: "number"; readonly value: number; unit?: IUnit; readonly pos: IPos };
type ITokenOperator = {
  readonly type: "operator";
  readonly value: "!=" | "!" | "+" | "-" | "*" | "/" | ">=" | ">" | "=" | "==" | "<=" | "<" | "?" | ":" | "&&" | "||";
  readonly pos: IPos;
};
type ITokenIf = { readonly type: "if"; readonly value: "if" | "else"; readonly pos: IPos };
type ITokenParen = { readonly type: "paren"; readonly value: "(" | ")" | "[" | "]" | "{" | "}"; readonly pos: IPos };
type ITokenKeyword = { readonly type: "keyword"; readonly value: string; readonly pos: IPos };
type ITokenEol = { readonly type: "eol"; readonly value: "\\n"; readonly pos: IPos };
type ITokenComma = { readonly type: "comma"; readonly value: ","; readonly pos: IPos };
type ITokenSemicolon = { readonly type: "semicolon"; readonly value: ";"; readonly pos: IPos };

type IToken =
  | ITokenNumber
  | ITokenOperator
  | ITokenParen
  | ITokenKeyword
  | ITokenIf
  | ITokenEol
  | ITokenSemicolon
  | ITokenComma;

type ITokenCondition = { type: IToken["type"]; value?: string | RegExp };

function tokenize(text: string): IToken[] {
  const lines = text.split(/\r\n|\r|\n/);
  const tokens: IToken[] = [];
  lines.forEach((rawLine, lineNumber) => {
    let offset = 0;
    let line = rawLine.trimLeft();
    offset += rawLine.length - line.length;
    while (line.length > 0) {
      let match: RegExpExecArray | null;
      const pos = { line: lineNumber + 1, offset: offset + 1 };
      if ((match = /^\/\/.*$/.exec(line))) {
        // comments, ignoring
      } else if ((match = /^([(){}\[\]])/.exec(line))) {
        tokens.push({ type: "paren", value: match[0] as ITokenParen["value"], pos });
      } else if ((match = /^([\d\.]+)(lb|kg)?/.exec(line))) {
        tokens.push({ type: "number", value: parseFloat(match[1]), unit: match[2] as IUnit | undefined, pos });
      } else if ((match = /^(,)/.exec(line))) {
        tokens.push({ type: "comma", value: ",", pos });
      } else if ((match = /^([\!\+\-*<>=&|\?:/]+)/.exec(line))) {
        tokens.push({ type: "operator", value: match[0] as ITokenOperator["value"], pos });
      } else if ((match = /^(;)/.exec(line))) {
        tokens.push({ type: "semicolon", value: ";", pos });
      } else if ((match = /^(if)\W/.exec(line))) {
        tokens.push({ type: "if", value: "if", pos });
      } else if ((match = /^(else)\W/.exec(line))) {
        tokens.push({ type: "if", value: "else", pos });
      } else if ((match = /^([a-zA-Z][a-zA-Z0-9\.]*)/.exec(line))) {
        tokens.push({ type: "keyword", value: match[0] as ITokenKeyword["value"], pos });
      } else {
        throw SyntaxError(`Unexpected token at line ${pos.line}:${pos.offset}, ${line}`);
      }
      const restLine = line.slice(match[0].length);
      offset += line.length - restLine.length;
      const trimmedRestLine = restLine.trimLeft();
      offset += restLine.length - trimmedRestLine.length;
      line = trimmedRestLine;
    }
  });
  return tokens;
}

const allRules = {
  if: (parser: Parser): IExpr => {
    function getCondition(): IIfCondition {
      const condition = parser.match("andOr");
      parser.get({ type: "paren", value: "{" });
      const then = parser.match("block");
      return { if: condition, then };
    }

    const conditions: IIfCondition[] = [];
    parser.get({ type: "if", value: "if" });
    conditions.push(getCondition());
    let elseKeyword = parser.maybeGet({ type: "if", value: "else" });
    let or;
    if (elseKeyword != null) {
      let anotherIf = parser.maybeGet({ type: "if", value: "if" });
      while (anotherIf != null) {
        conditions.push(getCondition());
        elseKeyword = parser.maybeGet({ type: "if", value: "else" });
        if (elseKeyword != null) {
          anotherIf = parser.maybeGet({ type: "if", value: "if" });
        } else {
          break;
        }
      }
      if (elseKeyword != null) {
        parser.get({ type: "paren", value: "{" });
        or = parser.match("block");
      }
    }
    return { type: "if", conditions, or };
  },
  block: (parser: Parser): IExpr => {
    const exprs: IExpr[] = [];
    while (!parser.isEof() && !parser.maybeGet({ type: "paren", value: "}" })) {
      const expr = parser.match(["if", "assign", "fn", "ternary"]);
      if (expr != null) {
        exprs.push(expr);
      }
      // eslint-disable-next-line no-unused-expressions
      while (parser.maybeGet({ type: "eol" }) || parser.maybeGet({ type: "semicolon" })) {
        // eating all eols and semicolons
      }
    }
    return { type: "block", exprs };
  },
  assign: (parser: Parser): IExpr => {
    const variable = parser.match("keyword") as IExprKeyword;
    parser.get({ type: "operator", value: "=" });
    const value = parser.match("fn");
    return { type: "assign", variable: variable.value, value };
  },
  fn: (parser: Parser): IExpr => {
    const name = parser.match(["ternary", "keyword"]);
    if (name.type === "keyword") {
      const args: IExpr[] = [];
      const openParen = parser.maybeGet({ type: "paren", value: "(" });
      if (openParen != null) {
        while (true) {
          args.push(parser.match("fn"));
          const comma = parser.maybeGet({ type: "comma" });
          if (comma == null) {
            parser.get({ type: "paren", value: ")" });
            return { type: "fn", args, name: name.value };
          }
        }
      }
    }
    return name;
  },
  factor: (parser: Parser): IExpr => {
    const token = parser.maybeGet({ type: "paren", value: "(" });
    if (token != null) {
      const expr = parser.match("fn");
      parser.get({ type: "paren", value: ")" });
      return expr;
    } else {
      return parser.match(["number", "keyword"]);
    }
  },
  andOr: (parser: Parser): IExpr => {
    const left = parser.match("cmp");
    const operator = parser.maybeGet({ type: "operator", value: /(&&|\|\|)/ });
    if (operator != null) {
      const right = parser.match("andOr");
      return { type: "expression", left, operator: operator as ITokenOperator, right };
    } else {
      return left;
    }
  },
  cmp: (parser: Parser): IExpr => {
    const not = parser.maybeGet({ type: "operator", value: "!" });
    if (not != null) {
      const condition = parser.match("cmp");
      return { type: "not", condition };
    } else {
      const left = parser.match("expression");
      const operator = parser.maybeGet({ type: "operator", value: /(==|!=|>|<|>=|<=)/ });
      if (operator != null) {
        const right = parser.match("cmp");
        return { type: "expression", left, operator: operator as ITokenOperator, right };
      } else {
        return left;
      }
    }
  },
  ternary: (parser: Parser): IExpr => {
    const condition = parser.match("andOr");
    const operator = parser.maybeGet({ type: "operator", value: "?" });
    if (operator != null) {
      const then = parser.match("fn");
      parser.get({ type: "operator", value: ":" });
      const or = parser.match("fn");
      return { type: "cond", condition, then, or };
    } else {
      return condition;
    }
  },
  expression: (parser: Parser): IExpr => {
    const left = parser.match("term");
    const operator = parser.maybeGet({ type: "operator", value: /\+|\-/ });
    if (operator != null) {
      const right = parser.match("expression");
      return { type: "expression", left, operator: operator as ITokenOperator, right };
    } else {
      return left;
    }
  },
  term: (parser: Parser): IExpr => {
    const left = parser.match("factor");
    const operator = parser.maybeGet({ type: "operator", value: /\*|\// });
    if (operator != null) {
      const right = parser.match("factor");
      return { type: "expression", left, operator: operator as ITokenOperator, right };
    } else {
      return left;
    }
  },
  number: (parser: Parser): IExpr => {
    const sign = parser.maybeGet({ type: "operator", value: /\+|\-/ });
    const number = parser.get({ type: "number" }) as ITokenNumber;
    const value = number.unit != null ? Weight.build(number.value, number.unit) : number.value;
    return {
      type: "number",
      sign: sign != null && "value" in sign && sign.value === "-" ? "-" : "+",
      value,
    };
  },
  keyword: (parser: Parser): IExpr => {
    const keyword = parser.get({ type: "keyword" });
    const field = parser.maybeGet({ type: "paren", value: "[" });
    let fieldExpr: IExpr | undefined;
    if (field != null) {
      fieldExpr = parser.match("expression");
      parser.get({ type: "paren", value: "]" });
    }
    return {
      type: "keyword",
      value: keyword.value as string,
      field: fieldExpr,
    };
  },
} as const;
type IRules = typeof allRules;

type IIfCondition = { if: IExpr; then: IExpr };
type IExprNumber = { type: "number"; sign: "+" | "-"; value: number | IWeight };
type IExprBlock = { type: "block"; exprs: IExpr[] };
type IExprKeyword = { type: "keyword"; value: string; field?: IExpr };
type IExprExpression = { type: "expression"; operator: ITokenOperator; left: IExpr; right: IExpr };
type IExprCond = { type: "cond"; condition: IExpr; then: IExpr; or: IExpr };
type IExprIf = { type: "if"; conditions: IIfCondition[]; or?: IExpr };
type IExprAssign = { type: "assign"; variable: string; value: IExpr };
type IExprFn = { type: "fn"; name: string; args: IExpr[] };
type IExprNot = { type: "not"; condition: IExpr };

type IExpr =
  | IExprNumber
  | IExprKeyword
  | IExprExpression
  | IExprCond
  | IExprIf
  | IExprAssign
  | IExprBlock
  | IExprFn
  | IExprNot;

class Parser {
  private tokens: IToken[];
  private readonly rules: IRules;

  constructor(tokens: IToken[], rules: IRules) {
    this.tokens = [...tokens];
    this.rules = rules;
  }

  public maybeGet(conds: ITokenCondition | ITokenCondition[]): IToken | undefined {
    conds = Array.isArray(conds) ? conds : [conds];
    const token = this.tokens[0];
    const condition =
      token != null &&
      conds.some((c) => {
        if (c.type === token.type) {
          if (c.value == null || !("value" in token)) {
            return true;
          } else {
            if (typeof c.value === "string") {
              return c.value === token.value;
            } else {
              return c.value.test(token.value.toString());
            }
          }
        } else {
          return false;
        }
      });
    return condition ? this.tokens.shift() : undefined;
  }

  public get(conds: ITokenCondition | ITokenCondition[]): IToken {
    const token = this.maybeGet(conds);
    if (token != null) {
      return token;
    } else {
      return this.raiseError();
    }
  }

  public match(ruleKeys: keyof IRules | Array<keyof IRules>): IExpr {
    ruleKeys = Array.isArray(ruleKeys) ? ruleKeys : [ruleKeys];
    for (const key of ruleKeys) {
      let expr: IExpr | undefined;
      const tokens = [...this.tokens];
      try {
        expr = this.rules[key](this);
      } catch (e) {
        if (!(e instanceof SyntaxError)) {
          throw e;
        } else {
          this.tokens = tokens;
        }
      }
      if (expr != null) {
        return expr;
      }
    }
    return this.raiseError();
  }

  public parse(): IExpr {
    const expr = this.match("block");
    if (this.tokens[0] == null || this.tokens[0].type === "semicolon") {
      return expr;
    } else {
      return this.raiseError();
    }
  }

  public isEof(): boolean {
    return this.tokens.length === 0;
  }

  private raiseError(): never {
    const token = this.tokens[0];
    if (token != null) {
      throw new SyntaxError(`Unexpected symbol ${token.value} at ${token.pos.line}:${token.pos.offset}`);
    } else {
      throw new SyntaxError("Unexpected end of script");
    }
  }
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

class Evaluator {
  private readonly state: IProgramState;
  private readonly bindings: IScriptBindings;
  private readonly fns: IScriptFunctions;
  private readonly context: IScriptContext;

  constructor(state: IProgramState, bindings: IScriptBindings, fns: IScriptFunctions, context: IScriptContext) {
    this.state = state;
    this.bindings = bindings;
    this.fns = fns;
    this.context = context;
  }

  public evaluate(expr: IExpr): number | boolean | IWeight {
    if (expr.type === "expression") {
      const { left, right, operator } = expr;
      const evalLeft = this.evaluate(left);
      const evalRight = this.evaluate(right);
      if (typeof evalLeft === "boolean" || typeof evalRight === "boolean") {
        if (operator.value === "&&") {
          return evalLeft && evalRight;
        } else if (operator.value === "||") {
          return evalLeft || evalRight;
        } else {
          throw new SyntaxError(`Unknown operator ${operator.value} between ${evalLeft} and ${evalRight}`);
        }
      } else {
        if (operator.value === ">") {
          return comparing(evalLeft, evalRight, operator.value);
        } else if (operator.value === "<") {
          return comparing(evalLeft, evalRight, operator.value);
        } else if (operator.value === ">=") {
          return comparing(evalLeft, evalRight, operator.value);
        } else if (operator.value === "<=") {
          return comparing(evalLeft, evalRight, operator.value);
        } else if (operator.value === "==") {
          return comparing(evalLeft, evalRight, operator.value);
        } else if (operator.value === "!=") {
          return comparing(evalLeft, evalRight, operator.value);
        } else {
          if (Array.isArray(evalLeft) || Array.isArray(evalRight)) {
            throw new SyntaxError(`You cannot apply ${operator.value} to arrays`);
          }
          if (operator.value === "+") {
            return this.add(evalLeft, evalRight);
          } else if (operator.value === "-") {
            return this.subtract(evalLeft, evalRight);
          } else if (operator.value === "*") {
            return this.multiply(evalLeft, evalRight);
          } else if (operator.value === "/") {
            return this.divide(evalLeft, evalRight);
          } else {
            throw new SyntaxError(`Unknown operator ${operator.value} between ${evalLeft} and ${evalRight}`);
          }
        }
      }
    } else if (expr.type === "number") {
      if (Weight.is(expr.value)) {
        return expr.sign === "-" ? Weight.build(-expr.value.value, expr.value.unit) : expr.value;
      } else {
        return expr.sign === "-" ? -expr.value : expr.value;
      }
    } else if (expr.type === "cond") {
      return this.evaluate(expr.condition) ? this.evaluate(expr.then) : this.evaluate(expr.or);
    } else if (expr.type === "if") {
      for (let i = 0; i < expr.conditions.length; i += 1) {
        const condition = expr.conditions[i];
        if (this.evaluate(condition.if)) {
          return this.evaluate(condition.then);
        }
      }
      if (expr.or != null) {
        return this.evaluate(expr.or);
      } else {
        return 0;
      }
    } else if (expr.type === "assign") {
      const variable = expr.variable;
      let match: RegExpExecArray | null;
      if ((match = /^state\.([a-zA-Z0-9]+)/.exec(variable))) {
        const stateKey = match[1];
        if (stateKey in this.state) {
          const value = this.evaluate(expr.value);
          if (Weight.is(value) || typeof value === "number") {
            this.state[stateKey] = value;
          } else {
            throw new SyntaxError(`Can't assign to ${stateKey} - value is not a number or weight`);
          }
          return value;
        } else {
          throw new SyntaxError(`Unknown state variable '${stateKey}'`);
        }
      } else {
        throw new SyntaxError(`Can only assign to 'state' fields, but got ${variable} instead`);
      }
    } else if (expr.type === "block") {
      let result: number | boolean | IWeight = 0;
      for (const e of expr.exprs) {
        result = this.evaluate(e);
      }
      return result;
    } else if (expr.type === "fn") {
      const fns = this.fns;
      const name = expr.name as keyof typeof fns;
      if (this.fns[name] != null) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (this.fns[name] as any).apply(undefined, [...expr.args.map((a) => this.evaluate(a)), this.context]);
      } else {
        throw new SyntaxError(`Unknown function '${name}'`);
      }
    } else if (expr.type === "not") {
      const evaluated = this.evaluate(expr.condition);
      return !evaluated;
    } else {
      const value = expr.value;
      let match: RegExpExecArray | null;
      if ((match = /^state\.([a-zA-Z0-9]+)/.exec(value))) {
        const stateKey = match[1];
        if (stateKey in this.state) {
          return this.state[stateKey];
        } else {
          throw new SyntaxError(`Unknown state variable '${stateKey}'`);
        }
      } else if ((match = /^(weights|reps|completedReps|w|r|cr)$/.exec(value)) && !!expr.field) {
        const key = match[1] as "w" | "r" | "cr" | "weights" | "reps" | "completedReps";
        const field = this.evaluate(expr.field);
        if (typeof field !== "number") {
          throw new SyntaxError(`${value} - Expecting to have a number in [] of ${match[1]}`);
        }
        if (this.bindings[key][field - 1] == null) {
          throw new SyntaxError(`${value} - There's no set ${field} in the exercise`);
        } else {
          return this.bindings[key][field - 1];
        }
      } else if (Object.keys(this.bindings).indexOf(expr.value) !== -1) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (this.bindings as any)[expr.value];
      } else {
        throw new SyntaxError(`Unexpected variable '${value}'`);
      }
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

let lastRollbarSent: number = 0;

export class ScriptRunner {
  private readonly script: string;
  private readonly state: IProgramState;
  private readonly bindings: IScriptBindings;
  private readonly fns: IScriptFunctions;
  private readonly units: IUnit;
  private readonly context: IScriptContext;

  constructor(
    script: string,
    state: IProgramState,
    bindings: IScriptBindings,
    fns: IScriptFunctions,
    units: IUnit,
    context: IScriptContext
  ) {
    this.script = script;
    this.state = state;
    this.bindings = bindings;
    this.fns = fns;
    this.units = units;
    this.context = context;
  }

  public parse(): IExpr {
    const tokens = tokenize(this.script);
    return new Parser(tokens, allRules).parse();
  }

  public execute(type: "reps"): number;
  public execute(type: "weight"): IWeight;
  public execute(type: "timer"): number;
  public execute(type?: undefined): number | IWeight | boolean;
  public execute(type?: "reps" | "weight" | "timer"): number | IWeight | boolean {
    let liftoscriptOutput: number | IWeight | boolean | undefined;
    let liftoscriptError: { error: string; type: string } | undefined;
    const stateCopy = { ...this.state };
    try {
      const liftoscriptTree = LiftoscriptParser.parse(this.script);
      const liftoscriptEvaluator = new LiftoscriptEvaluator(
        this.script,
        stateCopy,
        this.bindings,
        this.fns,
        this.context
      );
      liftoscriptEvaluator.parse(liftoscriptTree.topNode);
      const rawResult = liftoscriptEvaluator.evaluate(liftoscriptTree.topNode);
      const result = Array.isArray(rawResult) ? rawResult[0] : rawResult;
      liftoscriptOutput = this.convertResult(type, result);
    } catch (e) {
      liftoscriptError = { error: e.message, type: e.name };
    }

    let output: number | IWeight | boolean;
    try {
      const ast = this.parse();
      const evaluator = new Evaluator(this.state, this.bindings, this.fns, this.context);
      const result = evaluator.evaluate(ast);
      output = this.convertResult(type, result);
    } catch (e) {
      if (e.name === "SyntaxError" && liftoscriptError == null) {
        this.reportInconsistensyError("Parser thrown an error, but Liftoscript didn't", {
          output: undefined,
          liftoscriptOutput,
          error: e,
          liftoscriptError,
        });
      }
      throw e;
    }

    if (liftoscriptError != null) {
      this.reportInconsistensyError("Liftoscript thrown an error, but Parser didn't", {
        output,
        liftoscriptOutput,
        error: undefined,
        liftoscriptError,
      });
    } else {
      if (liftoscriptOutput !== output) {
        this.reportInconsistensyError("Liftoscript returned a different result than Parser", {
          output,
          liftoscriptOutput,
          error: undefined,
          liftoscriptError,
        });
      }
      if (!dequal(this.state, stateCopy)) {
        this.reportInconsistensyError("Liftoscript and Parser changed states differently", {
          output,
          liftoscriptOutput,
          error: undefined,
          liftoscriptError,
        });
      }
    }
    return output;
  }

  private reportInconsistensyError(
    msg: string,
    args: {
      output?: number | IWeight | boolean;
      liftoscriptOutput?: number | IWeight | boolean;
      error?: Error;
      liftoscriptError?: { error: string; type: string };
    }
  ): void {
    const { output, liftoscriptOutput, error, liftoscriptError } = args;
    const payload = {
      script: this.script,
      bindings: JSON.stringify(this.bindings),
      units: this.units,
      state: JSON.stringify(this.state),
      output: JSON.stringify(output),
      liftoscriptOutput: JSON.stringify(liftoscriptOutput),
      error: error ? JSON.stringify({ message: error.message, name: error.name }) : undefined,
      liftoscriptError: JSON.stringify(liftoscriptError),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      screen: JSON.stringify(((window as any)?.state as IState)?.screenStack),
    };
    if (lastRollbarSent < Date.now() - 1000 * 5) {
      if (typeof Rollbar !== "undefined") {
        Rollbar.error(msg, payload);
      }
      console.error(msg, payload);
      lastRollbarSent = Date.now();
    }
  }

  private convertResult(
    type: "reps" | "weight" | "timer" | undefined,
    result: number | IWeight | boolean
  ): number | IWeight | boolean {
    if (type === "reps" || type === "timer") {
      if (typeof result !== "number") {
        throw new SyntaxError("Expected to get number as a result");
      } else if (result < 0) {
        return 0;
      } else {
        return result;
      }
    } else if (type === "weight") {
      if (typeof result === "boolean") {
        throw new SyntaxError("Expected to get number or weight as a result");
      } else {
        if (!Weight.is(result)) {
          result = Weight.build(result, this.units);
        }
        if (Weight.lt(result, 0)) {
          return Weight.build(0, this.units);
        } else {
          return result;
        }
      }
    } else {
      return result;
    }
  }
}
