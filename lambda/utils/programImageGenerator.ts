import satori from "satori";
import { Resvg, initWasm } from "@resvg/resvg-wasm";
import * as fs from "fs";
import * as path from "path";
import { IProgramIndexEntry } from "../../src/models/program";
import { ExerciseImageUtils_exists, ExerciseImageUtils_id } from "../../src/models/exerciseImage";
import { equipmentName } from "../../src/models/exercise";
import { Program_exerciseRangeFormat } from "../../src/models/program";
import { StringUtils_pluralize } from "../../src/utils/string";
import { IEither } from "../../src/utils/types";
import { Tailwind } from "../../src/utils/tailwindConfig";

let resvgInitialized = false;
async function initResvgWasm(): Promise<void> {
  if (resvgInitialized) {
    return;
  }
  const wasmPath = require.resolve("@resvg/resvg-wasm/index_bg.wasm");
  const wasmBuf = await fs.promises.readFile(wasmPath);
  await initWasm(wasmBuf);
  resvgInitialized = true;
}

export interface IProgramImageGeneratorArgs {
  indexEntry: IProgramIndexEntry;
  fetch: Window["fetch"];
}

type ISatoriNode = {
  type: string;
  props: Record<string, unknown> & { children?: (ISatoriNode | string)[] };
};

function el(
  type: string,
  props: Record<string, unknown>,
  ...children: (ISatoriNode | string | false | null | undefined)[]
): ISatoriNode {
  return { type, props: { ...props, children: children.filter((c): c is ISatoriNode | string => !!c) } };
}

function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/_(.+?)_/g, "$1")
    .replace(/\[(.+?)\]\(.+?\)/g, "$1")
    .replace(/`(.+?)`/g, "$1")
    .replace(/#+\s/g, "");
}

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) {
    return text;
  }
  return text.slice(0, maxLen - 1) + "\u2026";
}

const sem = Tailwind.semantic();
const ICON_COLOR = sem.icon.neutralsubtle;

function iconWatch(width: number, height: number): ISatoriNode {
  return el(
    "svg",
    { width, height, viewBox: "0 0 17 22", fill: "none", xmlns: "http://www.w3.org/2000/svg" },
    el("path", {
      d: "M12.187 6.72466L13.2643 5.24117M6.58297 3.66675H10.2496M8.41667 8.2493V11.9167H12.0833M14.8333 11.9167C14.8333 15.4606 11.9605 18.3334 8.41667 18.3334C4.87283 18.3334 2 15.4606 2 11.9167C2 8.37291 4.87283 5.50008 8.41667 5.50008C11.9605 5.50008 14.8333 8.37291 14.8333 11.9167Z",
      stroke: ICON_COLOR,
      strokeWidth: "1.5",
      strokeLinecap: "round",
      strokeLinejoin: "round",
    })
  );
}

function iconCalendar(size: number): ISatoriNode {
  return el(
    "svg",
    { width: size, height: size, viewBox: "0 0 14 14", fill: "none", xmlns: "http://www.w3.org/2000/svg" },
    el("path", {
      d: "M10.1529 3.2428H3.74706C2.78218 3.2428 2 4.07387 2 5.09905V11.2865C2 12.3117 2.78218 13.1428 3.74706 13.1428H10.1529C11.1178 13.1428 11.9 12.3117 11.9 11.2865V5.09905C11.9 4.07387 11.1178 3.2428 10.1529 3.2428Z",
      stroke: ICON_COLOR,
      strokeLinecap: "round",
      strokeLinejoin: "round",
    }),
    el("path", { d: "M2 6.54285H11.9", stroke: ICON_COLOR, strokeLinecap: "round", strokeLinejoin: "round" }),
    el("path", { d: "M4.2002 2.14282V4.34282", stroke: ICON_COLOR, strokeLinecap: "round", strokeLinejoin: "round" }),
    el("path", { d: "M9.7002 2.14282V4.34282", stroke: ICON_COLOR, strokeLinecap: "round", strokeLinejoin: "round" })
  );
}

function iconKettlebell(size: number): ISatoriNode {
  return el(
    "svg",
    { width: size, height: size, viewBox: "0 0 14 14", fill: "none", xmlns: "http://www.w3.org/2000/svg" },
    el("path", {
      d: "M4.96875 7.14282L4.34705 3.82711C4.23166 3.2117 4.70379 2.64282 5.32993 2.64282H9.67007C10.2962 2.64282 10.7683 3.2117 10.6529 3.82711L10.0312 7.14282",
      stroke: ICON_COLOR,
    }),
    el("path", {
      d: "M9.30261 6.88928C7.59166 6.28746 5.47318 6.56206 4.1662 7.73766C3.4028 8.42434 3 9.33953 3 10.2888C3 11.232 3.39188 12.0895 4.0354 12.7613C4.39642 13.1382 4.95439 13.3303 5.51879 13.3303H9.48121C10.0456 13.3303 10.6036 13.1382 10.9646 12.7613C11.6082 12.0895 12 11.232 12 10.2888C12 10.1941 11.9962 10.1001 11.9885 10.0071C11.8956 8.87296 11.2302 7.86353 10.1194 7.25335C9.86046 7.11113 9.58664 6.98915 9.30261 6.88928Z",
      stroke: ICON_COLOR,
      strokeLinecap: "round",
      strokeLinejoin: "round",
    })
  );
}

async function fetchImageAsDataUri(fetchFn: Window["fetch"], url: string): Promise<string | undefined> {
  try {
    const resp = await fetchFn(url);
    if (!resp.ok) {
      return undefined;
    }
    const buf = Buffer.from(await resp.arrayBuffer());
    const mime = resp.headers.get("content-type") || "image/png";
    return `data:${mime};base64,${buf.toString("base64")}`;
  } catch {
    return undefined;
  }
}

