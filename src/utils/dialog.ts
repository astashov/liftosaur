export async function Dialog_confirm(message: string): Promise<boolean> {
  if (typeof window !== "undefined") {
    return Promise.resolve(window.confirm(message));
  } else {
    return Promise.resolve(false);
  }
}

// The native version is an Alert with one button per option plus Cancel; the browser has no
// multi-button primitive, so each branch is spelled out in the message and dismissing the
// dialog picks the last option rather than cancelling.
export async function Dialog_choice(title: string, message: string, options: string[]): Promise<number | undefined> {
  if (typeof window === "undefined") {
    return Promise.resolve(undefined);
  }
  const spelled = options.map((option, index) => `${index === 0 ? "OK" : "Cancel"} — ${option}`).join("\n");
  return Promise.resolve(window.confirm(`${title}\n\n${message}\n\n${spelled}`) ? 0 : options.length - 1);
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
