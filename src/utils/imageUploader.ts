import { Service } from "../api/service";

export class ImageUploader {
  private readonly MAX_WIDTH = 600;
  private readonly MAX_HEIGHT = 900;

  constructor(private readonly service: Service) {}

  public async uploadImage(file: File, exerciseId: string): Promise<string> {
    const extension = file.name.split(".").pop() || "png";
    const fileName = `${exerciseId}.${extension}`;
    const resizedFile = await this.resizeImage(file);
    const presignedUrlResponse = await this.service.postImageUploadUrl(fileName, resizedFile.type);
    await this.uploadToS3(presignedUrlResponse.uploadUrl, resizedFile);
    return presignedUrlResponse.imageUrl;
  }

  public async uploadBase64Image(base64Data: string, exerciseId: string): Promise<string> {
    const response = await this.service.client(base64Data);
    const blob = await response.blob();
    const extension = blob.type.split("/")[1] || "png";
    const fileName = `${exerciseId}.${extension}`;
    const file = new File([blob], fileName, { type: blob.type });
    return this.uploadImage(file, exerciseId);
  }

  private async resizeImage(file: File): Promise<File> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        reject(new Error("Could not get canvas context"));
        return;
      }

      img.onload = () => {
        const width = img.width;
        const height = img.height;
        const currentAspectRatio = width / height;
        const targetAspectRatio = this.MAX_WIDTH / this.MAX_HEIGHT;

        let canvasWidth: number;
        let canvasHeight: number;
        let imageWidth: number;
        let imageHeight: number;

        if (width > this.MAX_WIDTH || height > this.MAX_HEIGHT) {
          canvasWidth = this.MAX_WIDTH;
          canvasHeight = this.MAX_HEIGHT;

          if (currentAspectRatio > targetAspectRatio) {
            imageWidth = this.MAX_WIDTH;
            imageHeight = Math.round(this.MAX_WIDTH / currentAspectRatio);
          } else {
            imageHeight = this.MAX_HEIGHT;
            imageWidth = Math.round(this.MAX_HEIGHT * currentAspectRatio);
          }
        } else {
          imageWidth = width;
          imageHeight = height;

          if (currentAspectRatio > targetAspectRatio) {
            canvasWidth = width;
            canvasHeight = Math.round(width / targetAspectRatio);
          } else {
            canvasHeight = height;
            canvasWidth = Math.round(height * targetAspectRatio);
          }

          if (canvasWidth > this.MAX_WIDTH || canvasHeight > this.MAX_HEIGHT) {
            const scale = Math.min(this.MAX_WIDTH / canvasWidth, this.MAX_HEIGHT / canvasHeight);
            canvasWidth = Math.round(canvasWidth * scale);
            canvasHeight = Math.round(canvasHeight * scale);
            imageWidth = Math.round(imageWidth * scale);
            imageHeight = Math.round(imageHeight * scale);
          }
        }

        if (width === canvasWidth && height === canvasHeight) {
          resolve(file);
          return;
        }

        canvas.width = canvasWidth;
        canvas.height = canvasHeight;

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";

        const xOffset = Math.round((canvasWidth - imageWidth) / 2);
        const yOffset = Math.round((canvasHeight - imageHeight) / 2);

        if (width > imageWidth * 2 || height > imageHeight * 2) {
          const tempCanvas = document.createElement("canvas");
          const tempCtx = tempCanvas.getContext("2d");

          if (tempCtx) {
            const tempWidth = imageWidth * 2;
            const tempHeight = imageHeight * 2;
            tempCanvas.width = tempWidth;
            tempCanvas.height = tempHeight;

            tempCtx.imageSmoothingEnabled = true;
            tempCtx.imageSmoothingQuality = "high";
            tempCtx.drawImage(img, 0, 0, tempWidth, tempHeight);

            ctx.drawImage(tempCanvas, 0, 0, tempWidth, tempHeight, xOffset, yOffset, imageWidth, imageHeight);
          } else {
            ctx.drawImage(img, xOffset, yOffset, imageWidth, imageHeight);
          }
        } else {
          ctx.drawImage(img, xOffset, yOffset, imageWidth, imageHeight);
        }

        const isPng = file.type === "image/png";
        const outputType = isPng ? "image/png" : "image/jpeg";
        const quality = isPng ? undefined : 0.95;

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const resizedFile = new File([blob], file.name, {
                type: outputType,
                lastModified: Date.now(),
              });
              console.log(`Processed image from ${width}x${height} to ${canvasWidth}x${canvasHeight} canvas`);
              resolve(resizedFile);
            } else {
              reject(new Error("Failed to create blob from canvas"));
            }
          },
          outputType,
          quality
        );
      };

      img.onerror = () => {
        reject(new Error("Failed to load image"));
      };

      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };
      reader.onerror = () => {
        reject(new Error("Failed to read file"));
      };
      reader.readAsDataURL(file);
    });
  }

  private async uploadToS3(uploadUrl: string, file: File): Promise<void> {
    console.log("Uploading image to S3", { uploadUrl, fileName: file.name, fileType: file.type });
    const response = await this.service.client(uploadUrl, {
      method: "PUT",
      body: file,
      headers: {
        "Content-Type": file.type,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to upload image to S3: ${response.statusText}`);
    }
  }
}
