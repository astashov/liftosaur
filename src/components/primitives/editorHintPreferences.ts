export function EditorHintPreferences_setDismissed(helps: string[], helpId: string, dismissed: boolean): string[] {
  if (dismissed) {
    return helps.includes(helpId) ? helps : [...helps, helpId];
  }
  return helps.filter((h) => h !== helpId);
}
