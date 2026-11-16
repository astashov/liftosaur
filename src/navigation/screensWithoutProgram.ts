const screensWithoutProgram: ReadonlySet<string> = new Set([
  "first",
  "onboarding",
  "units",
  "programs",
  "programPreview",
  "setupequipment",
  "setupplates",
  "equipmentDetail",
  "hearaboutus",
  "programselect",
  "friends",
  "friendInvite",
  "followInvite",
  "friendRequest",
  "friendFollower",
  "friendProfile",
  "friendPrograms",
  "friendProgram",
]);

export function ScreensWithoutProgram_allows(screen: string): boolean {
  return screensWithoutProgram.has(screen);
}
