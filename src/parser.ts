import { IScriptBindings, IScriptFunctions } from "./models/progress";

type IPos = { readonly line: number; readonly offset: number };

type ITokenNumber = { readonly type: "number"; readonly value: number; readonly pos: IPos };
type ITokenOperator = {
  readonly type: "operator";
  readonly value: "+" | "-" | "*" | "/" | ">=" | ">" | "=" | "==" | "<=" | "<" | "?" | ":" | "&&" | "||";
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
      if ((match = /^([(){}\[\]])/.exec(line))) {
        tokens.push({ type: "paren", value: match[0] as ITokenParen["value"], pos });
      } else if ((match = /^([\d\.]+)/.exec(line))) {
        tokens.push({ type: "number", value: parseFloat(match[0]), pos });
      } else if ((match = /^(,)/.exec(line))) {
        tokens.push({ type: "comma", value: ",", pos });
      } else if ((match = /^([\+\-*<>=&|\?:/]+)/.exec(line))) {
        tokens.push({ type: "operator", value: match[0] as ITokenOperator["value"], pos });
      } else if ((match = /^(;)/.exec(line))) {
        tokens.push({ type: "semicolon", value: ";", pos });
      } else if ((match = /^(if)\W/.exec(line))) {
        tokens.push({ type: "if", value: "if", pos });
      } else if ((match = /^(else)\W/.exec(line))) {
        tokens.push({ type: "if", value: "else", pos });
      } else if ((match = /^([a-zA-Z][a-zA-Z0-9\.\[\]]+)/.exec(line))) {
        tokens.push({ type: "keyword", value: match[0] as ITokenKeyword["value"], pos });
      } else {
        throw SyntaxError(`Unexpected token at line ${pos.line}:${pos.offset}, ${line}`);
      }
      const restLine = line.slice(match[1].length);
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
    parser.get({ type: "if", value: "if" });
    const condition = parser.match("andOr");
    parser.get({ type: "paren", value: "{" });
    const then = parser.match("block");
    let or;
    const elseKeyword = parser.maybeGet({ type: "if", value: "else" });
    if (elseKeyword != null) {
      parser.get({ type: "paren", value: "{" });
      or = parser.match("block");
    }
    return { type: "if", condition, then, or };
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
    const operator = parser.maybeGet({ type: "operator", value: /(&&|\|\})/ });
    if (operator != null) {
      const right = parser.match("andOr");
      return { type: "expression", left, operator: operator as ITokenOperator, right };
    } else {
      return left;
    }
  },
  cmp: (parser: Parser): IExpr => {
    const left = parser.match("expression");
    const operator = parser.maybeGet({ type: "operator", value: /[<>=]+/ });
    if (operator != null) {
      const right = parser.match("cmp");
      return { type: "expression", left, operator: operator as ITokenOperator, right };
    } else {
      return left;
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
    const number = parser.get({ type: "number" });
    return {
      type: "number",
      sign: sign != null && "value" in sign && sign.value === "-" ? "-" : "+",
      value: number.value as number,
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

type IExprNumber = { type: "number"; sign: "+" | "-"; value: number };
type IExprBlock = { type: "block"; exprs: IExpr[] };
type IExprKeyword = { type: "keyword"; value: string };
type IExprExpression = { type: "expression"; operator: ITokenOperator; left: IExpr; right: IExpr };
type IExprCond = { type: "cond"; condition: IExpr; then: IExpr; or: IExpr };
type IExprIf = { type: "if"; condition: IExpr; then: IExpr; or?: IExpr };
type IExprAssign = { type: "assign"; variable: string; value: IExpr };
type IExprFn = { type: "fn"; name: string; args: IExpr[] };

type IExpr = IExprNumber | IExprKeyword | IExprExpression | IExprCond | IExprIf | IExprAssign | IExprBlock | IExprFn;

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

class Evaluator {
  private readonly state: Record<string, number | boolean>;
  private readonly bindings: IScriptBindings;
  private readonly fns: IScriptFunctions;

  constructor(state: Record<string, number | boolean>, bindings: IScriptBindings, fns: IScriptFunctions) {
    this.state = state;
    this.bindings = bindings;
    this.fns = fns;
  }

  public evaluate(expr: IExpr): number | boolean {
    if (expr.type === "expression") {
      const { left, right, operator } = expr;
      const evalLeft = this.evaluate(left);
      const evalRight = this.evaluate(right);
      if (operator.value === "+") {
        return (evalLeft as number) + (evalRight as number);
      } else if (operator.value === "-") {
        return (evalLeft as number) - (evalRight as number);
      } else if (operator.value === "*") {
        return (evalLeft as number) * (evalRight as number);
      } else if (operator.value === "/") {
        return (evalLeft as number) * (evalRight as number);
      } else if (operator.value === ">") {
        return (evalLeft as number) > (evalRight as number);
      } else if (operator.value === "<") {
        return (evalLeft as number) < (evalRight as number);
      } else if (operator.value === ">=") {
        return (evalLeft as number) >= (evalRight as number);
      } else if (operator.value === "<=") {
        return (evalLeft as number) <= (evalRight as number);
      } else if (operator.value === "==") {
        return evalLeft === evalRight;
      } else if (operator.value === "&&") {
        return evalLeft && evalRight;
      } else if (operator.value === "||") {
        return evalLeft || evalRight;
      } else {
        throw new SyntaxError(`Unknown operator ${operator.value}`);
      }
    } else if (expr.type === "number") {
      return expr.sign === "-" ? -expr.value : expr.value;
    } else if (expr.type === "cond") {
      return this.evaluate(expr.condition) ? this.evaluate(expr.then) : this.evaluate(expr.or);
    } else if (expr.type === "if") {
      if (this.evaluate(expr.condition)) {
        return this.evaluate(expr.then);
      } else if (expr.or != null) {
        return this.evaluate(expr.or);
      } else {
        return false;
      }
    } else if (expr.type === "assign") {
      const variable = expr.variable;
      let match: RegExpExecArray | null;
      if ((match = /^state\.([a-zA-Z0-9]+)/.exec(variable))) {
        const stateKey = match[1];
        const value = this.evaluate(expr.value);
        this.state[stateKey] = value;
        return value;
      } else {
        throw new SyntaxError(`Can only assign to 'state' fields, but got ${variable} instead`);
      }
    } else if (expr.type === "block") {
      let result: number | boolean = false;
      for (const e of expr.exprs) {
        result = this.evaluate(e);
      }
      return result;
    } else if (expr.type === "fn") {
      const fns = this.fns;
      const name = expr.name as keyof typeof fns;
      if (this.fns[name] != null) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (this.fns[name] as any).apply(
          undefined,
          expr.args.map((a) => this.evaluate(a))
        );
      } else {
        throw new SyntaxError(`Unknown function '${name}'`);
      }
    } else {
      const value = expr.value;
      let match: RegExpExecArray | null;
      if ((match = /^state\.([a-zA-Z0-9]+)/.exec(value))) {
        const stateKey = match[1];
        return this.state[stateKey];
      } else if ((match = /^(w|r|cr)\[(\d+)\]\[(\d+)\]/.exec(value))) {
        const key = match[1] as "w" | "r" | "cr";
        const excerciseIndex = parseInt(match[2], 10) - 1;
        const setIndex = parseInt(match[3], 10) - 1;
        return this.bindings[key][excerciseIndex][setIndex];
      } else if (Object.keys(this.bindings).indexOf(expr.value) !== -1) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (this.bindings as any)[expr.value];
      } else {
        throw new SyntaxError(`Unexpected variable '${value}'`);
      }
    }
  }
}

export class ScriptRunner {
  private readonly script: string;
  private readonly state: Record<string, number | boolean>;
  private readonly bindings: IScriptBindings;
  private readonly fns: IScriptFunctions;

  constructor(
    script: string,
    state: Record<string, number | boolean>,
    bindings: IScriptBindings,
    fns: IScriptFunctions
  ) {
    this.script = script;
    this.state = state;
    this.bindings = bindings;
    this.fns = fns;
  }

  public execute(shouldExpectNumber: true): number;
  public execute(shouldExpectNumber: false): number | boolean;
  public execute(shouldExpectNumber: unknown): unknown {
    const tokens = tokenize(this.script);
    const ast = new Parser(tokens, allRules).parse();
    const evaluator = new Evaluator(this.state, this.bindings, this.fns);
    const result = evaluator.evaluate(ast);
    if (!shouldExpectNumber || typeof result === "number") {
      return result;
    } else {
      throw new SyntaxError("Expected to get number as a result, but got a boolean instead");
    }
  }
}
