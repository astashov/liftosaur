export async function Dialog_confirm(message: string): Promise<boolean> {
  if (typeof window !== "undefined") {
    return Promise.resolve(window.confirm(message));
  } else {
    return Promise.resolve(false);
  }
}

export async function Dialog_prompt(message: string): Promise<string | undefined> {
  if (typeof window !== "undefined") {
    const result = window.prompt(message);
    return result == null ? undefined : result;
  } else {
    return Promise.resolve(undefined);
  }
}

export function Dialog_alert(message: string): void {
  if (typeof window !== "undefined") {
    window.alert(message);
  }
}
