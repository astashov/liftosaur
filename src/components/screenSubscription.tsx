import { JSX } from "react";
import { View, Pressable, Platform } from "react-native";
import { SvgUri } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "./primitives/text";
import { Tailwind_semantic } from "../utils/tailwindConfig";
import { IDispatch } from "../ducks/types";
import { Dialog_alert } from "../utils/dialog";
import { NavScreenContent } from "../navigation/NavScreenContent";
import { useNavOptions } from "../navigation/useNavOptions";
import {
  IAppleOffer,
  IGoogleOffer,
  INavCommon,
  IOfferData,
  IState,
  ISubscriptionLoading,
  updateState,
} from "../models/state";
import { IconBarbell } from "./icons/iconBarbell";
import { IconGraphs } from "./icons/iconGraphs";
import { Button } from "./button";
import {
  SendMessage_isIos,
  SendMessage_isAndroid,
  SendMessage_toIos,
  SendMessage_iosAppVersion,
  SendMessage_androidAppVersion,
} from "../utils/sendMessage";
import { IAP_subscribeMonthly, IAP_subscribeYearly, IAP_buyLifetime, IAP_restorePurchases } from "../utils/iap";
import { LinkButton } from "./linkButton";
import { IconBell } from "./icons/iconBell";
import { lb } from "lens-shmens";
import { IconSpinner } from "./icons/iconSpinner";
import { IHistoryRecord, ISubscription } from "../types";
import { Thunk_pullScreen, Thunk_claimkey } from "../ducks/thunks";
import { IconClose } from "./icons/iconClose";
import { navigationRef } from "../navigation/navigationRef";
import { ObjectUtils_entries, ObjectUtils_keys } from "../utils/object";
import { lg } from "../utils/posthog";
import { IconW } from "./icons/iconW";
import { IconWatch } from "./icons/iconWatch";
import { IconLink } from "./icons/iconLink";
import { HostConfig_resolveUrl } from "../utils/hostConfig";
import { InternalLink } from "../internalLink";

interface IProps {
  prices?: Partial<Record<string, string>>;
  offers?: Partial<Record<string, IOfferData[]>>;
  subscription: ISubscription;
  appleOffer?: IAppleOffer;
  googleOffer?: IGoogleOffer;
  subscriptionLoading?: ISubscriptionLoading;
  history: IHistoryRecord[];
  dispatch: IDispatch;
  navCommon: INavCommon;
}

function isNativeSubscriptionRuntime(): boolean {
  return SendMessage_isIos() || SendMessage_isAndroid() || Platform.OS === "ios" || Platform.OS === "android";
}

function getFooterShadowStyle(semantic: ReturnType<typeof Tailwind_semantic>): Record<string, unknown> {
  return Platform.select({
    ios: {
      shadowColor: semantic.background.default === "#000000" ? "#fff" : "#000",
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
    },
    android: { elevation: 4 },
    default: {},
  }) as Record<string, unknown>;
}

