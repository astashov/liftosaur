import { JSX, useEffect } from "react";
import { View, Pressable, Platform, Image, AppState } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "./primitives/text";
import { Tailwind_semantic } from "../utils/tailwindConfig";
import { IDispatch } from "../ducks/types";
import { Dialog_alert } from "../utils/dialog";
import { NavScreenContent } from "../navigation/NavScreenContent";
import { useNavOptions } from "../navigation/useNavOptions";
import { IAppleOffer, IGoogleOffer, INavCommon, IOfferData, ISubscriptionLoading } from "../models/state";
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
import { LinkButton } from "./linkButton";
import { IconBell } from "./icons/iconBell";
import { IconSpinner } from "./icons/iconSpinner";
import { IHistoryRecord, ISubscription } from "../types";
import {
  Thunk_claimkey,
  Thunk_subscribeMonthly,
  Thunk_subscribeYearly,
  Thunk_buyLifetime,
  Thunk_restorePurchases,
  Thunk_redeemCouponIOS,
  Thunk_switchSubscription,
  Thunk_openManageSubscriptions,
  Thunk_iapRefreshActiveSubscriptions,
  Thunk_iapClearStuckLoadingOnForeground,
} from "../ducks/thunks";
import { IconClose } from "./icons/iconClose";
import { navigateToModal, goBack } from "../navigation/navigationService";
import { ObjectUtils_entries, ObjectUtils_keys } from "../utils/object";
import { lg } from "../utils/posthog";
import { IconWatch } from "./icons/iconWatch";
import { IconLink } from "./icons/iconLink";
import { IconDinoSunglasses } from "./icons/iconDinoSunglasses";
import { ImagePreloader_uri, ImagePreloader_preload } from "../utils/imagePreloader";
import { ISubscriptionInfoType, SubscriptionInfoImages_allPaths } from "./subscriptionInfoImages";
import { InternalLink } from "../internalLink";
import { IIapActiveSubscription } from "../utils/iapAdapter";
import { SubscriptionPlan_derive, ISubscriptionPlanKind, IDerivedSubscriptionPlan } from "../utils/subscriptionPlan";
import { DateUtils_format } from "../utils/date";
import { IconFire } from "./icons/iconFire";

interface IProps {
  prices?: Partial<Record<string, string>>;
  offers?: Partial<Record<string, IOfferData[]>>;
  subscription: ISubscription;
  appleOffer?: IAppleOffer;
  googleOffer?: IGoogleOffer;
  subscriptionLoading?: ISubscriptionLoading;
  subscriptionStatus?: IIapActiveSubscription[];
  ownedLifetime?: boolean;
  history: IHistoryRecord[];
  dispatch: IDispatch;
  navCommon: INavCommon;
}

function isNativeSubscriptionRuntime(): boolean {
  return SendMessage_isIos() || SendMessage_isAndroid() || Platform.OS === "ios" || Platform.OS === "android";
}

function isIosRuntime(): boolean {
  return SendMessage_isIos() || Platform.OS === "ios";
}

interface IFeatureDef {
  key: string;
  icon: JSX.Element;
  title: string;
  description: string;
  infoType?: ISubscriptionInfoType;
  iosOnly?: boolean;
}

function getFeatures(): IFeatureDef[] {
  return [
    {
      key: "plates",
      icon: <IconBarbell />,
      title: "Plates Calculator",
      description: "shows exactly which plates to load on the bar.",
      infoType: "platesCalculator",
    },
    {
      key: "graphs",
      icon: <IconGraphs />,
      title: "Graphs",
      description: "visualize your progress over time.",
      infoType: "graphs",
    },
    {
      key: "notifications",
      icon: <IconBell />,
      title: "Rest Timer Notifications",
      description: "get push notifications when it's time for your next set.",
      infoType: "notifications",
    },
    {
      key: "weekinsights",
      icon: <IconFire />,
      title: "Week Insights",
      description: "personalized performance stats.",
      infoType: "weekInsights",
    },
    {
      key: "watch",
      icon: <IconWatch />,
      title: "Apple Watch App",
      description: "track workouts directly from your wrist",
      infoType: "watch",
      iosOnly: true,
    },
    {
      key: "api",
      icon: <IconLink />,
      title: "API & MCP",
      description:
        "give Claude/ChatGPT/Gemini access to your workouts and programs. Or build your custom integrations.",
      infoType: "mcp",
    },
  ];
}

