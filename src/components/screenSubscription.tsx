import { h, JSX, Fragment } from "preact";
import { IDispatch } from "../ducks/types";
import { Surface } from "./surface";
import { NavbarView } from "./navbar";
import { IScreen } from "../models/screen";
import { ILoading } from "../models/state";
import { IconBarbell } from "./icons/iconBarbell";
import { IconGraphs2 } from "./icons/iconGraphs2";
import { IconMuscles2 } from "./icons/iconMuscles2";
import { Button } from "./button";
import { SendMessage } from "../utils/sendMessage";
import { LinkButton } from "./linkButton";
import { useState } from "preact/hooks";
import { Modal } from "./modal";
import { IconBell } from "./icons/iconBell";

interface IProps {
  loading: ILoading;
  screenStack: IScreen[];
  dispatch: IDispatch;
}

export function ScreenSubscription(props: IProps): JSX.Element {
  const [isPlatesCalculatorShown, setIsPlatesCalculatorShown] = useState<boolean>(false);
  const [isGraphsShown, setIsGraphsShown] = useState<boolean>(false);
  const [isMusclesShown, setIsMusclesShown] = useState<boolean>(false);
  const [isNotifsShown, setIsNotifsShown] = useState<boolean>(false);

  return (
    <Surface
      navbar={
        <NavbarView
          loading={props.loading}
          dispatch={props.dispatch}
          screenStack={props.screenStack}
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
          <h3 className="pt-4 pb-2 text-lg font-bold">Plates Calculator</h3>
          <p className="pb-2">What plates to add to each side of a bar to get the necessary weight</p>
          <p className="pb-4">
            E.g. on a screenshot below it says that to get <strong>175lb</strong>, you need to add <strong>45lb</strong>{" "}
            plate and <strong>2 x 10lb</strong> plates to the each side of the bar.
          </p>
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
          <h3 className="pt-4 pb-2 text-lg font-bold">Graphs</h3>
          <p className="pb-4">
            Shows graphs of exercises and also bodyweight and measurements. You can overlay bodyweight graph on exercise
            graphs to see how your bodyweight affected your progress. It can also show calculated 1 rep max, a unified
            metric of your strength.
          </p>
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
          isHidden={!isMusclesShown}
          onClose={() => setIsMusclesShown(false)}
          shouldShowClose={true}
        >
          <h3 className="pt-4 pb-2 text-lg font-bold">Muscles</h3>
          <p className="pb-4">
            Shows the balance of the muscles you activate during the day, or for the whole program. You could use it to
            find imbalances in your program.
          </p>
          <div className="text-center">
            <img
              src="/images/muscles_subs.png"
              style={{ boxShadow: "0 25px 50px 0px rgb(0 0 0 / 25%)" }}
              alt="Muscles screenshot"
            />
          </div>
        </Modal>,
        <Modal
          noPaddings={true}
          isHidden={!isNotifsShown}
          onClose={() => setIsNotifsShown(false)}
          shouldShowClose={true}
        >
          <h3 className="pt-4 pb-2 text-lg font-bold">Rest Timer Notifications</h3>
          <p className="pb-4">When the rest timer runs out, you'll get a notification it's time to start a new set</p>
          <div className="text-center">
            <img
              src="/images/notifs_subs.jpg"
              style={{ boxShadow: "0 25px 50px 0px rgb(0 0 0 / 25%)" }}
              alt="Notification screenshot"
            />
          </div>
        </Modal>,
      ]}
    >
      <section className="flex flex-col flex-1 px-4">
        <div
          className="pt-24 mt-4 mb-6 bg-no-repeat"
          style={{
            backgroundImage: "url(/images/logo.svg)",
            backgroundPosition: "top center",
            backgroundSize: "4rem",
          }}
        ></div>
        <ul>
          <Feature
            icon={<IconBarbell color="#3C5063" />}
            title="Plates Calculator"
            description="What plates to add to each side of a bar to get the necessary weight"
            onClick={() => setIsPlatesCalculatorShown(true)}
          />
          <Feature
            icon={<IconGraphs2 />}
            title="Graphs"
            description="So you could visualize your progress over time"
            onClick={() => setIsGraphsShown(true)}
          />
          <Feature
            icon={<IconMuscles2 />}
            title="Muscles"
            description="To see the muscle balance of your program"
            onClick={() => setIsMusclesShown(true)}
          />
          <Feature
            icon={<IconBell />}
            title="Rest Timer Notifications"
            description="When it's about to start a new set, you'll get a notification."
            onClick={() => setIsNotifsShown(true)}
          />
        </ul>
        <div className="fixed bottom-0 left-0 w-full px-2 py-2 bg-white">
          <div className="safe-area-inset-bottom">
            <div className="flex flex-row">
              <div className="flex-1 px-2 text-center">
                <Button
                  onClick={() => {
                    if (SendMessage.isIos() || SendMessage.isAndroid()) {
                      SendMessage.toIos({ type: "subscribeMontly" });
                      SendMessage.toAndroid({ type: "subscribeMontly" });
                    } else {
                      webAlert();
                    }
                  }}
                  className="w-full"
                  kind="orange"
                >
                  $4.99/month
                </Button>
              </div>
              <div className="flex-1 px-2 text-center">
                <Button
                  onClick={() => {
                    if (SendMessage.isIos() || SendMessage.isAndroid()) {
                      SendMessage.toIos({ type: "subscribeYearly" });
                      SendMessage.toAndroid({ type: "subscribeYearly" });
                    } else {
                      webAlert();
                    }
                  }}
                  className="w-full"
                  kind="purple"
                >
                  $49.99/year
                </Button>
              </div>
            </div>
            <div className="pt-2 font-bold text-center">Includes free trial for 14 days!</div>
            {(SendMessage.isAndroid() ||
              (SendMessage.isIos() && parseFloat(window.lftIosVersion || "0.0") >= 14.0)) && (
              <div className="text-center">
                <LinkButton
                  onClick={() => {
                    if (SendMessage.isIos() || SendMessage.isAndroid()) {
                      SendMessage.toIos({ type: "redeemCoupon" });
                      SendMessage.toAndroid({ type: "redeemCoupon" });
                    } else {
                      alert(
                        "You can only redeem the coupon from an iOS or Android Liftosaur app. Install Liftosaur from Google Play or App Store, and try it there!"
                      );
                    }
                  }}
                  className="pt-2 font-bold text-center"
                >
                  Redeem coupon
                </LinkButton>
              </div>
            )}
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
    <li className="flex flex-row flex-1 mb-8" onClick={props.onClick}>
      <div className="w-6 pt-1 mr-3 text-center">{props.icon}</div>
      <div className="flex-1">
        <h3 className="text-base font-bold">
          <LinkButton>{props.title}</LinkButton>
        </h3>
        <p className="text-sm text-blackv2">{props.description}</p>
      </div>
    </li>
  );
}
