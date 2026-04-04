import { JSX } from "react";
import { IDispatch } from "../ducks/types";
import { ISettings } from "../types";
import { useNavOptions } from "../navigation/useNavOptions";
import { Thunk_pushScreen } from "../ducks/thunks";
import { IconDoc } from "./icons/iconDoc";
import { navigationRef } from "../navigation/navigationRef";
import { IconEditSquare } from "./icons/iconEditSquare";
import { IconLink } from "./icons/iconLink";
import { emptyProgramId, Program_selectProgram } from "../models/program";
import { IconEquipmentKettlebell } from "./icons/iconEquipmentKettlebell";

interface IScreenProgramSelectProps {
  dispatch: IDispatch;
  settings: ISettings;
}

export function ScreenProgramSelect(props: IScreenProgramSelectProps): JSX.Element {
  useNavOptions({ navHidden: true });

  const options = [
    {
      key: "builtin",
      icon: <IconDoc width={24} height={24} />,
      title: "Pick a built-in program",
      description: "Choose from popular routines like 5/3/1, GZCLP, and more",
      onClick: () => props.dispatch(Thunk_pushScreen("programs")),
    },
    {
      key: "create",
      icon: <IconEditSquare />,
      title: "Create a program",
      description: "Build your own custom routine from scratch",
      onClick: () => navigationRef.navigate("createProgramModal"),
    },
    {
      key: "import",
      icon: <IconLink size={24} />,
      title: "Import from link",
      description: "Paste a link from the program web editor",
      onClick: () => navigationRef.navigate("importFromLinkModal"),
    },
    {
      key: "adhoc",
      icon: <IconEquipmentKettlebell size={24} />,
      title: "Go without program",
      description: "You can run adhoc workouts, and build the program along the way",
      onClick: () => Program_selectProgram(props.dispatch, emptyProgramId),
    },
  ];

  return (
    <section className="flex flex-col h-screen text-text-primary bg-background-default">
      <div className="flex-1 px-4 pt-8 pb-4 overflow-y-auto">
        <div className="p-4 text-center">
          <img
            src="/images/dinoprogramselect.png"
            className="inline-block object-cover h-52"
            alt="Dino selecting a program"
          />
        </div>
        <div className="px-2 -mt-1">
          <h2 className="mb-2 text-xl font-bold text-center text-text-primary">Choose your program</h2>
          <p className="mb-6 text-sm text-center text-text-secondary">How would you like to set up your training?</p>

          <div className="space-y-3">
            {options.map((opt) => (
              <button
                key={opt.key}
                className="flex items-center w-full gap-3 px-4 py-4 text-left border rounded-xl bg-background-subtlecardpurple border-border-cardpurple nm-program-select"
                data-cy={`program-select-${opt.key}`}
                onClick={opt.onClick}
              >
                <div className="text-text-secondary">{opt.icon}</div>
                <div className="flex-1">
                  <div className="text-sm font-semibold">{opt.title}</div>
                  <div className="text-xs text-text-secondary">{opt.description}</div>
                </div>
                <div className="text-text-secondary">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path
                      d="M6 4l4 4-4 4"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