function planLabel(plan?: ISubscriptionPlanKind): string {
  return plan === "yearly" ? "Yearly" : plan === "monthly" ? "Monthly" : "Premium";
}

export function ScreenSubscription(props: IProps): JSX.Element {
  const insets = useSafeAreaInsets();
  const isIos = isIosRuntime();
  const isNative = isNativeSubscriptionRuntime();

  useEffect(() => {
    for (const path of SubscriptionInfoImages_allPaths()) {
      ImagePreloader_preload(path);
    }
  }, []);

  useEffect(() => {
    props.dispatch(Thunk_iapRefreshActiveSubscriptions());
    // Re-check on foreground so a cancel/change made in the system subscription manager
    // (App Store / Google Play) is reflected when the user comes back to the app.
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        props.dispatch(Thunk_iapRefreshActiveSubscriptions());
        // Give a genuine purchase event a moment to arrive and clear its own spinner first; if the
        // spinner is still up after that, the Android billing sheet was dismissed without buying.
        setTimeout(() => props.dispatch(Thunk_iapClearStuckLoadingOnForeground()), 1000);
      }
    });
    return () => sub.remove();
  }, []);

  const plan = SubscriptionPlan_derive({
    subscription: props.subscription,
    status: props.subscriptionStatus,
    ownedLifetime: props.ownedLifetime,
    isNative,
    isIos,
  });

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
  const hasOffer = !!(monthlyOffer || yearlyOffer);
  const supportsLifetime =
    (SendMessage_isIos() && SendMessage_iosAppVersion() >= 8) ||
    (SendMessage_isAndroid() && SendMessage_androidAppVersion() >= 15) ||
    Platform.OS === "ios" ||
    Platform.OS === "android";

  useNavOptions({ navHidden: true });

  const isUnclaimed = props.subscription.key === "unclaimed";

  if (plan.state === "loading" && !isUnclaimed) {
    return (
      <NavScreenContent>
        <SubscriptionHero />
        <View className="flex-1 items-center justify-center px-4" style={{ paddingBottom: insets.bottom + 16 }}>
          <IconSpinner width={24} height={24} />
          <Text className="mt-3 text-sm text-text-secondary">Checking your subscription…</Text>
        </View>
      </NavScreenContent>
    );
  }

  const isPitch = (plan.state === "none" || plan.state === "premium") && !isUnclaimed;
  const showManagement = plan.state === "subscriber" || plan.state === "cancelled" || plan.state === "premium";
  // Lifetime/free-access users already own everything, so a coupon would be a no-op for them.
  const hasFullAccess = plan.state === "lifetime" || plan.state === "freeaccess" || plan.state === "otherstore";

  return (
    <NavScreenContent>
      <SubscriptionHero />
      <View className="flex-1 px-4" style={{ paddingBottom: insets.bottom + 16 }}>
        {isPitch || isUnclaimed ? <PitchHeader /> : <StatusHeader plan={plan} />}
        <FeatureList isIos={isIos} />
        <View>
          {isUnclaimed ? (
            <ClaimFreeAccess dispatch={props.dispatch} />
          ) : plan.state === "none" ? (
            <PurchaseCards
              dispatch={props.dispatch}
              appleOffer={props.appleOffer}
              googleOffer={props.googleOffer}
              subscriptionLoading={props.subscriptionLoading}
              monthlyPrice={monthlyPrice}
              yearlyPrice={yearlyPrice}
              lifetimePrice={lifetimePrice}
              monthlyOffer={monthlyOffer}
              yearlyOffer={yearlyOffer}
              hasOffer={hasOffer}
              supportsLifetime={supportsLifetime}
            />
          ) : showManagement ? (
            <ManagementActions
              dispatch={props.dispatch}
              plan={plan}
              subscriptionLoading={props.subscriptionLoading}
              lifetimePrice={lifetimePrice}
              supportsLifetime={supportsLifetime}
              isNative={isNative}
            />
          ) : null}
        </View>
        <View className="flex-row py-2 items-center justify-between gap-4">
          {isNative && !hasFullAccess ? (
            <View className="flex-row items-center justify-center">
              <LinkButton
                name="redeem-coupon"
                onPress={() => {
                  if (SendMessage_isIos()) {
                    SendMessage_toIos({ type: "redeemCoupon" });
                  } else if (Platform.OS === "ios") {
                    props.dispatch(Thunk_redeemCouponIOS());
                  } else {
                    navigateToModal("couponModal");
                  }
                }}
                className="text-sm font-bold"
              >
                Redeem coupon
              </LinkButton>
            </View>
          ) : (
            <View />
          )}
          <View className="flex-row items-center justify-between">
            {plan.state === "none" && isNative ? (
              <LinkButton
                name="restore-subscriptions"
                className="text-sm font-bold"
                onPress={() => {
                  props.dispatch(Thunk_restorePurchases({ interactive: true }));
                }}
              >
                Restore Subscription
              </LinkButton>
            ) : (
              <InternalLink
                name="terms-of-use"
                href="/terms.html"
                className="text-sm font-bold underline text-text-link"
              >
                Terms of use
              </InternalLink>
            )}
          </View>
        </View>
        {isPitch && (
          <>
            <Text className="mt-2 mb-4 text-xs text-text-secondary">
              You can get monthly or yearly subscription (and you'll be charged for a month or year every month or year
              {!hasOffer ? " after initial 14 days free trial period" : ""}) or lifetime - one-time payment, that gives
              access to those features without recurring charges in the future.
            </Text>
            <Text className="mb-4 text-xs text-text-secondary">
              You can cancel subscriptions any time via Google Play or App Store subscriptions management.
            </Text>
          </>
        )}
        {plan.state === "none" && isNative && (
          <View className="flex-row">
            <View className="items-center justify-center flex-1">
              <InternalLink
                name="terms-of-use"
                href="/terms.html"
                className="text-sm font-bold text-center underline text-text-link"
              >
                Terms of use
              </InternalLink>
            </View>
          </View>
        )}
      </View>
    </NavScreenContent>
  );
}

