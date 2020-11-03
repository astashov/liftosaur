/* eslint-disable @typescript-eslint/no-explicit-any */
import * as fs from "fs";
import * as csv from "fast-csv";
import * as E from "./models/exercise";
import { ObjectUtils } from "./utils/object";
import { DateUtils } from "../server/src/utils/date";
import { IExerciseId } from "./models/exercise";

interface IEquipment {
  barbell: string;
  cable: string;
  dumbbell: string;
  smith: string;
  band: string;
  kettlebell: string;
  bodyweight: string;
  leverageMachine: string;
  medicineball: string;
  ezbar: string;
  trapbar: string;
}

export const exerciseMapping: Record<IExerciseId, Partial<IEquipment>> = {
  abWheel: {
    bodyweight: "0857",
  },
  arnoldPress: {
    dumbbell: "0287",
    kettlebell: "0523",
  },
  aroundTheWorld: {
    dumbbell: "3968",
  },
  backExtension: {
    bodyweight: "1234",
    leverageMachine: "0573",
  },
  ballSlams: {
    medicineball: "1354",
  },
  battleRopes: {
    bodyweight: "0128",
  },
  benchDip: {
    bodyweight: "1399",
  },
  benchPress: {
    barbell: "0025",
    cable: "0151",
    dumbbell: "0289",
    smith: "0748",
    band: "1254",
    kettlebell: "3738",
  },
  benchPressCloseGrip: {
    barbell: "0030",
    ezbar: "2432",
    smith: "0751",
  },
  benchPressWideGrip: {
    barbell: "0122",
    smith: "1308",
  },
  bentOverOneArmRow: {
    dumbbell: "0292",
  },
  bentOverRow: {
    barbell: "0027",
    cable: "0189",
    dumbbell: "0293",
    band: "0892",
    leverageMachine: "1237",
    smith: "1359",
  },
  bicepCurl: {
    barbell: "0031",
    dumbbell: "0294",
    band: "0968",
    leverageMachine: "0575",
    cable: "2656",
    ezbar: "2404",
  },
  bicycleCrunch: {
    bodyweight: "0147",
  },
  boxJump: {},
  boxSquat: {
    barbell: "0026",
    dumbbell: "0291",
  },
  bulgarianSplitSquat: {
    dumbbell: "2290",
  },
  burpee: {},
  cableCrossover: {
    cable: "0155",
  },
  cableCrunch: {
    cable: "0226",
  },
  cableKickback: {
    cable: "0860",
  },
  cablePullThrough: {
    cable: "1206",
  },
  cableTwist: {
    barbell: "0094",
    bodyweight: "0695",
    cable: "0243",
    leverageMachine: "1453",
    band: "0933",
  },
  calfPressOnLegPress: {
    leverageMachine: "2335",
  },
  calfPressOnSeatedLegPress: {
    leverageMachine: "1385",
  },
  chestDip: {
    bodyweight: "0251",
  },
  chestFly: {
    barbell: "0458",
    cable: "0185",
    dumbbell: "0308",
    leverageMachine: "0596",
  },
  chestPress: {
    leverageMachine: "1029",
    band: "0913",
  },
  chinUp: {
    leverageMachine: "0572",
    bodyweight: "1326",
  },
  clean: {},
  cleanandJerk: {},
  concentrationCurl: {
    barbell: "2414",
    dumbbell: "0297",
    band: "0976",
    cable: "3925",
  },
  crossBodyCrunch: {
    bodyweight: "0262",
  },
  crunch: {
    cable: "0175",
    bodyweight: "0267",
    leverageMachine: "1452",
  },
  cycling: {},
  deadlift: {
    barbell: "0032",
    cable: "0157",
    dumbbell: "0300",
    leverageMachine: "0578",
    smith: "0752",
    band: "0895",
    kettlebell: "3322",
    bodyweight: "3585",
  },
  deadliftHighPull: {
    barbell: "1199",
  },
  declineBenchPress: {
    dumbbell: "0301",
    smith: "0753",
  },
  declineCrunch: {},
  deficitDeadlift: {},
  ellipticalMachine: {
    leverageMachine: "2192",
  },
  facePull: {
    band: "0896",
  },
  flatKneeRaise: {
    bodyweight: "0617",
  },
  flatLegRaise: {
    bodyweight: "3590",
  },
  frontRaise: {
    barbell: "0041",
    cable: "0162",
    dumbbell: "0310",
    bodyweight: "0834",
    band: "0978",
  },
  frontSquat: {
    barbell: "0042",
    kettlebell: "0533",
    dumbbell: "2966",
    cable: "3349",
    smith: "1433",
  },
  gobletSquat: {
    kettlebell: "0534",
    dumbbell: "2281",
  },
  goodMorning: {
    barbell: "0044",
    smith: "0749",
    leverageMachine: "3759",
  },
  hackSquat: {
    barbell: "0046",
    smith: "0755",
  },
  hammerCurl: {
    cable: "0166",
    dumbbell: "0313",
    band: "0897",
  },
  handstandPushUp: {
    bodyweight: "0471",
  },
  hangClean: {
    kettlebell: "0518",
  },
  hangSnatch: {},
  hangingLegRaise: {
    bodyweight: "0472",
    cable: "2887",
  },
  highKneeSkips: {},
  hipAbductor: {
    leverageMachine: "0597",
    bodyweight: "0791",
    cable: "0879",
    band: "0899",
  },
  hipThrust: {
    barbell: "1060",
    leverageMachine: "2146",
    band: "2760",
    bodyweight: "1062",
  },
  inclineBenchPress: {
    barbell: "0047",
    cable: "0169",
    dumbbell: "0314",
    smith: "0757",
  },
  inclineChestFly: {
    cable: "0171",
    dumbbell: "0319",
  },
  inclineChestPress: {
    leverageMachine: "1299",
    band: "0923",
    dumbbell: "1289",
  },
  inclineCurl: {
    dumbbell: "0318",
  },
  inclineRow: {
    barbell: "0049",
    dumbbell: "0327",
  },
  invertedRow: {
    bodyweight: "0499",
  },
  isoLateralChestPress: {},
  isoLateralRow: {},
  jackknifeSitUp: {
    bodyweight: "0507",
  },
  jumpRope: {},
  jumpSquat: {
    barbell: "0053",
    bodyweight: "0514",
  },
  jumpingJack: {},
  kettlebellSwing: {
    dumbbell: "3368",
    kettlebell: "3571",
  },
  kettlebellTurkishGetUp: {},
  kippingPullUp: {},
  kneeRaise: {},
  kneelingPulldown: {
    band: "0905",
  },
  kneestoElbows: {
    bodyweight: "3890",
  },
  latPulldown: {
    cable: "1204",
  },
  lateralBoxJump: {},
  lateralRaise: {
    cable: "0178",
    dumbbell: "0334",
    leverageMachine: "0584",
    band: "0907",
    kettlebell: "3740",
  },
  legExtension: {
    leverageMachine: "0585",
    band: "0926",
  },
  legPress: {
    smith: "0760",
    leverageMachine: "3385",
  },
  lunge: {
    barbell: "0054",
    dumbbell: "0336",
    bodyweight: "0612",
    cable: "3351",
  },
  lyingLegCurl: {
    leverageMachine: "0586",
    band: "0911",
  },
  mountainClimber: {},
  muscleUp: {
    bodyweight: "1401",
  },
  obliqueCrunch: {
    bodyweight: "1495",
  },
  overheadPress: {
    barbell: "1165",
    dumbbell: "0426",
    ezbar: "1226",
  },
  overheadSquat: {
    barbell: "0069",
    dumbbell: "3709",
  },
  pecDeck: {
    leverageMachine: "1030",
  },
  pendlayRow: {
    barbell: "3017",
  },
  pistolSquat: {
    kettlebell: "0544",
    leverageMachine: "1040",
    bodyweight: "3747",
  },
  plank: {
    bodyweight: "0463",
  },
  powerClean: {},
  powerSnatch: {},
  preacherCurl: {
    barbell: "0070",
    dumbbell: "0372",
    ezbar: "2900",
    leverageMachine: "0592",
  },
  pressUnder: {},
  pullUp: {
    leverageMachine: "0017",
    bodyweight: "0652",
    band: "0970",
  },
  pullover: {
    barbell: "0073",
    dumbbell: "0375",
  },
  pushPress: {
    bodyweight: "1851",
    kettlebell: "0540",
  },
  pushUp: {
    bodyweight: "0662",
    band: "0915",
  },
  reverseCrunch: {
    bodyweight: "0671",
    cable: "0873",
  },
  reverseCurl: {
    barbell: "0080",
    cable: "0206",
    dumbbell: "0429",
    band: "0917",
  },
  reverseFly: {
    dumbbell: "0383",
    leverageMachine: "0602",
    band: "0993",
  },
  reverseGripConcentrationCurl: {},
  reversePlank: {},
  romanianDeadlift: {
    barbell: "0085",
    dumbbell: "1459",
  },
  rowing: {},
  russianTwist: {
    bodyweight: "0687",
    dumbbell: "3449",
    cable: "0211",
  },
  seatedCalfRaise: {
    barbell: "0088",
    dumbbell: "1379",
    leverageMachine: "0594",
  },
  seatedLegCurl: {
    leverageMachine: "0599",
  },
  seatedLegPress: {
    leverageMachine: "3385",
  },
  seatedOverheadPress: {
    barbell: "0091",
  },
  seatedPalmsUpWristCurl: {
    dumbbell: "0401",
  },
  seatedRow: {
    cable: "0861",
    band: "0918",
    leverageMachine: "1350",
  },
  seatedWideGripRow: {
    cable: "0218",
  },
  shoulderPress: {
    cable: "0219",
    dumbbell: "0405",
    leverageMachine: "2318",
    band: "0698",
    smith: "0766",
  },
  shrug: {
    barbell: "0095",
    cable: "0220",
    dumbbell: "0406",
    leverageMachine: "0604",
    band: "1018",
    smith: "0767",
  },
  sideBend: {
    cable: "0222",
    dumbbell: "0407",
    band: "1019",
  },
  sidePlank: {
    bodyweight: "0715",
  },
  singleLegBridge: {
    bodyweight: "0726",
  },
  singleLegDeadlift: {
    dumbbell: "1757",
    bodyweight: "3585",
  },
  sitUp: {
    bodyweight: "0736",
    kettlebell: "1187",
  },
  skullcrusher: {
    barbell: "0061",
    cable: "0187",
    dumbbell: "0351",
    ezbar: "3646",
  },
  snatch: {
    dumbbell: "3888",
  },
  snatchPull: {},
  splitJerk: {},
  squat: {
    barbell: "0043",
    dumbbell: "0413",
    bodyweight: "0787",
    smith: "3281",
    leverageMachine: "1039",
  },
  squatRow: {
    band: "1003",
  },
  standingCalfRaise: {
    barbell: "1372",
    dumbbell: "0417",
    leverageMachine: "0605",
    bodyweight: "1373",
    cable: "1375",
  },
  stepUp: {
    barbell: "0114",
    dumbbell: "0431",
    bodyweight: "0801",
    band: "1008",
  },
  stiffLegDeadlift: {
    barbell: "1543",
    dumbbell: "0432",
    band: "1009",
  },
  straightLegDeadlift: {
    barbell: "0116",
    dumbbell: "0434",
    band: "1010",
    kettlebell: "3733",
  },
  sumoDeadlift: {
    barbell: "0117",
  },
  sumoDeadliftHighPull: {
    barbell: "1199",
  },
  superman: {
    bodyweight: "0804",
    dumbbell: "3454",
  },
  tBarRow: {
    leverageMachine: "0606",
  },
  thruster: {
    barbell: "3305",
  },
  toesToBar: {
    bodyweight: "3891",
  },
  torsoRotation: {},
  trapBarDeadlift: {
    trapbar: "0811",
  },
  tricepsDip: {
    bodyweight: "0814",
    leverageMachine: "0019",
  },
  tricepsExtension: {
    barbell: "0109",
    cable: "0194",
    band: "0914",
    dumbbell: "0430",
  },
  tricepsPushdown: {
    cable: "0241",
  },
  uprightRow: {
    barbell: "0120",
    cable: "0246",
    dumbbell: "0437",
    band: "0934",
  },
  vUp: {
    bodyweight: "0825",
    band: "1014",
    dumbbell: "3336",
  },
  widePullUp: {
    bodyweight: "1429",
  },
  wristRoller: {
    bodyweight: "0859",
  },
  zercherSquat: {
    barbell: "0127",
  },
};

