import { SendMessage } from "./sendMessage";
import { StringUtils } from "./string";

export interface IFeature {
  name: string;
  rollout: number;
  userids: string[];
  platform?: "ios" | "android";
}

const newstorage: IFeature = {
  name: "newstorage",
  rollout: 0.05,
  userids: ["tiolnbjbleke", "udvlvsutjj", "gwwxznaz"],
  platform: "ios",
};

export class Features {
  private static features = {
    newstorage,
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
    if (
      feature.platform &&
      ((feature.platform === "ios" && !SendMessage.isIos()) ||
        (feature.platform === "android" && !SendMessage.isAndroid()))
    ) {
      return false;
    }
    const hash = StringUtils.hashCode0To1(userid);
    const isRolloutEnabled = feature.rollout > 0 && hash <= feature.rollout;
    if (isRolloutEnabled) {
      return true;
    }
    if (feature.userids.indexOf(userid) !== -1) {
      return true;
    }
    return false;
  }
}
