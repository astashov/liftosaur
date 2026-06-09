import RNFS from "react-native-fs";
import { Service } from "../api/service";
import NativeImageResizer from "../specs/NativeLiftosaurImageResizer";
import { ImageResizeLayout_compute } from "./imageResizeLayout";

// Matches the web ImageUploader canvas (MAX_WIDTH/MAX_HEIGHT) so native and web produce the same
// 2:3-padded PNG.
const MAX_WIDTH = 600;
const MAX_HEIGHT = 900;
const TRANSPARENT = 0x00000000;

export class ImageUploader {
  constructor(private readonly service: Service) {}

  // The arg is a local file:// uri from imagePicker.native.ts. The native module only does pixels
  // (getSize + drawToCanvas) - the 2:3 framing/padding geometry is computed here in JS via the same
  // layout function the web canvas uses. We then stream the result to S3 with react-native-fs, since
  // RN's fetch polyfill can't read file:// uris into a body and Hermes has no DOM/canvas.
  public async uploadBase64Image(uri: string, exerciseId: string): Promise<string> {
    const size = await NativeImageResizer.getSize(uri);
    const layout = ImageResizeLayout_compute(size.width, size.height, MAX_WIDTH, MAX_HEIGHT);
    const resizedUri = await NativeImageResizer.drawToCanvas(
      uri,
      layout.canvasWidth,
      layout.canvasHeight,
      layout.x,
      layout.y,
      layout.imageWidth,
      layout.imageHeight,
      "png",
      1,
      TRANSPARENT
    );
    return this.upload(resizedUri, exerciseId, "image/png");
  }

  public async uploadImage(_file: File, _exerciseId: string): Promise<string> {
    throw new Error("uploadImage is web-only; native uses uploadBase64Image with a file uri");
  }

  private async upload(uri: string, exerciseId: string, contentType: string): Promise<string> {
    const extension = contentType.split("/")[1] || "jpg";
    const fileName = `${exerciseId}.${extension}`;
    const presignedUrlResponse = await this.service.postImageUploadUrl(fileName, contentType);
    const filepath = decodeURIComponent(uri.replace(/^file:\/\//, ""));
    const { promise } = RNFS.uploadFiles({
      toUrl: presignedUrlResponse.uploadUrl,
      method: "PUT",
      binaryStreamOnly: true,
      headers: { "Content-Type": contentType },
      files: [{ name: "file", filename: fileName, filepath, filetype: contentType }],
    });
    const result = await promise;
    if (result.statusCode < 200 || result.statusCode >= 300) {
      throw new Error(`Failed to upload image to S3: ${result.statusCode}`);
    }
    return presignedUrlResponse.imageUrl;
  }
}
