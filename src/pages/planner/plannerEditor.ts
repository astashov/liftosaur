import { autocompletion, completionKeymap } from "@codemirror/autocomplete";
import { defaultKeymap, historyKeymap, history, indentWithTab } from "@codemirror/commands";
import { search, searchKeymap } from "@codemirror/search";
import { HighlightStyle, syntaxHighlighting, syntaxTree } from "@codemirror/language";
import { linter, forceLinting } from "@codemirror/lint";
import { Compartment, EditorState, Extension, RangeSet } from "@codemirror/state";
import {
  drawSelection,
  EditorView,
  gutterLineClass,
  GutterMarker,
  highlightActiveLine,
  highlightActiveLineGutter,
  keymap,
  lineNumbers,
} from "@codemirror/view";
import { highlightSelectionMatches } from "@codemirror/search";
import { tags } from "@lezer/highlight";
import { buildPlannerExerciseLanguageSupport } from "./plannerExerciseCodemirror";
import { equipmentName, Exercise } from "../../models/exercise";
import { ExerciseImageUtils } from "../../models/exerciseImage";
import { StringUtils } from "../../utils/string";
import { IAllCustomExercises } from "../../types";
import { PlannerSyntaxError } from "./plannerExerciseEvaluator";
import { ObjectUtils } from "../../utils/object";

const highlightStyle = HighlightStyle.define([
  { tag: tags.keyword, color: "#708" },
  { tag: [tags.literal, tags.inserted], color: "#164" },
  { tag: tags.variableName, color: "#28839f" },
  { tag: tags.comment, color: "#8B9BAB" },
  { tag: tags.blockComment, color: "#5a8e7b" },
  { tag: tags.atom, color: "#940" },
  { tag: tags.propertyName, color: "#8B9BAB" },
  { tag: tags.attributeName, color: "#940" },
  { tag: tags.attributeValue, color: "#28839F" },
  { tag: tags.annotation, color: "#6f6e24" },
  { tag: tags.docComment, color: "#12957e" },
]);

interface IEditorCompartments {
  errorGutterCompartment: Compartment;
}

class ErrorGutterMarker extends GutterMarker {
  constructor() {
    super();
    this.elementClass = "cm-errorLineGutter";
  }
}

function buildInfoLine(label: string, data: string): HTMLElement {
  const infoContainer = document.createElement("div");
  infoContainer.classList.add("exercise-completion-description-info");

  const labelNode = document.createElement("span");
  labelNode.classList.add("exercise-completion-description-info-label");
  labelNode.textContent = label;

  const dataNode = document.createElement("span");
  dataNode.classList.add("exercise-completion-description-info-data");
  dataNode.textContent = data;

  infoContainer.appendChild(labelNode);
  infoContainer.appendChild(dataNode);

  return infoContainer;
}