function SubscriptionHero(): JSX.Element {
  const insets = useSafeAreaInsets();
  return (
    <View className="bg-background-cardpurple w-full" style={{ paddingTop: insets.top, height: 280 }}>
      <Pressable
        className="absolute z-10 p-2"
        style={{ top: insets.top + 4, right: 8 }}
        data-testid="subscription-close"
        testID="subscription-close"
        onPress={() => goBack()}
      >
        <IconClose size={20} color={Tailwind_semantic().icon.neutral} />
      </Pressable>
      <Image
        className="absolute bottom-4 left-4"
        source={{ uri: ImagePreloader_uri("/images/subscriptionhero.png") }}
        style={{ width: "80%", aspectRatio: 879 / 516 }}
        resizeMode="contain"
        accessibilityLabel="Liftosaur Premium features"
      />
      <View className="absolute right-4 bottom-0">
        <IconDinoSunglasses width={102} height={136} />
      </View>
    </View>
  );
}

function PitchHeader(): JSX.Element {
  return (
    <View className="py-4">
      <Text className="text-lg font-semibold">Upgrade your workout routine with Liftosaur Premium:</Text>
    </View>
  );
}

function StatusHeader(props: { plan: IDerivedSubscriptionPlan }): JSX.Element {
  const { plan } = props;
  const dateStr = plan.expirationDate ? DateUtils_format(plan.expirationDate, true) : undefined;

  let title: string;
  let subtitle: string | undefined;
  if (plan.state === "lifetime") {
    title = "🎉 Lifetime Premium";
    subtitle = "All Premium features unlocked forever.";
  } else if (plan.state === "freeaccess") {
    title = "Free access";
    subtitle = "All Premium features unlocked.";
  } else if (plan.state === "cancelled") {
    title = `${planLabel(plan.plan)} — won't renew`;
    subtitle = dateStr ? `Your access ends on ${dateStr}.` : "Your access ends at the end of the current period.";
  } else if (plan.state === "subscriber") {
    title = `✓ Premium — ${planLabel(plan.plan)}`;
    subtitle = dateStr ? `Renews on ${dateStr}.` : undefined;
  } else if (plan.state === "otherstore") {
    title = "✓ Premium";
    subtitle =
      plan.managedOn === "apple"
        ? "You bought this subscription on the App Store. Manage or cancel it from an Apple device."
        : "You bought this subscription on Google Play. Manage or cancel it from an Android device.";
  } else {
    title = "✓ Premium";
    subtitle = "Manage your subscription from the mobile app.";
  }

  return (
    <View className="pt-2 pb-4">
      <Text className="text-2xl font-bold" data-testid="subscription-status-title">
        {title}
      </Text>
      {subtitle && <Text className="mt-1 text-sm text-text-secondary">{subtitle}</Text>}
    </View>
  );
}

