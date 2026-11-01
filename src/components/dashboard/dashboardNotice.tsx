import { JSX } from "react";
import { Text } from "../primitives/text";
import { DashboardCard } from "./dashboardCard";

export function DashboardNotice(props: { caption?: string; message: string; isError?: boolean }): JSX.Element {
  return (
    <DashboardCard caption={props.caption} testID="dashboard-notice">
      <Text className={`text-sm ${props.isError ? "text-text-error" : "text-text-secondary"}`}>{props.message}</Text>
    </DashboardCard>
  );
}
