/* eslint-disable @typescript-eslint/no-explicit-any */
import * as fs from "fs";
import * as csv from "fast-csv";
import { IExerciseId, Exercise, exercises } from "./models/exercise";
import { ObjectUtils } from "./utils/object";

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

interface IExerciseMeta {
  targetMuscles: string[];
  synergistMuscles: string[];
  bodyPart: string[];
  id: string;
  imageUrl: string;
  pageUrl: string;
}

function read(): Promise<{ gymvisualExercises: Partial<Record<string, IExerciseMeta>> }> {
  const gymvisualExercises: Partial<Record<string, IExerciseMeta>> = {};
  return new Promise((resolve) => {
    fs.createReadStream("list3.csv")
      .pipe(csv.parse({ headers: true }))
      .on("data", (row) => {
        const payload: IExerciseMeta = {
          id: row.ID,
          bodyPart: row.BodyPart.trim(),
          targetMuscles: arr(row.Target),
          synergistMuscles: arr(row.Synergist),
          pageUrl: row.URL,
          imageUrl: row.Img,
        };
        gymvisualExercises[row.ID] = payload;
      })
      .on("end", (rowCount: number) => {
        resolve({ gymvisualExercises });
      });
  });
}

function toHtml(exes: Partial<Record<IExerciseId, Partial<Record<keyof IEquipment, IExerciseMeta>>>>): void {
  console.log("<form>");
  for (const exerciseId of ObjectUtils.keys(exes)) {
    const exercise = Exercise.get({ id: exerciseId, bar: exercises[exerciseId].defaultBar });
    console.log("<div class='exercise'><h2>");
    console.log(exercise.name);
    console.log("</h2>");
    for (const equipment of ObjectUtils.keys(exes[exerciseId]!)) {
      const meta = exes[exerciseId]![equipment]!;
      console.log(`<div class='entry'>`);
      console.log(
        `  [<span class="equipment">${equipment}</span>] [<span class="bodypart">${
          meta.bodyPart
        }}</span>] [<span class="target">${meta.targetMuscles.join(
          ", "
        )}</span>] [<span class="synergist">${meta.synergistMuscles.join(", ")}</span>] [<span class="ref">${
          meta.id
        }</span>] (<span class="img"><a tabindex="-1" href='${meta.pageUrl}'>URL</a><img src="${
          meta.imageUrl
        }" /></span>)`
      );
      console.log(`</div>`);
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

  .bodypart {
    color: #772a2a;
  }

  .target {
    color: #3193a9;
  }

  .synergist {
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
}

async function main(): Promise<void> {
  const { gymvisualExercises } = await read();
  const exes: Partial<Record<IExerciseId, Partial<Record<keyof IEquipment, IExerciseMeta>>>> = {};
  const ids: string[] = [];
  const productIds: string[] = [];
  for (const exerciseId of ObjectUtils.keys(exerciseMapping)) {
    const equipments = exerciseMapping[exerciseId];
    exes[exerciseId] = exes[exerciseId] || {};
    for (const equipment of ObjectUtils.keys(equipments)) {
      const meta = gymvisualExercises[equipments[equipment]!]!;
      exes[exerciseId]![equipment] = meta;
      ids.push(meta.id);
      const match = meta.pageUrl.match(/\/illustrations\/(\d+)-/);
      productIds.push(match![1]);
    }
  }
  productIds.sort();
  console.log(JSON.stringify(exes, null, 2));

  // toHtml(exes);

  // console.dir(productIds, { depth: null, maxArrayLength: null });
}

main();
