import React from "react";
import { useNavigation } from "@react-navigation/native";
import type { IRootNavigation } from "../navigation/types";
import { useStoreStateWhenFocused } from "../context/StoreContext";
import { useDispatch } from "../context/DispatchContext";
import { ScreenHome } from "@crossplatform/components/screens/ScreenHome";

export function NativeScreenHome(): React.ReactElement {
  const navigation = useNavigation<IRootNavigation>();
  const state = useStoreStateWhenFocused();
  const dispatch = useDispatch();

  return (
    <ScreenHome
      state={state}
      dispatch={dispatch}
      onNavigateToCalendar={(selectedFirstDayOfWeek) =>
        navigation.navigate("MonthCalendarSheet", { selectedFirstDayOfWeek })
      }
      onShowMoreInsights={(selectedFirstDayOfWeek) =>
        navigation.navigate("WeekInsightsSheet", { selectedFirstDayOfWeek })
      }
    />
  );
}
