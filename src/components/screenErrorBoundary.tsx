import { Component, ErrorInfo, ReactNode } from "react";
import { View, Text, Pressable } from "react-native";
import RB from "rollbar";

declare let Rollbar: RB | undefined;

interface INavigationLike {
  canGoBack?: () => boolean;
  goBack?: () => void;
}

interface IProps {
  screenName: string;
  navigation?: INavigationLike;
  children: ReactNode;
}

interface IState {
  hasError: boolean;
}

export class ScreenErrorBoundary extends Component<IProps, IState> {
  public state: IState = { hasError: false };

  public static getDerivedStateFromError(): IState {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, info: ErrorInfo): void {
    // Report here so the JS error + stack survives. Without a boundary a render-phase
    // throw tears down the Fabric tree and surfaces as an unactionable native
    // EXC_BAD_ACCESS in Hermes, captured by the native crash reporter instead of the JS one.
    if (typeof Rollbar !== "undefined" && Rollbar != null) {
      Rollbar.error(error, { componentStack: info.componentStack, screen: this.props.screenName });
    }
  }

  // canGoBack() can throw while navigation is mid-transition/unmount, which is exactly the
  // state we're in during error recovery. A throw here escapes this boundary (a boundary
  // can't catch its own render), so keep the fallback bulletproof and never let it throw.
  private safeCanGoBack(): boolean {
    try {
      return this.props.navigation?.canGoBack?.() ?? false;
    } catch {
      return false;
    }
  }

  private readonly onReset = (): void => {
    this.setState({ hasError: false });
  };

  private readonly onGoBack = (): void => {
    this.setState({ hasError: false });
    try {
      this.props.navigation?.goBack?.();
    } catch {
      // Navigation may already be gone; the tab bar / nav header remain usable.
    }
  };

  public render(): ReactNode {
    if (this.state.hasError) {
      // On modal/form-sheet routes the tab bar is hidden behind the overlay, so offer an
      // explicit way out instead of relying on tabs being reachable.
      const canGoBack = this.safeCanGoBack();
      return (
        <View className="items-center justify-center flex-1 px-8 bg-background-default">
          <Text className="pb-2 text-xl font-bold text-text-primary">Something went wrong</Text>
          <Text className="pb-6 text-sm text-center text-text-secondary">
            This screen ran into an error. You can try again{canGoBack ? " or go back" : ""}.
          </Text>
          <View className="flex-row items-center gap-3">
            <Pressable
              testID="screen-error-retry"
              onPress={this.onReset}
              className="px-6 py-3 rounded-lg bg-background-purpledark"
            >
              <Text className="text-base text-text-primary">Try again</Text>
            </Pressable>
            {canGoBack && (
              <Pressable
                testID="screen-error-goback"
                onPress={this.onGoBack}
                className="px-6 py-3 rounded-lg bg-background-subtle"
              >
                <Text className="text-base text-text-primary">Go back</Text>
              </Pressable>
            )}
          </View>
        </View>
      );
    }
    return this.props.children;
  }
}