function arr(str: string): string[] {
  return str
    .split(",")
    .map((s) => s.trim())
    .filter((s) => !!s);
}

const equipmentWhitelist = [
  "Band",
  "Barbell",
  "Body weight",
  "Cable",
  "Dumbbell",
  "EZ Barbell",
  "Kettlebell",
  "Leverage machine",
  "Resistance Band",
  "Rope",
  "Smith machine",
  "Suspension",
  "Trap bar",
  "Weighted",
  "Wheel roller",
];

function addarr(set: Partial<Record<string, number>>, str: string): void {
  return add(set, arr(str));
}

function add(set: Partial<Record<string, number>>, strs: string[]): void {
  strs.forEach((s) => {
    set[s] = set[s] || 0;
    set[s]! += 1;
  });
}

const synonyms: Partial<Record<string, string>> = {
  alternate: "alternating",
  "°": "degree",
  degrees: "degree",
  "straight legs": "straight leg",
  "behind the back": "behind back",
  biceps: "bicep",
  curls: "curl",
  dips: "dip",
  flye: "fly",
  hamstrings: "hamstring",
  crunches: "crunch",
  concetration: "Concentration",
  thrusts: "Thrust",
  "bent knees": "bent knee",
};

const equipmentPrefixes = new Set([
  "Bodyweight",
  "Olympic Barbell",
  "EZ Barbell",
  "EZ Bar",
  "EZ-bar",
  "Barbell",
  "Dumbbell",
  "Dumbbells",
  "Cable bar",
  "Cable",
  "Kettlebell",
  "Lever",
  "Smith",
  "Weighted",
  "Resistance Band",
  "Band",
  "on exercise Ball",
  "Exercise Ball",
  "with Medicine Ball",
  "Medicine Ball",
  "Suspension",
  "Suspended",
]);

