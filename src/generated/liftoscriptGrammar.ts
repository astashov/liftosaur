// Auto-generated from ./liftoscript.grammar
// Do not edit manually - run npm run build:markdown to update

export const content = `@top Program { expression* }

@precedence {
  unary
  fncall @left
  arrindex @left
  times @left
  plus @left
  cmp @left
  andor @left
  ternary @right
  assign @right
}

expression {
  BinaryExpression |
  NumberExpression |
  WeightExpression |
  Percentage |
  ParenthesisExpression |
  BlockExpression |
  Ternary |
  IfExpression |
  ForExpression |
  AssignmentExpression |
  IncAssignmentExpression |
  BuiltinFunctionExpression |
  VariableExpression |
  StateVariable |
  Variable |
  UnaryExpression
}

ParenthesisExpression { "(" expression ")" }
BlockExpression { "{" expression* "}" }
IfExpression {
  @specialize<Keyword, "if"> ParenthesisExpression
  BlockExpression
  (@specialize<Keyword, "else"> @specialize<Keyword, "if"> ParenthesisExpression BlockExpression)*
  (@specialize<Keyword, "else"> BlockExpression)? 
}
ForExpression {
  @specialize<Keyword, "for"> "(" Variable "in" ForInExpression ")"
  BlockExpression
}
ForInExpression {
  expression
}
AssignmentExpression { (StateVariable | Variable | VariableExpression) !assign "=" expression }
IncAssignmentExpression { (StateVariable | Variable | VariableExpression) !assign IncAssignment expression }
VariableExpression { Keyword (!arrindex "[" VariableIndex (":" VariableIndex)* "]")? }
StateVariable { StateKeyword (!arrindex "[" StateVariableIndex "]")? "." Keyword }
VariableIndex { Wildcard | expression }
StateVariableIndex { expression }
Wildcard { "*" }
BuiltinFunctionExpression { Keyword !fncall "(" expression? ("," expression)* ")" }
Ternary { expression !ternary "?" expression ":" expression }
NumberExpression { !unary Plus? Number }
WeightExpression { NumberExpression Unit }

BinaryExpression {
  expression !plus Plus expression |
  expression !times Times expression |
  expression !cmp Cmp expression |
  expression !andor AndOr expression
}

UnaryExpression {
  !unary Not expression
}

@skip { space | LineComment | ";" | "{~" | "~}" }

@tokens {
  space { @whitespace+ }
  LineComment { "//" ![\\n]* }
  @precedence { LineComment, Times }

  Keyword { @asciiLetter (@asciiLetter | @digit | "_")* }
  StateKeyword { "state" }
  Variable { "var." Keyword }
  Unit { "lb" | "kg" }
  @precedence { StateKeyword, Variable, Unit, Keyword }

  Number { (@digit+ ("." @digit+)*) | "." @digit+ | @digit+ "." }
  Plus { ("+" | "-") }
  Percentage { Number "%" }
  IncAssignment { ("+=" | "-=" | "*=" | "/=") }
  @precedence { Percentage, Number, Plus }

  Times { ("*" | "/" | "%") }
  Cmp { ( ">" "="? | "==" | "!=" | "<" "="? ) }
  AndOr { ( "&&" | "||" ) }
  Not { "!" }
}
`;

export default content;
