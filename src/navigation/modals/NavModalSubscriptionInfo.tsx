import { JSX } from "react";
import { View, Image } from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import { ModalScreenContainer } from "../ModalScreenContainer";
import { FormSheet } from "../FormSheet";
import { Text } from "../../components/primitives/text";
import type { IRootStackParamList } from "../types";
import { ImagePreloader_uri } from "../../utils/imagePreloader";
import { SubscriptionInfoImages_get } from "../../components/subscriptionInfoImages";

interface ISectionProps {
  title: string;
  description: JSX.Element;
  imageUri: string;
  imageAlt: string;
  aspect: number;
}

function Section(props: ISectionProps): JSX.Element {
  return (
    <>
      <View className="px-4">
        <Text className="pt-4 pb-2 text-lg font-bold">{props.title}</Text>
        {props.description}
      </View>
      <View className="items-center">
        <Image
          source={{ uri: ImagePreloader_uri(props.imageUri) }}
          style={{ width: "100%", aspectRatio: props.aspect }}
          resizeMode="contain"
          accessibilityLabel={props.imageAlt}
        />
      </View>
    </>
  );
}

export function NavModalSubscriptionInfo(): JSX.Element {
  const navigation = useNavigation();
  const route = useRoute<{
    key: string;
    name: "subscriptionInfoModal";
    params: IRootStackParamList["subscriptionInfoModal"];
  }>();
  const { type } = route.params;
  const image = SubscriptionInfoImages_get(type);

  const onClose = (): void => {
    navigation.goBack();
  };

  return (
    <ModalScreenContainer onClose={onClose} shouldShowClose={true}>
      <FormSheet>
        {type === "platesCalculator" && (
          <Section
            title="Plates Calculator"
            imageUri={image.uri}
            aspect={image.aspect}
            imageAlt="Plates Calculator screenshot"
            description={
              <>
                <Text className="pb-2">What plates to add to each side of a bar to get the necessary weight</Text>
                <Text className="pb-4">
                  E.g. on a screenshot below it says that to get <Text className="font-bold">175lb</Text>, you need to
                  add <Text className="font-bold">45lb</Text> plate and <Text className="font-bold">2 x 10lb</Text>{" "}
                  plates to the each side of the bar.
                </Text>
              </>
            }
          />
        )}
        {type === "graphs" && (
          <Section
            title="Graphs"
            imageUri={image.uri}
            aspect={image.aspect}
            imageAlt="Graphs screenshot"
            description={
              <Text className="pb-4">
                Shows graphs of exercises and also bodyweight and measurements. You can overlay bodyweight graph on
                exercise graphs to see how your bodyweight affected your progress. It can also show calculated 1 rep
                max, a unified metric of your strength.
              </Text>
            }
          />
        )}
        {type === "notifications" && (
          <Section
            title="Rest Timer Notifications"
            imageUri={image.uri}
            aspect={image.aspect}
            imageAlt="Notification screenshot"
            description={
              <Text className="pb-4">
                When the rest timer runs out, you'll get a notification it's time to start a new set
              </Text>
            }
          />
        )}
        {type === "weekInsights" && (
          <Section
            title="Week Insights"
            imageUri={image.uri}
            aspect={image.aspect}
            imageAlt="Week Insights Screenshot"
            description={
              <Text className="pb-4">
                After each week you'll see how many sets you finished per type, per muscle group, etc, and whether it's
                within recommended range.
              </Text>
            }
          />
        )}
        {type === "watch" && (
          <Section
            title="Apple Watch App"
            imageUri={image.uri}
            aspect={image.aspect}
            imageAlt="Apple Watch app screenshot"
            description={
              <Text className="pb-4">
                Track your workouts directly from your wrist - log sets, see your next exercise, and run the rest timer
                without reaching for your phone.
              </Text>
            }
          />
        )}
        {type === "mcp" && (
          <Section
            title="API & MCP"
            imageUri={image.uri}
            aspect={image.aspect}
            imageAlt="MCP screenshot"
            description={
              <Text className="pb-4">
                Give Claude, ChatGPT, or Gemini access to your workouts and programs via MCP. Or use the API to build
                your own custom integrations.
              </Text>
            }
          />
        )}
      </FormSheet>
    </ModalScreenContainer>
  );
}
