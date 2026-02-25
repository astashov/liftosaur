import { h, JSX, Fragment } from "preact";
import { useState } from "preact/hooks";
import { Settings_build } from "../../models/settings";
import { IProgram, ISettings } from "../../types";
import { IAccount } from "../../models/account";
import { ProgramDetailsWorkoutPlayground } from "./programDetails/programDetailsWorkoutPlayground";
import { ProgramDetailsUpsell } from "./programDetails/programDetailsUpsell";
import { ProgramDetailsAddButton } from "./programDetails/programDetailsAddButton";
import {
  IProgramIndexEntry,
  Program_fullProgram,
  Program_evaluate,
  Program_exerciseRangeFormat,
} from "../../models/program";
import { ObjectUtils_clone } from "../../utils/object";
import { Markdown } from "../../components/markdown";
import { IPlannerEvalResult } from "../planner/plannerExerciseEvaluator";
import { IconArrowDown2 } from "../../components/icons/iconArrowDown2";
import { IconArrowRight } from "../../components/icons/iconArrowRight";
import { PlannerWeekStats } from "../planner/components/plannerWeekStats";
import { IconWatch } from "../../components/icons/iconWatch";
import { IconCalendarSmall } from "../../components/icons/iconCalendarSmall";
import { IconKettlebellSmall } from "../../components/icons/iconKettlebellSmall";
import { Equipment_currentEquipment } from "../../models/equipment";
import { equipmentName } from "../../models/exercise";
import { StringUtils_pluralize } from "../../utils/string";
import { Tailwind_colors } from "../../utils/tailwindConfig";

export interface IProgramDetailsContentProps {
  program: IProgram;
  fullDescription?: string;
  faq?: string;
  client: Window["fetch"];
  userAgent?: string;
  accountSettings?: ISettings;
  account?: IAccount;
  indexEntry?: IProgramIndexEntry;
}

export function ProgramDetailsContent(props: IProgramDetailsContentProps): JSX.Element {
  const { program, accountSettings, indexEntry } = props;
  const settings = accountSettings || Settings_build();
  const fullProgram = Program_fullProgram(ObjectUtils_clone(program), settings);
  const evaluatedProgram = Program_evaluate(ObjectUtils_clone(program), settings);
  const descriptionText = props.fullDescription || program.description;

  const firstWeek = evaluatedProgram.weeks[0];
  const maxWidth = 1200;

  const evaluatedDays: IPlannerEvalResult[] =
    firstWeek?.days.map((d) => ({ success: true as const, data: d.exercises })) ?? [];

  const allEquipment = Equipment_currentEquipment(settings);
  const equipment = (indexEntry?.equipment ?? []).map((e) => equipmentName(e, allEquipment));
  const exercisesRange = indexEntry?.exercisesRange;
  const weeksCount = indexEntry?.weeksCount ?? 0;

  const [isSummaryOpen, setIsSummaryOpen] = useState(true);
  const [isWeekStatsOpen, setIsWeekStatsOpen] = useState(true);

  return (
    <section className="px-4">
      <div className="flex flex-col mx-auto lg:flex-row" style={{ gap: "2rem", maxWidth }}>
        <div className="flex-1 min-w-0">
          <nav className="pt-2 pb-2 text-xs text-text-secondary" aria-label="Breadcrumb">
            <a href="/" className="underline hover:text-text-primary">
              Home
            </a>
            <span className="mx-1">/</span>
            <a href="/programs" className="underline hover:text-text-primary">
              Programs
            </a>
            <span className="mx-1">/</span>
            <span className="text-text-primary">{program.name}</span>
          </nav>
          <h1 className="text-2xl font-bold leading-8">{program.name} Workout Program</h1>
          {program.author && (
            <div className="mt-2 mb-4 text-sm font-bold">
              {program.url ? (
                <a href={program.url} target="_blank" className="underline text-text-link">
                  by {program.author}
                </a>
              ) : (
                <span>by {program.author}</span>
              )}
            </div>
          )}
          <Markdown
            className="program-details-description"
            value={descriptionText}
            directivesData={{
              exercise: { settings },
              exerciseExample: { settings, evaluatedProgram },
            }}
          />
          {props.faq && (
            <Markdown
              className="program-details-description mt-8"
              value={`## Frequently Asked Questions\n\n${props.faq}`}
            />
          )}
        </div>
        <div className="flex-shrink-0 w-72">
          <div className="lg:sticky lg:top-4">
            <button
              className="flex items-center w-full gap-1 mb-2 text-xl font-bold text-left cursor-pointer"
              onClick={() => setIsSummaryOpen(!isSummaryOpen)}
            >
              <div className="flex items-center justify-center w-4">
                {isSummaryOpen ? (
                  <IconArrowDown2 className="inline-block" />
                ) : (
                  <IconArrowRight className="inline-block" />
                )}
              </div>
              <div>Summary</div>
            </button>
            {isSummaryOpen && (
              <>
                <div>
                  {indexEntry?.duration && (
                    <div className="flex items-center gap-1 mb-2 text-sm text-text-secondary">
                      <IconWatch width={14} height={18} />
                      <span>~{indexEntry.duration} min per workout</span>
                    </div>
                  )}
                  <div className="flex mb-2 text-sm text-text-secondary">
                    <IconCalendarSmall color={Tailwind_colors().lightgray[600]} className="block mt-0.5 mr-1" />
                    <div>
                      {weeksCount > 1 && `${weeksCount} ${StringUtils_pluralize("week", weeksCount)}, `}
                      {indexEntry?.frequency ? `${indexEntry.frequency}x/week` : ""}
                      {indexEntry?.frequency && exercisesRange ? ", " : ""}
                      {exercisesRange ? Program_exerciseRangeFormat(exercisesRange[0], exercisesRange[1]) : ""}
                    </div>
                  </div>
                  {equipment.length > 0 && (
                    <div className="flex mb-2 text-sm text-text-secondary">
                      <IconKettlebellSmall color={Tailwind_colors().lightgray[600]} className="block mt-0.5 mr-1" />
                      <div>{equipment.join(", ")}</div>
                    </div>
                  )}
                </div>
                <div className="mb-4">
                  <ProgramDetailsAddButton
                    program={program}
                    settings={settings}
                    account={props.account}
                    client={props.client}
                  />
                </div>
              </>
            )}
            <button
              className="flex items-center w-full gap-1 mb-2 text-xl font-bold text-left cursor-pointer"
              onClick={() => setIsWeekStatsOpen(!isWeekStatsOpen)}
            >
              <div className="flex items-center justify-center w-4">
                {isWeekStatsOpen ? (
                  <IconArrowDown2 className="inline-block" />
                ) : (
                  <IconArrowRight className="inline-block" />
                )}
              </div>
              <div>Week Stats</div>
            </button>
            {isWeekStatsOpen && (
              <PlannerWeekStats
                hideTitle={true}
                dispatch={() => {}}
                evaluatedDays={evaluatedDays}
                settings={settings}
              />
            )}
          </div>
        </div>
      </div>
      <div className="w-32 h-px mx-auto my-8 b bg-border-neutral" />
      <ProgramDetailsWorkoutPlayground program={fullProgram} settings={settings} maxWidth={maxWidth} />
      <div className="mt-8">
        <ProgramDetailsUpsell userAgent={props.userAgent} maxWidth={maxWidth} />
      </div>
    </section>
  );
}
