import fs from "fs";
import upng, { Image } from "upng-js";
import path from "path";
import { S3Util } from "../lambda/utils/s3";
import { LogUtil } from "../lambda/utils/log";
import util from "util";
import { CollectionUtils } from "./utils/collection";
import childProcess from "child_process";
import { LftS3Buckets } from "../lambda/dao/buckets";

// Usage:
// Extract all images from gymvisual.com into a directory
// Name each directory exerciseid_equipment_boxindex
// Run npx ts-node src/imageExtractorGymVisual.ts source-dir destination-dir
// It'll generate images and upload to S3
// Copy Available Images output to the `exerciseImage.ts` availableSmallImages and availableSmallImages arrays

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
  const arrayBuffer = (fs.readFileSync(filename) as unknown) as ArrayBuffer;

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
  const color: Uint8Array = (image.data.slice(begin, begin + 4) as unknown) as Uint8Array;
  return {
    r: color[0],
    g: color[1],
    b: color[2],
    a: color[3],
  };
}

async function main(): Promise<void> {
  const dirImgs = process.argv[2];

  const dirs = fs
    .readdirSync(dirImgs, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  for (const dir of dirs) {
    const [_, exerciseName, exerciseEquipment, boxIndex] = dir.match(/(\w+)_(\w+)_(\d+)/)!;
    console.log(exerciseName, exerciseEquipment, boxIndex);
    console.log(dir);
    const files = fs
      .readdirSync(path.join(dirImgs, dir), { withFileTypes: true })
      .filter((d) => d.isFile())
      .map((d) => d.name);
    console.log(files);
    const file = files.find((f) => /_medium/.test(f))!;
    const filename = path.join(dirImgs, dir, file);
    const outputDirSmall = path.join(process.argv[3], "single", "small");
    const outputDirLarge = path.join(process.argv[3], "full", "large");
    const finalFilename = path.join(outputDirSmall, `${exerciseName}_${exerciseEquipment}_single_small.png`);
    const finalFilenameLarge = path.join(outputDirLarge, `${exerciseName}_${exerciseEquipment}_full_large.png`);
    console.log(finalFilename);
    const boundingBoxes = findBoundingBoxes(filename);
    boundingBoxes.sort((a, b) => a.x - b.x);
    console.log("Bounding boxes", boundingBoxes);
    console.log("Index", boxIndex);
    const box = boundingBoxes[parseInt(boxIndex, 10)];
    const minX = Math.min(...boundingBoxes.map((b) => b.x));
    const minY = Math.min(...boundingBoxes.map((b) => b.y));
    const maxX = Math.max(...boundingBoxes.map((b) => b.x + b.width));
    const maxY = Math.max(...boundingBoxes.map((b) => b.y + b.height));
    const combinedBoundingBox: IBox = {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
    fs.mkdirSync(outputDirSmall, { recursive: true });
    fs.mkdirSync(outputDirLarge, { recursive: true });
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

    childProcess.execSync(
      `convert '${filename}' -crop ${combinedBoundingBox.width}x${combinedBoundingBox.height}+${
        combinedBoundingBox.x
      }+${combinedBoundingBox.y} ${path.join(dirImgs, dir, "intermediatelarge1.png")}`
    );
    childProcess.execSync(
      `convert ${path.join(dirImgs, dir, "intermediatelarge1.png")} -resize 800x600 ${path.join(
        dirImgs,
        dir,
        "intermediatelarge2.png"
      )}`
    );
    childProcess.execSync(
      `convert ${path.join(
        dirImgs,
        dir,
        "intermediatelarge2.png"
      )} -background transparent -gravity center -extent 800x600 ${finalFilenameLarge.toLowerCase()}`
    );
  }
  await uploadToS3();
  await listAvailableImages();
}

async function uploadToS3(): Promise<void> {
  const outputDirSmall = path.join(process.argv[3], "single", "small");
  const outputDirLarge = path.join(process.argv[3], "full", "large");
  const smallFiles = fs
    .readdirSync(outputDirSmall, { withFileTypes: true })
    .filter((d) => d.isFile())
    .map((d) => d.name);

  const largeFiles = fs
    .readdirSync(outputDirLarge, { withFileTypes: true })
    .filter((d) => d.isFile())
    .map((d) => d.name);

  const logUtil = new LogUtil();
  const s3 = new S3Util(logUtil);

  const smallGroups = CollectionUtils.inGroupsOf(100, smallFiles);
  const largeGroups = CollectionUtils.inGroupsOf(100, largeFiles);

  for (const sf of smallGroups) {
    await Promise.all(
      sf.map((file) =>
        s3.putObject({
          bucket: LftS3Buckets.images,
          key: `exercises/single/small/${file}`,
          body: fs.readFileSync(path.join(outputDirSmall, file)),
          opts: {
            acl: "public-read",
            contentType: "image/png",
          },
        })
      )
    );
  }

  for (const lf of largeGroups) {
    await Promise.all(
      lf.map((file) =>
        s3.putObject({
          bucket: LftS3Buckets.images,
          key: `exercises/full/large/${file}`,
          body: fs.readFileSync(path.join(outputDirLarge, file)),
          opts: {
            acl: "public-read",
            contentType: "image/png",
          },
        })
      )
    );
  }
}

async function listAvailableImages(): Promise<void> {
  const logUtil = new LogUtil();
  const s3 = new S3Util(logUtil);
  const smallList = await s3.listObjects({ bucket: LftS3Buckets.images, prefix: "exercises/single/small" });
  let cleanedSmallList = smallList!.map((l) =>
    l.replace("exercises/single/small/", "").replace("_single_small.png", "").replace("_single.png", "")
  );
  cleanedSmallList.sort();
  cleanedSmallList = Array.from(new Set(cleanedSmallList));
  console.log("Available small images:");
  console.log(util.inspect(cleanedSmallList, { depth: null, colors: true, maxArrayLength: null }));

  const largeList = await s3.listObjects({ bucket: LftS3Buckets.images, prefix: "exercises/full/large" });
  let cleanedLargeList = largeList!.map((l) => l.replace("exercises/full/large/", "").replace("_full_large.png", ""));
  cleanedLargeList.sort();
  cleanedLargeList = Array.from(new Set(cleanedLargeList));

  console.log("");

  console.log("Available large images:");
  console.log(util.inspect(cleanedLargeList, { depth: null, colors: true, maxArrayLength: null }));
}

main();