const typePrefixes = new Set([
  "Self assisted",
  "Assisted",
  "Alternate",
  "Alternating",
  "Incline",
  "Decline",
  "Close grip",
  "Reverse grip",
  "Wide grip",
  "hammer grip",
  "clean grip",
  "palm up",
  "pronated grip",
  "Kneeling",
  "Standing",
  "Seated",
  "Lying",
  "One Arm",
  "One Handed",
  "One Hand",
  "One Leg",
  "Single Leg",
  "Single Arm",
  "Straight arm",
  "Straight back",
  "with Bent Knee between Chairs",
  "with arms extended",
  "with hands behind head",
  "with knees off ground",
  "with press",
  "with rotation",
  "Behind Neck",
  "Behind The Back",
  "Behind Back",
  "Behind Head",
  "on floor",
  "floor",
  "Bent Arm",
  "Bent Knee",
  "Bent Leg",
  "Bent Over",
  "With v bar",
  "with bed sheet",
  "with towel",
  "with rope",
  "with hands against wall",
  "with knee lift",
  "with chair",
  "between chairs",
  "on flat bench",
  "in flat bench",
  "flat bench",
  "flat",
  "with throw down",
  "with throw down",
  "with support",
  "with kicked leg",
  "with twist",
]);

const include = [1165];
const synonymsExercises = { 1165: "overhead press" };

