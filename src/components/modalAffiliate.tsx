import type { JSX } from "react";
import { View } from "react-native";
import { Text } from "./primitives/text";
import { GroupHeader } from "./groupHeader";
import { IDispatch } from "../ducks/types";
import { ISettings } from "../types";
import { lb } from "lens-shmens";
import { IconCheckCircle } from "./icons/iconCheckCircle";
import { IconLink } from "./icons/iconLink";
import { Tailwind_semantic } from "../utils/tailwindConfig";
import { MenuItemEditable } from "./menuItemEditable";
import { updateSettings } from "../models/state";

interface IModalAffiliateContentProps {
  isAffiliateEnabled: boolean;
  onClose: () => void;
  dispatch: IDispatch;
}

interface IBulletProps {
  children: JSX.Element | string;
}

function Bullet(props: IBulletProps): JSX.Element {
  return (
    <View className="flex-row">
      <Text className="text-xs text-text-secondary">* </Text>
      <Text className="flex-1 text-xs text-text-secondary">{props.children}</Text>
    </View>
  );
}

export function ModalAffiliateContent(props: IModalAffiliateContentProps): JSX.Element {
  return (
    <View className="pb-6">
      <GroupHeader size="large" name="Affiliate Program" />
      <View className="mb-6">
        <Text className="mb-3 text-lg font-semibold">How the Affiliate Program Works</Text>

        <View style={{ gap: 16 }}>
          <View className="flex-row items-start">
            <View className="items-center justify-center w-10 h-10 mr-3 rounded-full bg-color-yellow200">
              <IconLink size={18} color={Tailwind_semantic().icon.neutral} />
            </View>
            <View className="flex-1">
              <Text className="mb-1 font-medium">Share Your Programs</Text>
              <Text className="text-sm text-text-secondary">
                When users import your published programs, they become affiliated with you.
              </Text>
            </View>
          </View>

          <View className="flex-row items-start">
            <View className="items-center justify-center w-10 h-10 mr-3 rounded-full bg-color-green100">
              <Text className="font-bold text-icon-green">$</Text>
            </View>
            <View className="flex-1">
              <Text className="mb-1 font-medium">Earn 20% Commission</Text>
              <Text className="text-sm text-text-secondary">
                Get 20% of all payments from users who subscribe after importing your programs.
              </Text>
            </View>
          </View>

          <View className="flex-row items-start">
            <View className="items-center justify-center w-10 h-10 mr-3 rounded-full bg-color-purple100">
              <IconCheckCircle
                isChecked={true}
                size={16}
                color={Tailwind_semantic().icon.purple}
                checkColor={Tailwind_semantic().background.default}
              />
            </View>
            <View className="flex-1">
              <Text className="mb-1 font-medium">Lifetime Earnings</Text>
              <Text className="text-sm text-text-secondary">
                Continue earning from subscription renewals for as long as users remain subscribed.
              </Text>
            </View>
          </View>
        </View>
      </View>

      <View className="p-4 mb-6 border rounded-lg border-border-cardyellow bg-background-cardyellow">
        <Text className="mb-2 text-sm font-semibold">Important Terms:</Text>
        <View style={{ gap: 4 }}>
          <Bullet>Commissions only apply to payments made AFTER users import your program</Bullet>
          <Bullet>If a user imports multiple programs, only the first creator gets commissions</Bullet>
          <Bullet>Refunded payments are excluded from commission calculations</Bullet>
          <Bullet>You can track your earnings in the affiliate dashboard</Bullet>
          <Bullet>Payouts are processed monthly (minimum $50 balance required)</Bullet>
        </View>
      </View>

      <View className="mb-6">
        <Text className="mb-2 text-sm font-semibold">By enabling the affiliate program, you agree to:</Text>
        <View style={{ gap: 4 }}>
          <Bullet>Promote your programs ethically and honestly</Bullet>
          <Bullet>Not engage in spam or misleading marketing practices</Bullet>
          <Bullet>Allow Liftosaur to track affiliate relationships and process payments</Bullet>
          <Bullet>Provide valid payment information for receiving commissions</Bullet>
        </View>
      </View>

      <MenuItemEditable
        type="boolean"
        name="Enable Affiliate Program"
        value={props.isAffiliateEnabled ? "true" : "false"}
        onChange={() => {
          updateSettings(
            props.dispatch,
            lb<ISettings>().p("affiliateEnabled").record(!props.isAffiliateEnabled),
            "Toggle affiliate program"
          );
        }}
      />
    </View>
  );
}