function getEditorSetup(plannerEditor: PlannerEditor): [Extension[], IEditorCompartments] {
  const errorGutterCompartment = new Compartment();

  return [
    [
      drawSelection(),
      autocompletion({
        closeOnBlur: false,
        addToOptions: [
          {
            render: (completion) => {
              if (completion.type === "keyword") {
                const exercise = Exercise.findByNameAndEquipment(
                  completion.label,
                  plannerEditor.args.customExercises || {}
                );
                const url =
                  exercise && ExerciseImageUtils.exists(exercise, "small")
                    ? ExerciseImageUtils.url(exercise, "small")
                    : undefined;
                if (url != null) {
                  const element = document.createElement("img");
                  element.src = url;
                  element.classList.add("exercise-image");
                  return element;
                } else {
                  const div = document.createElement("div");
                  div.classList.add("exercise-default-image");

                  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
                  svg.setAttribute("width", "32");
                  svg.setAttribute("height", "32");
                  svg.setAttribute("viewBox", "0 0 64 64");
                  svg.setAttribute("fill", "none");

                  const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
                  rect.setAttribute("width", "64");
                  rect.setAttribute("height", "64");
                  rect.setAttribute("rx", "16");
                  rect.setAttribute("fill", "#D9D9D9");

                  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
                  path.setAttribute("fill-rule", "evenodd");
                  path.setAttribute("clip-rule", "evenodd");
                  path.setAttribute("fill", "#BCBCBC");
                  path.setAttribute(
                    "d",
                    "M25.5716 14.9039C24.7645 15.1393 23.9687 15.4203 23.1866 15.7469L23.1757 15.7515C22.5413 16.0162 22.1752 16.6773 22.2922 17.3471L23.4988 24.2642C23.589 24.7813 23.3914 25.3056 22.9838 25.6432C19.9371 28.1663 18 31.952 18 36.1839C18 44.6348 25.725 51.3062 34.5875 49.6987C40.2007 48.6802 44.6108 44.3261 45.6397 38.7873C46.6168 33.5285 44.5595 28.6763 40.9008 25.6451C40.4923 25.3066 40.2931 24.7825 40.3834 24.264L41.5883 17.3588C41.7061 16.6822 41.3366 16.0141 40.6953 15.7469C39.9132 15.4203 39.1174 15.1393 38.3106 14.9039C36.2521 14.3032 34.1188 14 31.941 14C29.7637 14 27.6301 14.3032 25.5716 14.9039ZM26.4243 19.7917C26.2912 19.0293 26.7795 18.2932 27.5418 18.1127C28.9733 17.7739 30.4446 17.6032 31.941 17.6032C33.4378 17.6032 34.9088 17.7739 36.3404 18.1127C37.1026 18.2932 37.591 19.0293 37.4576 19.7917L36.8452 23.3044C35.3197 22.7381 33.6668 22.4286 31.941 22.4286C30.2152 22.4286 28.5624 22.7381 27.037 23.3044L26.4243 19.7917Z"
                  );

                  div.appendChild(svg);
                  svg.appendChild(rect);
                  svg.appendChild(path);

                  return div;
                }
              } else {
                const div = document.createElement("div");
                return div;
              }
            },
            position: 10,
          },
          {
            render: (completion) => {
              if (completion.type === "keyword") {
                const customExercises = plannerEditor.args.customExercises || {};
                const exercise = Exercise.findByNameAndEquipment(completion.label, customExercises);
                if (exercise == null) {
                  return document.createElement("span");
                }
                const container = document.createElement("div");
                container.classList.add("exercise-completion");

                const title = document.createElement("div");
                title.classList.add("exercise-completion-title");
                title.textContent = `${exercise.name}${
                  exercise.equipment ? `, ${equipmentName(exercise.equipment)}` : ""
                }`;

                const description = document.createElement("div");
                description.classList.add("exercise-completion-description");

                const targetMuscles = Exercise.targetMuscles(exercise, customExercises);
                const targetMusclesNode = buildInfoLine("Target Muscles: ", targetMuscles.join(", "));

                const synergistMuscles = Exercise.synergistMuscles(exercise, customExercises);
                const synergistMusclesNode = buildInfoLine("Synergist Muscles: ", synergistMuscles.join(", "));

                const targetMuscleGroups = Exercise.targetMusclesGroups(exercise, customExercises).map((w) =>
                  StringUtils.capitalize(w)
                );
                const targetMuscleGroupsNode = buildInfoLine("Target Muscle Groups: ", targetMuscleGroups.join(", "));
                targetMuscleGroupsNode.style.marginTop = "0.25rem";

                const synergistMuscleGroupsNode = buildInfoLine(
                  "Synergist Muscle Groups: ",
                  Exercise.synergistMusclesGroups(exercise, customExercises)
                    .map((w) => StringUtils.capitalize(w))
                    .filter((w) => targetMuscleGroups.indexOf(w) === -1)
                    .join(", ")
                );

                const types = buildInfoLine("Types: ", exercise.types.map((w) => StringUtils.capitalize(w)).join(", "));
                types.style.marginTop = "0.25rem";

                container.appendChild(title);
                container.appendChild(description);
                description.appendChild(targetMusclesNode);
                description.appendChild(synergistMusclesNode);
                description.appendChild(targetMuscleGroupsNode);
                description.appendChild(synergistMuscleGroupsNode);
                description.appendChild(types);

                return container;
              } else if (completion.type === "property") {
                const container = document.createElement("div");
                container.classList.add("property-completion");
                const title = document.createElement("div");
                title.classList.add("property-completion-title");
                title.textContent = completion.label.replace(": ", "");

                const description = document.createElement("div");
                description.classList.add("property-completion-description");
                if (completion.label === "progress: ") {
                  description.textContent =
                    "Specifies progressive overload for the exercise. You can specify linear progression, double progression, etc.";
                }

                container.appendChild(title);
                container.appendChild(description);
                return container;
              } else if (completion.type === "method") {
                const container = document.createElement("div");
                container.classList.add("equipment-completion");
                const title = document.createElement("div");
                title.classList.add("equipment-completion-title");
                title.textContent = completion.label;
                container.appendChild(title);
                return container;
              } else if (completion.type === "function") {
                const container = document.createElement("div");
                container.classList.add("function-completion");
                const title = document.createElement("div");
                title.classList.add("function-completion-title");
                title.textContent = completion.label.replace(": ", "");

                const description = document.createElement("div");
                description.classList.add("function-completion-description");
                if (completion.label === "lp") {
                  description.innerHTML =
                    "<p><strong>Linear Progression</strong>. You can set up increments, decrements and successful/unsuccessful attempts before incrementing or decrementing.</p>" +
                    "<p>For example:</p>" +
                    "<ul>" +
                    "<li><strong><code>lp(5lb)</code></strong> - increment by 5lb if you hit all the required reps</li>" +
                    "<li><strong><code>lp(5lb, 3)</code></strong> - increment by 5lb if you hit all the required reps 3 times</li>" +
                    "<li><strong><code>lp(5lb, 3, 1)</code></strong> - increment by 5lb if you hit all the required reps 3 times, and start with 1 success</li>" +
                    "<li><strong><code>lp(5lb, 3, 0, 10%, 1)</code></strong> - increment by 5lb after 3 times, and decrement by 10% of 1RM if you didn't hit all the required reps.</li>" +
                    "<li><strong><code>lp(5lb, 2, 0, 15lb, 4, 0)</code></strong> - increment by 5lb after 2 times, and decrement by 15lb after 4 times</li>" +
                    "</ul>" +
                    "<p>You can use lb or kg units, and also percentages (%)</p>";
                } else if (completion.label === "sum") {
                  description.innerHTML =
                    "<p><strong>Reps Sum Progression</strong>. Increases weight when hit a total sum or reps from all sets</p>" +
                    "<p>For example:</p>" +
                    "<ul>" +
                    "<li><strong><code>sum(30, 5lb)</code></strong> - increment by 5lb if hit 30 or more reps across all sets</li>" +
                    "<li><strong><code>sum(40, 10%)</code></strong> - increment by 10% if hit 40 or more reps across all sets</li>" +
                    "</ul>" +
                    "<p>You can use lb or kg units, and also percentages (%)</p>";
                } else if (completion.label === "dp") {
                  description.innerHTML =
                    "<p><strong>Double Progression</strong>. Increases reps within a range, and after that resets the reps and increase weight.</p>" +
                    "<p>For example:</p>" +
                    "<ul>" +
                    "<li><strong><code>dp(5lb, 8, 12)</code></strong> - It'll keep adding reps if you hit all required reps, until it adds 4 max (from 8 to 12), then it resets to the initial reps and adds 5lb</li>." +
                    "</ul>" +
                    "<p>You can use lb or kg units, and also percentages (%)</p>";
                }
                container.appendChild(title);
                container.appendChild(description);
                return container;
              } else {
                return document.createElement("span");
              }
            },
            position: 60,
          },
        ],
      }),
      ...(plannerEditor.args.lineNumbers
        ? [lineNumbers(), highlightActiveLine(), highlightActiveLineGutter(), errorGutterCompartment.of([]), history()]
        : []),
      syntaxHighlighting(highlightStyle),
      highlightSelectionMatches(),
      linter(
        (view) => {
          const { state } = view;
          const tree = syntaxTree(state);
          if (tree.length === state.doc.length) {
            let from: number | undefined = undefined;
            let to: number | undefined = undefined;
            tree.iterate({
              enter: (n) => {
                if (from == null && n.type.isError) {
                  from = n.from;
                  to = n.to;
                  return false;
                }
                return;
              },
            });

            if (from != null && to != null && state.doc.length >= to) {
              return [{ from: from, to: to, severity: "error", message: "Syntax Error" }];
            }
          }

          const error = plannerEditor.args.error;
          if (error != null && state.doc.length >= error.to) {
            return [{ from: error.from, to: error.to, severity: "error", message: error.message }];
          }

          return [];
        },
        {
          needsRefresh: (update) => {
            if (plannerEditor.requireLint) {
              plannerEditor.requireLint = false;
              return true;
            }
            return false;
          },
        }
      ),
      search({
        top: true,
      }),
      EditorState.allowMultipleSelections.of(true),
      keymap.of([...defaultKeymap, ...historyKeymap, ...completionKeymap, ...searchKeymap, indentWithTab]),
    ],
    { errorGutterCompartment },
  ];
}

