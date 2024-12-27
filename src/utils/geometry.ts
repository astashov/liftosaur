import { IRect } from "./types";

export class Geometry {
  public static fitRectIntoRect(rect: IRect, into: IRect): IRect {
    const scale = Math.min(into.width / rect.width, into.height / rect.height);
    const width = rect.width * scale;
    const height = rect.height * scale;
    return {
      x: into.x + (into.width - width) / 2,
      y: into.y + (into.height - height) / 2,
      width,
      height,
    };
  }

  public static rectCenter(rect: IRect): { x: number; y: number } {
    return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
  }
}
