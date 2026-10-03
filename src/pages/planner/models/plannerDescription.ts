export function PlannerDescription_afterBlur(text: string): string | undefined {
  return text.trim() === "" ? undefined : text;
}
