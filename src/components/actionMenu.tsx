import { JSX, useCallback, useState } from "react";
import { View, Pressable, Platform, ActionSheetIOS, Modal as RNModal } from "react-native";
import { Text } from "./primitives/text";
import { DropdownMenu, DropdownMenuItem } from "./dropdownMenu";

export interface IActionMenuAction {
  label: string;
  onPress: () => void;
  destructive?: boolean;
  disabled?: boolean;
  "data-cy"?: string;
}

export interface IActionMenuProps {
  renderTrigger: (open: () => void) => JSX.Element;
  title?: string;
  actions: IActionMenuAction[];
}

export function ActionMenu(props: IActionMenuProps): JSX.Element {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => {
    if (Platform.OS === "ios") {
      const actions = props.actions;
      const labels = actions.map((a) => a.label).concat("Cancel");
      const destructiveIndex = actions.findIndex((a) => a.destructive);
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title: props.title,
          options: labels,
          cancelButtonIndex: labels.length - 1,
          destructiveButtonIndex: destructiveIndex >= 0 ? destructiveIndex : undefined,
        },
        (buttonIndex) => {
          if (buttonIndex != null && buttonIndex < actions.length && !actions[buttonIndex].disabled) {
            actions[buttonIndex].onPress();
          }
        }
      );
      return;
    }
    setIsOpen(true);
  }, [props.actions, props.title]);

  const close = useCallback(() => setIsOpen(false), []);

  return (
    <>
      {props.renderTrigger(open)}
      {isOpen && Platform.OS === "web" && (
        <DropdownMenu rightOffset="3rem" onClose={close}>
          {props.actions.map((a, i) => (
            <DropdownMenuItem
              key={a.label}
              isTop={i === 0}
              data-cy={a["data-cy"]}
              disabled={a.disabled}
              onClick={() => {
                close();
                if (!a.disabled) {
                  a.onPress();
                }
              }}
            >
              <Text className={a.destructive ? "text-text-error" : ""}>{a.label}</Text>
            </DropdownMenuItem>
          ))}
        </DropdownMenu>
      )}
      {Platform.OS === "android" && (
        <RNModal transparent visible={isOpen} animationType="fade" onRequestClose={close}>
          <Pressable className="flex-1 justify-end" style={{ backgroundColor: "rgba(0,0,0,0.4)" }} onPress={close}>
            <Pressable className="bg-background-default rounded-t-2xl pb-8" onPress={(e) => e.stopPropagation()}>
              {props.title && (
                <View className="px-4 py-3 border-b border-border-neutral">
                  <Text className="text-sm text-text-secondary text-center">{props.title}</Text>
                </View>
              )}
              {props.actions.map((a) => (
                <Pressable
                  key={a.label}
                  data-cy={a["data-cy"]}
                  testID={a["data-cy"]}
                  disabled={a.disabled}
                  className="px-4 py-4 border-b border-border-neutral"
                  onPress={() => {
                    close();
                    if (!a.disabled) {
                      a.onPress();
                    }
                  }}
                >
                  <Text
                    className={`text-base ${
                      a.destructive ? "text-text-error" : a.disabled ? "text-text-disabled" : "text-text-primary"
                    }`}
                  >
                    {a.label}
                  </Text>
                </Pressable>
              ))}
              <Pressable className="px-4 py-4" onPress={close}>
                <Text className="text-base text-text-secondary text-center">Cancel</Text>
              </Pressable>
            </Pressable>
          </Pressable>
        </RNModal>
      )}
    </>
  );
}
