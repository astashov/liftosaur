import { h, JSX } from "preact";
import { builtinProgramProperties } from "../../../models/builtinPrograms";
import { ExerciseImage } from "../../../components/exerciseImage";
import { IconCalendarSmall } from "../../../components/icons/iconCalendarSmall";
import { IconKettlebellSmall } from "../../../components/icons/iconKettlebellSmall";
import { IconWatch } from "../../../components/icons/iconWatch";
import { Markdown } from "../../../components/markdown";
import { Equipment } from "../../../models/equipment";
import { equipmentName } from "../../../models/exercise";
import { ExerciseImageUtils } from "../../../models/exerciseImage";
import { Program } from "../../../models/program";
import { ISettings } from "../../../types";
import { StringUtils } from "../../../utils/string";
import { Tailwind } from "../../../utils/tailwindConfig";
import { IProgramListItem } from "../programsPageContent";

interface IProgramCardProps {
  program: IProgramListItem;
  settings: ISettings;
}

export function ProgramCard(props: IProgramCardProps): JSX.Element {
  const { program, settings } = props;
  const properties = builtinProgramProperties[program.id];
  const exercises = properties?.exercises ?? [];
  const allEquipment = Equipment.currentEquipment(settings);
  const equipment = (properties?.equipment ?? []).map((e) => equipmentName(e, allEquipment));
  const exercisesRange = properties?.exercisesRange;

  return (
    <a
      href={`/programs/${program.id}`}
      className="block overflow-hidden transition-shadow border rounded-lg bg-background-cardyellow border-border-cardyellow hover:shadow-md"
    >
      <div className="p-4">
        <div className="flex items-start">
          <h3 className="flex-1 mr-2 text-base font-bold leading-tight">{program.name}</h3>
          {properties?.duration && (
            <div className="flex-shrink-0 text-sm text-text-secondary whitespace-nowrap">
              <IconWatch className="mb-1 align-middle" width={14} height={18} />
              <span className="pl-1 align-middle">{properties.duration}m</span>
            </div>
          )}
        </div>

        {program.shortDescription && (
          <Markdown value={program.shortDescription} className="mt-1 text-sm text-text-secondary" />
        )}

        <div className="py-3">
          {exercises
            .filter((e) => ExerciseImageUtils.exists(e, "small"))
            .map((e) => (
              <ExerciseImage
                key={`${e.id}-${e.equipment}`}
                settings={settings}
                exerciseType={e}
                size="small"
                className="w-8 mr-1"
              />
            ))}
        </div>

        <div className="flex mb-1 text-text-secondary">
          <IconCalendarSmall color={Tailwind.colors().lightgray[600]} className="block mt-0.5 mr-1" />
          <div className="text-xs">
            {program.weeksCount > 1 && `${program.weeksCount} ${StringUtils.pluralize("week", program.weeksCount)}, `}
            {properties?.frequency ? `${properties.frequency}x/week, ` : ""}
            {exercisesRange ? Program.exerciseRangeFormat(exercisesRange[0], exercisesRange[1]) : ""}
          </div>
        </div>
        {equipment.length > 0 && (
          <div className="flex text-text-secondary">
            <IconKettlebellSmall color={Tailwind.colors().lightgray[600]} className="block mt-0.5 mr-1" />
            <div className="text-xs">{equipment.join(", ")}</div>
          </div>
        )}
      </div>
    </a>
  );
}
