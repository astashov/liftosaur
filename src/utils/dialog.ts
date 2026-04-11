export async function Dialog_confirm(message: string): Promise<boolean> {
  return Promise.resolve(window.confirm(message));
}

export async function Dialog_prompt(message: string): Promise<string | undefined> {
  const result = window.prompt(message);
  return result == null ? undefined : result;
}

export function Dialog_alert(message: string): void {
  window.alert(message);
}