const prefixes = new Set(["Advanced", "Bar Grip", /\([^\)]+\)/g]);

const ignore = new Set(["alternating", "self assisted", "stretch"]);

interface IMuscle {
  id: string;
  name: string;
  bodyPart: string;
  target: string[];
  synergist: string[];
  types: string[];
  url: string;
  img: string;
}

function sort(obj: Partial<Record<string, number>>): [string, number][] {
  const keys = Object.keys(obj);
  const arr1 = keys.reduce<[string, number][]>((memo, k) => {
    if (k) {
      memo.push([k, obj[k]!]);
    }
    return memo;
  }, []);
  arr1.sort((a, b) => a[0].localeCompare(b[0]));
  return arr1;
}

function read(): Promise<any> {
  const bodyParts: Partial<Record<string, number>> = {};
  const muscles: Partial<Record<string, number>> = {};
  const equipments: Partial<Record<string, number>> = {};
  const exercises: Partial<Record<string, Partial<Record<string, IMuscle[]>>>> = {};
  return new Promise((resolve) => {
    fs.createReadStream("list3.csv")
      .pipe(csv.parse({ headers: true }))
      .on("data", (row) => {
        const target = arr(row.Target);
        const synergist = arr(row.Synergist);
        if (target.length !== 0 || synergist.length !== 0) {
          let exercise: string = row.Name.toLowerCase().replace(/-/g, " ");
          const types: string[] = [];
          for (const p of Object.keys(synonyms)) {
            exercise = exercise.replace(p, synonyms[p]!);
          }
          for (let p of prefixes) {
            p = typeof p === "string" ? p.toLowerCase() : p;
            exercise = exercise.replace(p, "");
          }
          for (let p of typePrefixes) {
            p = typeof p === "string" ? p.toLowerCase() : p;
            if (exercise.indexOf(p) !== -1) {
              if (types.indexOf(p) === -1) {
                types.push(p);
              }
              exercise = exercise.replace(p, "");
            }
          }
          for (let p of equipmentPrefixes) {
            p = typeof p === "string" ? p.toLowerCase() : p;
            if (exercise.indexOf(p) !== -1) {
              exercise = exercise.replace(p, "");
            }
          }
          exercise = exercise.trim().replace(/\s+/g, " ").toLowerCase();
          // for (const p of ignore) {
          //   if (types.indexOf(p) !== -1 || exercise.indexOf(p) !== -1) {
          //     return;
          //   }
          // }
          let equipment = row.Equipment.trim();
          if (equipmentWhitelist.indexOf(equipment) === -1) {
            return;
          }
          if (equipment === "Weighted") {
            equipment = "Body weight";
          }
          exercises[exercise] = exercises[exercise] || {};
          exercises[exercise]![equipment] = exercises[exercise]![equipment] || [];
          if (types.length === 0) {
            types.push("regular");
          }
          // const hasTypes = exercises[exercise]![equipment]?.some((e) => {
          //   const arr1 = [...e.types];
          //   arr1.sort();
          //   const arr2 = [...types];
          //   arr2.sort();
          //   return JSON.stringify(arr1) === JSON.stringify(arr2);
          // });
          // if (!hasTypes) {
          const payload = {
            id: row.ID,
            name: row.Name,
            bodyPart: row.BodyPart.trim(),
            target: arr(row.Target),
            synergist: arr(row.Synergist),
            types,
            url: row.URL,
            img: row.Img,
          };
          if (row.ID === "1162") {
            console.log(payload);
          }
          exercises[exercise]![equipment]!.push(payload);
          addarr(bodyParts, row.BodyPart);
          addarr(muscles, row.Target);
          addarr(muscles, row.Synergist);
          addarr(equipments, row.Equipment);
          // }
        }
      })
      .on("end", (rowCount: number) => {
        resolve({ bodyParts, muscles, equipments, exercises });
      });
  });
}

