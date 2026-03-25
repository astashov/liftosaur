export const docTypes = {
  json: "application/json",
  csv: "text/csv",
} as const;

export function FileImport_pickAndRead(fileTypes: string[]): Promise<string | undefined> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = fileTypes.join(",");
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(undefined);
        return;
      }
      const text = await file.text();
      resolve(text);
    };
    input.oncancel = () => resolve(undefined);
    input.click();
  });
}

export function FileImport_confirm(
  title: string,
  message: string,
  onConfirm: () => void
): void {
  if (confirm(message)) {
    onConfirm();
  }
}