function FeatureList(props: { isIos: boolean }): JSX.Element {
  const features = getFeatures().filter((f) => !f.iosOnly || props.isIos);
  return (
    <View className="mb-4">
      {features.map((f) => {
        const infoType = f.infoType;
        return (
          <Feature
            key={f.key}
            icon={f.icon}
            title={f.title}
            description={f.description}
            onPress={infoType ? () => navigateToModal("subscriptionInfoModal", { type: infoType }) : undefined}
          />
        );
      })}
    </View>
  );
}

function ClaimFreeAccess(props: { dispatch: IDispatch }): JSX.Element {
  return (
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
  );
}

interface IPurchaseCardsProps {
  dispatch: IDispatch;
  appleOffer?: IAppleOffer;
  googleOffer?: IGoogleOffer;
  subscriptionLoading?: ISubscriptionLoading;
  monthlyPrice: string;
  yearlyPrice: string;
  lifetimePrice: string;
  monthlyOffer?: IOfferData;
  yearlyOffer?: IOfferData;
  hasOffer: boolean;
  supportsLifetime: boolean;
}

function PurchaseCards(props: IPurchaseCardsProps): JSX.Element {
  const trialNote = !props.hasOffer ? "Free 14-day trial" : undefined;
  return (
    <View>
      <PlanCard
        testID="button-subscription-yearly"
        highlighted={true}
        title="Start with Yearly"
        subtitle={trialNote}
        price={props.yearlyOffer ? props.yearlyOffer.formattedPrice : props.yearlyPrice}
        oldPrice={props.yearlyOffer ? props.yearlyPrice : undefined}
        period="/year"
        badge="Save 33%"
        loading={!!props.subscriptionLoading?.yearly}
        onPress={() => {
          if (isNativeSubscriptionRuntime()) {
            lg("start-subscription-yearly");
            props.dispatch(
              Thunk_subscribeYearly({ applePromo: props.appleOffer?.yearly, googlePromo: props.googleOffer?.yearly })
            );
          } else {
            webAlert();
          }
        }}
      />
      <PlanCard
        testID="button-subscription-monthly"
        title="Start with Monthly"
        subtitle={trialNote}
        price={props.monthlyOffer ? props.monthlyOffer.formattedPrice : props.monthlyPrice}
        oldPrice={props.monthlyOffer ? props.monthlyPrice : undefined}
        period="/month"
        loading={!!props.subscriptionLoading?.monthly}
        onPress={() => {
          if (isNativeSubscriptionRuntime()) {
            lg("start-subscription-monthly");
            props.dispatch(
              Thunk_subscribeMonthly({ applePromo: props.appleOffer?.monthly, googlePromo: props.googleOffer?.monthly })
            );
          } else {
            webAlert();
          }
        }}
      />
      {props.supportsLifetime && (
        <PlanCard
          testID="button-subscription-lifetime"
          title="Lifetime"
          subtitle="One-time payment"
          price={props.lifetimePrice}
          loading={!!props.subscriptionLoading?.lifetime}
          onPress={() => {
            if (isNativeSubscriptionRuntime()) {
              lg("start-subscription-lifetime");
              props.dispatch(Thunk_buyLifetime());
            } else {
              webAlert();
            }
          }}
        />
      )}
      {props.hasOffer && (
        <Text className="pt-1 text-xs text-center text-text-secondary">Discount applies for the first year</Text>
      )}
    </View>
  );
}

