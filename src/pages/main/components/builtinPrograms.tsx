import { h, JSX } from "preact";
import { IconKettlebell } from "../../../components/icons/iconKettlebell";
import { Tailwind } from "../../../utils/tailwindConfig";

export function BuiltinPrograms(): JSX.Element {
  const programs: readonly (readonly [string, string])[] = [
    ["5/3/1 for beginners", "/programs/the5314b"],
    ["Basic Beginner", "/programs/basicBeginner"],
    ["Dumbbell PPL", "/programs/dbPpl"],
    ["GZCLP", "/programs/gzclp"],
    ["GZCL: The Rippler", "/programs/gzcl-the-rippler"],
    ["GZCL: Jacked And Tan 2.0", "/programs/gzcl-jacked-and-tan-2"],
    ["GZCL: UHF 9 weeks", "/programs/gzcl-uhf-9-weeks"],
    ["GZCL: UHF 5 weeks", "/programs/gzcl-uhf-5-weeks"],
    ["GZCL: VDIP", "/programs/gzcl-vdip"],
    ["GZCL: General Gainz", "/programs/gzcl-general-gainz"],
    ["GZCL: General Gainz - BBB", "/programs/gzcl-general-gainz-burrito-but-big"],
    ["Lyle's Generic Bulking", "/programs/lylegenericbulking"],
    ["Metallicadpa PPL", "/programs/metallicadpappl"],
    ["Starting Strength", "/programs/ss1"],
    ["Strong Curves", "/programs/strongcurves"],
    ["Texas Method", "/programs/texasmethod"],
    ["Arnold's Golden Six", "/programs/arnoldgoldensix"],
  ];

  return (
    <div
      id="programs"
      className="px-4 py-10 mx-auto md:px-12 bg-purple-75 md:py-14 rounded-3xl"
      style={{ maxWidth: 1000 }}
    >
      <div className="flex justify-center w-full mb-6">
        <div className="flex items-center gap-2 text-icon-purple">
          <div>
            <IconKettlebell color={Tailwind.semantic().icon.purple} />
          </div>
          <div className="font-semibold">Weightlifting Programs</div>
        </div>
      </div>
      <h2 className="mb-4 text-3xl font-bold text-center md:text-4xl">Follow free built-in programs</h2>
      <p className="mx-auto mb-8 text-base text-center text-gray-600" style={{ maxWidth: "40rem" }}>
        Start with a trusted program. All are built with Liftoscript, making them fully customizable to match your goals
        and preferences.
      </p>
      <div className="flex flex-wrap justify-center gap-1 md:gap-2">
        {programs.map(([name, link]) => (
          <a
            href={link}
            target="_blank"
            className="inline-block px-3 py-2 text-xs font-semibold no-underline bg-white border border-purple-200 rounded-full md:text-sm md:py-3 md:px-6 hover:bg-purple-50"
          >
            {name}
          </a>
        ))}
      </div>
    </div>
  );
}