interface IArgs {
  onChange?: (newValue: string) => void;
  onLineChange?: (newValue: number) => void;
  onBlur?: (event: FocusEvent, newValue: string) => void;
  value?: string;
  customExercises?: IAllCustomExercises;
  exerciseFullNames?: string[];
  height?: number;
  error?: PlannerSyntaxError;
  lineNumbers?: boolean;
}

export class PlannerEditor {
  public readonly args: IArgs;
  private codeMirror?: EditorView;
  private compartments?: IEditorCompartments;
  public requireLint: boolean = false;

  constructor(args: IArgs = {}) {
    this.args = args;
  }

  public setValue(value: string): void {
    if (this.codeMirror) {
      this.codeMirror.update([
        this.codeMirror.state.update({ changes: { from: 0, to: this.codeMirror.state.doc.length, insert: value } }),
      ]);
    }
  }

  public setCustomExercises(customExercises: IAllCustomExercises): void {
    this.args.customExercises = customExercises;
    this.relint();
  }

  public setExerciseFullNames(names: string[]): void {
    const changed = !ObjectUtils.isEqual({ arr: names }, { arr: this.args.exerciseFullNames });
    if (changed) {
      this.args.exerciseFullNames = names;
      this.relint();
    }
  }

  public setError(error?: PlannerSyntaxError): void {
    this.args.error = error;
    this.relint();
  }

