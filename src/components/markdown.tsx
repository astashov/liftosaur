import { h, JSX, render } from "preact";
import MarkdownIt from "markdown-it";
import { useEffect, useRef, useState } from "preact/hooks";
import { LinkButton } from "./linkButton";
import { IEvaluatedProgram } from "../models/program";
import { ISettings } from "../types";
import { Exercise_findByNameAndEquipment } from "../models/exercise";
import { ProgramDetailsExerciseExample } from "../pages/programs/programDetails/programDetailsExerciseExample";
import { ExerciseTooltip } from "./exerciseTooltip";

const md = new MarkdownIt({ html: true, linkify: true });

function preprocessDirectives(text: string, directivesData?: IMarkdownDirectivesData): string {
  let result = text;
  if (directivesData?.exercise) {
    result = result.replace(/\[\{([^}]+)\}\]/g, (_match, name: string) => {
      return `<strong class="md-exercise-directive md" data-name="${name.trim()}">${name.trim()}</strong>`;
    });
  }
  if (directivesData?.exerciseExample) {
    result = result.replace(/^:::exercise-example\{([^}]*)\}[ \t]*$/gm, (_match, attrsStr: string) => {
      const attrs: Record<string, string> = {};
      for (const m of attrsStr.matchAll(/(\w+)="([^"]*)"/g)) {
        attrs[m[1]] = m[2];
      }
      return `<div class="md-exercise-example mb-4" data-exercise="${attrs.exercise || ""}" data-equipment="${attrs.equipment || ""}" data-key="${attrs.key || ""}" data-weeks="${attrs.weeks || ""}" data-week-labels="${attrs.weekLabels || ""}"></div>`;
    });
  }
  return result;
}

export interface IMarkdownDirectivesData {
  exercise?: { settings: ISettings };
  exerciseExample?: { settings: ISettings; evaluatedProgram: IEvaluatedProgram };
}

interface IProps {
  value: string;
  className?: string;
  truncate?: number;
  directivesData?: IMarkdownDirectivesData;
}

export function Markdown(props: IProps): JSX.Element {
  const [shouldTruncate, setShouldTruncate] = useState(props.truncate != null);
  const [isTruncated, setIsTruncated] = useState(props.truncate != null);
  const stringValue = typeof props.value === "string" ? props.value : String(props.value ?? "");
  const value = preprocessDirectives(stringValue, props.directivesData);
  const result = md.render(value);
  let className = props.className || "markdown";
  if (isTruncated && props.className?.indexOf("line-clamp") === -1) {
    className += ` line-clamp-${props.truncate}`;
  }

  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const container = containerRef.current;
    if (isTruncated) {
      setShouldTruncate(container.scrollHeight > container.clientHeight);
    }
    if (container) {
      for (const element of Array.from(container.querySelectorAll("a"))) {
        element.setAttribute("target", "_blank");
      }
      setTimeout(() => {
        if (props.directivesData?.exercise) {
          hydrateExerciseDirectives(container, props.directivesData.exercise.settings);
        }
        if (props.directivesData?.exerciseExample) {
          hydrateExerciseExampleDirectives(
            container,
            props.directivesData.exerciseExample.settings,
            props.directivesData.exerciseExample.evaluatedProgram
          );
        }
      }, 0);
    }
  });

  return (
    <div>
      <div ref={containerRef} className={className} dangerouslySetInnerHTML={{ __html: result }} />
      {shouldTruncate && props.truncate != null && (
        <div className="leading-none" style={{ marginTop: "-0.125rem" }}>
          <LinkButton
            name="truncate-markdown"
            className="text-xs font-normal"
            onClick={() => setIsTruncated(!isTruncated)}
          >
            {isTruncated ? "Show more" : "Show less"}
          </LinkButton>
        </div>
      )}
    </div>
  );
}

function hydrateExerciseDirectives(container: HTMLElement, settings: ISettings): void {
  for (const el of Array.from(container.querySelectorAll(".md-exercise-directive"))) {
    if (el.getAttribute("data-hydrated")) {
      continue;
    }
    el.setAttribute("data-hydrated", "true");
    const name = el.getAttribute("data-name") || "";
    const exercise = Exercise_findByNameAndEquipment(name, settings.exercises);
    if (!exercise) {
      continue;
    }
    const exerciseType = { id: exercise.id, equipment: exercise.equipment };
    el.textContent = "";
    render(<ExerciseTooltip exerciseType={exerciseType} settings={settings} name={name} />, el);
  }
}

function hydrateExerciseExampleDirectives(
  container: HTMLElement,
  settings: ISettings,
  evaluatedProgram: IEvaluatedProgram
): void {
  for (const el of Array.from(container.querySelectorAll(".md-exercise-example"))) {
    if (el.getAttribute("data-hydrated")) {
      continue;
    }
    el.setAttribute("data-hydrated", "true");
    const exercise = el.getAttribute("data-exercise") || "";
    const equipment = el.getAttribute("data-equipment") || "";
    const key = el.getAttribute("data-key") || "";
    const weeksStr = el.getAttribute("data-weeks") || "";
    const weekLabelsStr = el.getAttribute("data-week-labels") || "";

    const exerciseType = { id: exercise, equipment };
    const weekLabels = weekLabelsStr ? weekLabelsStr.split(",") : [];

    let weekSetup: { name: string }[] | undefined;
    if (weeksStr) {
      const [start, end] = weeksStr.split("-").map(Number);
      weekSetup = evaluatedProgram.weeks.slice(start - 1, end).map((w, i) => ({
        name: weekLabels[i] ? `${w.name} (${weekLabels[i]})` : w.name,
      }));
    } else if (weekLabels.length > 0) {
      weekSetup = evaluatedProgram.weeks.map((w, i) => ({
        name: weekLabels[i] ? `${w.name} (${weekLabels[i]})` : w.name,
      }));
    }

    render(
      <ProgramDetailsExerciseExample
        program={evaluatedProgram}
        settings={settings}
        programExerciseKey={key}
        exerciseType={exerciseType}
        weekSetup={weekSetup}
      />,
      el as HTMLElement
    );
  }
}