export function ScreenSubscription(props: IProps): JSX.Element {
  const insets = useSafeAreaInsets();
  const footerShadow = getFooterShadowStyle(Tailwind_semantic());
  const monthlyPrice =
    ObjectUtils_entries(props.prices || {}).filter(([k]) => k.indexOf("mont") !== -1)?.[0]?.[1] ?? "$4.99";
  const yearlyPrice =
    ObjectUtils_entries(props.prices || {}).filter(([k]) => k.indexOf("year") !== -1)?.[0]?.[1] ?? "$39.99";
  const lifetimePrice =
    ObjectUtils_entries(props.prices || {}).filter(([k]) => k.indexOf("lifetime") !== -1)?.[0]?.[1] ?? "$99.99";
  let monthlyOffer: IOfferData | undefined = undefined;
  let yearlyOffer: IOfferData | undefined = undefined;
  for (const productId of ObjectUtils_keys(props.offers || {})) {
    monthlyOffer =
      monthlyOffer ||
      props.offers?.[productId]?.find((o) => {
        return o.offerId === props.appleOffer?.monthly?.offerId || o.offerId === props.googleOffer?.monthly?.offerId;
      });
    yearlyOffer =
      yearlyOffer ||
      props.offers?.[productId]?.find((o) => {
        return o.offerId === props.appleOffer?.yearly?.offerId || o.offerId === props.googleOffer?.yearly?.offerId;
      });
  }
  const hasOffer = monthlyOffer || yearlyOffer;
  const supportsLifetime =
    (SendMessage_isIos() && SendMessage_iosAppVersion() >= 8) ||
    (SendMessage_isAndroid() && SendMessage_androidAppVersion() >= 15) ||
    Platform.OS === "ios" ||
    Platform.OS === "android";

  useNavOptions({
    navTitle: (
      <Text className="text-base font-semibold">
        <Text className="text-base">⭐</Text> <Text className="text-lg font-semibold">Liftosaur Premium</Text>{" "}
        <Text className="text-base">⭐</Text>
      </Text>
    ),
    navRightButtons: [
      <Pressable
        key="close"
        className="p-2 nm-back"
        data-testid="navbar-back"
        testID="navbar-back"
        onPress={() => {
          props.dispatch(Thunk_pullScreen());
        }}
      >
        <IconClose />
      </Pressable>,
    ],
  });

  const footer = (
    <View
      className="w-full px-2 py-2 bg-background-default footer-shadow"
      style={[footerShadow, { paddingBottom: insets.bottom + 8 }]}
    >
      {props.subscription.key === "unclaimed" ? (
        <View className="flex-row items-center px-2">
          <View className="flex-1">
            <Text className="text-xs text-text-secondary">
              You were granted the <Text className="font-bold">free access</Text> to Liftosaur!
            </Text>
          </View>
          <View>
            <Button
              name="subscription-free"
              onPress={() => props.dispatch(Thunk_claimkey())}
              kind="purple"
              testID="button-subscription-free"
              buttonSize="lg"
            >
              Get it!
            </Button>
          </View>
        </View>
      ) : (
        <View>
          <View className="flex-row">
            <View className="flex-1 px-2">
              {!hasOffer && (
                <Text className="text-xs text-center text-text-secondary">Includes free 14 days trial</Text>
              )}
              <Button
                style={{ paddingVertical: 12, paddingHorizontal: 8 }}
                name="subscription-monthly"
                onPress={() => {
                  if (isNativeSubscriptionRuntime()) {
                    lg("start-subscription-monthly");
                    void IAP_subscribeMonthly({
                      applePromo: props.appleOffer?.monthly,
                      googlePromo: props.googleOffer?.monthly,
                    });
                    updateState(
                      props.dispatch,
                      [lb<IState>().p("subscriptionLoading").record({ monthly: true })],
                      "Start monthly subscription"
                    );
                  } else {
                    webAlert();
                  }
                }}
                className="w-full"
                kind="purple"
                testID="button-subscription-monthly"
              >
                {!props.subscriptionLoading?.monthly ? (
                  <Text className="text-xs font-semibold text-text-alwayswhite">
                    {monthlyOffer ? (
                      <>
                        <Text className="mr-1 text-xs font-normal line-through text-text-alwayswhite">
                          {monthlyPrice}
                        </Text>
                        <Text className="text-xs font-bold text-text-alwayswhite">{monthlyOffer.formattedPrice}</Text>
                      </>
                    ) : (
                      <Text className="text-xs text-text-alwayswhite">{monthlyPrice}</Text>
                    )}
                    <Text className="text-xs text-text-alwayswhite">/month</Text>
                  </Text>
                ) : (
                  <IconSpinner color="white" width={18} height={18} />
                )}
              </Button>
            </View>
            <View className="flex-1 px-2">
              {!hasOffer && (
                <Text className="text-xs text-center text-text-secondary">Includes free 14 days trial</Text>
              )}
              <Button
                name="subscription-yearly"
                style={{ paddingVertical: 12, paddingHorizontal: 8 }}
                onPress={() => {
                  if (isNativeSubscriptionRuntime()) {
                    lg("start-subscription-yearly");
                    void IAP_subscribeYearly({
                      applePromo: props.appleOffer?.yearly,
                      googlePromo: props.googleOffer?.yearly,
                    });
                    updateState(
                      props.dispatch,
                      [lb<IState>().p("subscriptionLoading").record({ yearly: true })],
                      "Start yearly subscription"
                    );
                  } else {
                    webAlert();
                  }
                }}
                className="w-full"
                kind="purple"
                testID="button-subscription-yearly"
              >
                {!props.subscriptionLoading?.yearly ? (
                  <Text className="text-xs font-semibold text-text-alwayswhite">
                    {yearlyOffer ? (
                      <>
                        <Text className="mr-1 text-xs font-normal line-through text-text-alwayswhite">
                          {yearlyPrice}
                        </Text>
                        <Text className="text-xs font-bold text-text-alwayswhite">{yearlyOffer.formattedPrice}</Text>
                      </>
                    ) : (
                      <Text className="text-xs text-text-alwayswhite">{yearlyPrice}</Text>
                    )}
                    <Text className="text-xs text-text-alwayswhite">/year</Text>
                  </Text>
                ) : (
                  <IconSpinner color="white" width={18} height={18} />
                )}
              </Button>
            </View>
          </View>
          {(monthlyOffer || yearlyOffer) && (
            <Text className="pt-1 text-xs text-center text-text-secondary">Discount applies for the first year</Text>
          )}
          {supportsLifetime && (
            <View className="px-2 pt-2">
              <Button
                name="subscription-lifetime"
                onPress={() => {
                  if (isNativeSubscriptionRuntime()) {
                    lg("start-subscription-lifetime");
                    void IAP_buyLifetime();
                    updateState(
                      props.dispatch,
                      [lb<IState>().p("subscriptionLoading").record({ lifetime: true })],
                      "Start lifetime subscription"
                    );
                  } else {
                    webAlert();
                  }
                }}
                className="w-full"
                kind="red"
                testID="button-subscription-lifetime"
              >
                {!props.subscriptionLoading?.lifetime ? (
                  "Lifetime - " + lifetimePrice
                ) : (
                  <IconSpinner color="white" width={18} height={18} />
                )}
              </Button>
            </View>
          )}
        </View>
      )}
      <View className="flex-row py-2">
        <View className="flex-row items-center justify-center flex-1">
          <LinkButton
            name="redeem-coupon"
            onPress={() => {
              if (SendMessage_isIos()) {
                SendMessage_toIos({ type: "redeemCoupon" });
              } else {
                navigationRef.navigate("couponModal");
              }
            }}
            className="text-sm font-bold"
          >
            Redeem coupon
          </LinkButton>
        </View>
        <View className="flex-row items-center justify-center flex-1">
          <InternalLink
            name="terms-of-use"
            href="/terms.html"
            className="text-sm font-bold text-center underline text-text-link"
          >
            Terms of use
          </InternalLink>
        </View>
      </View>
      <View className="flex-row">
        <View className="items-center justify-center flex-1">
          <LinkButton
            name="restore-subscriptions"
            className="text-sm"
            onPress={() => {
              void IAP_restorePurchases(props.dispatch);
            }}
          >
            Restore Subscription
          </LinkButton>
        </View>
      </View>
    </View>
  );

  return (
    <NavScreenContent footer={footer}>
      <View className="flex-1 px-4">
        <View className="items-center pt-2 pb-2">
          <SvgUri uri={HostConfig_resolveUrl("/images/logo.svg")} width={64} height={64} />
        </View>
        <Text className="mb-4 text-sm">
          While you can use Liftosaur for free, there're some features on Liftosaur that require premium access:
        </Text>
        <View>
          <Feature
            icon={<IconBarbell />}
            title="Plates Calculator"
            description="What plates to add to each side of a bar to get the necessary weight"
            onPress={() => navigationRef.navigate("subscriptionInfoModal", { type: "platesCalculator" })}
          />
          <Feature
            icon={<IconGraphs />}
            title="Graphs"
            description="So you could visualize your progress over time"
            onPress={() => navigationRef.navigate("subscriptionInfoModal", { type: "graphs" })}
          />
          <Feature
            icon={<IconBell />}
            title="Rest Timer Notifications"
            description="When it's about to start a new set, you'll get a notification."
            onPress={() => navigationRef.navigate("subscriptionInfoModal", { type: "notifications" })}
          />
          <Feature
            icon={<IconW />}
            title="Week Insights"
            description="Weekly stats about your performance"
            onPress={() => navigationRef.navigate("subscriptionInfoModal", { type: "weekInsights" })}
          />
          <Feature icon={<IconWatch />} title="Apple Watch App" description="Track workouts directly from your wrist" />
          <Feature
            icon={<IconLink />}
            title="API & MCP"
            description="Programmatic access and AI assistant integration"
          />
        </View>
        <Text className="mb-4 text-xs text-text-secondary">
          You can get monthly or yearly subscription (and you'll be charged for a month or year every month or year
          {!hasOffer ? "after initial 14 days free trial period" : ""}) or lifetime - one-time payment, that gives
          access to those features without recurring charges in the future.
        </Text>
        <Text className="mb-4 text-xs text-text-secondary">
          You can cancel subscriptions any time via Google Play or App Store subscriptions management.
        </Text>
      </View>
    </NavScreenContent>
  );
}

function webAlert(): void {
  Dialog_alert(
    "You can only subscribe from an iOS or Android Liftosaur app. Install Liftosaur from Google Play or App Store, subscribe there, then log in in Liftosaur, and use the same login method on the web. That will unlock the premium features on the web."
  );
}

interface IFeatureProps {
  icon: JSX.Element;
  title: string;
  description: string;
  onPress?: () => void;
}

function Feature(props: IFeatureProps): JSX.Element {
  return (
    <Pressable className="flex-row mb-6" onPress={props.onPress}>
      <View className="items-center w-6 pt-1 mr-3">{props.icon}</View>
      <View className="flex-1">
        <View>
          {props.onPress ? (
            <LinkButton name="subscription-feature">{props.title}</LinkButton>
          ) : (
            <Text className="text-base font-bold">{props.title}</Text>
          )}
        </View>
        <Text className="text-sm text-text-primary">{props.description}</Text>
      </View>
    </Pressable>
  );
}