export class ProgramImageGenerator {
  public async generate(args: IProgramImageGeneratorArgs): Promise<IEither<Uint8Array<ArrayBufferLike>, string>> {
    const { indexEntry, fetch: fetchFn } = args;
    const exercises = indexEntry.exercises ?? [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const equipment = (indexEntry.equipment ?? []).map((e) => equipmentName(e as any));
    const exercisesRange = indexEntry.exercisesRange;

    const imageExercises = exercises.filter((e) => ExerciseImageUtils_exists(e, "small"));
    const cdnHost = process.env.HOST || "https://www.liftosaur.com";
    const maxImages = 12;
    const displayExercises = imageExercises.slice(0, maxImages);

    const imageDataUris: (string | undefined)[] = await Promise.all(
      displayExercises.map((e) => {
        const imgId = ExerciseImageUtils_id(e);
        const url = `${cdnHost}/externalimages/exercises/single/small/${imgId}_single_small.png`;
        return fetchImageAsDataUri(fetchFn, url);
      })
    );

    const calendarParts: string[] = [];
    if ((indexEntry.weeksCount ?? 0) > 1) {
      calendarParts.push(`${indexEntry.weeksCount} ${StringUtils_pluralize("week", indexEntry.weeksCount ?? 0)}`);
    }
    if (indexEntry.frequency) {
      calendarParts.push(`${indexEntry.frequency}x/week`);
    }
    if (exercisesRange) {
      calendarParts.push(Program_exerciseRangeFormat(exercisesRange[0], exercisesRange[1]));
    }

    const description = indexEntry.shortDescription ? truncate(stripMarkdown(indexEntry.shortDescription), 180) : "";

    const validImages = displayExercises.map((_, i) => imageDataUris[i]).filter((uri): uri is string => !!uri);

    const card = el(
      "div",
      {
        style: {
          display: "flex",
          flexDirection: "column",
          width: "1200px",
          height: "630px",
          backgroundColor: sem.background.cardyellow,
          border: `4px solid ${sem.border.cardyellow}`,
          borderRadius: "16px",
          padding: "48px",
          fontFamily: "Poppins",
          color: sem.text.primary,
        },
      },
      el(
        "div",
        {
          style: {
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
          },
        },
        el(
          "div",
          {
            style: {
              display: "flex",
              fontSize: "62px",
              fontWeight: 700,
              lineHeight: 1.2,
              flex: 1,
              marginRight: "16px",
            },
          },
          truncate(indexEntry.name, 50)
        ),
        indexEntry.duration
          ? el(
              "div",
              {
                style: {
                  display: "flex",
                  alignItems: "center",
                  flexShrink: 0,
                  fontSize: "34px",
                  color: sem.text.secondary,
                },
              },
              iconWatch(30, 38),
              el("span", { style: { display: "flex", marginLeft: "6px" } }, `${indexEntry.duration}m`)
            )
          : false
      ),
      el(
        "div",
        {
          style: {
            display: "flex",
            fontSize: "24px",
            color: sem.text.secondary,
            marginTop: "4px",
            fontWeight: 400,
            textTransform: "uppercase" as const,
            letterSpacing: "0.05em",
          },
        },
        `by ${indexEntry.author}`
      ),
      description
        ? el(
            "div",
            {
              style: {
                display: "flex",
                fontSize: "26px",
                color: sem.text.secondary,
                marginTop: "24px",
                lineHeight: 1.4,
              },
            },
            description
          )
        : false,
      validImages.length > 0
        ? el(
            "div",
            {
              style: {
                display: "flex",
                flexWrap: "wrap",
                marginTop: "24px",
              },
            },
            ...validImages.map((dataUri) =>
              el("img", {
                src: dataUri,
                width: 80,
                height: 120,
                style: { marginRight: 8, objectFit: "contain" },
              })
            )
          )
        : false,
      el("div", { style: { display: "flex", flex: 1 } }),
      calendarParts.length > 0
        ? el(
            "div",
            {
              style: {
                display: "flex",
                alignItems: "center",
                fontSize: "32px",
                color: sem.text.secondary,
                marginBottom: "8px",
              },
            },
            iconCalendar(32),
            el("span", { style: { display: "flex", marginLeft: "8px" } }, calendarParts.join(", "))
          )
        : false,
      equipment.length > 0
        ? el(
            "div",
            {
              style: {
                display: "flex",
                alignItems: "center",
                fontSize: "32px",
                color: sem.text.secondary,
                marginBottom: "8px",
              },
            },
            iconKettlebell(32),
            el("span", { style: { display: "flex", marginLeft: "8px" } }, truncate(equipment.join(", "), 80))
          )
        : false,
      el(
        "div",
        {
          style: {
            display: "flex",
            fontSize: "26px",
            color: sem.text.secondarysubtle,
            marginTop: "8px",
            fontWeight: 700,
          },
        },
        "liftosaur.com"
      )
    );

    const prefix = process.env.IMGPREFIX || "";
    const [regularFont, boldFont] = await Promise.all([
      fs.promises.readFile(path.join(prefix, "images", "Poppins-Regular.ttf")),
      fs.promises.readFile(path.join(prefix, "images", "Poppins-Bold.ttf")),
    ]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const svg = await satori(card as any, {
      width: 1200,
      height: 630,
      fonts: [
        { name: "Poppins", data: regularFont, weight: 400, style: "normal" },
        { name: "Poppins", data: boldFont, weight: 700, style: "normal" },
      ],
    });

    await initResvgWasm();
    const resvg = new Resvg(svg, { fitTo: { mode: "width", value: 1200 } });
    const png = resvg.render().asPng();
    return { success: true, data: png };
  }
}
