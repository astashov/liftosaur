import { h, JSX, Fragment } from "preact";
import { IDispatch } from "../ducks/types";
import { Surface } from "./surface";
import { NavbarView } from "./navbar";
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
  SendMessage_toAndroid,
  SendMessage_iosAppVersion,
  SendMessage_androidAppVersion,
} from "../utils/sendMessage";
import { LinkButton } from "./linkButton";
import { useState } from "preact/hooks";
import { Modal } from "./modal";
import { IconBell } from "./icons/iconBell";
import { lb } from "lens-shmens";
import { IconSpinner } from "./icons/iconSpinner";
import { InternalLink } from "../internalLink";
import { IHistoryRecord, ISubscription } from "../types";
import { Thunk_pullScreen, Thunk_claimkey } from "../ducks/thunks";
import { ModalCoupon } from "./modalCoupon";
import { IconClose } from "./icons/iconClose";
import { ObjectUtils_entries, ObjectUtils_keys } from "../utils/object";
import { lg } from "../utils/posthog";
import { IconW } from "./icons/iconW";
import { Subscriptions_isEligibleForThanksgivingPromo } from "../utils/subscriptions";

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

export function ScreenSubscription(props: IProps): JSX.Element {
  const [isPlatesCalculatorShown, setIsPlatesCalculatorShown] = useState<boolean>(false);
  const [isGraphsShown, setIsGraphsShown] = useState<boolean>(false);
  const [isNotifsShown, setIsNotifsShown] = useState<boolean>(false);
  const [isRedeemShown, setIsRedeemShown] = useState<boolean>(false);
  const [isWeekStatsShown, setIsWeekStatsShown] = useState<boolean>(false);
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
  const isEligibleForThanks25 = Subscriptions_isEligibleForThanksgivingPromo(
    props.history.length > 0,
    props.subscription
  );
  const hasOffer = monthlyOffer || yearlyOffer;

  return (
    <Surface
      navbar={
        <NavbarView
          navCommon={props.navCommon}
          dispatch={props.dispatch}
          rightButtons={[
            <button
              className="p-2 nm-back"
              data-cy="navbar-back"
              onClick={() => {
                props.dispatch(Thunk_pullScreen());
              }}
            >
              <IconClose />
            </button>,
          ]}
          title={
            <span>
              <span style={{ fontFamily: "sans-serif" }}>⭐</span> <span>Liftosaur Premium</span>{" "}
              <span style={{ fontFamily: "sans-serif" }}>⭐</span>
            </span>
          }
        />
      }
      footer={<></>}
      addons={[
        <Modal
          noPaddings={true}
          isHidden={!isPlatesCalculatorShown}
          onClose={() => setIsPlatesCalculatorShown(false)}
          shouldShowClose={true}
        >
          <div className="px-4">
            <h3 className="pt-4 pb-2 text-lg font-bold">Plates Calculator</h3>
            <p className="pb-2">What plates to add to each side of a bar to get the necessary weight</p>
            <p className="pb-4">
              E.g. on a screenshot below it says that to get <strong>175lb</strong>, you need to add{" "}
              <strong>45lb</strong> plate and <strong>2 x 10lb</strong> plates to the each side of the bar.
            </p>
          </div>
          <div className="text-center">
            <img
              src="/images/plates_calculator_subs.png"
              style={{ boxShadow: "0 25px 50px 0px rgb(0 0 0 / 25%)" }}
              alt="Plates Calculator screenshot"
            />
          </div>
        </Modal>,
        <Modal
          noPaddings={true}
          isHidden={!isGraphsShown}
          onClose={() => setIsGraphsShown(false)}
          shouldShowClose={true}
        >
          <div className="px-4">
            <h3 className="pt-4 pb-2 text-lg font-bold">Graphs</h3>
            <p className="pb-4">
              Shows graphs of exercises and also bodyweight and measurements. You can overlay bodyweight graph on
              exercise graphs to see how your bodyweight affected your progress. It can also show calculated 1 rep max,
              a unified metric of your strength.
            </p>
          </div>
          <div className="text-center">
            <img
              src="/images/graphs_subs.png"
              style={{ boxShadow: "0 25px 50px 0px rgb(0 0 0 / 25%)" }}
              alt="Graphs screenshot"
            />
          </div>
        </Modal>,
        <Modal
          noPaddings={true}
          isHidden={!isNotifsShown}
          onClose={() => setIsNotifsShown(false)}
          shouldShowClose={true}
        >
          <div className="px-4">
            <h3 className="pt-4 pb-2 text-lg font-bold">Rest Timer Notifications</h3>
            <p className="pb-4">When the rest timer runs out, you'll get a notification it's time to start a new set</p>
          </div>
          <div className="text-center">
            <img
              src="/images/notifs_subs.jpg"
              style={{ boxShadow: "0 25px 50px 0px rgb(0 0 0 / 25%)" }}
              alt="Notification screenshot"
            />
          </div>
        </Modal>,
        <Modal
          noPaddings={true}
          isHidden={!isWeekStatsShown}
          onClose={() => setIsWeekStatsShown(false)}
          shouldShowClose={true}
        >
          <div className="px-4">
            <h3 className="pt-4 pb-2 text-lg font-bold">Week Insights</h3>
            <p className="pb-4">
              After each week you'll see how many sets you finished per type, per muscle group, etc, and whether it's
              within recommended range.
            </p>
          </div>
          <div className="text-center">
            <img
              src="/images/week_insights_subs.png"
              style={{ boxShadow: "0 25px 50px 0px rgb(0 0 0 / 25%)" }}
              alt="Week Insights Screenshot"
            />
          </div>
        </Modal>,
        <ModalCoupon isHidden={!isRedeemShown} dispatch={props.dispatch} onClose={() => setIsRedeemShown(false)} />,
      ]}
    >
      <section className="flex flex-col flex-1 px-4">
        {isEligibleForThanks25 ? (
          <div className="flex items-center gap-4 p-2 mb-4 border rounded-lg bg-background-cardyellow border-border-cardyellow">
            <div className="flex-2">
              <img
                src="/images/thanks25.png"
                className="inline-block"
                style={{ width: "100%", maxWidth: "300px" }}
                alt="Thanksgiving 2025!"
              />
            </div>
            <div className="flex-3">
              <div className="mb-2">
                <div>
                  <span className="text-sm font-bold text-orange-600">30%</span> off
                </div>
                <div className="text-xs">first year of subscription</div>
              </div>
              <div className="mb-2">
                {SendMessage_isIos() ? (
                  <div>
                    <div className="text-sm">
                      <strong>Monthly Code: </strong>
                      <span className="font-bold text-text-purple">THANKS25</span>
                    </div>
                    <div className="text-sm">
                      <strong>Yearly Code: </strong>
                      <span className="font-bold text-text-purple">THANKS25Y</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm">
                    <strong>Code: </strong>
                    <span className="font-bold text-text-purple">THANKS25</span>
                  </div>
                )}
                <div className="text-xs text-text-secondary">Valid 25 Nov - 3 Dec 25</div>
              </div>
              <div>
                <div className="text-xs">
                  Applicable to <span className="font-bold text-text-purple">monthly</span> and{" "}
                  <span className="font-bold text-text-purple">yearly</span> subscriptions.
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div
            className="pt-16 mb-2 bg-no-repeat"
            style={{
              backgroundImage: "url(/images/logo.svg)",
              backgroundPosition: "top center",
              backgroundSize: "4rem",
            }}
          ></div>
        )}
        <p className="mb-4 text-sm">
          While you can use Liftosaur for free, there're some features on Liftosaur that require premium access:
        </p>
        <ul>
          <Feature
            icon={<IconBarbell />}
            title="Plates Calculator"
            description="What plates to add to each side of a bar to get the necessary weight"
            onClick={() => setIsPlatesCalculatorShown(true)}
          />
          <Feature
            icon={<IconGraphs />}
            title="Graphs"
            description="So you could visualize your progress over time"
            onClick={() => setIsGraphsShown(true)}
          />
          <Feature
            icon={<IconBell />}
            title="Rest Timer Notifications"
            description="When it's about to start a new set, you'll get a notification."
            onClick={() => setIsNotifsShown(true)}
          />
          <Feature
            icon={<IconW />}
            title="Week Insights"
            description="Weekly stats about your performance"
            onClick={() => setIsWeekStatsShown(true)}
          />
        </ul>
        <p className="mb-4 text-xs text-text-secondary">
          You can get monthly or yearly subscription (and you'll be charged for a month or year every month or year
          {!hasOffer ? "after initial 14 days free trial period" : ""}) or lifetime - one-time payment, that gives
          access to those features without recurring charges in the future.
        </p>
        <p className="mb-4 text-xs text-text-secondary">
          You can cancel subscriptions any time via Google Play or App Store subscriptions management.
        </p>
        <div className="fixed bottom-0 left-0 w-full px-2 py-2 bg-background-default">
          <div className="safe-area-inset-bottom">
            {props.subscription.key === "unclaimed" ? (
              <div className="flex items-center px-2">
                <div className="text-xs text-text-secondary">
                  You were granted the <strong>free access</strong> to Liftosaur!
                </div>
                <div>
                  <Button
                    name="subscription-free"
                    onClick={() => props.dispatch(Thunk_claimkey())}
                    kind="purple"
                    className="whitespace-nowrap"
                    data-cy="button-subscription-free"
                    buttonSize="lg"
                  >
                    Get it!
                  </Button>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex flex-row">
                  <div className="flex-1 px-2 text-center">
                    {!hasOffer && <div className="text-xs text-text-secondary">Includes free 14 days trial</div>}
                    <Button
                      style={{ padding: "0.75rem 0.5rem" }}
                      name="subscription-monthly"
                      onClick={() => {
                        if (SendMessage_isIos() || SendMessage_isAndroid()) {
                          lg("start-subscription-monthly");
                          SendMessage_toIos({
                            type: "subscribeMontly",
                            offer: JSON.stringify(props.appleOffer?.monthly),
                          });
                          SendMessage_toAndroid({
                            type: "subscribeMontly",
                            offer: JSON.stringify(props.googleOffer?.monthly),
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
                      data-cy="button-subscription-monthly"
                    >
                      {!props.subscriptionLoading?.monthly ? (
                        <>
                          {monthlyOffer ? (
                            <>
                              <span className="mr-1 font-normal line-through">{monthlyPrice}</span>
                              <span className="font-bold">{monthlyOffer.formattedPrice}</span>
                            </>
                          ) : (
                            <span>{monthlyPrice}</span>
                          )}
                          <span>/month</span>
                        </>
                      ) : (
                        <IconSpinner color="white" width={18} height={18} />
                      )}
                    </Button>
                  </div>
                  <div className="flex-1 px-2 text-center">
                    {!hasOffer && <div className="text-xs text-text-secondary">Includes free 14 days trial</div>}
                    <Button
                      name="subscription-yearly"
                      style={{ padding: "0.75rem 0.5rem" }}
                      onClick={() => {
                        if (SendMessage_isIos() || SendMessage_isAndroid()) {
                          lg("start-subscription-yearly");
                          SendMessage_toIos({
                            type: "subscribeYearly",
                            offer: JSON.stringify(props.appleOffer?.yearly),
                          });
                          SendMessage_toAndroid({
                            type: "subscribeYearly",
                            offer: JSON.stringify(props.googleOffer?.yearly),
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
                      data-cy="button-subscription-yearly"
                    >
                      {!props.subscriptionLoading?.yearly ? (
                        <>
                          {yearlyOffer ? (
                            <>
                              <span className="mr-1 font-normal line-through">{yearlyPrice}</span>
                              <span className="font-bold">{yearlyOffer.formattedPrice}</span>
                            </>
                          ) : (
                            <span>{yearlyPrice}</span>
                          )}
                          <span>/year</span>
                        </>
                      ) : (
                        <IconSpinner color="white" width={18} height={18} />
                      )}
                    </Button>
                  </div>
                </div>
                {(monthlyOffer || yearlyOffer) && (
                  <div className="pt-1 text-xs text-center text-text-secondary">
                    Discount applies for the first year
                  </div>
                )}
                {((SendMessage_isIos() && SendMessage_iosAppVersion() >= 8) ||
                  (SendMessage_isAndroid() && SendMessage_androidAppVersion() >= 15)) && (
                  <div className="px-2 pt-2 text-center">
                    <Button
                      name="subscription-lifetime"
                      onClick={() => {
                        if (SendMessage_isIos() || SendMessage_isAndroid()) {
                          lg("start-subscription-lifetime");
                          SendMessage_toIos({ type: "subscribeLifetime" });
                          SendMessage_toAndroid({ type: "subscribeLifetime" });
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
                      data-cy="button-subscription-lifetime"
                    >
                      {!props.subscriptionLoading?.lifetime ? (
                        "Lifetime - " + lifetimePrice
                      ) : (
                        <IconSpinner color="white" width={18} height={18} />
                      )}
                    </Button>
                  </div>
                )}
              </div>
            )}
            <div className="flex flex-row">
              <div className="flex-1 text-center">
                <LinkButton
                  name="redeem-coupon"
                  onClick={() => {
                    if (SendMessage_isIos()) {
                      SendMessage_toIos({ type: "redeemCoupon" });
                    } else {
                      setIsRedeemShown(true);
                    }
                  }}
                  className="pt-2 font-bold text-center"
                >
                  Redeem coupon
                </LinkButton>
              </div>
              <div className="flex-1 pt-2 text-center">
                <InternalLink
                  name="terms-of-use"
                  href="/terms.html"
                  className="font-bold underline border-none text-text-link"
                >
                  Terms of use
                </InternalLink>
              </div>
            </div>
            <div className="flex flex-row">
              <div className="flex-1 pt-2 text-center">
                <LinkButton
                  name="restore-subscriptions"
                  onClick={() => {
                    SendMessage_toIos({ type: "restoreSubscriptions" });
                    SendMessage_toAndroid({ type: "restoreSubscriptions" });
                  }}
                >
                  Restore Subscription
                </LinkButton>
              </div>
            </div>
          </div>
        </div>
      </section>
    </Surface>
  );
}

function webAlert(): void {
  alert(
    "You can only subscribe from an iOS or Android Liftosaur app. Install Liftosaur from Google Play or App Store, subscribe there, then log in in Liftosaur, and use the same login method on the web. That will unlock the premium features on the web."
  );
}

interface IFeatureProps {
  icon: JSX.Element;
  title: string;
  description: string;
  onClick: () => void;
}

function Feature(props: IFeatureProps): JSX.Element {
  return (
    <li className="flex flex-row flex-1 mb-6" onClick={props.onClick}>
      <div className="w-6 pt-1 mr-3 text-center">{props.icon}</div>
      <div className="flex-1">
        <h3 className="text-base font-bold">
          <LinkButton name="subscription-feature">{props.title}</LinkButton>
        </h3>
        <p className="text-sm text-text-primary">{props.description}</p>
      </div>
    </li>
  );
}
