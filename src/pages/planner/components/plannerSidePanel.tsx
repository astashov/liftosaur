import { JSX, ReactNode, useState } from "react";
import { ISettings } from "../../../types";
import { ILensDispatch } from "../../../utils/useLensReducer";
import { IPlannerSidePanelTab, IPlannerState } from "../models/types";
import { IPlannerEvalResult } from "../plannerExerciseEvaluator";
import { IPlannerSidePanelStats, PlannerSidePanelStats_emptyMessage } from "../models/plannerSidePanelStats";
import { PlannerStatsUtils_formatDuration, PlannerStatsUtils_programSummary } from "../models/plannerStatsUtils";
import { PlannerWeekStats } from "./plannerWeekStats";
import { PlannerDayStats } from "./plannerDayStats";
import { PlannerExerciseStats } from "./plannerExerciseStats";
import { ProgramQrCode } from "../../../components/programQrCode";
import { IconTimerSmall } from "../../../components/icons/iconTimerSmall";
import { IconLink } from "../../../components/icons/iconLink";
import { IconPicture } from "../../../components/icons/iconPicture";
import { IconDocStacked } from "../../../components/icons/iconDocStacked";
import { IconSidePanel } from "../../../components/icons/iconSidePanel";
import { IconArrowRight } from "../../../components/icons/iconArrowRight";
import { IconArrowDown2 } from "../../../components/icons/iconArrowDown2";
import { IconEdit2 } from "../../../components/icons/iconEdit2";
import { IconCloseCircleOutline } from "../../../components/icons/iconCloseCircleOutline";
import { Tailwind_semantic } from "../../../utils/tailwindConfig";
import { StringUtils_pluralize } from "../../../utils/string";
import { IGridSelectionSummary } from "../../../components/editProgram/editProgramGrid/gridSelectionSummary";

interface IPlannerSidePanelProps {
  evaluatedWeeks: IPlannerEvalResult[][];
  settings: ISettings;
  tab: IPlannerSidePanelTab;
  stats: IPlannerSidePanelStats;
  isReorder: boolean;
  selection?: IGridSelectionSummary;
  copiedUrl?: string;
  isAffiliateLink: boolean;
  isExportDisabled: boolean;
  dispatch: ILensDispatch<IPlannerState>;
  onTab: (tab: IPlannerSidePanelTab) => void;
  onCopyLink: () => Promise<void>;
  onExportImage: () => void;
  onVersions?: () => void;
  onEditSettings: () => void;
  onClearSelection: () => void;
  onClose: () => void;
}

const tabs: { tab: IPlannerSidePanelTab; label: string }[] = [
  { tab: "week", label: "Weekly" },
  { tab: "day", label: "Daily" },
  { tab: "exercise", label: "Exercise" },
];

export function PlannerSidePanel(props: IPlannerSidePanelProps): JSX.Element {
  const summary = PlannerStatsUtils_programSummary(props.evaluatedWeeks, props.settings);
  const [isCopying, setIsCopying] = useState(false);
  const [collapsed, setCollapsed] = useState({ summary: false, stats: false });
  const linkColor = Tailwind_semantic().text.link;

  return (
    <div className="px-4 py-4 leading-snug md:px-5" data-testid="planner-side-panel">
      {props.selection && <PlannerSelectionCard selection={props.selection} onClear={props.onClearSelection} />}
      <PanelSection
        name="summary"
        title="Summary"
        titleClassName="text-lg font-bold"
        isCollapsed={collapsed.summary}
        onToggle={() => setCollapsed((c) => ({ ...c, summary: !c.summary }))}
        leading={
          <button
            className="md:hidden nm-planner-close-panel"
            data-testid="planner-close-panel"
            aria-label="Close summary and stats"
            onClick={props.onClose}
          >
            <IconSidePanel isOpen={true} />
          </button>
        }
      >
        <div className="mt-2 text-sm text-text-secondary">
          <div>
            {summary.daysPerWeek} {StringUtils_pluralize("day", summary.daysPerWeek)} per week,{" "}
            {summary.exercisesPerDay} {StringUtils_pluralize("exercise", summary.exercisesPerDay)} per day
          </div>
          <div className="flex items-center gap-1">
            <IconTimerSmall />
            <span>{PlannerStatsUtils_formatDuration(summary.approxTimeMs)}</span>
          </div>
        </div>
        <div className="flex flex-col items-start gap-2 mt-3">
          <PanelLink
            name="planner-copy-link"
            disabled={isCopying}
            onClick={async () => {
              setIsCopying(true);
              try {
                await props.onCopyLink();
              } finally {
                setIsCopying(false);
              }
            }}
            icon={<IconLink size={18} color={linkColor} />}
          >
            Copy program link
          </PanelLink>
          {props.copiedUrl && (
            <div className="text-xs text-text-secondary">
              <div>Copied to clipboard{props.isAffiliateLink ? " as an affiliate link" : ""}:</div>
              <a target="_blank" className="font-bold underline break-all text-text-link" href={props.copiedUrl}>
                {props.copiedUrl}
              </a>
              <div className="mt-2">
                <ProgramQrCode url={props.copiedUrl} title="Scan this QR to open that link:" />
              </div>
            </div>
          )}
          <PanelLink
            name="planner-export-image"
            disabled={props.isExportDisabled}
            onClick={props.onExportImage}
            icon={<IconPicture size={18} color={linkColor} />}
          >
            Export program to image
          </PanelLink>
          {props.onVersions && (
            <PanelLink
              name="show-revisions"
              onClick={props.onVersions}
              icon={<IconDocStacked width={18} height={18} color={linkColor} />}
            >
              Versions
            </PanelLink>
          )}
        </div>
      </PanelSection>

      <PanelSection
        name="stats"
        title="Stats"
        titleClassName="text-lg font-bold"
        className="mt-5"
        isCollapsed={collapsed.stats}
        onToggle={() => setCollapsed((c) => ({ ...c, stats: !c.stats }))}
      >
        <div className="flex p-0.5 mt-2 rounded-md bg-background-neutral">
          {tabs.map(({ tab, label }) => {
            const isSelected = props.tab === tab;
            return (
              <button
                key={tab}
                className={`flex-1 py-1 text-sm font-semibold rounded-md nm-planner-stats-tab-${tab} ${
                  isSelected ? "bg-background-default shadow-sm text-text-purple" : "text-text-secondary"
                }`}
                data-testid={`planner-stats-tab-${tab}`}
                aria-pressed={isSelected}
                onClick={() => props.onTab(tab)}
              >
                {label}
              </button>
            );
          })}
        </div>
        <div className="mt-3">
          <PanelStats {...props} />
        </div>
      </PanelSection>
    </div>
  );
}

