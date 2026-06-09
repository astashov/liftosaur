export interface IImageResizeLayout {
  canvasWidth: number;
  canvasHeight: number;
  imageWidth: number;
  imageHeight: number;
  x: number;
  y: number;
}

// Contain `width`x`height` into a maxWidth:maxHeight-aspect canvas, centered, with padding, capped at
// maxWidth x maxHeight. Same geometry as the web ImageUploader.resizeImage canvas so native and web
// produce identically framed images.
export function ImageResizeLayout_compute(
  width: number,
  height: number,
  maxWidth: number,
  maxHeight: number
): IImageResizeLayout {
  const targetAspect = maxWidth / maxHeight;
  const currentAspect = width / height;
  let canvasWidth: number;
  let canvasHeight: number;
  let imageWidth: number;
  let imageHeight: number;

  if (width > maxWidth || height > maxHeight) {
    canvasWidth = maxWidth;
    canvasHeight = maxHeight;
    if (currentAspect > targetAspect) {
      imageWidth = maxWidth;
      imageHeight = Math.round(maxWidth / currentAspect);
    } else {
      imageHeight = maxHeight;
      imageWidth = Math.round(maxHeight * currentAspect);
    }
  } else {
    imageWidth = width;
    imageHeight = height;
    if (currentAspect > targetAspect) {
      canvasWidth = width;
      canvasHeight = Math.round(width / targetAspect);
    } else {
      canvasHeight = height;
      canvasWidth = Math.round(height * targetAspect);
    }
    if (canvasWidth > maxWidth || canvasHeight > maxHeight) {
      const scale = Math.min(maxWidth / canvasWidth, maxHeight / canvasHeight);
      canvasWidth = Math.round(canvasWidth * scale);
      canvasHeight = Math.round(canvasHeight * scale);
      imageWidth = Math.round(imageWidth * scale);
      imageHeight = Math.round(imageHeight * scale);
    }
  }

  const x = Math.round((canvasWidth - imageWidth) / 2);
  const y = Math.round((canvasHeight - imageHeight) / 2);
  return { canvasWidth, canvasHeight, imageWidth, imageHeight, x, y };
}
