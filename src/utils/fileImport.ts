export type IFileImportType = "json" | "csv" | "any";

export async function FileImport_pickFile(_fileType: IFileImportType = "any"): Promise<string | undefined> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.style.display = "none";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(undefined);
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result;
        resolve(typeof result === "string" ? result : undefined);
      };
      reader.onerror = () => resolve(undefined);
      reader.readAsText(file);
    };
    input.click();
  });
}

export async function FileImport_confirm(message: string): Promise<boolean> {
  return Promise.resolve(window.confirm(message));
}