interface IManagementActionsProps {
  dispatch: IDispatch;
  plan: IDerivedSubscriptionPlan;
  subscriptionLoading?: ISubscriptionLoading;
  lifetimePrice: string;
  supportsLifetime: boolean;
  isNative: boolean;
}

function ManagementActions(props: IManagementActionsProps): JSX.Element {
  const { plan } = props;
  const isAndroid = isNativeSubscriptionRuntime() && !isIosRuntime();

  if (plan.state === "premium") {
    return (
      <View>
        <Text className="text-xs text-center text-text-secondary">
          Manage your subscription from the Liftosaur mobile app, or your App Store / Play Store account.
        </Text>
      </View>
    );
  }

  const currentPlan = plan.plan;
  const targetPlan: ISubscriptionPlanKind | undefined =
    plan.plan === "yearly" ? "monthly" : plan.plan === "monthly" ? "yearly" : undefined;
  const switchLoading =
    targetPlan === "yearly" ? props.subscriptionLoading?.yearly : props.subscriptionLoading?.monthly;
  const keepLoading = currentPlan ? props.subscriptionLoading?.[currentPlan] : undefined;
  const switchSubtext =
    targetPlan === "yearly"
      ? "Starts at your next renewal."
      : "You'll be credited for the time remaining on your yearly plan.";

  const lifetimeDisabledReason =
    plan.state === "subscriber"
      ? "Cancel your subscription first"
      : plan.expirationDate
        ? `Available after ${DateUtils_format(plan.expirationDate, true)}`
        : "Available after your subscription expires";

  return (
    <View>
      {plan.state === "subscriber" && plan.pendingPlan ? (
        <View
          className="justify-center px-4 py-2 mb-2 border min-h-16 rounded-xl bg-background-cardpurple border-border-cardpurple"
          style={{ borderRadius: 16 }}
          data-testid="subscription-pending-switch"
        >
          <Text className="text-base font-bold text-text-primary">Switching to {planLabel(plan.pendingPlan)}</Text>
          <Text className="text-xs text-text-secondary">
            {plan.expirationDate
              ? `Takes effect on ${DateUtils_format(plan.expirationDate, true)}.`
              : "Takes effect at your next renewal."}
          </Text>
          {isAndroid && (
            // Google Play has no API to cancel a queued deferred plan change, and re-purchasing the
            // current product is rejected as a no-op replacement. The only way to revert is from the
            // Play subscription manager.
            <Text className="text-xs text-text-secondary">To cancel the switch, manage it in Google Play.</Text>
          )}
          {currentPlan && (
            <View className="pt-2">
              {keepLoading && !isAndroid ? (
                <IconSpinner width={16} height={16} />
              ) : (
                <LinkButton
                  name="keep-current-plan"
                  testID="button-keep-current-plan"
                  className="text-sm font-bold"
                  onPress={() => {
                    lg(`keep-subscription-${currentPlan}`);
                    if (isAndroid) {
                      props.dispatch(Thunk_openManageSubscriptions());
                    } else {
                      props.dispatch(Thunk_switchSubscription(currentPlan));
                    }
                  }}
                >
                  {isAndroid ? "Manage in Google Play" : `Keep ${planLabel(currentPlan)}`}
                </LinkButton>
              )}
            </View>
          )}
        </View>
      ) : plan.state === "subscriber" && targetPlan ? (
        <PlanCard
          testID={`button-switch-${targetPlan}`}
          highlighted={true}
          title={`Switch to ${planLabel(targetPlan)}`}
          subtitle={switchSubtext}
          loading={!!switchLoading}
          onPress={() => {
            lg(`switch-subscription-${targetPlan}`);
            props.dispatch(Thunk_switchSubscription(targetPlan));
          }}
        />
      ) : null}
      {props.supportsLifetime && (
        <PlanCard
          testID="button-subscription-lifetime"
          title="Lifetime"
          subtitle={lifetimeDisabledReason}
          price={props.lifetimePrice}
          disabled={true}
          onPress={() => {}}
        />
      )}
      {plan.state === "cancelled" && (
        <View className="pt-2">
          <Button
            name="subscription-resubscribe"
            kind="purple"
            className="w-full"
            testID="button-subscription-resubscribe"
            onPress={() => props.dispatch(Thunk_openManageSubscriptions())}
          >
            Resubscribe
          </Button>
        </View>
      )}
      {plan.state === "subscriber" && (
        <View className="pt-2">
          <LinkButton
            name="cancel-subscription"
            className="text-sm text-center text-text-error"
            testID="button-cancel-subscription"
            onPress={() => props.dispatch(Thunk_openManageSubscriptions())}
          >
            Cancel subscription
          </LinkButton>
        </View>
      )}
    </View>
  );
}

