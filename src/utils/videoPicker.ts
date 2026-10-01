import { IVideoPick } from "./videoPick";

export async function VideoPicker_pick(source: "camera" | "photo-library"): Promise<IVideoPick | undefined> {
  if (source === "camera") {
    return undefined;
  }
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "video/mp4,video/quicktime,video/*";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(undefined);
        return;
      }
      resolve({ uri: URL.createObjectURL(file), type: file.type || undefined, size: file.size });
    };
    input.click();
  });
}
