import { StringUtils } from "./string";

export interface IFeature {
  name: string;
  rollout: number;
  userids: string[];
}

const nativestorage: IFeature = {
  name: "nativestorage",
  rollout: 0.05,
  userids: ["tiolnbjbleke"],
};

export class Features {
  private static features = {
    nativestorage,
  } as const;

  static isEnabled(name: keyof typeof this.features, userid?: string): boolean {
    userid = userid || (typeof window !== "undefined" ? window.tempUserId || undefined : undefined);
    const feature = this.features[name];
    if (!feature) {
      return false;
    }
    if (userid == null) {
      return false;
    }
    const hash = StringUtils.hashCode(userid);
    const isRolloutEnabled = feature.rollout > 0 && feature.rollout >= hash;
    if (isRolloutEnabled) {
      return true;
    }
    if (feature.userids.indexOf(userid) !== -1) {
      return true;
    }
    return false;
  }
}
