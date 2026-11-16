import { JSX } from "react";
import { Image } from "react-native";
import { IReaction, Reactions_imagePath } from "../../models/reactions";
import { BundledImages_resolve } from "../../utils/bundledImages";

interface IProps {
  reaction: IReaction;
  size: number;
}

export function ReactionImage(props: IProps): JSX.Element {
  return (
    <Image
      source={BundledImages_resolve(Reactions_imagePath(props.reaction))}
      style={{ width: props.size, height: props.size }}
      accessibilityLabel={props.reaction.replace("dino_", "")}
    />
  );
}
