import { ISettings, IPlate, IBars } from "../types";
import { Weight } from "./weight";

export namespace Settings {
  export function build(): ISettings {
    return {
      lengthUnits: "in",
      statsEnabled: { weight: { weight: true }, length: {} },
      plates: [
        { weight: Weight.build(45, "lb"), num: 4 },
        { weight: Weight.build(25, "lb"), num: 4 },
        { weight: Weight.build(10, "lb"), num: 4 },
        { weight: Weight.build(5, "lb"), num: 4 },
        { weight: Weight.build(2.5, "lb"), num: 4 },
        { weight: Weight.build(1.25, "lb"), num: 2 },
        { weight: Weight.build(20, "kg"), num: 4 },
        { weight: Weight.build(10, "kg"), num: 4 },
        { weight: Weight.build(5, "kg"), num: 4 },
        { weight: Weight.build(2.5, "kg"), num: 4 },
        { weight: Weight.build(1.25, "kg"), num: 4 },
        { weight: Weight.build(0.5, "kg"), num: 2 },
      ],
      exercises: {},
      graphs: [],
      bars: {
        lb: {
          barbell: Weight.build(45, "lb"),
          ezbar: Weight.build(20, "lb"),
          dumbbell: Weight.build(10, "lb"),
        },
        kg: {
          barbell: Weight.build(20, "kg"),
          ezbar: Weight.build(10, "kg"),
          dumbbell: Weight.build(5, "kg"),
        },
      },
      timers: {
        warmup: 90,
        workout: 180,
      },
      units: "lb",
    };
  }

  export function plates(settings: ISettings): IPlate[] {
    return settings.plates.filter((p) => p.weight.unit === settings.units);
  }

  export function bars(settings: ISettings): IBars {
    return settings.bars[settings.units];
  }
}
