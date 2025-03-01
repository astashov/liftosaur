import { JSX, h } from "preact";
import { IProgram, ISettings } from "../types";

interface IMigrationBannerProps {
  client: Window["fetch"];
  program: IProgram;
  settings: ISettings;
}

export function MigrationBanner(props: IMigrationBannerProps): JSX.Element {
  return (
    <div className="flex flex-col items-center px-8 py-4 mx-4 mb-4 bg-red-100 border border-red-400 rounded-lg sm:flex-row">
      <div>
        <div>This is an old-style program, that doesn't work anymore!</div>
      </div>
    </div>
  );
}