async function main(): Promise<void> {
  const sets = await read();
  // console.log(sort(sets.bodyParts));
  // console.log(sort(sets.muscles));
  // console.log(sort(sets.equipments));
  // console.dir(
  //   // sort(sets.exercises).map((a) => a[0].toLowerCase()),
  //   sets.exercises,
  //   { depth: null, maxArrayLength: null }
  // );

  // let counter = 0;
  // for (const exercise of Object.keys(sets.exercises)) {
  //   for (const equipment of Object.keys(sets.exercises[exercise])) {
  //     const objs = sets.exercises[exercise][equipment];
  //     const regular: IMuscle = objs.find((o: IMuscle) => o.types[0] === "regular");
  //     if (regular) {
  //       const filteredObjs = objs.filter((o: IMuscle) => {
  //         const condition =
  //           o.types[0] !== "regular" &&
  //           regular.target.length === o.target.length &&
  //           regular.target.every((t) => o.target.includes(t)) &&
  //           regular.synergist.length === o.synergist.length &&
  //           regular.synergist.every((t) => o.synergist.includes(t));
  //         if (condition) {
  //           counter += 1;
  //           // console.log(
  //           //   `Removing '${exercise}' [${equipment}] [${o.types.join(", ")}] [${o.name}] [${o.id}] (${o.url})`
  //           // );
  //         }
  //         return !condition;
  //       });
  //       sets.exercises[exercise][equipment] = filteredObjs;
  //     }
  //   }
  // }
  // console.log("REmoved - ", counter);

  const exercisesNames = Object.keys(sets.exercises);
  exercisesNames.sort();
  console.log("<form>");
  for (const exercise of exercisesNames) {
    console.log("<div class='exercise'><h2>");
    console.log(exercise);
    console.log("</h2>");
    for (const equipment of Object.keys(sets.exercises[exercise])) {
      const objs = sets.exercises[exercise][equipment];
      for (const obj of objs) {
        console.log(
          `<div class='entry'><input class='check' type='checkbox' id='${obj.id}_id' name='${obj.id}_id' /><label for='${obj.id}_id'>`
        );
        console.log(
          `  [<span class="equipment">${equipment}</span>] [<span class="types">${obj.types.join(
            ", "
          )}</span>] [<span class="name">${obj.name}</span>] [${obj.id}] (<span class="img"><a tabindex="-1" href='${
            obj.url
          }'>URL</a><img src="${obj.img}" /></span>)`
        );
        console.log(`</label></div>`);
      }
    }
    console.log("</div>");
  }
  console.log("</form>");
  console.log("<style>");
  console.log(`
* {
  padding: 0;
  margin: 0;
  font-family: Arial;
}

body {
  padding: 20px;
}

.entry {
  font-size: 14px;
  margin-left: 15px;
}

.img {
  position: relative;
}

h2 {
  font-size: 16px;
}

.exercise {
  margin-bottom: 7px;
}

.equipment {
  color: #4ba240;
}

.name {
  color: #772a2a;
}

.types {
  color: #3193a9;
}

.img:hover img {
  display: block;
}

.img img {
  position: absolute;
  display: none;
  border: 1px solid gray;
  background: white;
  top: -50px;
  left: 50px;
  width: 500px;
  height: 500px;
  z-index: 1;
}
  `);
  console.log("</style>");
  console.log("<script>");
  console.log(`
  const idsRaw = window.localStorage.getItem("ids"); 
  window.ids = idsRaw ? JSON.parse(idsRaw) : {};
  const checks = document.querySelectorAll('.check');
  for (const el of checks) {
    const id = parseInt(el.getAttribute("id"), 10);
    el.checked = window.ids[id];
    el.addEventListener("change", (e) => {
      if (e.target.checked) {
        window.ids[id] = e.target.checked;
      } else {
        delete window.ids[id];
      }
      window.localStorage.setItem("ids", JSON.stringify(ids));
    });
  }
`);
  console.log("</script>");
  // console.log(Object.keys(sets.exercises).length);

  // const missing: string[] = [];
  // const a = ObjectUtils.keys(E.exercises).reduce<Record<string, unknown>>((memo, k) => {
  //   const name = E.exercises[k].name.toLowerCase();
  //   let key: string | undefined = Object.keys(sets.exercises).filter((e: string) => e.toLowerCase() === name)[0];
  //   if (key == null) {
  //     key = mappings[name];
  //   }
  //   const muscles: Record<string, string> = {};
  //   if (key != null) {
  //     const data = sets.exercises[key!];
  //     for (const dataKey of Object.keys(data)) {
  //       for (const d of data[dataKey]) {
  //         muscles[dataKey] = [...d.target, ...d.synergist].join(", ");
  //       }
  //     }
  //   } else {
  //     missing.push(name);
  //   }
  //   memo[name] = muscles;
  //   return memo;
  // }, {});
  // console.log(a);
  // console.log(missing);
}

