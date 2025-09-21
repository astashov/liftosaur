import { S3Event } from "aws-lambda";
import sharp from "sharp";
import { buildDi } from "./utils/di";
import { LogUtil } from "./utils/log";
import fetch from "node-fetch";

const MAX_WIDTH = 600;
const MAX_HEIGHT = 900;

export const handler = async (event: S3Event): Promise<void> => {
  const di = buildDi(new LogUtil(), fetch);

  for (const record of event.Records) {
    const bucket = record.s3.bucket.name;
    const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, " "));

    if (!key.startsWith("user-uploads/")) {
      di.log.log("Skipping non-user upload:", key);
      continue;
    }

    try {
      const getObjectResult = await di.s3.getObject({ bucket, key });

      if (!getObjectResult) {
        di.log.log("No body in S3 object");
        continue;
      }

      const image = sharp(getObjectResult as Buffer);
      const metadata = await image.metadata();

      if (!metadata.width || !metadata.height) {
        di.log.log("Could not get image dimensions");
        continue;
      }

      const targetAspectRatio = MAX_WIDTH / MAX_HEIGHT;
      const currentAspectRatio = metadata.width / metadata.height;

      let canvasWidth: number;
      let canvasHeight: number;

      if (metadata.width > MAX_WIDTH || metadata.height > MAX_HEIGHT) {
        canvasWidth = MAX_WIDTH;
        canvasHeight = MAX_HEIGHT;
      } else {
        if (currentAspectRatio > targetAspectRatio) {
          canvasWidth = metadata.width;
          canvasHeight = Math.round(metadata.width / targetAspectRatio);
        } else {
          canvasHeight = metadata.height;
          canvasWidth = Math.round(metadata.height * targetAspectRatio);
        }

        if (canvasWidth > MAX_WIDTH || canvasHeight > MAX_HEIGHT) {
          const scale = Math.min(MAX_WIDTH / canvasWidth, MAX_HEIGHT / canvasHeight);
          canvasWidth = Math.round(canvasWidth * scale);
          canvasHeight = Math.round(canvasHeight * scale);
        }
      }

      if (metadata.width === canvasWidth && metadata.height === canvasHeight) {
        di.log.log(`Image ${key} already has correct dimensions ${canvasWidth}x${canvasHeight}`);
        continue;
      }

      const resizedImage = await image
        .resize(canvasWidth, canvasHeight, {
          fit: "contain",
          background: { r: 255, g: 255, b: 255, alpha: 1 },
          withoutEnlargement: true,
        })
        .jpeg({ quality: 90 })
        .toBuffer();

      await di.s3.putObject({
        bucket,
        key,
        body: resizedImage,
        opts: {
          contentType: "image/jpeg",
        },
      });

      di.log.log(
        `Successfully processed ${key} from ${metadata.width}x${metadata.height} to ${canvasWidth}x${canvasHeight} canvas with white padding`
      );
    } catch (error) {
      di.log.log(`Error resizing ${key}:`, error);
    }
  }
};
