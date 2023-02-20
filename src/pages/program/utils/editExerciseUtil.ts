export namespace EditExerciseUtil {
  export function getKey(exerciseId: string, day?: number): string {
    return `${exerciseId}${day != null ? `-${day}` : ""}`;
  }
}
