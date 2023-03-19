/* eslint-disable @typescript-eslint/unified-signatures */
import { IScriptBindings, IScriptContext, IScriptFunctions } from "./models/progress";
import { Weight } from "./models/weight";
import { IUnit, IWeight, IProgramState } from "./types";

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
      } else if ((match = /^([a-zA-Z][a-zA-Z0-9\.\[\]]*)/.exec(line))) {
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
    return {
      type: "keyword",
      value: keyword.value as string,
    };
  },
} as const;
type IRules = typeof allRules;

type IIfCondition = { if: IExpr; then: IExpr };
type IExprNumber = { type: "number"; sign: "+" | "-"; value: number | IWeight };
type IExprBlock = { type: "block"; exprs: IExpr[] };
type IExprKeyword = { type: "keyword"; value: string };
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
        return false;
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
      let result: number | boolean | IWeight = false;
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
      } else if ((match = /^(weights|reps|completedReps|w|r|cr)\[(\d+)\]/.exec(value))) {
        const key = match[1] as "w" | "r" | "cr" | "weights" | "reps" | "completedReps";
        const setIndex = parseInt(match[2], 10) - 1;
        if (this.bindings[key][setIndex] == null) {
          throw new SyntaxError(`${value} - There's no set ${setIndex + 1} in the exercise`);
        } else {
          return this.bindings[key][setIndex];
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
    const ast = this.parse();
    const evaluator = new Evaluator(this.state, this.bindings, this.fns, this.context);
    let result = evaluator.evaluate(ast);
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
