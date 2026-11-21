import type { JSX } from "react";
import { View } from "react-native";
import { Lens, lb } from "lens-shmens";
import { IDispatch } from "../ducks/types";
import { I1RMFormula, ISettings, rm1Formulas } from "../types";
import { useNavOptions } from "../navigation/useNavOptions";
import { GroupHeader } from "./groupHeader";
import { MenuItem } from "./menuItem";
import { Text } from "./primitives/text";
import { IconCheckCircle } from "./icons/iconCheckCircle";
import { Rm1Formula_name, Rm1Formula_previewText } from "../models/rm1Formula";

interface IProps {
  dispatch: IDispatch;
  formula: I1RMFormula;
}

export function ScreenRm1Formula(props: IProps): JSX.Element {
  useNavOptions({ navTitle: "1RM Formula" });

  const onSelect = (formula: I1RMFormula): void => {
    const lensRecording = Lens.buildLensRecording(lb<ISettings>().p("rm1formula"), formula);
    props.dispatch({ type: "UpdateSettings", lensRecording, desc: `Set 1RM formula to ${formula}` });
  };

  return (
    <View className="px-gutter">
      <GroupHeader name="Formula for % of 1RM and estimated 1RM" />
      {rm1Formulas.map((formula) => (
        <MenuItem
          key={formula}
          name={Rm1Formula_name(formula)}
          expandName={true}
          addons={<Text className="text-xs text-text-secondary">{Rm1Formula_previewText(formula)}</Text>}
          value={<IconCheckCircle isChecked={formula === props.formula} />}
          onClick={() => onSelect(formula)}
        />
      ))}
      <Text className="pt-4 text-xs text-text-secondary">
        Used for weights of RPE sets, estimated 1RMs in history and graphs, and the rpeMultiplier(), calculate1RM() and
        calculateTrainingMax() functions in Liftoscript. Reps in reserve count as extra reps for Epley, Brzycki and
        Lombardi.
      </Text>
    </View>
  );
}
