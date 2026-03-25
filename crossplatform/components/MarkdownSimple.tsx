import type { JSX } from "react";
import { View, Text } from "react-native";
import Markdown from "markdown-to-jsx";

interface IProps {
  value: string;
  className?: string;
}

export function MarkdownSimple(props: IProps): JSX.Element {
  const stringValue = typeof props.value === "string" ? props.value : String(props.value ?? "");
  return (
    <View className={props.className || "markdown"}>
      <Markdown
        options={{
          overrides: {
            p: { component: ({ children }) => <Text className="text-sm mb-1">{children}</Text> },
            strong: { component: ({ children }) => <Text className="font-bold">{children}</Text> },
            em: { component: ({ children }) => <Text className="italic">{children}</Text> },
            li: {
              component: ({ children }) => (
                <View className="flex-row mb-1">
                  <Text className="text-sm mr-1">{"\u2022"}</Text>
                  <Text className="text-sm flex-1">{children}</Text>
                </View>
              ),
            },
            ul: { component: ({ children }) => <View className="ml-2">{children}</View> },
            ol: { component: ({ children }) => <View className="ml-2">{children}</View> },
            a: {
              component: ({ children }) => <Text className="text-text-link underline">{children}</Text>,
            },
            h1: { component: ({ children }) => <Text className="text-lg font-bold mb-1">{children}</Text> },
            h2: { component: ({ children }) => <Text className="text-base font-bold mb-1">{children}</Text> },
            h3: { component: ({ children }) => <Text className="text-sm font-bold mb-1">{children}</Text> },
            code: { component: ({ children }) => <Text className="font-mono text-xs">{children}</Text> },
            pre: { component: ({ children }) => <View className="mb-2">{children}</View> },
          },
          forceBlock: true,
        }}
      >
        {stringValue}
      </Markdown>
    </View>
  );
}
