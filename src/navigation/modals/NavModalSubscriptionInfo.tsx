import { JSX } from "react";
import { useRoute, useNavigation } from "@react-navigation/native";
import { ModalScreenContainer } from "../ModalScreenContainer";
import type { IRootStackParamList } from "../types";

export function NavModalSubscriptionInfo(): JSX.Element {
  const navigation = useNavigation();
  const route = useRoute<{
    key: string;
    name: "subscriptionInfoModal";
    params: IRootStackParamList["subscriptionInfoModal"];
  }>();
  const { type } = route.params;

  const onClose = (): void => {
    navigation.goBack();
  };

  return (
    <ModalScreenContainer onClose={onClose} shouldShowClose={true} noPaddings={true}>
      {type === "platesCalculator" && (
        <>
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
        </>
      )}
      {type === "graphs" && (
        <>
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
        </>
      )}
      {type === "notifications" && (
        <>
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
        </>
      )}
      {type === "weekInsights" && (
        <>
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
        </>
      )}
    </ModalScreenContainer>
  );
}
