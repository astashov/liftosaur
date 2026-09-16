export type IPushPlatform = "ios" | "android";

// SNS platform applications have no CloudFormation resource (aws/aws-cdk#36681), so they are created once
// with `aws sns create-platform-application`.
export const PushPlatforms_arns: Record<"dev" | "prod", Record<IPushPlatform, string>> = {
  dev: {
    ios: "arn:aws:sns:us-west-2:366191129585:app/APNS_SANDBOX/LiftosaurIosDev",
    android: "arn:aws:sns:us-west-2:366191129585:app/GCM/LiftosaurAndroid",
  },
  prod: {
    ios: "arn:aws:sns:us-west-2:366191129585:app/APNS/LiftosaurIosProd",
    android: "arn:aws:sns:us-west-2:366191129585:app/GCM/LiftosaurAndroid",
  },
};

export function PushPlatforms_apnsKey(env: "dev" | "prod"): "APNS" | "APNS_SANDBOX" {
  return env === "dev" ? "APNS_SANDBOX" : "APNS";
}

export function PushPlatforms_isPlatform(value: unknown): value is IPushPlatform {
  return value === "ios" || value === "android";
}
