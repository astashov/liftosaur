import { h, JSX } from "preact";
import { useState } from "preact/hooks";
import { IProgram, ISettings } from "../../../types";
import { Program_exportProgram } from "../../../models/program";
import { Service } from "../../../api/service";
import {
  PlannerProgram_hasNonSelectedWeightUnit,
  PlannerProgram_switchToUnit,
} from "../../planner/models/plannerProgram";
import { Weight_oppositeUnit } from "../../../models/weight";
import { Button } from "../../../components/button";
import { IconSpinner } from "../../../components/icons/iconSpinner";
import { UidFactory_generateUid } from "../../../utils/generator";
import { Tailwind_semantic } from "../../../utils/tailwindConfig";

declare let __HOST__: string;

interface IProps {
  program: IProgram;
  settings: ISettings;
  isLoggedIn?: boolean;
  client: Window["fetch"];
}

export function ProgramDetailsAddButton(props: IProps): JSX.Element {
  const [isLoading, setIsLoading] = useState(false);
  const { program, settings } = props;

  return (
    <Button
      className="w-full"
      name="add-program-to-account"
      kind={props.isLoggedIn ? "purple" : "grayv2"}
      disabled={isLoading}
      onClick={async () => {
        if (!props.isLoggedIn) {
          alert("You should be logged in");
          return;
        }
        const exportProgram = Program_exportProgram(
          {
            ...program,
            id: UidFactory_generateUid(8),
          },
          settings
        );
        const pg = exportProgram.program;
        if (pg.planner && PlannerProgram_hasNonSelectedWeightUnit(pg.planner, settings)) {
          const fromUnit = Weight_oppositeUnit(settings.units);
          const toUnit = settings.units;
          if (confirm(`The program has weights in ${fromUnit}, do you want to convert them to ${toUnit}?`)) {
            pg.planner = PlannerProgram_switchToUnit(pg.planner, settings);
          }
        }
        setIsLoading(true);
        const service = new Service(props.client);
        const result = await service.postSaveProgram(exportProgram);
        if (result.success) {
          window.location.href = `${__HOST__}/user/p/${result.data}`;
        } else {
          alert("Failed to save the program");
          setIsLoading(false);
        }
      }}
    >
      {isLoading ? <IconSpinner color={Tailwind_semantic().icon.white} width={16} height={16} /> : "Add to account"}
    </Button>
  );
}
