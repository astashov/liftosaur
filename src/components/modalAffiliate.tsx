import { h, JSX } from "preact";
import { Modal } from "./modal";
import { GroupHeader } from "./groupHeader";
import { IDispatch } from "../ducks/types";
import { ISettings } from "../types";
import { lb } from "lens-shmens";
import { IconCheckCircle } from "./icons/iconCheckCircle";
import { IconLink } from "./icons/iconLink";
import { Tailwind_semantic } from "../utils/tailwindConfig";
import { MenuItemEditable } from "./menuItemEditable";
import { updateSettings } from "../models/state";

interface IProps {
  isHidden: boolean;
  isAffiliateEnabled: boolean;
  onClose: () => void;
  dispatch: IDispatch;
}

export function ModalAffiliate(props: IProps): JSX.Element {
  return (
    <Modal isFullWidth={true} isHidden={props.isHidden} shouldShowClose={true} onClose={props.onClose}>
      <div className="px-4 pb-4">
        <GroupHeader size="large" name="Affiliate Program" />
        <div className="mb-6">
          <h3 className="mb-3 text-lg font-semibold">How the Affiliate Program Works</h3>

          <div className="space-y-4">
            <div className="flex items-start">
              <div className="flex items-center justify-center flex-shrink-0 w-10 h-10 mr-3 rounded-full bg-color-yellow200">
                <IconLink size={18} color={Tailwind_semantic().icon.neutral} />
              </div>
              <div>
                <h4 className="mb-1 font-medium">Share Your Programs</h4>
                <p className="text-sm text-text-secondary">
                  When users import your published programs, they become affiliated with you.
                </p>
              </div>
            </div>

            <div className="flex items-start">
              <div className="flex items-center justify-center flex-shrink-0 w-10 h-10 mr-3 rounded-full bg-color-green100 text-icon-green">
                $
              </div>
              <div>
                <h4 className="mb-1 font-medium">Earn 20% Commission</h4>
                <p className="text-sm text-text-secondary">
                  Get 20% of all payments from users who subscribe after importing your programs.
                </p>
              </div>
            </div>

            <div className="flex items-start">
              <div className="flex items-center justify-center flex-shrink-0 w-10 h-10 mr-3 rounded-full bg-color-purple100">
                <IconCheckCircle
                  isChecked={true}
                  size={16}
                  color={Tailwind_semantic().icon.purple}
                  checkColor={Tailwind_semantic().background.default}
                />
              </div>
              <div>
                <h4 className="mb-1 font-medium">Lifetime Earnings</h4>
                <p className="text-sm text-text-secondary">
                  Continue earning from subscription renewals for as long as users remain subscribed.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 mb-6 border rounded-lg border-border-cardyellow bg-background-cardyellow">
          <h4 className="mb-2 text-sm font-semibold">Important Terms:</h4>
          <ul className="space-y-1 text-xs">
            <li>* Commissions only apply to payments made AFTER users import your program</li>
            <li>* If a user imports multiple programs, only the first creator gets commissions</li>
            <li>* Refunded payments are excluded from commission calculations</li>
            <li>* You can track your earnings in the affiliate dashboard</li>
            <li>* Payouts are processed monthly (minimum $50 balance required)</li>
          </ul>
        </div>

        <div className="mb-6">
          <h4 className="mb-2 text-sm font-semibold">By enabling the affiliate program, you agree to:</h4>
          <ul className="space-y-1 text-xs text-text-secondary">
            <li>* Promote your programs ethically and honestly</li>
            <li>* Not engage in spam or misleading marketing practices</li>
            <li>* Allow Liftosaur to track affiliate relationships and process payments</li>
            <li>* Provide valid payment information for receiving commissions</li>
          </ul>
        </div>

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
      </div>
    </Modal>
  );
}
