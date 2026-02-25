import { SendMessage_isIos, SendMessage_isAndroid } from "./sendMessage";
import { StringUtils_hashCode0To1 } from "./string";

export interface IFeature {
  name: string;
  rollout: number;
  userids: string[];
  platform?: "ios" | "android";
}

const affiliates: IFeature = {
  name: "affiliates",
  rollout: 0.0,
  userids: ["tiolnbjbleke", "txgxmqgyps", "gwwxznaz"],
};

export class Features {
  private static readonly features = {
    affiliates,
  } as const;

  public static isEnabled(name: keyof typeof this.features, userid?: string): boolean {
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
      ((feature.platform === "ios" && !SendMessage_isIos()) ||
        (feature.platform === "android" && !SendMessage_isAndroid()))
    ) {
      return false;
    }
    const hash = StringUtils_hashCode0To1(userid);
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
