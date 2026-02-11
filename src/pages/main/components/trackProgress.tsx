import { h, JSX } from "preact";
import { useState } from "preact/hooks";
import { IconFire } from "../../../components/icons/iconFire";
import { IconGraphs } from "../../../components/icons/iconGraphs";
import { IconBarbell } from "../../../components/icons/iconBarbell";
import { IconCalculator } from "../../../components/icons/iconCalculator";
import { IconCalendarSmall } from "../../../components/icons/iconCalendarSmall";
import { IconMuscles2 } from "../../../components/icons/iconMuscles2";
import { IconTracker } from "../../../components/icons/iconTracker";
import { Tailwind } from "../../../utils/tailwindConfig";

interface IAccordionItem {
  icon: (color: string) => JSX.Element;
  title: string;
  description: string;
  image: string;
}

export function TrackProgress(): JSX.Element {
  const items: IAccordionItem[] = [
    {
      icon: (color) => <IconFire color={color} />,
      title: "Automatic Progressions",
      description:
        "Built-in Linear, Double, and Rep Sum progressions — or script any custom logic. The app adjusts your program after every workout automatically.",
      image: "/images/mainaccordeon1.png",
    },
    {
      icon: (color) => <IconGraphs color={color} />,
      title: "Detailed Analytics",
      description:
        "Graphs for weight, reps, and volume per exercise over time. See weekly volume per muscle group — both prescribed and actually completed.",
      image: "/images/mainaccordeon2.png",
    },
    {
      icon: (color) => <IconBarbell color={color} />,
      title: "1RM & RPE Support",
      description:
        "Set weights as % of 1RM or by RPE — the app calculates the load automatically. Log RPE per set and track how effort changes over time.",
      image: "/images/mainaccordeon3.png",
    },
    {
      icon: (color) => <IconCalculator color={color} />,
      title: "Plates Calculator",
      description:
        "Define your available plates and bar weight. The app rounds weights to what you can actually load and shows the exact plate breakdown per side.",
      image: "/images/mainaccordeon4.png",
    },
    {
      icon: (color) => <IconCalendarSmall color={color} size={24} />,
      title: "Weekly Periodization",
      description:
        "Build programs spanning 12+ weeks with weekly undulation. Templates and reuse syntax mean changing one place updates every week automatically.",
      image: "/images/mainaccordeon5.png",
    },
    {
      icon: (color) => <IconMuscles2 color={color} size={24} />,
      title: "Body Measurements",
      description:
        "Track weight, body fat, arm/leg/waist measurements over time, and visualize trends alongside your lifting data.",
      image: "/images/mainaccordeon6.png",
    },
  ];

  const [openIndex, setOpenIndex] = useState(0);

  return (
    <div className="px-0 py-12 mx-auto md:py-20" style={{ maxWidth: 1000 }}>
      <div className="flex justify-center w-full px-4 mb-2">
        <div className="flex items-center gap-2 text-icon-red">
          <div>
            <IconTracker color={Tailwind.semantic().icon.red} />
          </div>
          <div className="font-semibold">Powerful Tracker</div>
        </div>
      </div>
      <h2 className="px-4 mb-4 text-3xl font-bold text-center md:text-4xl">Track your progress</h2>
      <p
        className="px-4 mx-auto mb-10 text-base leading-relaxed text-center text-gray-600"
        style={{ maxWidth: "40rem" }}
      >
        Log every set and rep, monitor body stats, and visualize your progress with detailed graphs. All your data is
        securely stored in the cloud for access anywhere.
      </p>
      <div className="flex gap-8">
        <div className="flex-1">
          <div className="overflow-hidden bg-white border border-gray-200 divide-y divide-gray-200 rounded-2xl">
            {items.map((item, i) => {
              const isOpen = openIndex === i;
              const iconColor = isOpen ? Tailwind.colors().red[500] : Tailwind.semantic().text.primary;
              return (
                <button
                  className="block w-full px-4 text-left cursor-pointer md:px-6"
                  style={{
                    backgroundColor: isOpen
                      ? Tailwind.semantic().background.default
                      : Tailwind.semantic().background.subtle,
                    transition: "background-color 300ms ease",
                  }}
                  onClick={() => setOpenIndex(i)}
                >
                  <div className="flex items-center gap-3 py-4">
                    <div className="flex-shrink-0">{item.icon(iconColor)}</div>
                    <div className="flex-1 text-lg font-bold">{item.title}</div>
                    <div
                      className="flex-shrink-0 text-2xl text-gray-400"
                      style={{
                        transition: "transform 300ms ease",
                        transform: isOpen ? "rotate(45deg)" : "rotate(0deg)",
                      }}
                    >
                      +
                    </div>
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateRows: isOpen ? "1fr" : "0fr",
                      transition: "grid-template-rows 300ms ease",
                    }}
                  >
                    <div style={{ overflow: "hidden" }}>
                      <div className="pb-5 -mt-1">
                        <p className="text-sm leading-relaxed text-gray-600">{item.description}</p>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex-1 hidden md:block">
          <div
            className="overflow-hidden bg-contain aspect-square rounded-3xl"
            style={{ backgroundImage: "url(/images/mainaccordeonbg.jpg)" }}
          >
            <div className="relative flex justify-center flex-1">
              <div className="relative mt-12" style={{ width: "271px", height: "555px" }}>
                <div
                  className="absolute top-0 left-0 z-10 bg-contain"
                  style={{ backgroundImage: "url(/images/iphoneframe.png)", width: "271px", height: "555px" }}
                />
                <div
                  className="absolute bg-white rounded-2xl"
                  style={{ width: "248px", height: "535px", top: "10px", left: "12px" }}
                />
                {items.map((item, i) => (
                  <img
                    src={item.image}
                    loading="eager"
                    className="w-full rounded-2xl"
                    style={{
                      width: "248px",
                      height: "535px",
                      top: "10px",
                      left: "12px",
                      transition: "opacity 300ms ease",
                      opacity: openIndex === i ? 1 : 0,
                      position: i === 0 ? "relative" : "absolute",
                    }}
                    alt={item.title}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