const mappings: Partial<Record<string, string>> = {
  "ab wheel": "wheel rollout",
  "medicine ball overhead slam": "ball slams",
  "battle ropes": "battling ropes",
  "bench press close grip": "close grip bench press",
  "bench press wide grip": "wide grip bench press",
  "bent over one arm row": "bent over row",
  "bicycle crunch": "bicycle twisting crunch",
  "box jump": "box jump down with one leg stabilization",
  "box squat": "goblet box squat",
  "cable crossover": "standing up straight crossovers",
  "cable crunch": "standing crunch",
  "cable kickback": "kickback",
  "cable pull through": "pull through",
  "cable twist": "standing twist",
  "calf press on leg press": "sled calf press on leg press",
  "calf press on seated leg press": "seated calf press",
  "chest fly": "one arm decline chest fly",
  "chin up": "chin ups",
  "deadlift high pull": "sumo deadlift high pull",
  "deficit deadlift": "deadlift",
  "elliptical machine": "elliptical machine walk",
  "flat knee raise": "hanging knee raise",
  "flat leg raise": "lying floor leg raise",
  "handstand push up": "handstand push-up",
  "hang clean": "alternating hang clean",
  "hip abductor": "standing hip abduction",
  "jackknife sit up": "jack knife floor",
  "kettlebell swing": "swing",
  "kipping pull up": "kipping muscle up",
  "knee raise": "hanging knee raise",
  "knees to elbows": "elbow to knee sit-up",
  "lat pulldown": "one arm lat pulldown",
  "lateral box jump": "box jump down with one leg stabilization",
  "overhead press": "seated overhead press",
  "pec deck": "pec deck fly",
  plank: "front plank",
  "hang snatch": "one arm snatch",
  "push press": "incline push press",
  "push up": "push-up",
  "reverse grip concentration curl": "concentration curl",
  "reverse plank": "reverse plank with leg lift",
  "decline sit up": "sit up",
  skullcrusher: "lying triceps extension skull crusher",
  snatch: "one arm snatch",
  "step up": "single leg step up",
  "toes to bar": "hanging toes to bar",
  "v up": "seated row with v bar",
};
main();
