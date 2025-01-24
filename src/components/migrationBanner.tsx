import { JSX, h } from "preact";
import { useState } from "preact/hooks";
import { MigratorToPlanner } from "../models/migratorToPlanner";
import { BuilderCopyLink } from "../pages/builder/components/builderCopyLink";
import { PlannerProgram } from "../pages/planner/models/plannerProgram";
import { IProgram, ISettings } from "../types";
import { Encoder } from "../utils/encoder";
import { UrlUtils } from "../utils/url";
import { UidFactory } from "../utils/generator";

interface IMigrationBannerProps {
  client: Window["fetch"];
  program: IProgram;
  settings: ISettings;
}

export function MigrationBanner(props: IMigrationBannerProps): JSX.Element {
  const [link, setLink] = useState<string | undefined>(undefined);
  return (
    <div className="flex flex-col items-center px-8 py-4 mx-4 mb-4 bg-red-100 border border-red-400 rounded-lg sm:flex-row">
      <div>
        <div>
          This old-style program <strong>WILL STOP</strong> working on <strong>Feb 3, 2025</strong>! You can migrate to
          the new - plain text style program, but it won't migrate the Finish Day scripts.
        </div>
        <div>
          <BuilderCopyLink
            type="p"
            onShowInfo={(url) => setLink(url)}
            suppressShowInfo={true}
            program={{}}
            title={<span className="ml-1 font-bold underline text-bluev2">Generate new-style program</span>}
            client={props.client}
            encodedProgram={async () => {
              const newPlannerProgram = new MigratorToPlanner(props.program, props.settings).migrate();
              const exportedProgram = PlannerProgram.buildExportedProgram(
                UidFactory.generateUid(8),
                newPlannerProgram,
                props.settings,
                props.program.nextDay
              );
              const baseUrl = UrlUtils.build("/planner", window.location.href);
              const encodedUrl = await Encoder.encodeIntoUrl(JSON.stringify(exportedProgram), baseUrl.toString());
              return encodedUrl.toString();
            }}
          />
        </div>
        {link && (
          <div>
            <span>Copied! You can import it into the app. </span>
            <a target="_blank" className="font-bold underline text-bluev2" href={link}>
              {link}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
