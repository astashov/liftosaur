import type { ILiftoEditorLevel } from "../components/primitives/liftoEditorBrain";
import type { ILiftoEditorHint } from "../components/primitives/liftoEditorHints";

export const LiftographHints_helpId = "liftograph-editor-hints";

const HINTS: Partial<Record<string, ILiftoEditorHint>> = {
  top: { short: "Add a widget", detail: "Pick a graph, a value, a row or a line of text." },
  row: { short: "Widgets side by side", detail: "A row puts up to 4 widgets next to each other." },
  "widget:graph": {
    short: "A chart with one or more series",
    detail: "Each line inside the braces is one series. 'range' sets how far back the chart goes.",
  },
  "widget:value": {
    short: "One number with its change",
    detail: "Shows the latest value of a series. 'compare' adds the change over a period, 'trend' a small chart.",
  },
  "widget:muscles": { short: "Sets per muscle", detail: "A body map and a list of sets per muscle for 'range'." },
  "widget:calendar": { short: "Workout days", detail: "A calendar with the days you trained over 'range'." },
  series: { short: "One line on the chart", detail: "'name' labels it, 'source' says where the data comes from." },
  "field:name": { short: "The series label", detail: "Shown in the legend and the tooltip." },
  "field:source": {
    short: "Where the data comes from",
    detail: "exercise(...) for one lift, workout for whole workouts, stats(...) for body measurements.",
  },
  "field:y": { short: "What to draw", detail: "A ready-made value such as e1rm or volume. A script can replace it." },
  "field:group": {
    short: "Joins points into buckets",
    detail: "sum(1w) adds up each week. max, min, avg, last and count work the same way.",
  },
  "field:smooth": {
    short: "A moving average",
    detail: "avg(4w) averages over 4 weeks. A plain number, like avg(5), averages over points.",
  },
  "field:mark": { short: "How points look", detail: "line, dots or bars." },
  "field:axis": { short: "Which y-axis", detail: "right puts this series on a second axis with its own scale." },
  "field:color": { short: "Series color", detail: "One of the palette names." },
  "field:range": { short: "How far back", detail: "7d, 4w, 3m, 1y, or all." },
  "field:compare": { short: "Change over a period", detail: "Shows the value now minus the value back then." },
  "field:trend": { short: "Small trend chart", detail: "Draws the value over this period under the number." },
  "field:show": { short: "What to show", detail: "map, sets, or both." },
  "argument:exercise": {
    short: "Exercise and filters",
    detail: "The name, then equipment. label, program and day narrow which sets count.",
  },
  "argument:workout": { short: "Workout filters", detail: "program and day narrow which workouts count." },
  "argument:stats": { short: "Body measurement", detail: "weight, bodyfat, or a body part length." },
  caption: { short: "Text above a widget", detail: "Markdown. Double-tap to edit it." },
  script: { short: "A Liftoscript script", detail: "Calls point(...) for each value to draw. Double-tap to edit it." },
};

export function LiftographHints_forLevel(level: ILiftoEditorLevel | undefined): ILiftoEditorHint | undefined {
  return level != null ? HINTS[level.nodeName] : undefined;
}
