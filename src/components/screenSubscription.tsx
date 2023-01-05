import { h, JSX, Fragment } from "preact";
import { IDispatch } from "../ducks/types";
import { Surface } from "./surface";
import { NavbarView } from "./navbar";
import { IScreen } from "../models/screen";
import { ILoading } from "../models/state";
import { IconDoc } from "./icons/iconDoc";
import { IconBarbell } from "./icons/iconBarbell";
import { IconGraphs2 } from "./icons/iconGraphs2";
import { IconMuscles2 } from "./icons/iconMuscles2";
import { Button } from "./button";
import { SendMessage } from "../utils/sendMessage";
import { LinkButton } from "./linkButton";

interface IProps {
  loading: ILoading;
  screenStack: IScreen[];
  dispatch: IDispatch;
}

export function ScreenSubscription(props: IProps): JSX.Element {
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
            icon={<IconDoc />}
            title="Powerful exercise editor"
            description="Where you can define any logic for changing reps, weight and sets over time"
          />
          <Feature
            icon={<IconBarbell color="#3C5063" />}
            title="Plates Calculator"
            description="What plates to add to each side of a bar to get the necessary weight"
          />
          <Feature icon={<IconGraphs2 />} title="Graphs" description="So you could visualize your progress over time" />
          <Feature icon={<IconMuscles2 />} title="Muscles" description="To see the muscle balance of your program" />
        </ul>
        <div className="fixed bottom-0 left-0 w-full px-2 py-2 bg-white safe-area-inset-bottom">
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

function Feature(props: { icon: JSX.Element; title: string; description: string }): JSX.Element {
  return (
    <li className="flex flex-row flex-1 mb-8">
      <div className="w-6 pt-1 mr-3 text-center">{props.icon}</div>
      <div className="flex-1">
        <h3 className="text-lg font-bold">{props.title}</h3>
        <p className="text-sm text-grayv2-main">{props.description}</p>
      </div>
    </li>
  );
}
