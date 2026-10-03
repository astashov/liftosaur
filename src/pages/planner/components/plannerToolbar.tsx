import { JSX, ReactNode } from "react";
import { IconUndo } from "../../../components/icons/iconUndo";
import { IconReorder } from "../../../components/icons/iconReorder";
import { IconDayTextMode } from "../../../components/icons/iconDayTextMode";
import { IconFullTextMode } from "../../../components/icons/iconFullTextMode";
import { IconSidePanel } from "../../../components/icons/iconSidePanel";
import { IconSpinner } from "../../../components/icons/iconSpinner";
import { IconPreview } from "../../../components/icons/iconPreview";
import { Tailwind_semantic } from "../../../utils/tailwindConfig";
import { IPlannerWebMode } from "../models/plannerMode";

interface IPlannerToolbarProps {
  mode: IPlannerWebMode;
  canReorder: boolean;
  canUndo: boolean;
  canRedo: boolean;
  isPanelOpen: boolean;
  showSave: boolean;
  isSaveDisabled: boolean;
  isSaving: boolean;
  isPreviewDisabled: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onMode: (mode: IPlannerWebMode) => void;
  onPreview: () => void;
  onSave: () => void;
  onTogglePanel: () => void;
}

export function PlannerToolbar(props: IPlannerToolbarProps): JSX.Element {
  return (
    <div className="sticky top-0 z-30 border-b bg-background-default border-border-prominent">
      <div className="flex items-center gap-2 px-2 mx-auto md:px-6 lg:px-24" style={{ minHeight: "3rem" }}>
        <div className="flex items-center">
          <ToolbarIconButton name="planner-undo" label="Undo" disabled={!props.canUndo} onClick={props.onUndo}>
            <IconUndo width={18} height={18} color={undoColor(props.canUndo)} />
          </ToolbarIconButton>
          <ToolbarIconButton name="planner-redo" label="Redo" disabled={!props.canRedo} onClick={props.onRedo}>
            <span style={{ display: "inline-block", transform: "scaleX(-1)" }}>
              <IconUndo width={18} height={18} color={undoColor(props.canRedo)} />
            </span>
          </ToolbarIconButton>
        </div>
        <div className="flex p-0.5 rounded-md bg-background-neutral md:ml-4">
          <ModeButton
            name="planner-mode-grid"
            label="Reorder"
            isSelected={props.mode === "grid"}
            disabled={!props.canReorder}
            title={props.canReorder ? undefined : "Fix errors in all weeks and days to reorder"}
            onClick={() => props.onMode("grid")}
            icon={(color) => <IconReorder size={20} color={color} />}
          />
          <ModeButton
            name="planner-mode-perday"
            label="By Weeks"
            isSelected={props.mode === "perday"}
            onClick={() => props.onMode("perday")}
            icon={(color) => <IconDayTextMode size={20} color={color} />}
          />
          <ModeButton
            name="planner-mode-full"
            label="Full Program"
            isSelected={props.mode === "full"}
            onClick={() => props.onMode("full")}
            icon={(color) => <IconFullTextMode size={20} color={color} />}
          />
        </div>
        <div className="flex-1" />
        <button
          className="flex items-center px-2 py-1 text-sm font-semibold border rounded-md md:px-4 md:text-base text-text-secondary border-border-prominent bg-background-default disabled:opacity-50 nm-planner-preview"
          data-testid="planner-preview"
          aria-label="Preview"
          title="Preview"
          disabled={props.isPreviewDisabled}
          onClick={props.onPreview}
        >
          <span className="md:hidden">
            <IconPreview size={20} />
          </span>
          <span className="hidden md:inline">Preview</span>
        </button>
        {props.showSave && (
          <button
            className="relative px-3 py-1 text-sm font-semibold rounded-md md:px-6 md:text-base text-text-alwayswhite bg-button-primarybackground disabled:opacity-50 nm-web-save-planner"
            data-testid="web-save-planner"
            disabled={props.isSaveDisabled}
            onClick={props.onSave}
          >
            <span className={props.isSaving ? "invisible" : ""}>Save</span>
            {props.isSaving && (
              <span className="absolute inset-0 flex items-center justify-center">
                <IconSpinner color="white" width={18} height={18} />
              </span>
            )}
          </button>
        )}
        <div className="self-stretch pl-2 ml-1 border-l md:hidden border-border-prominent">
          <ToolbarIconButton
            name="planner-toggle-panel"
            label={props.isPanelOpen ? "Close summary and stats" : "Open summary and stats"}
            onClick={props.onTogglePanel}
          >
            <IconSidePanel isOpen={props.isPanelOpen} />
          </ToolbarIconButton>
        </div>
      </div>
    </div>
  );
}

function undoColor(isEnabled: boolean): string {
  return isEnabled ? Tailwind_semantic().icon.neutral : Tailwind_semantic().icon.light;
}

function ToolbarIconButton(props: {
  name: string;
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}): JSX.Element {
  return (
    <button
      className={`flex items-center justify-center h-full p-1.5 nm-${props.name}`}
      data-testid={props.name}
      aria-label={props.label}
      title={props.label}
      disabled={props.disabled}
      onClick={props.onClick}
    >
      {props.children}
    </button>
  );
}

function ModeButton(props: {
  name: string;
  label: string;
  isSelected: boolean;
  disabled?: boolean;
  title?: string;
  onClick: () => void;
  icon: (color: string) => JSX.Element;
}): JSX.Element {
  const color = props.isSelected
    ? Tailwind_semantic().icon.purple
    : props.disabled
      ? Tailwind_semantic().icon.light
      : Tailwind_semantic().icon.neutral;
  const selectedClass = props.isSelected ? "bg-background-default shadow-sm text-text-purple" : "text-text-secondary";
  return (
    <button
      className={`flex items-center gap-2 px-2 py-1 rounded-md text-base font-semibold lg:px-4 disabled:cursor-not-allowed disabled:opacity-60 ${selectedClass} nm-${props.name}`}
      data-testid={props.name}
      aria-label={props.label}
      aria-pressed={props.isSelected}
      title={props.title ?? props.label}
      disabled={props.disabled}
      onClick={props.onClick}
    >
      {props.icon(color)}
      <span className="hidden lg:inline">{props.label}</span>
    </button>
  );
}
