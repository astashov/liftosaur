import fs from "fs";
import upng, { Image } from "upng-js";
import path from "path";
import childProcess from "child_process";

interface IColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

interface IPoint {
  x: number;
  y: number;
}

interface IBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

function pointToStr(point: IPoint): string {
  return `${point.x}_${point.y}`;
}

function maybeAddPoint(image: Image, points: IPoint[], visitedPoints: Set<string>, point: IPoint): void {
  if (!visitedPoints.has(pointToStr(point))) {
    const color = getColorAt(image, point);
    if (color.a > 0) {
      points.push(point);
    }
  }
}

function getNeighbors(image: Image, points: Set<string>, point: IPoint): IPoint[] {
  const { x, y } = point;
  const neighbors: IPoint[] = [];
  if (y > 0) {
    maybeAddPoint(image, neighbors, points, { x: x, y: y - 1 });
  }
  if (y < image.height) {
    maybeAddPoint(image, neighbors, points, { x: x, y: y + 1 });
  }
  if (x > 0) {
    maybeAddPoint(image, neighbors, points, { x: x - 1, y: y });
  }
  if (x < image.width) {
    maybeAddPoint(image, neighbors, points, { x: x + 1, y: y });
  }
  return neighbors;
}

function traversePoints(image: Image, startingPoint: IPoint): Set<string> {
  const points: Set<string> = new Set();
  const stack = [startingPoint];
  while (stack.length > 0) {
    const point = stack.pop()!;
    const neighbors = getNeighbors(image, points, point);
    for (const n of neighbors) {
      points.add(pointToStr(n));
      stack.push(n);
    }
  }
  return points;
}

function findBoundingBox(points: Set<string>): IBox {
  let x1 = Infinity;
  let x2 = 0;
  let y1 = Infinity;
  let y2 = 0;
  console.log("points size", points.size);
  for (const p of points) {
    const [x, y] = p.split("_").map((t) => parseInt(t, 10));
    if (x < x1) {
      x1 = x;
    }
    if (x > x2) {
      x2 = x;
    }
    if (y < y1) {
      y1 = y;
    }
    if (y > y2) {
      y2 = y;
    }
  }
  return { x: x1, width: x2 - x1, y: y1, height: y2 - y1 };
}

function findBoundingBoxes(filename: string): IBox[] {
  const arrayBuffer: Buffer = fs.readFileSync(filename);

  const image = upng.decode(arrayBuffer);
  const handledPoints = new Set();
  const blobs: Set<string>[] = [];

  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      const point = { x, y };
      const pointStr = pointToStr(point);
      const color = getColorAt(image, point);
      if (color.a > 0 && !handledPoints.has(pointStr)) {
        const pointsBlob = traversePoints(image, point);
        for (const p of pointsBlob) {
          handledPoints.add(p);
        }
        blobs.push(pointsBlob);
      }
    }
  }
  return blobs
    .filter((b) => b.size > 0)
    .map((b) => findBoundingBox(b))
    .filter((b) => b.width > 20);
}

function getColorAt(image: Image, point: IPoint): IColor {
  const { x, y } = point;
  const begin = y * image.width * 4 + x * 4;
  const color: Uint8Array = image.data.slice(begin, begin + 4) as Uint8Array;
  return {
    r: color[0],
    g: color[1],
    b: color[2],
    a: color[3],
  };
}

function containFit(fromRect: IBox, toRect: IBox, origin: IPoint): IBox {
  const scale = Math.min(toRect.width / fromRect.width, toRect.height / fromRect.height);
  const newWidth = fromRect.width * scale;
  const newHeight = fromRect.height * scale;

  return {
    x: origin.x - newWidth * ((origin.x - toRect.x) / toRect.width),
    y: origin.y - newHeight * ((origin.y - toRect.y) / toRect.height),
    width: newWidth,
    height: newHeight,
  };
}

function main(): void {
  const dirImgs = "/Users/anton/projects/liftosaur-imgs";

  const dirs = fs
    .readdirSync(dirImgs, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  const csv = fs
    .readFileSync("list2.csv", { encoding: "utf-8" })
    .split("\n")
    .reduce<Record<string, number>>((memo, line) => {
      const [ex, ...vars] = line.split(",").map((l) => l.trim());
      memo[ex] = vars.findIndex((v) => v === "1");
      return memo;
    }, {});

  // const list = [
  //   "shrug_cable",
  //   "seatedRow_band",
  //   "reverseFly_band",
  //   "reverseCurl_cable",
  //   "reverseCurl_band",
  //   "pushPress_bodyweight",
  //   "preacherCurl_barbell",
  //   "kneelingPulldown_band",
  //   "hipThrust_band",
  //   "hipAbductor_band",
  //   "hammerCurl_band",
  //   "facePull_band",
  //   "deadlift_band",
  //   "bulgarianSplitSquat_dumbbell",
  //   "bentOverRow_dumbbell",
  //   "bentOverRow_band",
  // ];

  for (const dir of dirs) {
    const [, , exerciseName, exerciseEquipment] = dir.match(/(\d+)_(\w+)_(\w+)/)!;
    // if (list.every((l) => l !== `${exerciseName}_${exerciseEquipment}`)) {
    //   continue;
    // }
    console.log(dir);
    const files = fs
      .readdirSync(path.join(dirImgs, dir), { withFileTypes: true })
      .filter((d) => d.isFile())
      .map((d) => d.name);
    console.log(files);
    const file = files.find((f) => /_medium/.test(f))!;
    const filename = path.join(dirImgs, dir, file);
    const finalFilename = path.join(
      "/Users/anton/projects/liftosaur-imgs-final",
      `${exerciseName}_${exerciseEquipment}_single.png`
    );
    console.log(finalFilename);
    const boundingBoxes = findBoundingBoxes(filename);
    boundingBoxes.sort((a, b) => a.x - b.x);
    const boxIndex = csv[dir];
    console.log("Bounding boxes", boundingBoxes);
    console.log("Index", boxIndex);
    const box = boundingBoxes[boxIndex];
    childProcess.execSync(
      `convert '${filename}' -crop ${box.width}x${box.height}+${box.x}+${box.y} ${path.join(
        dirImgs,
        dir,
        "intermediate1.png"
      )}`
    );
    childProcess.execSync(
      `convert ${path.join(dirImgs, dir, "intermediate1.png")} -resize 400x600 ${path.join(
        dirImgs,
        dir,
        "intermediate2.png"
      )}`
    );
    childProcess.execSync(
      `convert ${path.join(
        dirImgs,
        dir,
        "intermediate2.png"
      )} -background transparent -gravity center -extent 400x600 ${finalFilename.toLowerCase()}`
    );
  }
}

main();
