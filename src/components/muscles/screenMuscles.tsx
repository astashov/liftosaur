import type { JSX } from "react";
import { IDispatch } from "../../ducks/types";
import { IPoints } from "../../models/muscle";
import { ISettings } from "../../types";
import { MusclesView } from "./musclesView";
import { useNavOptions } from "../../navigation/useNavOptions";
import { INavCommon } from "../../models/state";
import type { IHelpKey } from "../help/helpRegistry";

interface IProps {
  dispatch: IDispatch;
  title: string;
  helpKey: IHelpKey;
  points: IPoints;
  settings: ISettings;
  navCommon: INavCommon;
}

export function ScreenMuscles(props: IProps): JSX.Element {
  useNavOptions({ navTitle: "Muscles Map", navSubtitle: props.title, navHelpKey: props.helpKey });

  return <MusclesView title={props.title} points={props.points} settings={props.settings} />;
}