function PanelSection(props: {
  name: string;
  title: string;
  titleClassName: string;
  className?: string;
  isCollapsed: boolean;
  onToggle: () => void;
  leading?: ReactNode;
  children: ReactNode;
}): JSX.Element {
  return (
    <section className={props.className}>
      <div className="flex items-center gap-3">
        {props.leading}
        <button
          className={`flex items-center gap-2 nm-planner-toggle-${props.name}`}
          data-testid={`planner-toggle-${props.name}`}
          aria-expanded={!props.isCollapsed}
          onClick={props.onToggle}
        >
          <span className="flex items-center justify-center w-4">
            {props.isCollapsed ? (
              <IconArrowRight width={8} height={11} color={Tailwind_semantic().icon.neutral} />
            ) : (
              <IconArrowDown2 width={11} height={8} color={Tailwind_semantic().icon.neutral} />
            )}
          </span>
          <h2 className={props.titleClassName}>{props.title}</h2>
        </button>
      </div>
      {!props.isCollapsed && props.children}
    </section>
  );
}

function PanelStats(props: IPlannerSidePanelProps): JSX.Element {
  const { stats } = props;
  switch (stats.kind) {
    case "week":
      return (
        <PlannerWeekStats
          hideTitle={true}
          evaluatedDays={stats.evaluatedDays}
          settings={props.settings}
          onEditSettings={props.onEditSettings}
          editSettingsLabel="Program Muscle Settings"
        />
      );
    case "day":
      return (
        <PlannerDayStats
          hideTitle={true}
          settings={props.settings}
          evaluatedDay={stats.evaluatedDay}
        />
      );
    case "exercise":
      return (
        <PlannerExerciseStats
          settings={props.settings}
          evaluatedWeeks={props.evaluatedWeeks}
          dispatch={props.dispatch}
          weekIndex={stats.weekIndex}
          dayIndex={stats.dayIndex}
          exerciseLine={stats.exerciseLine}
        />
      );
    case "empty":
      return (
        <div className="text-sm text-text-secondary" data-testid="planner-stats-empty">
          {PlannerSidePanelStats_emptyMessage(stats.reason, props.tab, props.isReorder)}
        </div>
      );
  }
}

function PanelLink(props: {
  name: string;
  disabled?: boolean;
  onClick: () => void;
  icon: JSX.Element;
  children: ReactNode;
}): JSX.Element {
  return (
    <button
      className={`flex items-center gap-2 text-sm font-semibold text-text-link disabled:opacity-50 nm-${props.name}`}
      data-testid={props.name}
      disabled={props.disabled}
      onClick={props.onClick}
    >
      {props.icon}
      {props.children}
    </button>
  );
}

function PlannerSelectionCard(props: { selection: IGridSelectionSummary; onClear: () => void }): JSX.Element {
  const { selection } = props;
  return (
    <div
      className="hidden p-3 mb-4 text-sm border md:block rounded-xl border-border-cardpurple bg-background-subtlecardpurple"
      data-testid="planner-selection-card"
    >
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold uppercase text-text-secondary">Selected</div>
          <div className="font-bold break-words">{selection.label}</div>
          {selection.badges.length > 0 && (
            <div className="text-xs text-text-secondary">{selection.badges.join(" · ")}</div>
          )}
          {selection.description && (
            <div className="mt-1 text-sm whitespace-pre-wrap text-text-secondary">{selection.description}</div>
          )}
          {selection.detail && <div className="mt-1 text-xs text-text-secondary">{selection.detail}</div>}
        </div>
        <button className="p-1 nm-planner-selection-clear" aria-label="Clear selection" onClick={props.onClear}>
          <IconCloseCircleOutline size={20} />
        </button>
      </div>
      <div className="flex flex-col items-start gap-1 mt-2">
        {selection.edit && (
          <button
            className="flex items-center gap-2 font-semibold text-text-link disabled:opacity-40 nm-planner-selection-edit"
            data-testid="planner-selection-edit"
            disabled={selection.edit.disabled}
            onClick={selection.edit.onPress}
          >
            <IconEdit2 size={18} color={Tailwind_semantic().text.link} />
            {selection.edit.label}
          </button>
        )}
        {selection.actions.map((action) => (
          <button
            key={action.label}
            className={`font-semibold ${action.isDestructive ? "text-text-error" : "text-text-link"}`}
            data-testid={`planner-selection-${action.label}`}
            onClick={action.onPress}
          >
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
}
