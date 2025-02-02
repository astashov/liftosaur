import { h, JSX, Fragment } from "preact";
import { IDispatch } from "../ducks/types";
import { Surface } from "./surface";
import { NavbarView } from "./navbar";
import { INavCommon, IState, ISubscriptionLoading, updateState } from "../models/state";
import { IconBarbell } from "./icons/iconBarbell";
import { IconGraphs } from "./icons/iconGraphs";
import { Button } from "./button";
import { SendMessage } from "../utils/sendMessage";
import { LinkButton } from "./linkButton";
import { useState } from "preact/hooks";
import { Modal } from "./modal";
import { IconBell } from "./icons/iconBell";
import { lb } from "lens-shmens";
import { IconSpinner } from "./icons/iconSpinner";
import { InternalLink } from "../internalLink";
import { ISubscription } from "../types";
import { Thunk } from "../ducks/thunks";
import { ModalCoupon } from "./modalCoupon";
import { IconClose } from "./icons/iconClose";
import { ObjectUtils } from "../utils/object";
import { lg } from "../utils/posthog";
import { IconW } from "./icons/iconW";

interface IProps {
  prices?: Partial<Record<string, string>>;
  subscription: ISubscription;
  subscriptionLoading?: ISubscriptionLoading;
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
    ObjectUtils.entries(props.prices || {}).filter(([k]) => k.indexOf("mont") !== -1)?.[0]?.[1] ?? "$4.99";
  const yearlyPrice =
    ObjectUtils.entries(props.prices || {}).filter(([k]) => k.indexOf("year") !== -1)?.[0]?.[1] ?? "$39.99";
  const lifetimePrice =
    ObjectUtils.entries(props.prices || {}).filter(([k]) => k.indexOf("lifetime") !== -1)?.[0]?.[1] ?? "$79.99";

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
                props.dispatch(Thunk.pullScreen());
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
        <div
          className="pt-16 mb-2 bg-no-repeat"
          style={{
            backgroundImage: "url(/images/logo.svg)",
            backgroundPosition: "top center",
            backgroundSize: "4rem",
          }}
        ></div>
        <p className="mb-4 text-sm">
          While you can use Liftosaur for free, there're some features on Liftosaur that require premium access:
        </p>
        <ul>
          <Feature
            icon={<IconBarbell color="#3C5063" />}
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
        <p className="mb-4 text-xs text-grayv2-main">
          You can get monthly or yearly subscription (and you'll be charged for a month or year every month or year
          after initial 14 days free trial period) or lifetime - one-time payment, that gives access to those features
          without recurring charges in the future.
        </p>
        <p className="mb-4 text-xs text-grayv2-main">
          You can cancel subscriptions any time via Google Play or App Store subscriptions management.
        </p>
        <div className="fixed bottom-0 left-0 w-full px-2 py-2 bg-white">
          <div className="safe-area-inset-bottom">
            {props.subscription.key === "unclaimed" ? (
              <div className="flex items-center px-2">
                <div className="text-xs text-grayv2-main">
                  You were granted the <strong>free access</strong> to Liftosaur!
                </div>
                <div>
                  <Button
                    name="subscription-free"
                    onClick={() => props.dispatch(Thunk.claimkey())}
                    kind="orange"
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
                    <div className="text-xs text-grayv2-main">Includes free 14 days trial</div>
                    <Button
                      name="subscription-monthly"
                      onClick={() => {
                        if (SendMessage.isIos() || SendMessage.isAndroid()) {
                          lg("start-subscription-monthly");
                          SendMessage.toIos({ type: "subscribeMontly" });
                          SendMessage.toAndroid({ type: "subscribeMontly" });
                          updateState(props.dispatch, [
                            lb<IState>().p("subscriptionLoading").record({ monthly: true }),
                          ]);
                        } else {
                          webAlert();
                        }
                      }}
                      className="w-full"
                      kind="orange"
                      data-cy="button-subscription-monthly"
                    >
                      {!props.subscriptionLoading?.monthly ? (
                        monthlyPrice + "/month"
                      ) : (
                        <IconSpinner color="white" width={18} height={18} />
                      )}
                    </Button>
                  </div>
                  <div className="flex-1 px-2 text-center">
                    <div className="text-xs text-grayv2-main">Includes free 14 days trial</div>
                    <Button
                      name="subscription-yearly"
                      onClick={() => {
                        if (SendMessage.isIos() || SendMessage.isAndroid()) {
                          lg("start-subscription-yearly");
                          SendMessage.toIos({ type: "subscribeYearly" });
                          SendMessage.toAndroid({ type: "subscribeYearly" });
                          updateState(props.dispatch, [lb<IState>().p("subscriptionLoading").record({ yearly: true })]);
                        } else {
                          webAlert();
                        }
                      }}
                      className="w-full"
                      kind="purple"
                      data-cy="button-subscription-yearly"
                    >
                      {!props.subscriptionLoading?.yearly ? (
                        yearlyPrice + "/year"
                      ) : (
                        <IconSpinner color="white" width={18} height={18} />
                      )}
                    </Button>
                  </div>
                </div>
                {((SendMessage.isIos() && SendMessage.iosAppVersion() >= 8) ||
                  (SendMessage.isAndroid() && SendMessage.androidAppVersion() >= 15)) && (
                  <div className="px-2 pt-2 text-center">
                    <Button
                      name="subscription-lifetime"
                      onClick={() => {
                        if (SendMessage.isIos() || SendMessage.isAndroid()) {
                          lg("start-subscription-lifetime");
                          SendMessage.toIos({ type: "subscribeLifetime" });
                          SendMessage.toAndroid({ type: "subscribeLifetime" });
                          updateState(props.dispatch, [
                            lb<IState>().p("subscriptionLoading").record({ lifetime: true }),
                          ]);
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
                  onClick={() => setIsRedeemShown(true)}
                  className="pt-2 font-bold text-center"
                >
                  Redeem coupon
                </LinkButton>
              </div>
              <div className="flex-1 pt-2 text-center">
                <InternalLink
                  name="terms-of-use"
                  href="/terms.html"
                  className="font-bold underline border-none text-bluev2"
                >
                  Terms of use
                </InternalLink>
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
        <p className="text-sm text-blackv2">{props.description}</p>
      </div>
    </li>
  );
}
