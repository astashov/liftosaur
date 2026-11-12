export interface IThanksgivingPromoCode {
  label: string;
  code: string;
}

export const ThanksgivingPromo_helpKey = "thanks26";
export const ThanksgivingPromo_validText = "Valid 24 Nov - 2 Dec 2026";
export const ThanksgivingPromo_imagePath = "/images/thanks25.png";

const startsAt = new Date(2026, 10, 24).getTime();
const endsAt = new Date(2026, 11, 3).getTime();

export function ThanksgivingPromo_isActive(now: number): boolean {
  return now >= startsAt && now < endsAt;
}

export function ThanksgivingPromo_isEligible(args: {
  now: number;
  platform: string;
  hasWorkouts: boolean;
  hasSubscription: boolean;
}): boolean {
  const isNative = args.platform === "ios" || args.platform === "android";
  return isNative && args.hasWorkouts && !args.hasSubscription && ThanksgivingPromo_isActive(args.now);
}

export function ThanksgivingPromo_shouldShowModal(isEligible: boolean, helps: string[]): boolean {
  return isEligible && !helps.includes(ThanksgivingPromo_helpKey);
}

export function ThanksgivingPromo_codes(platform: string): IThanksgivingPromoCode[] {
  if (platform === "ios") {
    return [
      { label: "Monthly code", code: "THANKS26" },
      { label: "Yearly code", code: "THANKS26Y" },
    ];
  }
  return [{ label: "Code", code: "THANKS26" }];
}
