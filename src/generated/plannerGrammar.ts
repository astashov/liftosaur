// Auto-generated from ./src/pages/planner/plannerExercise.grammar
// Do not edit manually - run npm run build:markdown to update

export const content = `@top Program { expression* }

expression { LineComment | TripleLineComment | Week | Day | ExerciseExpression | EmptyExpression }

ExerciseExpression { ExerciseName Repeat? (SectionSeparator ExerciseSection?)* linebreakOrEof }
EmptyExpression { linebreak }

ExerciseName { NonSeparator+ }
ExerciseSets { CurrentVariation? ExerciseSet ("," ExerciseSet)* }
WarmupExerciseSets { (WarmupExerciseSet ("," WarmupExerciseSet)*) }
ExerciseSection {  (ExerciseProperty | ExerciseSets | ReuseSectionWithWeekDay) ("\\\\" linebreak)? }
ReuseSectionWithWeekDay { ReuseSection WeekDay? }
ReuseSection { "..." ExerciseName }
ExerciseSet { (Rpe | Timer | SetPart | WeightWithPlus | PercentageWithPlus | SetLabel)+ }
WarmupExerciseSet { (WarmupSetPart | Weight | Percentage)+ }
ExerciseProperty { ExercisePropertyName ":" (FunctionExpression | WarmupExerciseSets | None ) }
ExercisePropertyName { Keyword }
None { @specialize<Keyword, "none"> }
CurrentVariation { "!" }
WeekDay { "[" WeekOrDay (":" WeekOrDay)? "]" }
WeekOrDay { (Int | Current) }
Repeat { "[" (Rep | RepRange) ("," (Rep | RepRange))* "]" }

FunctionExpression { 
  FunctionName
  ("(" FunctionArgument? ("," FunctionArgument)* ")")?
  (Liftoscript | ReuseLiftoscript)?
}
ReuseLiftoscript { "{" ReuseSection "}" }
FunctionName { Keyword }
FunctionArgument { Number | Weight | Percentage | Rpe | RepRange | KeyValue }

PosNumber { Float | Int }
Number { (Plus | "-")? PosNumber }
RepRange { Rep "-" Rep }
Rep { Int }

Rpe { "@" (PosNumber | Plus | PosNumber Plus?) }
PercentageWithPlus { Percentage Plus? }
WeightWithPlus { Weight Plus? }
Timer { Int "s" }
SetPart { Rep Plus? "x" (RepRange | Rep) Plus? }
KeyValue { Keyword Plus? ":" (Number | Weight | Percentage) }
SetLabel { "(" NonSeparator+ ")" }

WarmupSetPart { (Rep "x")? Rep }

@skip { space }

@tokens {
  @precedence { Weight, Keyword }
  @precedence { Weight, Percentage, Float, Int }
  @precedence { Day, Week }
  @precedence { TripleLineComment, LineComment }
  @precedence { "\\\\", "[", "]", NonSeparator }
  TripleLineComment { "///" ![\\n]* linebreakOrEof }
  LineComment { "//" ![\\n]* linebreakOrEof }
  Liftoscript { "{~" ![~]* "~}" }
  Percentage { ("+" | "-")? (Float | Int) "%" }
  Weight { ("+" | "-")? (Float | Int) ("lb" | "kg") }
  Plus { "+" }
  Week { "#" ![\\n]* linebreakOrEof }
  Day { "##" ![\\n]* linebreakOrEof }
  Current { "_" }
  space { $[ \\t]+ }
  SectionSeparator { "/" }
  linebreakOrEof { linebreak | @eof }
  linebreak { "\\n" | "\\r" | "\\r\\n" }
  NonSeparator { ![/{}() \\t\\n\\r#\\[\\]]+ }
  Keyword { $[a-zA-Z_] $[0-9a-zA-Z_]* }
  Int { @digit+ }
  Float { @digit* "." @digit+ }
}`;

export default content;
