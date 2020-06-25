type IPos = { readonly line: number; readonly offset: number };

type ITokenNumber = { readonly type: "number"; readonly value: number; readonly pos: IPos };
type ITokenOperator = {
  readonly type: "operator";
  readonly value: "+" | "-" | "*" | "/" | ">=" | ">" | "=" | "==" | "<=" | "<" | "?" | ":";
  readonly pos: IPos;
};
type ITokenParen = { readonly type: "paren"; readonly value: "(" | ")"; readonly pos: IPos };
type ITokenKeyword = { readonly type: "keyword"; readonly value: string; readonly pos: IPos };
type ITokenEol = { readonly type: "eol"; readonly value: "\\n"; readonly pos: IPos };
type ITokenSemicolon = { readonly type: "semicolon"; readonly value: ";"; readonly pos: IPos };

type IToken = ITokenNumber | ITokenOperator | ITokenParen | ITokenKeyword | ITokenEol | ITokenSemicolon;

type ITokenCondition = { type: IToken["type"]; value?: string | RegExp };

export function tokenize(text: string): IToken[] {
  const lines = text.split(/\r\n|\r|\n/);
  const tokens: IToken[] = [];
  lines.forEach((rawLine, lineNumber) => {
    let offset = 0;
    let line = rawLine.trimLeft();
    offset += rawLine.length - line.length;
    while (line.length > 0) {
      let match: RegExpExecArray | null;
      const pos = { line: lineNumber + 1, offset: offset + 1 };
      if ((match = /^[()]/.exec(line))) {
        tokens.push({ type: "paren", value: match[0] as ITokenParen["value"], pos });
      } else if ((match = /^[\d\.]+/.exec(line))) {
        tokens.push({ type: "number", value: parseInt(match[0], 10), pos });
      } else if ((match = /^[\+\-*<>=\?:/]/.exec(line))) {
        tokens.push({ type: "operator", value: match[0] as ITokenOperator["value"], pos });
      } else if ((match = /^;/.exec(line))) {
        tokens.push({ type: "semicolon", value: ";", pos });
      } else if ((match = /^[a-zA-Z][a-zA-Z0-9\.\[\]]+/.exec(line))) {
        tokens.push({ type: "keyword", value: match[0] as ITokenKeyword["value"], pos });
      } else {
        throw SyntaxError(`Unexpected token at line ${pos.line}:${pos.offset}`);
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
  assign: (parser: Parser): IExpr => {
    const variable = parser.match("keyword") as IExprKeyword;
    parser.get({ type: "operator", value: "=" });
    const value = parser.match("cond");
    return { type: "assign", variable: variable.value, value };
  },
  factor: (parser: Parser): IExpr => {
    const token = parser.maybeGet({ type: "paren", value: "(" });
    if (token != null) {
      const expr = parser.match("cond");
      parser.get({ type: "paren", value: ")" });
      return expr;
    } else {
      return parser.match(["number", "keyword"]);
    }
  },
  cmp: (parser: Parser): IExpr => {
    const left = parser.match("expression");
    const operator = parser.maybeGet({ type: "operator", value: /<|>/ });
    if (operator != null) {
      const right = parser.match("cmp");
      return { type: "expression", left, operator: operator as ITokenOperator, right };
    } else {
      return left;
    }
  },
  cond: (parser: Parser): IExpr => {
    const condition = parser.match("cmp");
    const operator = parser.maybeGet({ type: "operator", value: "?" });
    if (operator != null) {
      const then = parser.match("cond");
      parser.get({ type: "operator", value: ":" });
      const or = parser.match("cond");
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
type IExprKeyword = { type: "keyword"; value: string };
type IExprExpression = { type: "expression"; operator: ITokenOperator; left: IExpr; right: IExpr };
type IExprCond = { type: "cond"; condition: IExpr; then: IExpr; or: IExpr };
type IExprAssign = { type: "assign"; variable: string; value: IExpr };

type IExpr = IExprNumber | IExprKeyword | IExprExpression | IExprCond | IExprAssign;

class Parser {
  private readonly tokens: IToken[];
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
      try {
        expr = this.rules[key](this);
      } catch (e) {
        if (!(e instanceof SyntaxError)) {
          throw e;
        }
      }
      if (expr != null) {
        return expr;
      }
    }
    return this.raiseError();
  }

  public parse(): IExpr {
    const expr = this.match("assign");
    if (this.tokens[0] == null || this.tokens[0].type === "semicolon") {
      return expr;
    } else {
      return this.raiseError();
    }
  }

  private raiseError(): never {
    const token = this.tokens[0];
    throw new SyntaxError(`Unexpected symbol ${token.value} at ${token.pos.line}:${token.pos.offset}`);
  }
}

class ParserAll {
  private readonly tokenGroups: IToken[][];
  private readonly rules: IRules;

  constructor(tokens: IToken[], rules: IRules) {
    this.tokenGroups = tokens.reduce<IToken[][]>(
      (memo, token) => {
        if (token.type === "semicolon") {
          memo.push([]);
        } else {
          memo[memo.length - 1].push(token);
        }
        return memo;
      },
      [[]]
    );
    this.rules = rules;
  }

  public parse(): IExpr[] {
    return this.tokenGroups.reduce<IExpr[]>((memo, tokens) => {
      if (tokens.length > 0) {
        const lineParser = new Parser(tokens, this.rules);
        memo.push(lineParser.parse());
      }
      return memo;
    }, []);
  }
}

function evaluate(
  expr: IExpr,
  state: Record<string, number | boolean>,
  bindings: Record<string, number[]>
): number | boolean {
  if (expr.type === "expression") {
    const { left, right, operator } = expr;
    const evalLeft = evaluate(left, state, bindings);
    const evalRight = evaluate(right, state, bindings);
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
      return (evalLeft as number) === (evalRight as number);
    } else {
      return (evalLeft as number) + (evalRight as number);
    }
  } else if (expr.type === "number") {
    return expr.sign === "-" ? -expr.value : expr.value;
  } else if (expr.type === "cond") {
    return evaluate(expr.condition, state, bindings)
      ? evaluate(expr.then, state, bindings)
      : evaluate(expr.or, state, bindings);
  } else if (expr.type === "assign") {
    const variable = expr.variable;
    let match: RegExpExecArray | null;
    if ((match = /^state\.([a-zA-Z0-9]+)/.exec(variable))) {
      const stateKey = match[1];
      const value = evaluate(expr.value, state, bindings);
      state[stateKey] = value;
      return value;
    } else {
      throw new SyntaxError(`Can only assign to 'state' fields, but got ${variable} instead`);
    }
  } else {
    const value = expr.value;
    let match: RegExpExecArray | null;
    if ((match = /^state\.([a-zA-Z0-9]+)/.exec(value))) {
      const stateKey = match[1];
      return state[stateKey];
    } else if ((match = /^(w|r|cr)\[(\d+)\]/.exec(value))) {
      const key = match[1];
      const index = parseInt(match[2], 10) - 1;
      return bindings[key][index];
    } else {
      throw new SyntaxError(`Unexpected variable '${value}'`);
    }
  }
}

function evaluateAll(
  exprs: IExpr[],
  state: Record<string, number | boolean>,
  bindings: Record<string, number[]>
): number | boolean | undefined {
  let result: boolean | number | undefined;
  for (const expr of exprs) {
    result = evaluate(expr, state, bindings);
  }
  return result;
}

/*
-24 + (32 * state.foo) + w[2] > 5000 ? 400 : 500
*/

const program = `
state.bar = -24 + 32 > 50 ? 600 : 700 * state.foo + w[2] > 5000 ? 400 : 500;
state.yea = 123;
`;
const tokens = tokenize(program);
console.log(program);
console.log(tokens);
const ast = new ParserAll(tokens, allRules).parse();
console.dir(ast, { depth: null });
const state = { foo: 5 };
const result = evaluateAll(ast, state, { w: [1, 2, 3] });
console.log(result);
console.log(state);
