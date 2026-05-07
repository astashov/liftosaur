export interface IHealthIosAnchors {
  bodyMass?: string;
  bodyFat?: string;
  waist?: string;
}

export function HealthIosAnchors_decode(raw: string | undefined): IHealthIosAnchors {
  if (!raw) {
    return {};
  }
  try {
    const parsed = JSON.parse(raw) as Partial<IHealthIosAnchors>;
    return {
      bodyMass: typeof parsed.bodyMass === "string" ? parsed.bodyMass : undefined,
      bodyFat: typeof parsed.bodyFat === "string" ? parsed.bodyFat : undefined,
      waist: typeof parsed.waist === "string" ? parsed.waist : undefined,
    };
  } catch {
    return {};
  }
}

export function HealthIosAnchors_encode(anchors: IHealthIosAnchors): string {
  return JSON.stringify(anchors);
}
