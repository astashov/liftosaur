export function HealthSyncIdConflict_isSupersededByWatch(error: unknown): boolean {
  const message = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  return /Workout with UUID .* has not yet been saved/.test(message);
}
