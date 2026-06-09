/* eslint-disable @typescript-eslint/naming-convention */
import type { TurboModule } from "react-native";
import { TurboModuleRegistry } from "react-native";

export type ImageSize = { width: number; height: number };

export interface Spec extends TurboModule {
  getSize(uri: string): Promise<ImageSize>;

  // Dumb pixel compositor: fill a canvasWidth x canvasHeight canvas with `backgroundColor`, draw the
  // source image into the rect [destX, destY, destWidth, destHeight], encode as `format` ("png" | "jpeg")
  // and return a file:// uri. All geometry (resize ratio, 2:3 framing, padding) is computed in JS - this
  // only moves pixels. resize = dest smaller than source; pad = canvas bigger than dest; jpg->png = format.
  // `backgroundColor` is a 0xAARRGGBB value (use 0 for transparent - only meaningful with png; jpeg has
  // no alpha, so pass an opaque color or the padding falls back to black).
  drawToCanvas(
    uri: string,
    canvasWidth: number,
    canvasHeight: number,
    destX: number,
    destY: number,
    destWidth: number,
    destHeight: number,
    format: string,
    quality: number,
    backgroundColor: number
  ): Promise<string>;
}

export default TurboModuleRegistry.getEnforcing<Spec>("LiftosaurImageResizer");
