import { h, JSX } from "preact";
import { ExerciseImage } from "../../../components/exerciseImage";
import { IconCalendarSmall } from "../../../components/icons/iconCalendarSmall";
import { IconKettlebellSmall } from "../../../components/icons/iconKettlebellSmall";
import { IconWatch } from "../../../components/icons/iconWatch";
import { Markdown } from "../../../components/markdown";
import { Equipment_currentEquipment } from "../../../models/equipment";
import { equipmentName, Exercise_toKey } from "../../../models/exercise";
import { ExerciseImageUtils_exists } from "../../../models/exerciseImage";
import { IProgramIndexEntry, Program_exerciseRangeFormat } from "../../../models/program";
import { ISettings } from "../../../types";
import { StringUtils_pluralize } from "../../../utils/string";
import { Tailwind_colors } from "../../../utils/tailwindConfig";

interface IProgramCardProps {
  program: IProgramIndexEntry;
  settings: ISettings;
}

export function ProgramCard(props: IProgramCardProps): JSX.Element {
  const { program, settings } = props;
  const exercises = program.exercises ?? [];
  const allEquipment = Equipment_currentEquipment(settings);
  const equipment = (program.equipment ?? []).map((e) => equipmentName(e, allEquipment));
  const exercisesRange = program.exercisesRange;

  return (
    <a
      href={`/programs/${program.id}`}
      className="block overflow-hidden transition-shadow border rounded-lg bg-background-cardyellow border-border-cardyellow hover:shadow-md"
    >
      <div className="p-4">
        <div className="flex items-start">
          <h3 className="flex-1 mr-2 text-base font-bold leading-tight">{program.name}</h3>
          {program.duration && (
            <div className="flex-shrink-0 text-sm text-text-secondary whitespace-nowrap">
              <IconWatch className="mb-1 align-middle" width={14} height={18} />
              <span className="pl-1 align-middle">{program.duration}m</span>
            </div>
          )}
        </div>

        {program.shortDescription && (
          <Markdown value={program.shortDescription} className="mt-1 text-sm text-text-secondary" />
        )}

        <div className="py-3">
          {exercises
            .filter((e) => ExerciseImageUtils_exists(e, "small"))
            .map((e) => (
              <ExerciseImage
                key={Exercise_toKey(e)}
                settings={settings}
                exerciseType={e}
                size="small"
                className="w-8 mr-1"
              />
            ))}
        </div>

        <div className="flex mb-1 text-text-secondary">
          <IconCalendarSmall color={Tailwind_colors().lightgray[600]} className="block mt-0.5 mr-1" />
          <div className="text-xs">
            {(program.weeksCount ?? 0) > 1 &&
              `${program.weeksCount} ${StringUtils_pluralize("week", program.weeksCount ?? 0)}, `}
            {program.frequency ? `${program.frequency}x/week, ` : ""}
            {exercisesRange ? Program_exerciseRangeFormat(exercisesRange[0], exercisesRange[1]) : ""}
          </div>
        </div>
        {equipment.length > 0 && (
          <div className="flex text-text-secondary">
            <IconKettlebellSmall color={Tailwind_colors().lightgray[600]} className="block mt-0.5 mr-1" />
            <div className="text-xs">{equipment.join(", ")}</div>
          </div>
        )}
      </div>
    </a>
  );
}
