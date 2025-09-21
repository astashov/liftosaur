import { Service } from "../api/service";

export class ImageUploader {
  private readonly MAX_WIDTH = 600;
  private readonly MAX_HEIGHT = 800;

  constructor(private readonly service: Service) {}

  public async uploadImage(file: File): Promise<string> {
    const resizedFile = await this.resizeImage(file);

    // Debug: Display resized image
    const debugImg = document.createElement("img");
    debugImg.src = URL.createObjectURL(resizedFile);
    debugImg.style.position = "fixed";
    debugImg.style.bottom = "10px";
    debugImg.style.right = "10px";
    debugImg.style.border = "2px solid red";
    debugImg.style.maxWidth = "600px";
    debugImg.style.maxHeight = "800px";
    debugImg.style.zIndex = "9999";
    debugImg.title = `Resized: ${resizedFile.size} bytes`;
    document.body.appendChild(debugImg);

    console.log("Debug image added to screen. Size:", resizedFile.size, "bytes");

    // Remove debug image after 10 seconds
    setTimeout(() => {
      if (debugImg.parentNode) {
        debugImg.parentNode.removeChild(debugImg);
        URL.revokeObjectURL(debugImg.src);
      }
    }, 10000);

    const presignedUrlResponse = await this.service.postImageUploadUrl(resizedFile.name, resizedFile.type);
    await this.uploadToS3(presignedUrlResponse.uploadUrl, resizedFile);
    return presignedUrlResponse.imageUrl;
  }

  public async uploadBase64Image(base64Data: string, exerciseId: string): Promise<string> {
    const response = await this.service.client(base64Data);
    const blob = await response.blob();
    const extension = blob.type.split("/")[1] || "png";
    const fileName = `${exerciseId}.${extension}`;
    const file = new File([blob], fileName, { type: blob.type });
    return this.uploadImage(file);
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

        if (width <= this.MAX_WIDTH && height <= this.MAX_HEIGHT) {
          resolve(file);
          return;
        }

        const aspectRatio = width / height;
        const maxAspectRatio = this.MAX_WIDTH / this.MAX_HEIGHT;

        let newWidth: number;
        let newHeight: number;

        if (aspectRatio > maxAspectRatio) {
          newWidth = this.MAX_WIDTH;
          newHeight = Math.round(this.MAX_WIDTH / aspectRatio);
        } else {
          newHeight = this.MAX_HEIGHT;
          newWidth = Math.round(this.MAX_HEIGHT * aspectRatio);
        }

        canvas.width = this.MAX_WIDTH;
        canvas.height = this.MAX_HEIGHT;

        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, this.MAX_WIDTH, this.MAX_HEIGHT);

        // Enable high quality image smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";

        // Step-down approach for better quality when significantly downscaling
        if (width > this.MAX_WIDTH * 2 || height > this.MAX_HEIGHT * 2) {
          // Create temporary canvas for step-down scaling
          const tempCanvas = document.createElement("canvas");
          const tempCtx = tempCanvas.getContext("2d");

          if (tempCtx) {
            // First scale to 2x target size
            const tempWidth = newWidth * 2;
            const tempHeight = newHeight * 2;
            tempCanvas.width = tempWidth;
            tempCanvas.height = tempHeight;

            tempCtx.imageSmoothingEnabled = true;
            tempCtx.imageSmoothingQuality = "high";
            tempCtx.drawImage(img, 0, 0, tempWidth, tempHeight);

            // Then scale from temp canvas to final size
            const xOffset = Math.round((this.MAX_WIDTH - newWidth) / 2);
            const yOffset = Math.round((this.MAX_HEIGHT - newHeight) / 2);
            ctx.drawImage(tempCanvas, 0, 0, tempWidth, tempHeight, xOffset, yOffset, newWidth, newHeight);
          } else {
            // Fallback to direct scaling
            const xOffset = Math.round((this.MAX_WIDTH - newWidth) / 2);
            const yOffset = Math.round((this.MAX_HEIGHT - newHeight) / 2);
            ctx.drawImage(img, xOffset, yOffset, newWidth, newHeight);
          }
        } else {
          // Direct scaling for smaller reductions
          const xOffset = Math.round((this.MAX_WIDTH - newWidth) / 2);
          const yOffset = Math.round((this.MAX_HEIGHT - newHeight) / 2);
          ctx.drawImage(img, xOffset, yOffset, newWidth, newHeight);
        }

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const resizedFile = new File([blob], file.name, {
                type: "image/jpeg",
                lastModified: Date.now(),
              });
              console.log(`Resized image from ${img.width}x${img.height} to ${this.MAX_WIDTH}x${this.MAX_HEIGHT}`);
              resolve(resizedFile);
            } else {
              reject(new Error("Failed to create blob from canvas"));
            }
          },
          "image/jpeg",
          0.95 // Increased quality from 0.9 to 0.95
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
