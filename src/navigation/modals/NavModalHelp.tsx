import { JSX } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRoute, useNavigation } from "@react-navigation/native";
import { ModalScreenContainer } from "../ModalScreenContainer";
import { FormSheet } from "../FormSheet";
import { Text } from "../../components/primitives/text";
import { Link } from "../../components/link";
import { HelpComponents } from "../../components/help/helpRegistry";
import type { IRootStackParamList } from "../types";

export function NavModalHelp(): JSX.Element {
  const navigation = useNavigation();
  const route = useRoute<{
    key: string;
    name: "helpModal";
    params: IRootStackParamList["helpModal"];
  }>();
  const { helpKey } = route.params;
  const Component = HelpComponents[helpKey];
  const onClose = (): void => navigation.goBack();
  const insets = useSafeAreaInsets();

  return (
    <ModalScreenContainer onClose={onClose} shouldShowClose={true} isFullWidth={true}>
      <FormSheet>
        {Component ? <Component /> : null}
        <View className="w-full h-px mt-4 mb-2 bg-border-neutral" />
        <Text className="text-sm text-text-secondary">
          If you still have questions, or if you encountered a bug, have a feature idea, or just want to share some
          feedback - don't hesitate to{" "}
          <Link className="text-sm" href="mailto:info@liftosaur.com">
            contact us
          </Link>
          ! Or join our{" "}
          <Link className="text-sm" href="https://discord.com/invite/AAh3cvdBRs">
            Discord server
          </Link>{" "}
          and ask your question there.
        </Text>
        <View style={{ height: insets.bottom }} />
      </FormSheet>
    </ModalScreenContainer>
  );
}