interface IPlanCardProps {
  testID: string;
  title: string;
  subtitle?: string;
  price?: string;
  oldPrice?: string;
  period?: string;
  badge?: string;
  highlighted?: boolean;
  disabled?: boolean;
  loading?: boolean;
  onPress: () => void;
}

function PlanCard(props: IPlanCardProps): JSX.Element {
  const bg = props.highlighted ? "bg-icon-purple" : "bg-background-cardpurple";
  const borderColor = props.highlighted ? "" : "border border-border-cardpurple";
  const titleColor = props.highlighted ? "text-text-alwayswhite" : "text-text-primary";
  const subColor = props.highlighted ? "text-text-alwayswhite" : "text-text-secondary";
  return (
    <Pressable
      className={`flex-row items-center min-h-16 px-4 py-2 mb-2 rounded-xl ${bg} ${borderColor} ${props.disabled ? "opacity-50" : ""}`}
      style={{ borderRadius: 16 }}
      data-testid={props.testID}
      testID={props.testID}
      disabled={props.disabled || props.loading}
      onPress={props.onPress}
    >
      {props.loading ? (
        <View className="items-center flex-1">
          <IconSpinner color={props.highlighted ? "white" : undefined} width={20} height={20} />
        </View>
      ) : (
        <>
          <View className="flex-1">
            <Text className={`text-base font-bold ${titleColor}`}>{props.title}</Text>
            {props.subtitle && <Text className={`text-xs ${subColor}`}>{props.subtitle}</Text>}
          </View>
          <View className="items-end">
            <View className="flex-row items-baseline">
              {props.oldPrice && <Text className={`mr-1 text-xs line-through ${subColor}`}>{props.oldPrice}</Text>}
              {props.price && (
                <Text className={`text-base font-bold ${titleColor}`}>
                  {props.price}
                  {props.period ? <Text className={`text-xs font-normal ${titleColor}`}>{props.period}</Text> : null}
                </Text>
              )}
            </View>
            {props.badge && <Text className={`text-xs ${subColor}`}>{props.badge}</Text>}
          </View>
        </>
      )}
    </Pressable>
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
        <Text className="text-base">
          <Text className={props.onPress ? "font-bold underline text-text-link" : "font-bold"}>{props.title}</Text>
          <Text className="text-sm text-text-primary"> - {props.description}</Text>
        </Text>
      </View>
    </Pressable>
  );
}
