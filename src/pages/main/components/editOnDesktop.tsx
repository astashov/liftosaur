import { h, JSX } from "preact";
import { IconLaptop } from "../../../components/icons/iconLaptop";
import { Tailwind_colors } from "../../../utils/tailwindConfig";

export function EditOnDesktop(): JSX.Element {
  return (
    <div className="px-0 mx-auto md:px-4" style={{ maxWidth: 1000 }}>
      <div className="overflow-hidden rounded-3xl" style={{ backgroundColor: "#252147" }}>
        <div className="flex flex-col md:flex-row">
          <div className="flex-1 px-4 py-12 md:px-12 md:py-20">
            <div className="flex items-center gap-2 mb-4">
              <IconLaptop color={Tailwind_colors().purple[400]} />
              <span className="text-sm font-semibold" style={{ color: Tailwind_colors().purple[400] }}>
                Program Web Editor
              </span>
            </div>
            <h2 className="mb-6 text-3xl font-semibold text-white md:text-4xl">Edit programs on desktop</h2>
            <p className="mb-2 text-base leading-relaxed text-white md:mb-6">
              Typing your program on a phone can indeed be tedious. To ease this process, there is a web editor
              available. Edit programs from your account, or generate a link to a program, and share with other people.
              And you can import those links into the app.
            </p>
            <a
              href="/planner"
              className="inline-block font-bold underline"
              style={{ color: Tailwind_colors().purple[400] }}
            >
              Try the Web Editor
            </a>
          </div>
          <div className="relative flex-1 block md:hidden">
            <div
              className="relative bg-no-repeat bg-contain"
              style={{
                backgroundImage: "url(/images/laptop.png)",
                width: "512px",
                height: "320px",
              }}
            >
              <img
                src="/images/webeditor2.png"
                alt="Web editor screenshot"
                loading="lazy"
                className="absolute"
                style={{
                  top: "19px",
                  left: "72px",
                  width: "375px",
                  height: "216px",
                }}
              />
            </div>
          </div>
          <div className="relative flex-1 hidden md:block">
            <img
              src="/images/webeditor2.png"
              alt="Web editor screenshot"
              loading="lazy"
              className="absolute"
              style={{
                top: "84px",
                right: "-106px",
                width: "435px",
                height: "271px",
              }}
            />
            <div
              className="absolute bg-no-repeat bg-contain"
              style={{
                backgroundImage: "url(/images/laptop.png)",
                top: "60px",
                right: "-228px",
                width: "640px",
                height: "400px",
              }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
}