  private relint(): void {
    if (this.codeMirror && this.compartments) {
      const errorGutterCompartment = this.compartments.errorGutterCompartment;
      this.requireLint = true;
      forceLinting(this.codeMirror);
      const from = this.args.error?.from;
      try {
        const line = from != null ? this.codeMirror.state.doc.lineAt(from).from : undefined;
        const rangeSet = RangeSet.of(line != null ? [new ErrorGutterMarker().range(line)] : []);
        this.codeMirror.dispatch({
          effects: errorGutterCompartment.reconfigure(gutterLineClass.of(rangeSet)),
        });
      } catch (e) {
        console.error(e);
      }
    }
  }

  public attach(container: HTMLElement): void {
    const updateFacet = EditorView.updateListener.of((update) => {
      const state = update.state;
      const line = state.doc.lineAt(state.selection.main.head);
      if (update.view.hasFocus && this.args.onLineChange) {
        this.args.onLineChange(line.number);
      }
      if (update.docChanged && this.args.onChange) {
        this.args.onChange(update.state.doc.toString());
      }
    });

    const language = buildPlannerExerciseLanguageSupport(this);

    const eventHandlers = EditorView.domEventHandlers({
      blur: (e, view) => {
        if (this.args.onBlur) {
          this.args.onBlur(e, view.state.doc.toString());
        }
      },
    });

    const [extensions, compartments] = getEditorSetup(this);
    this.compartments = compartments;
    const editorState = EditorState.create({
      doc: this.args.value || "",
      extensions: [keymap.of(defaultKeymap), extensions, updateFacet, language, eventHandlers],
    });

    const codemirror = new EditorView({
      state: editorState,
      parent: container,
    });
    this.codeMirror = codemirror;
  }
}

export function attachCodemirror(container: HTMLElement): void {}
